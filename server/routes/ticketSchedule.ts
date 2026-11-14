import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { expireUnpaidServiceRequests } from '../models/serviceSchedule';
import { queryRecords } from '../queries';
import { ensureServiceReceipt } from '../models/serviceReceipts';
import { processTicketNotifications } from '../models/ticketNotifications';
import { processOverdueServiceRefunds } from '../models/serviceRefunds';
export const ticketScheduleRouter = Router();
ticketScheduleRouter.post('/api/internal/tickets/run', async (req, res) => {
  const secret = process.env.TICKET_SCHEDULER_SECRET;
  const supplied = req.headers.authorization?.replace(/^Bearer /, '') || '';
  if (!secret || Buffer.byteLength(secret) !== Buffer.byteLength(supplied) || !timingSafeEqual(Buffer.from(secret), Buffer.from(supplied))) { res.sendStatus(401); return; }
  try {
    const expired = await expireUnpaidServiceRequests();
    const waiting = await queryRecords<{ id: string }>('tickets', [{ field: 'payment.status', op: 'eq', value: 'paid' }, { field: 'receipt.generatedAt', op: 'eq', value: null }], { limit: 50 });
    let receipts = 0;
    for (const ticket of waiting) { try { await ensureServiceReceipt(ticket.id); receipts++; } catch { /* Retained for next scheduled retry. */ } }
    res.json({ success: true, expired, receipts, refunds: await processOverdueServiceRefunds(), emails: await processTicketNotifications() });
  }
  catch { res.status(503).json({ success: false, error: 'Ticket maintenance failed. Retry the scheduled job.' }); }
});
