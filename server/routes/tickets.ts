import { Router } from 'express';
import { z } from 'zod';
import { verifyAuthToken, getAdminFirestore } from '../middleware/auth';
import { createTicket, customerTicket } from '../models/tickets';
import { ownedAssistantOrders } from '../models/assistantHistory';
import { queryRecords } from '../queries';
import { ticketSchema, type Ticket } from '../../src/lib/tickets';
import { parsePage } from '../models/paymentPages';

export const ticketsRouter = Router();
ticketsRouter.use('/api/tickets', async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  const account = await verifyAuthToken(req);
  if (!account) { res.status(401).json({ success: false, error: 'Please sign in to view or create tickets.' }); return; }
  res.locals.ticketUid = account.uid; next();
});
ticketsRouter.post('/api/tickets/support', async (req, res) => {
  try {
    const value = z.object({ name: z.string(), phone: z.string(), issueCategory: z.string(), description: z.string(), orderId: z.string().optional() }).strict().parse(req.body);
    const uid = res.locals.ticketUid;
    if (value.orderId && !(await ownedAssistantOrders(uid, 1, value.orderId)).length) { res.status(400).json({ success: false, error: 'Choose an order from your own account.' }); return; }
    const ticket = await createTicket(uid, { ...value, type: 'support' });
    res.status(201).json({ success: true, ticket: customerTicket(ticket) });
  } catch (error) { res.status(error instanceof z.ZodError ? 400 : 503).json({ success: false, error: error instanceof z.ZodError ? 'Check your phone, category and description (5 to 1000 characters).' : 'Your ticket could not be created. Please retry.' }); }
});
ticketsRouter.get('/api/tickets', async (req, res) => {
  try {
    const page = parsePage(req.query as Record<string, unknown>);
    const rows = await queryRecords<Ticket>('tickets', [{ field: 'uid', op: 'eq', value: res.locals.ticketUid }], { ...page, limit: page.limit + 1 });
    const visible = rows.slice(0, page.limit).filter(row => row.uid === res.locals.ticketUid).map(row => customerTicket(ticketSchema.parse(row)));
    const last = visible.at(-1);
    res.json({ success: true, tickets: visible, nextCursor: rows.length > page.limit && last ? Buffer.from(JSON.stringify({ time: last.createdAt, id: last.id })).toString('base64url') : null });
  } catch { res.status(503).json({ success: false, error: 'Your tickets could not be loaded. Please retry.' }); }
});
export const replySchema = z.object({ message: z.string().trim().min(1).max(1000) }).strict();
ticketsRouter.get('/api/tickets/:id/messages', async (req, res) => {
  try {
    if (!/^[\w-]{1,128}$/.test(req.params.id)) { res.sendStatus(404); return; }
    const snapshot = await getAdminFirestore().collection('tickets').doc(req.params.id).get();
    if (!snapshot.exists || snapshot.data()?.uid !== res.locals.ticketUid) { res.status(404).json({ success: false, error: 'Ticket not found.' }); return; }
    const messages = await queryRecords<{ id: string; message: string; author: string; createdAt: string }>(`tickets/${req.params.id}/messages`, [], { limit: 100 });
    res.json({ success: true, messages: messages.map(({ id, message, author, createdAt }) => ({ id, message, author, createdAt })).reverse() });
  } catch { res.status(503).json({ success: false, error: 'Replies could not be loaded. Please retry.' }); }
});
ticketsRouter.post('/api/tickets/:id/messages', async (req, res) => {
  try {
    const value = replySchema.parse(req.body);
    if (!/^[\w-]{1,128}$/.test(req.params.id)) { res.sendStatus(404); return; }
    const db = getAdminFirestore(); const ref = db.collection('tickets').doc(req.params.id);
    const messageRef = ref.collection('messages').doc();
    const added = await db.runTransaction(async tx => {
      const snapshot = await tx.get(ref); const ticket = snapshot.data();
      if (!ticket || ticket.uid !== res.locals.ticketUid || ['closed', 'resolved'].includes(ticket.status)) return false;
      tx.create(messageRef, { id: messageRef.id, message: value.message, author: 'customer', createdAt: new Date().toISOString() }); return true;
    });
    if (!added) { res.status(400).json({ success: false, error: 'This ticket is unavailable or closed.' }); return; }
    res.json({ success: true });
  } catch (error) { res.status(error instanceof z.ZodError ? 400 : 503).json({ success: false, error: 'Reply could not be added. Use 1 to 1000 characters and retry.' }); }
});
