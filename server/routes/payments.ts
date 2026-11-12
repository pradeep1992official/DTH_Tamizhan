import { Router } from 'express';
import { z } from 'zod';
import { createPaymentService, paymentMode, PaymentError } from '../payments';
import { planModel } from '../models/planModel';
import { orderCreateLimiter } from '../middleware/rateLimiter';
import { validateBody } from '../middleware/validation';

export const paymentsRouter = Router();
const service = createPaymentService(() => planModel.getAll());
const prepareSchema = z.object({
  idempotencyKey: z.string().uuid(),
  packId: z.string().min(1),
  operator: z.enum(['sun_direct', 'tata_play', 'airtel_dth', 'dish_tv', 'd2h']),
  smartCardNumber: z.string().max(64),
  customAmount: z.number().optional(),
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
  res.json({ mode, provider: mode === 'sandbox' ? 'Local sandbox simulator' : null });
});
paymentsRouter.post('/api/payments/session', orderCreateLimiter, validateBody(prepareSchema), (req, res) => respond(res, () => service.prepare(req.body)));
paymentsRouter.post('/api/recharge/create', orderCreateLimiter, validateBody(completeSchema), (req, res) => respond(res, () => service.complete(req.body.sessionId, req.body.outcome)));
