import { Router } from 'express';
import { z } from 'zod';
import { verifyAuthToken, getAdminFirestore } from '../middleware/auth';
import { customerTicket } from '../models/tickets';
import { queryRecords } from '../queries';
import { ticketSchema, stripTicketHtml, type Ticket } from '../../src/lib/tickets';
import { parsePage } from '../models/paymentPages';
import { ticketProtection, TicketRequestError, logTicketBlock } from '../middleware/ticketProtection';
import { createHelpTicket, upgradeHelpTicket, chooseCustomerCare } from '../models/help';
import { attachServiceCheckout, resumeServiceCheckout } from '../models/servicePayments';
import { withAiRequest } from '../utils/aiToolSecurity';
import { getAuth } from 'firebase-admin/auth';

export const ticketsRouter = Router();
ticketsRouter.use('/api/tickets', async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  const account = await verifyAuthToken(req);
  if (!account) { try { await logTicketBlock(null, 'unauthenticated', req.path); } catch {} res.status(401).json({ success: false, error: 'Please sign in to view or create tickets.' }); return; }
  res.locals.ticketUid = account.uid; next();
});
ticketsRouter.use('/api/tickets', ticketProtection);
ticketsRouter.post('/api/tickets/help', async (req, res) => {
  try {
    const uid = res.locals.ticketUid; const account = await getAuth().getUser(uid);
    const ticket = await withAiRequest(req, () => createHelpTicket(uid, req.body, account.displayName || 'Customer'));
    res.status(201).json({ success: true, ticket: customerTicket(ticket) });
  } catch (error) {
    try { await logTicketBlock(res.locals.ticketUid, error instanceof TicketRequestError ? error.message : 'help_create_failed', req.path); } catch {}
    res.status(error instanceof TicketRequestError ? error.status : 400).json({ success: false, error: error instanceof TicketRequestError ? error.message : 'Check your details and try again. Nothing has been charged.' });
  }
});
ticketsRouter.post('/api/tickets/:id/upgrade', async (req, res) => {
  try {
    if (!/^[\w-]{1,128}$/.test(req.params.id)) { res.sendStatus(404); return; }
    const ticket = await upgradeHelpTicket(res.locals.ticketUid, req.params.id, req.body);
    await attachServiceCheckout(res.locals.ticketUid, ticket);
    res.json({ success: true, ...await resumeServiceCheckout(res.locals.ticketUid, ticket.id) });
  } catch (error) { try { await logTicketBlock(res.locals.ticketUid, error instanceof TicketRequestError ? error.message : 'help_upgrade_failed', req.path); } catch {}
    res.status(error instanceof TicketRequestError ? error.status : 409).json({ success: false, error: error instanceof TicketRequestError ? error.message : 'Checkout could not be opened. Check My tickets before retrying.' }); }
});
ticketsRouter.post('/api/tickets/:id/call', async (req, res) => {
  try { if (!/^[\w-]{1,128}$/.test(req.params.id)) { res.sendStatus(404); return; }
    const { brand, fullAddress, pinCode } = z.object({ brand: z.string().max(50).optional(), fullAddress: z.string().max(500).optional(), pinCode: z.string().max(6).optional() }).strict().parse(req.body); res.json({ success: true, ticket: customerTicket(await chooseCustomerCare(res.locals.ticketUid, req.params.id, brand, fullAddress, pinCode)) });
  } catch { res.status(400).json({ success: false, error: 'Your ticket could not be updated. Please retry.' }); }
});
ticketsRouter.get('/api/tickets/:id', async (req, res) => {
  try { if (!/^[\w-]{1,128}$/.test(req.params.id)) { res.sendStatus(404); return; }
    const snapshot = await getAdminFirestore().collection('tickets').doc(req.params.id).get();
    if (!snapshot.exists || snapshot.data()?.uid !== res.locals.ticketUid) { res.sendStatus(404); return; }
    res.json({ success: true, ticket: customerTicket(ticketSchema.parse(snapshot.data())) });
  } catch { res.status(503).json({ success: false, error: 'Ticket could not be loaded.' }); }
});
ticketsRouter.post('/api/tickets/support', (_req, res) => { res.status(410).json({ success: false, error: 'Please use Get Help.' }); });
ticketsRouter.get('/api/tickets', async (req, res) => {
  try {
    const page = parsePage(req.query as Record<string, unknown>);
    const rows = await queryRecords<Ticket>('tickets', [{ field: 'uid', op: 'eq', value: res.locals.ticketUid }], { ...page, limit: page.limit + 1 });
    const visible = rows.slice(0, page.limit).filter(row => row.uid === res.locals.ticketUid).map(row => customerTicket(ticketSchema.parse(row)));
    const last = visible.at(-1);
    res.json({ success: true, tickets: visible, nextCursor: rows.length > page.limit && last ? Buffer.from(JSON.stringify({ time: last.createdAt, id: last.id })).toString('base64url') : null });
  } catch { res.status(503).json({ success: false, error: 'Your tickets could not be loaded. Please retry.' }); }
});
export const replySchema = z.object({ message: z.string().transform(stripTicketHtml).pipe(z.string().min(1).max(1000)) }).strict();
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
