import { Router } from 'express';
import { z } from 'zod';
import { createPaymentService, paymentMode, PaymentError } from '../payments';
import { planModel } from '../models/planModel';
import { orderCreateLimiter } from '../middleware/rateLimiter';
import { validateBody } from '../middleware/validation';
import { calculatePayment } from '../payments';
import { subscriberError } from '../../src/lib/subscriberValidation';
import { randomUUID } from 'node:crypto';
import { razorpayClient, verifyPaymentSignature } from '../razorpay';
import { recordProviderPayment } from '../models/paymentLedger';
import { verifyAuthToken } from '../middleware/auth';

export const paymentsRouter = Router();
const service = createPaymentService(() => planModel.getAll());
const sessionOwners = new Map<string, { uid: string; expiresAt: number }>();
paymentsRouter.use(['/api/create-order', '/api/verify-payment', '/api/payments/session', '/api/recharge/create'], async (req, res, next) => {
  try {
    const customer = await verifyAuthToken(req);
    if (!customer) { res.status(401).json({ success: false, error: 'Please sign in to continue with payment.' }); return; }
    res.locals.customer = customer;
    next();
  } catch { res.status(401).json({ success: false, error: 'Your session could not be verified. Please sign in again.' }); }
});
const prepareSchema = z.object({
  idempotencyKey: z.string().uuid(),
  packId: z.string().min(1),
  operator: z.enum(['sun_direct', 'tata_play', 'airtel_dth', 'dish_tv', 'd2h']),
  smartCardNumber: z.string().max(64),
  customAmount: z.number().optional(),
  customerName: z.string().trim().min(1).max(100).optional(),
  customerPhone: z.string().trim().regex(/^(?:\+91)?[6-9]\d{9}$/).optional(),
});
const completeSchema = z.object({ sessionId: z.string().min(1).max(80), outcome: z.enum(['success', 'failed', 'pending']) });

function respond(res: import('express').Response, action: () => unknown) {
  res.setHeader('Cache-Control', 'no-store');
  try { res.json({ success: true, session: action() }); }
  catch (error) {
    res.status(error instanceof PaymentError ? error.status : 500).json({ success: false,
      error: error instanceof PaymentError ? error.message : 'Checkout unavailable. No payment has been taken.' });
  }
}
paymentsRouter.get('/api/payments/config', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const mode = paymentMode();
  res.json({ mode, provider: mode === 'sandbox' ? 'Local sandbox simulator' : 'Razorpay' });
});
paymentsRouter.post('/api/payments/session', orderCreateLimiter, validateBody(prepareSchema), (req, res) => respond(res, () => {
  for (const [id, entry] of sessionOwners) if (entry.expiresAt <= Date.now()) sessionOwners.delete(id);
  const session = service.prepare({ ...req.body, idempotencyKey: `${res.locals.customer.uid}:${req.body.idempotencyKey}` });
  sessionOwners.set(session.id, { uid: res.locals.customer.uid, expiresAt: session.expiresAt });
  return session;
}));
paymentsRouter.post('/api/recharge/create', orderCreateLimiter, validateBody(completeSchema), (req, res) => respond(res, () => {
  if (sessionOwners.get(req.body.sessionId)?.uid !== res.locals.customer.uid) throw new PaymentError(403, 'This checkout belongs to another customer or has expired.');
  return service.complete(req.body.sessionId, req.body.outcome);
}));

const orderSchema = z.union([
  prepareSchema.omit({ idempotencyKey: true }),
  z.object({ amount: z.number().int().min(100).refine(Number.isSafeInteger),
    currency: z.literal('INR').default('INR'), receipt: z.string().min(1).max(40).optional() }),
]);
const signatureSchema = z.object({
  razorpay_order_id: z.string().regex(/^order_[a-zA-Z0-9]+$/),
  razorpay_payment_id: z.string().regex(/^pay_[a-zA-Z0-9]+$/),
  razorpay_signature: z.string().min(1).max(128),
});

function providerError(res: import('express').Response, error: unknown) {
  const status = error instanceof PaymentError ? error.status :
    (error as { statusCode?: number })?.statusCode === 401 ? 401 : 500;
  res.status(status).json({ success: false, error: error instanceof PaymentError ? error.message :
    status === 401 ? 'Razorpay authentication failed.' : 'Razorpay request failed. Please retry or check payment status.' });
}

paymentsRouter.post('/api/create-order', orderCreateLimiter, validateBody(orderSchema), async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const input = req.body;
    let amount = input.amount;
    let notes: Record<string, string> = {};
    if ('packId' in input) {
      const error = subscriberError(input.operator, input.smartCardNumber);
      if (error) throw new PaymentError(400, error);
      const quote = calculatePayment(input, planModel.getAll());
      amount = quote.amountPaise;
      notes = { dth_operator: input.operator, dth_subscriber: input.smartCardNumber,
        dth_plan: quote.packName.slice(0, 256), dth_pack_id: input.packId.slice(0, 256),
        dth_validity: quote.validity.slice(0, 256), dth_app: 'dth-tamizhan' };
      if (input.customerName) notes.dth_customer_name = input.customerName;
      if (input.customerPhone) notes.dth_customer_phone = input.customerPhone;
    }
    if (!Number.isSafeInteger(amount) || amount < 100) throw new PaymentError(400, 'Minimum amount is 100 paise.');
    notes.dth_customer_uid = res.locals.customer.uid;
    const order = await razorpayClient().orders.create({ amount, currency: 'INR',
      receipt: input.receipt || randomUUID(), notes });
    res.json({ order_id: order.id, amount: Number(order.amount), currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID });
  } catch (error) { providerError(res, error); }
});

paymentsRouter.post('/api/verify-payment', orderCreateLimiter, validateBody(signatureSchema), async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const client = razorpayClient();
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
    if (!verifyPaymentSignature(orderId, paymentId, signature, process.env.RAZORPAY_KEY_SECRET!)) {
      throw new PaymentError(400, 'Payment signature mismatch.');
    }
    // Read the provider's order and payment; never accept client-supplied paid status.
    const [order, payment] = await Promise.all([client.orders.fetch(orderId), client.payments.fetch(paymentId)]);
    if ((order.notes as Record<string, string>)?.dth_customer_uid !== res.locals.customer.uid) {
      throw new PaymentError(403, 'This payment does not belong to your account.');
    }
    if (order.id !== orderId || payment.order_id !== order.id || Number(payment.amount) !== Number(order.amount) || payment.currency !== order.currency) {
      throw new PaymentError(400, 'Payment does not match the order.');
    }
    recordProviderPayment(payment, order);
    res.json({ success: true, verified: true, paid: payment.status === 'captured',
      status: payment.status, order_id: order.id, payment_id: payment.id,
      amount: Number(payment.amount), currency: payment.currency, created_at: payment.created_at,
      test_mode: process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_') === true });
  } catch (error) { providerError(res, error); }
});
