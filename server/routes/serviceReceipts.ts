import { Router } from 'express';
import { z } from 'zod';
import { getAdminFirestore, verifyAuthToken, isCallerAdminAuthorized } from '../middleware/auth';
import { downloadServiceReceipt } from '../models/serviceReceipts';
import { analyticsBounds } from '../models/adminAnalytics';
import { queryRecords } from '../queries';
import type { Ticket } from '../../src/lib/tickets';
export const serviceReceiptsRouter = Router();
serviceReceiptsRouter.get('/api/tickets/:id/receipt', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const account = await verifyAuthToken(req);
    if (!account) { res.sendStatus(401); return; }
    if (!/^[\w-]{1,128}$/.test(req.params.id)) { res.sendStatus(404); return; }
    const snapshot = await getAdminFirestore().collection('tickets').doc(req.params.id).get();
    if (!snapshot.exists || (snapshot.data()?.uid !== account.uid && !(await isCallerAdminAuthorized(req, new Set())).authorized)) { res.sendStatus(404); return; }
    const { pdf } = await downloadServiceReceipt(req.params.id);
    res.type('pdf').setHeader('Content-Disposition', `attachment; filename="DTH-${req.params.id}.pdf"`); res.send(pdf);
  } catch { res.status(503).json({ success: false, error: 'Your receipt is not ready. Please retry shortly.' }); }
});
const dates = z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), csv: z.enum(['true']).optional() }).strict();
export function receiptCsv(tickets: Ticket[]) {
  const escape = (value: unknown) => `"${String(value ?? '').replace(/^[=+@-]/, char => "'" + char).replace(/"/g, '""')}"`;
  return [['Receipt no', 'Date', 'Ticket no', 'Brand', 'Amount INR', 'Payment id', 'Status'], ...tickets.map(ticket => [ticket.receipt.number, ticket.payment.paidAt, ticket.ticketNo, ticket.brand, ticket.payment.amount, ticket.payment.paymentId, ticket.payment.status])].map(row => row.map(escape).join(',')).join('\r\n');
}
serviceReceiptsRouter.get('/api/admin/service-receipts', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (!await verifyAuthToken(req)) { res.sendStatus(401); return; }
    if (!(await isCallerAdminAuthorized(req, new Set())).authorized) { res.sendStatus(403); return; }
    const parameters = dates.parse(req.query); const range = analyticsBounds({ from: parameters.from, to: parameters.to });
    const rows = await queryRecords<Ticket>('tickets', [{ field: 'type', op: 'eq', value: 'service_request' }, { field: 'payment.paidAt', op: 'gt', value: range.after }, { field: 'payment.paidAt', op: 'lte', value: range.through }], { limit: 501 });
    if (rows.length > 500) { res.status(400).json({ success: false, error: 'Choose a smaller date range (maximum 500 receipts).' }); return; }
    const tickets = rows.filter(ticket => ticket.receipt.number);
    if (parameters.csv) { res.type('csv').setHeader('Content-Disposition', 'attachment; filename="service-receipts.csv"'); res.send(receiptCsv(tickets)); return; }
    res.json({ success: true, receipts: tickets.map(ticket => ({ id: ticket.id, ticketNo: ticket.ticketNo, number: ticket.receipt.number, paidAt: ticket.payment.paidAt, brand: ticket.brand, amount: ticket.payment.amount, status: ticket.payment.status })) });
  } catch { res.status(400).json({ success: false, error: 'Receipts could not be loaded. Check the date range and retry.' }); }
});
