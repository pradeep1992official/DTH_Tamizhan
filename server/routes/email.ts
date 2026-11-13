import { forwardAsyncErrors } from '../asyncRoutes';
import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { processReceiptEmails } from '../emailDelivery';

// Optional scheduler hook for hosts that pause background work between requests.
export const emailRouter = Router();
emailRouter.post('/api/internal/email/process', async (req, res) => {
  const secret = process.env.EMAIL_WORKER_TOKEN;
  const supplied = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '';
  if (!secret || secret.length < 32) { res.status(404).json({ success: false }); return; }
  const expected = Buffer.from(secret); const received = Buffer.from(supplied);
  if (received.length !== expected.length || !timingSafeEqual(expected, received)) { res.status(401).json({ success: false }); return; }
  res.setHeader('Cache-Control', 'no-store');
  try { await processReceiptEmails(); res.json({ success: true }); }
  catch { res.status(503).json({ success: false, error: 'Email outbox processing failed.' }); }
});

forwardAsyncErrors(emailRouter);
