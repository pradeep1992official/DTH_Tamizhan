import { forwardAsyncErrors } from '../asyncRoutes';
import { Router } from 'express';
import { verifyAuthToken } from '../middleware/auth';
import { customerHistory } from '../models/customerHistory';
import { receiptEmail } from '../receiptEmail';
import { receiptPdf } from '../receiptPdf';
import { customerPayment, ordersForPayments, parsePage, paymentPage } from '../models/paymentPages';

export const customerHistoryRouter = Router();
customerHistoryRouter.use('/api/my', async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const customer = await verifyAuthToken(req);
    if (!customer) { res.status(401).json({ success: false, error: 'Please sign in to view your history.' }); return; }
    res.locals.customerUid = customer.uid; next();
  } catch { res.status(401).json({ success: false, error: 'Please sign in again.' }); }
});
customerHistoryRouter.get('/api/my/history', async (req, res) => {
  let page;
  try { page = parsePage(req.query); } catch { res.status(400).json({ success: false, error: 'Invalid history page.' }); return; }
  try { const result = await paymentPage(page, res.locals.customerUid);
    res.json({ success: true, ...customerHistory(res.locals.customerUid, result.orders, result.payments), nextCursor: result.nextCursor }); }
  catch { res.status(503).json({ success: false, error: 'Your history could not be loaded. Please retry.' }); }
});
customerHistoryRouter.get('/api/my/payments/:paymentId/receipt', async (req, res) => {
  try {
    const payment = await customerPayment(res.locals.customerUid, String(req.params.paymentId));
    if (!payment) { res.status(404).json({ success: false, error: 'Payment not found.' }); return; }
    if (payment.status !== 'paid' || payment.providerStatus !== 'captured') { res.status(409).json({ success: false, error: 'A receipt is available after payment is captured.' }); return; }
    const order = (await ordersForPayments([payment])).find(item => item.orderId === payment.orderId && item.user_id === res.locals.customerUid && item.rechargeStatus === 'completed');
    const pdf = await receiptPdf(receiptEmail(payment, order ? 'recharge' : 'payment', order).pdfData);
    res.type('application/pdf').setHeader('Content-Disposition', `attachment; filename="DTH-Tamizhan-${payment.id.replace(/[^a-zA-Z0-9_-]/g, '')}.pdf"`);
    res.send(pdf);
  } catch { res.status(503).json({ success: false, error: 'Could not prepare your receipt. Please retry.' }); }
});

forwardAsyncErrors(customerHistoryRouter);
