import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { expireUnpaidServiceRequests } from '../models/serviceSchedule';
export const ticketScheduleRouter = Router();
ticketScheduleRouter.post('/api/internal/tickets/run', async (req, res) => {
  const secret = process.env.TICKET_SCHEDULER_SECRET;
  const supplied = req.headers.authorization?.replace(/^Bearer /, '') || '';
  if (!secret || Buffer.byteLength(secret) !== Buffer.byteLength(supplied) || !timingSafeEqual(Buffer.from(secret), Buffer.from(supplied))) { res.sendStatus(401); return; }
  try { res.json({ success: true, expired: await expireUnpaidServiceRequests() }); }
  catch { res.status(503).json({ success: false, error: 'Ticket maintenance failed. Retry the scheduled job.' }); }
});
