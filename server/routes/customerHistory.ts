import { forwardAsyncErrors } from '../asyncRoutes';
import { Router } from 'express';
import { verifyAuthToken } from '../middleware/auth';
import { readPaymentLedger } from '../models/paymentLedger';
import { getRechargeOrders } from '../models/paidRechargeOrders';
import { customerHistory } from '../models/customerHistory';
import { receiptEmail } from '../receiptEmail';
import { receiptPdf } from '../receiptPdf';

export const customerHistoryRouter = Router();
customerHistoryRouter.use('/api/my', async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const customer = await verifyAuthToken(req);
    if (!customer) { res.status(401).json({ success: false, error: 'Please sign in to view your history.' }); return; }
    res.locals.customerUid = customer.uid; next();
  } catch { res.status(401).json({ success: false, error: 'Please sign in again.' }); }
});
customerHistoryRouter.get('/api/my/history', async (_req, res) => {
  try { res.json({ success: true, ...customerHistory(res.locals.customerUid, await getRechargeOrders(), await readPaymentLedger()) }); }
  catch { res.status(503).json({ success: false, error: 'Your history could not be loaded. Please retry.' }); }
});
customerHistoryRouter.get('/api/my/payments/:paymentId/receipt', async (req, res) => {
  try {
    const payment = (await readPaymentLedger()).find(item => item.id === req.params.paymentId && item.customerUid === res.locals.customerUid);
    if (!payment) { res.status(404).json({ success: false, error: 'Payment not found.' }); return; }
    if (payment.status !== 'paid' || payment.providerStatus !== 'captured') { res.status(409).json({ success: false, error: 'A receipt is available after payment is captured.' }); return; }
    const order = (await getRechargeOrders()).find(item => item.orderId === payment.orderId && item.user_id === res.locals.customerUid && item.rechargeStatus === 'completed');
    const pdf = await receiptPdf(receiptEmail(payment, order ? 'recharge' : 'payment', order).pdfData);
    res.type('application/pdf').setHeader('Content-Disposition', `attachment; filename="DTH-Tamizhan-${payment.id.replace(/[^a-zA-Z0-9_-]/g, '')}.pdf"`);
    res.send(pdf);
  } catch { res.status(503).json({ success: false, error: 'Could not prepare your receipt. Please retry.' }); }
});

forwardAsyncErrors(customerHistoryRouter);
