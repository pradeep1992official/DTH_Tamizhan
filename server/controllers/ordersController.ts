import { Request, Response } from 'express';
import {
  APPROVED_ADMIN_EMAILS,
} from '../models/store';
import { isCallerAdminAuthorized, verifyAuthToken } from '../middleware/auth';
import { getRechargeOrders, updatePaidRechargeStatus } from '../models/paidRechargeOrders';
import { syncCompletedRechargeConnection } from '../models/savedRechargeConnections';
import { UpdateOrderStatusSchema } from '../middleware/validation';
import { PaymentError } from '../payments';
import { parsePage, paymentPage } from '../models/paymentPages';
import { customerOrder } from '../models/customerHistory';

export const ordersController = {
  async list(req: Request, res: Response): Promise<void> {
    const authCtx = await verifyAuthToken(req);
    if (!authCtx) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. Please sign in to view orders.',
        orders: [],
      });
      return;
    }

    const adminCheck = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
    let page;
    try { page = parsePage(req.query); } catch { res.status(400).json({ success: false, error: 'Invalid orders page.' }); return; }
    try {
      const adminWide = adminCheck.authorized && (req.query.isWorker === 'true' || req.query.all === 'true');
      const result = await paymentPage(page, adminWide ? undefined : authCtx.uid);
      const orders = adminWide && req.query.isWorker === 'true' ? result.orders.filter(order => order.rechargeStatus !== 'completed') : result.orders;
      res.json({ success: true, count: orders.length, orders: adminWide ? orders : orders.map(customerOrder), nextCursor: result.nextCursor });
    } catch { res.status(503).json({ success: false, error: 'Unable to load recorded recharge payments.', orders: [] }); }
  },

  async listAdmin(req: Request, res: Response): Promise<void> {
    const adminCheck = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
    if (!adminCheck.authorized) {
      res.status(403).json({ success: false, error: 'Forbidden. Admin privileges required.' });
      return;
    }
    try {
      let page;
      try { page = parsePage(req.query); } catch { res.status(400).json({ success: false, error: 'Invalid orders page.' }); return; }
      const { orders, nextCursor } = await paymentPage(page);
      res.setHeader('Cache-Control', 'no-store');
      res.json({ success: true, count: orders.length, orders, nextCursor });
    } catch { res.status(503).json({ success: false, error: 'Unable to load recorded recharge payments.', orders: [] }); }
  },

  async updateStatus(req: Request, res: Response): Promise<void> {
    const adminCheck = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
    if (!adminCheck.authorized) {
      res.status(403).json({ success: false, error: 'Forbidden. Admin privileges required.' });
      return;
    }
    const parsed = UpdateOrderStatusSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ success: false, error: 'A valid order and recharge status are required.' }); return; }
    try {
      const order = await updatePaidRechargeStatus(parsed.data.orderId, parsed.data.rechargeStatus, parsed.data.workerNotes, parsed.data.operatorRefId);
      await syncCompletedRechargeConnection(order);
      res.json({ success: true, order });
    } catch (error) {
      res.status(error instanceof PaymentError ? error.status : 500).json({ success: false,
        error: error instanceof PaymentError ? error.message : 'Unable to save recharge status. Please retry.' });
    }
  },
};
