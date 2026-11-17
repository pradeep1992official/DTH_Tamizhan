import { rechargeGuard } from './rechargeFeature';
import { Router, raw } from 'express';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { calculatePayment, paymentMode, PaymentError } from './payments';
import { subscriberError } from '../src/lib/subscriberValidation';
import { customerPayment } from './models/paymentPages';
import { mutateYoupiPayment } from './models/paymentLedger';
import type { PaymentLedgerEntry } from './models/paymentLedger';
import { orderCreateLimiter } from './middleware/rateLimiter';
import { validateBody } from './middleware/validation';
import type { planModel } from './models/planModel';

export function youpiGatewayConfig() {
  const { YOUPI_API_URL, YOUPI_CHECKOUT_URL, YOUPI_MERCHANT_ID, YOUPI_MERCHANT_API_KEY, APP_URL } = process.env;
  if (!YOUPI_API_URL || !YOUPI_CHECKOUT_URL || !YOUPI_MERCHANT_ID || !YOUPI_MERCHANT_API_KEY || !APP_URL) throw new PaymentError(503, 'YouPI checkout is not configured. No payment has been taken.');
  for (const value of [YOUPI_API_URL, YOUPI_CHECKOUT_URL, APP_URL]) {
    const url = new URL(value);
    if (url.username || url.password || (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new PaymentError(503, 'Invalid YouPI URL configuration.');
  }
  return { api: YOUPI_API_URL.replace(/\/$/, ''), checkout: new URL(YOUPI_CHECKOUT_URL), merchant: YOUPI_MERCHANT_ID, key: YOUPI_MERCHANT_API_KEY, returnUrl: APP_URL };
}
export async function youpiGatewayRequest(path: string, body?: unknown) {
  const c = youpiGatewayConfig();
  const response = await fetch(`${c.api}/api/v1/${path}`, { method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json', 'X-Merchant-Id': c.merchant, 'X-Merchant-Key': c.key }, ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (error.code === 'OBSERVERS_UNHEALTHY') throw new PaymentError(503, 'UPI checkout is temporarily unavailable because the merchant payment observer is offline. Please contact support or try again after it reconnects.');
    throw new PaymentError(502, 'YouPI is unavailable. Check the existing payment before retrying.');
  }
  return response.json();
}
const config = youpiGatewayConfig;
const gateway = youpiGatewayRequest;
export async function refreshYoupiPayment(entry: PaymentLedgerEntry) {
  const data = await gateway(`payments/${encodeURIComponent(entry.orderId)}`);
  if (data.paymentId !== entry.orderId || data.orderId !== entry.id || data.currency !== 'INR' || Number(data.amountPaise) !== Math.round(entry.amount * 100) || data.method !== 'UPI') throw new PaymentError(502, 'YouPI payment details do not match this order.');
  // Merchant policy: accept server-fetched observer matches; browser callbacks never approve payment.
  const accepted = data.status === 'OBSERVED_SUCCESS' ||
    (data.status === 'RECONCILED' && data.settlementState === 'RECONCILED');
  // Hosted checkout contact belongs to the payment's gateway customer, not necessarily the sign-in profile.
  let customerPhone: string | undefined;
  let customerName: string | undefined;
  try {
    const details = await gateway(`payments/${encodeURIComponent(entry.orderId)}/cod`);
    if (details.paymentId === entry.orderId && details.orderId === entry.id && details.currency === 'INR' &&
      Number(details.amountPaise) === Math.round(entry.amount * 100) && details.method === 'UPI') {
      const phone = typeof details.customer?.mobileNumber === 'string' ? details.customer.mobileNumber.replace(/[\s()-]/g, '') : '';
      if (/^(?:\+?91)?[6-9]\d{9}$/.test(phone)) customerPhone = phone;
      if (typeof details.customer?.name === 'string' && details.customer.name.trim()) customerName = details.customer.name.trim().slice(0, 100);
    }
  } catch { /* Contact lookup must not discard an otherwise verified payment. Retry on the next status check. */ }
  return mutateYoupiPayment(entry.id, previous => {
    if (!previous || previous.provider !== 'YouPI') throw new PaymentError(404, 'Payment not found.');
    const contact = { ...(customerPhone ? { customerPhone } : {}), ...(customerName ? { customerName } : {}) };
    if (previous.status === 'paid') return { ...previous, ...contact };
    return { ...previous, ...contact, status: accepted ? 'paid' : 'initiated', providerStatus: accepted ? 'captured' : String(data.status), youpiOutcome: String(data.status) };
  });
}
function failure(res: import('express').Response, error: unknown) {
  res.status(error instanceof PaymentError ? error.status : 503).json({ error: error instanceof PaymentError ? error.message : 'Unable to check YouPI payment. Do not pay again until the existing payment is checked.' });
}
export function registerYoupiRoutes(router: Router, schema: z.ZodObject<any>, checkOperator: (id: string) => Promise<void>, plans: (id: string) => ReturnType<typeof planModel.getAll>) {
  router.post('/api/payments/youpi', rechargeGuard, orderCreateLimiter, validateBody(schema), async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      if (paymentMode() !== 'youpi') throw new PaymentError(409, 'YouPI checkout is not enabled.');
      const c = config(); const input = req.body; const uid = res.locals.customer.uid;
      const error = subscriberError(input.operator, input.smartCardNumber); if (error) throw new PaymentError(400, error);
      await checkOperator(input.operator);
      const quote = calculatePayment(input, await plans(input.packId));
      const id = `youpi_${createHash('sha256').update(`${uid}:${input.idempotencyKey}`).digest('hex')}`;
      let entry = await mutateYoupiPayment(id, previous => {
        if (previous) {
          if (previous.customerUid !== uid || previous.amount !== quote.amountPaise / 100 || previous.operator !== input.operator || previous.smartCardNumber !== input.smartCardNumber || previous.packId !== input.packId) throw new PaymentError(409, 'Checkout key already used for another payment.');
          return previous;
        }
        return { id, orderId: '', provider: 'YouPI', paymentMethod: 'upi', amount: quote.amountPaise / 100, currency: 'INR', status: 'initiated', providerStatus: 'INITIATED', operator: input.operator, smartCardNumber: input.smartCardNumber, packName: quote.packName, packId: input.packId, packValidity: quote.validity, customerUid: uid, customerName: input.customerName || 'Subscriber', customerPhone: input.customerPhone || '', createdAt: new Date().toISOString(), testMode: false, operatorRefId: '' };
      });
      if (!entry.checkoutUrl) {
        const data = await gateway('payments', { orderId: id, amount: (quote.amountPaise / 100).toFixed(2), currency: 'INR', method: 'UPI', idempotencyKey: id, returnUrl: c.returnUrl });
        const url = new URL(data.checkoutUrl);
        if (url.origin !== c.checkout.origin || url.username || url.password || !data.paymentId || data.orderId !== id || Number(data.amount) !== entry.amount) throw new PaymentError(502, 'Invalid YouPI checkout response.');
        entry = await mutateYoupiPayment(id, previous => ({ ...previous!, orderId: data.paymentId, checkoutUrl: url.href }));
      }
      res.json({ id: entry.id, checkoutUrl: entry.checkoutUrl, amountPaise: Math.round(entry.amount * 100), status: entry.status });
    } catch (error) { failure(res, error); }
  });
  router.post('/api/payments/youpi/status', orderCreateLimiter, validateBody(z.object({ id: z.string().regex(/^youpi_[a-f0-9]{64}$/) })), async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const entry = await customerPayment(res.locals.customer.uid, req.body.id);
      if (!entry || entry.provider !== 'YouPI' || !entry.orderId) throw new PaymentError(404, 'Payment not found.');
      const updated = await refreshYoupiPayment(entry);
      res.json({ status: updated.status, providerStatus: updated.providerStatus });
    } catch (error) { failure(res, error); }
  });
}

// Raw bytes must be captured before the application's JSON parser.
export const youpiWebhookRouter = Router();
youpiWebhookRouter.post('/api/payments/youpi/webhook', raw({ type: 'application/json', limit: '64kb' }), async (req, res) => {
  try {
    const secret = process.env.YOUPI_WEBHOOK_SECRET;
    if (!secret) throw new PaymentError(503, 'YouPI webhook is not configured.');
    const signature = String(req.headers['x-gateway-signature'] || '').replace(/^sha256=/, '');
    if (!Buffer.isBuffer(req.body) || !/^[a-f0-9]{64}$/i.test(signature) || !timingSafeEqual(Buffer.from(signature, 'hex'), createHmac('sha256', secret).update(req.body).digest())) throw new PaymentError(400, 'Invalid signature.');
    const event = JSON.parse(req.body.toString('utf8'));
    if (typeof event.orderId === 'string' && /^nc_[a-f0-9]{48}$/.test(event.orderId)) {
      const { handleNewConnectionYoupiCallback } = await import('./models/newConnectionOrders');
      await handleNewConnectionYoupiCallback(req.body, req.headers); res.json({ received: true }); return;
    }
    if (typeof event.orderId !== 'string' || !/^youpi_[a-f0-9]{64}$/.test(event.orderId)) throw new PaymentError(400, 'Invalid order.');
    // Fetch authoritative session through our own merchant credentials; do not trust event outcomes.
    const { readPaymentLedger } = await import('./models/paymentLedger');
    const entry = (await readPaymentLedger()).find(item => item.id === event.orderId && item.provider === 'YouPI');
    if (!entry || entry.orderId !== event.paymentId) throw new PaymentError(404, 'Payment not found.');
    await refreshYoupiPayment(entry); res.json({ received: true });
  } catch (error) { failure(res, error); }
});
