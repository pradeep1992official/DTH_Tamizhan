import express, { Router } from 'express';
import { z } from 'zod';
import { verifyAuthToken } from '../middleware/auth';
import { prepareServiceRequest, verifyServiceCheckout, verifyServiceWebhook, confirmServicePayment, servicePaymentConfig } from '../models/servicePayments';
import { orderCreateLimiter } from '../middleware/rateLimiter';
import { reconcileServiceRefundWebhook } from '../models/serviceRefunds';
export const servicePaymentsRouter = Router();
servicePaymentsRouter.use('/api/service-requests', async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  const account = await verifyAuthToken(req);
  if (!account) { res.status(401).json({ success: false, error: 'Please sign in to continue.' }); return; }
  res.locals.uid = account.uid; next();
});
servicePaymentsRouter.post('/api/service-requests', orderCreateLimiter, async (req, res) => {
  try { res.json({ success: true, ...await prepareServiceRequest(res.locals.uid, req.body) }); }
  catch (error) { res.status(error instanceof z.ZodError ? 400 : 409).json({ success: false, error: 'Checkout could not be prepared. Check your details and My tickets for an existing request before retrying.' }); }
});
servicePaymentsRouter.post('/api/service-requests/verify', orderCreateLimiter, async (req, res) => {
  try { res.json({ success: true, ...await verifyServiceCheckout(res.locals.uid, req.body) }); }
  catch { res.status(400).json({ success: false, error: 'Payment is unconfirmed. Check My tickets or retry verification; do not pay again.' }); }
});
// Mounted before express.json: signature is over exact request bytes.
export const serviceWebhookRouter = Router();
serviceWebhookRouter.post('/api/webhooks/service-requests', express.raw({ type: 'application/json', limit: '256kb' }), async (req, res) => {
  if (!Buffer.isBuffer(req.body) || !verifyServiceWebhook(req.body, req.headers['x-razorpay-signature'])) { res.sendStatus(401); return; }
  try {
    const event = JSON.parse(req.body.toString('utf8'));
    if (['refund.processed', 'refund.failed'].includes(event.event) && event.payload?.refund?.entity?.id) await reconcileServiceRefundWebhook(event.payload.refund.entity.id);
    if (['payment.captured', 'order.paid'].includes(event.event)) {
      const payment = event.payload?.payment?.entity;
      let order = event.payload?.order?.entity;
      if (!order && payment?.order_id) order = await servicePaymentConfig().orders.fetch(payment.order_id);
      const ticketId = order?.notes?.ticketId || payment?.notes?.ticketId;
      // A dedicated service webhook ignores unrelated recharge events.
      if (ticketId && payment?.id) await confirmServicePayment(ticketId, payment.id);
    }
    res.json({ success: true });
  } catch { res.status(503).json({ success: false, error: 'Event could not be confirmed. Retry delivery.' }); }
});
