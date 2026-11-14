import { Router } from 'express';
import { z } from 'zod';
import { verifyAuthToken, isCallerAdminAuthorized, getAdminFirestore } from '../middleware/auth';
import { queryRecords, type Filter } from '../queries';
import { parsePage } from '../models/paymentPages';
import { analyticsBounds } from '../models/adminAnalytics';
import { updateAdminTicket } from '../models/ticketAdmin';
import { replySchema } from './tickets';
import type { Ticket } from '../../src/lib/tickets';
import { refundServiceRequest } from '../models/serviceRefunds';
export const adminTicketsRouter = Router();
adminTicketsRouter.use('/api/admin/tickets', async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  try { const account = await verifyAuthToken(req); if (!account) { res.sendStatus(401); return; }
    if (!(await isCallerAdminAuthorized(req, new Set())).authorized) { res.sendStatus(403); return; }
    res.locals.uid = account.uid; next();
  } catch { res.status(503).json({ success: false, error: 'Administrator access could not be verified.' }); }
});
const listSchema = z.object({ type: z.enum(['support', 'service_request']), status: z.string().max(30).optional(), brand: z.string().max(50).optional(), from: z.string().optional(), to: z.string().optional(), searchBy: z.enum(['ticketNo', 'phone', 'subscriberId']).optional(), search: z.string().trim().max(128).optional(), cursor: z.string().optional(), limit: z.string().optional() }).strict();
adminTicketsRouter.get('/api/admin/tickets', async (req, res) => {
  try {
    const value = listSchema.parse(req.query); const page = parsePage({ limit: value.limit || '25', cursor: value.cursor });
    const filters: Filter[] = [{ field: 'type', op: 'eq', value: value.type }];
    if (value.status) filters.push({ field: 'status', op: 'eq', value: value.status });
    if (value.brand) filters.push({ field: 'brand', op: 'eq', value: value.brand });
    if (value.search && value.searchBy) filters.push({ field: value.searchBy, op: 'eq', value: value.search });
    if (value.from || value.to) { const range = analyticsBounds({ from: value.from || null, to: value.to! }); if (range.after) filters.push({ field: 'createdAt', op: 'gt', value: range.after }); filters.push({ field: 'createdAt', op: 'lte', value: range.through }); }
    const rows = await queryRecords<Ticket>('tickets', filters, { ...page, limit: page.limit + 1 }); const tickets = rows.slice(0, page.limit); const last = tickets.at(-1);
    res.json({ success: true, tickets, nextCursor: rows.length > page.limit && last ? Buffer.from(JSON.stringify({ time: last.createdAt, id: last.id })).toString('base64url') : null });
  } catch { res.status(400).json({ success: false, error: 'Tickets could not be loaded. Check the filters and retry.' }); }
});
adminTicketsRouter.get('/api/admin/tickets/blocked', async (_req, res) => {
  try { res.json({ success: true, attempts: await queryRecords('server_ticket_blocks', [], { limit: 100 }) }); }
  catch { res.status(503).json({ success: false, error: 'Blocked attempts could not be loaded.' }); }
});
adminTicketsRouter.get('/api/admin/tickets/:id', async (req, res) => {
  try {
    if (!/^[\w-]{1,128}$/.test(req.params.id)) { res.sendStatus(404); return; }
    const db = getAdminFirestore(); const snapshot = await db.collection('tickets').doc(req.params.id).get();
    if (!snapshot.exists) { res.sendStatus(404); return; }
    const privateSnapshot = await db.collection('server_ticket_private').doc(req.params.id).get();
    const messages = await queryRecords(`tickets/${req.params.id}/messages`, [], { limit: 100 });
    res.json({ success: true, ticket: { ...snapshot.data(), adminNotes: privateSnapshot.data()?.adminNotes || '' }, messages: messages.reverse(), refundNeedsAttention: privateSnapshot.data()?.refundNeedsAttention === true });
  } catch { res.status(503).json({ success: false, error: 'Ticket details could not be loaded.' }); }
});
adminTicketsRouter.post('/api/admin/tickets/:id', async (req, res) => {
  try {
    if (!/^[\w-]{1,128}$/.test(req.params.id)) { res.sendStatus(404); return; }
    res.json({ success: true, ticket: await updateAdminTicket(req.params.id, res.locals.uid, req.body) });
  } catch { res.status(400).json({ success: false, error: 'This change is unavailable. Placement requires a company reference before the 24-hour deadline. Refresh and check the status.' }); }
});
adminTicketsRouter.post('/api/admin/tickets/:id/reply', async (req, res) => {
  try {
    if (!/^[\w-]{1,128}$/.test(req.params.id)) { res.sendStatus(404); return; }
    const { message } = replySchema.parse(req.body); const db = getAdminFirestore(); const ref = db.collection('tickets').doc(req.params.id);
    const snapshot = await ref.get(); if (!snapshot.exists) { res.sendStatus(404); return; }
    const messageRef = ref.collection('messages').doc(); await messageRef.create({ id: messageRef.id, message, author: 'admin', createdAt: new Date().toISOString() }); res.json({ success: true });
  } catch { res.status(400).json({ success: false, error: 'Reply could not be posted. Check its length and retry.' }); }
});
adminTicketsRouter.post('/api/admin/tickets/:id/refund', async (req, res) => {
  try {
    if (!/^[\w-]{1,128}$/.test(req.params.id)) { res.sendStatus(404); return; }
    const { reason } = z.object({ reason: z.string().trim().min(5).max(200), confirmed: z.literal(true) }).strict().parse(req.body);
    await refundServiceRequest(req.params.id, reason, res.locals.uid);
    res.json({ success: true });
  } catch { res.status(409).json({ success: false, error: 'Refund could not be confirmed. Refresh this ticket; the same refund will be reconciled safely.' }); }
});
