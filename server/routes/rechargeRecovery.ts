import express, { Router } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { reconcileRechargePayment, recoverRechargeOrder, reconcilePendingRecharges } from '../models/rechargeRecovery';

export function validRechargeWebhook(body: Buffer, signature: unknown, secret = process.env.RAZORPAY_RECHARGE_WEBHOOK_SECRET): boolean {
  if (!secret || typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}
export const rechargeWebhookRouter = Router();
// Must be mounted before express.json(): the signature covers the exact bytes.
rechargeWebhookRouter.post('/api/webhooks/recharges', express.raw({ type: 'application/json', limit: '256kb' }), async (req, res) => {
  if (!Buffer.isBuffer(req.body) || !validRechargeWebhook(req.body, req.headers['x-razorpay-signature'])) { res.sendStatus(401); return; }
  let event;
  try { event = JSON.parse(req.body.toString('utf8')); } catch { res.sendStatus(400); return; }
  try {
    if (!['payment.captured', 'order.paid'].includes(event.event)) { res.json({ success: true, ignored: true }); return; }
    const payment = event.payload?.payment?.entity;
    const order = event.payload?.order?.entity;
    const orderId = order?.id || payment?.order_id;
    if (typeof orderId !== 'string' || !/^order_[a-zA-Z0-9]+$/.test(orderId)) { res.sendStatus(400); return; }
    // Provider-side order metadata decides whether this event belongs to recharge.
    if (payment?.id && /^pay_[a-zA-Z0-9]+$/.test(payment.id) && (order?.notes?.dth_app === 'dth-tamizhan' || payment?.notes?.dth_app === 'dth-tamizhan')) {
      await reconcileRechargePayment(payment.id, orderId);
    } else await recoverRechargeOrder(orderId);
    res.json({ success: true });
  } catch { res.status(503).json({ success: false, error: 'Recharge payment confirmation is pending. Retry webhook delivery.' }); }
});
export const rechargeScheduleRouter = Router();
rechargeScheduleRouter.post('/api/internal/recharges/reconcile', async (req, res) => {
  const secret = process.env.RECHARGE_SCHEDULER_SECRET;
  const supplied = req.headers.authorization?.replace(/^Bearer /, '') || '';
  if (!secret || Buffer.byteLength(secret) !== Buffer.byteLength(supplied) || !timingSafeEqual(Buffer.from(secret), Buffer.from(supplied))) { res.sendStatus(401); return; }
  try { res.json({ success: true, ...await reconcilePendingRecharges() }); }
  catch { res.status(503).json({ success: false, error: 'Recharge reconciliation remains pending. Retry the scheduled job.' }); }
});
