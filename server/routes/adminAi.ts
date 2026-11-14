import { Router, type Response } from 'express';
import { verifyAuthToken, isCallerAdminAuthorized } from '../middleware/auth';
import { allowAiRequest } from '../middleware/aiRateLimiter';
import { forwardAsyncErrors } from '../asyncRoutes';
import { pendingRechargeArgs, queryMessageSchema, ticketSummaryRequest, replyDraftRequest, replyApprovalSchema, ticketIdSchema } from '../../src/lib/adminAi';
import { openSupportTickets, supportTicket, ticketView } from '../models/adminAiData';
import { adminNaturalQuery, summarizeAdminTickets, draftAdminReply } from '../utils/adminAiModel';
import { executeAdminTool, InvalidAdminTool } from '../utils/adminAiTools';
export const adminAiRouter = Router();
adminAiRouter.use(async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const account = await verifyAuthToken(req);
    if (!account) { res.status(401).json({ success: false, error: 'Please sign in.' }); return; }
    const verdict = await isCallerAdminAuthorized(req, new Set());
    if (!verdict.authorized) { res.status(403).json({ success: false, error: 'Administrator access required.' }); return; }
    res.locals.adminAiUid = account.uid;
    if (!await allowAiRequest(account.uid, res)) return;
    next();
  } catch { res.status(503).json({ success: false, error: 'Administrator access could not be verified.' }); }
});
function unavailable(res: Response, error: unknown) {
  res.status(error instanceof InvalidAdminTool ? 502 : 503).json({ success: false,
    error: error instanceof InvalidAdminTool ? 'The AI returned an unsupported query. Use a status and date range.' : 'AI or ticket data is unavailable. Please retry. No reply has been sent.' });
}
adminAiRouter.get('/tickets', async (_req, res) => {
  try { const tickets = await openSupportTickets('all', 20); res.json({ success: true, tickets, limited: tickets.length === 20 }); }
  catch (error) { unavailable(res, error); }
});
adminAiRouter.post('/pending', async (req, res) => {
  const parsed = pendingRechargeArgs.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ success: false, error: 'Invalid pending-recharge page.' }); return; }
  try { res.json({ success: true, result: await executeAdminTool('list_pending_recharges', parsed.data) }); }
  catch (error) { unavailable(res, error); }
});
adminAiRouter.post('/query', async (req, res) => {
  const parsed = queryMessageSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ success: false, error: 'Enter a query of at most 500 characters.' }); return; }
  try { res.json({ success: true, ...await adminNaturalQuery(res.locals.adminAiUid, parsed.data.message) }); }
  catch (error) { unavailable(res, error); }
});
adminAiRouter.post('/summarize', async (req, res) => {
  const parsed = ticketSummaryRequest.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ success: false, error: 'Choose 1 to 20 tickets.' }); return; }
  try { const tickets = await openSupportTickets('all', parsed.data.limit);
    res.json({ success: true, tickets, analysis: await summarizeAdminTickets(res.locals.adminAiUid, tickets), limited: tickets.length === parsed.data.limit }); }
  catch (error) { unavailable(res, error); }
});
adminAiRouter.post('/tickets/:id/draft', async (req, res) => {
  const id = ticketIdSchema.safeParse(req.params.id); const parsed = replyDraftRequest.safeParse(req.body);
  if (!id.success || !parsed.success) { res.status(400).json({ success: false, error: 'Invalid ticket or draft instruction.' }); return; }
  try { const ticket = await supportTicket(id.data);
    if (!ticket) { res.status(404).json({ success: false, error: 'Ticket not found.' }); return; }
    if (ticket.status !== 'open') { res.status(409).json({ success: false, error: 'This ticket is no longer open.' }); return; }
    res.json({ success: true, draft: await draftAdminReply(res.locals.adminAiUid, ticketView(ticket), parsed.data.instruction) });
  } catch (error) { unavailable(res, error); }
});
adminAiRouter.post('/tickets/:id/approve', async (req, res) => {
  const id = ticketIdSchema.safeParse(req.params.id); const parsed = replyApprovalSchema.safeParse(req.body);
  if (!id.success || !parsed.success) { res.status(400).json({ success: false, error: 'Review the reply and explicitly approve it.' }); return; }
  try { const ticket = await supportTicket(id.data);
    if (!ticket) { res.status(404).json({ success: false, error: 'Ticket not found.' }); return; }
    if (ticket.status !== 'open') { res.status(409).json({ success: false, error: 'This ticket is no longer open.' }); return; }
    // Recipient comes only from the trusted imported ticket, never from model/client.
    const recipient = encodeURIComponent(ticket.replyEmail).replace(/%40/g, '@');
    const emailUrl = `mailto:${recipient}?subject=${encodeURIComponent(parsed.data.subject)}&body=${encodeURIComponent(parsed.data.body)}`;
    res.json({ success: true, emailUrl, recipient: ticket.replyEmail, delivery: 'email_app_required' });
  } catch (error) { unavailable(res, error); }
});
forwardAsyncErrors(adminAiRouter);
