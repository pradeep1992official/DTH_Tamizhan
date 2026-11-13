import { readLookupCustomers } from '../models/sharedStore';
import { Request, Response } from 'express';
import {
  APPROVED_ADMIN_EMAILS,
  OPERATORS,
} from '../models/store';
import { isCallerAdminAuthorized, verifyAuthToken } from '../middleware/auth';
import { SubscriberDetails } from '../../src/types';
import { getRechargeOrders, updatePaidRechargeStatus } from '../models/paidRechargeOrders';
import { syncCompletedRechargeConnection } from '../models/savedRechargeConnections';
import { UpdateOrderStatusSchema } from '../middleware/validation';
import { PaymentError } from '../payments';
import { parsePage, paymentPage } from '../models/paymentPages';

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
      res.json({ success: true, count: orders.length, orders, nextCursor: result.nextCursor });
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

  async verifySubscriber(req: Request, res: Response): Promise<void> {
    try {
      const { operator, smartCardNumber } = req.body;
      if (!operator || !smartCardNumber) {
        res.status(400).json({ success: false, error: 'Operator and smart card number are required.' });
        return;
      }

      const operatorConfig = OPERATORS.find((item) => item.id === operator);
      const existing = (await readLookupCustomers()).find((customer) =>
        customer.smartCardNumber === smartCardNumber && customer.operator === operator,
      );
      if (!existing) {
        res.status(404).json({ success: false, error: 'Subscriber not found. No provider lookup is configured.' });
        return;
      }
      if (typeof existing.currentBalance !== 'number' || typeof existing.expiryDate !== 'string') {
        res.status(503).json({ success: false, error: 'Subscriber account details are incomplete. No provider lookup is configured.' });
        return;
      }
      const subscriber: SubscriberDetails = {
        operator,
        operatorName: operatorConfig ? operatorConfig.name : operator,
        smartCardNumber,
        customerName: existing.customerName,
        registeredMobile: existing.registeredMobile,
        currentBalance: existing.currentBalance,
        packName: existing.activePackName,
        packMonthlyRent: existing.lastRechargeAmount || 0,
        expiryDate: existing.expiryDate,
        isExpired: false,
        accountStatus: existing?.accountStatus || 'Active',
      };
      res.json({ success: true, subscriber });
    } catch (error) {
      console.error('[API Error] /api/verify-subscriber failed:', error);
      res.status(500).json({ success: false, error: 'Internal lookup error' });
    }
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
      const order = await updatePaidRechargeStatus(parsed.data.orderId, parsed.data.rechargeStatus, parsed.data.workerNotes);
      await syncCompletedRechargeConnection(order);
      res.json({ success: true, order });
    } catch (error) {
      res.status(error instanceof PaymentError ? error.status : 500).json({ success: false,
        error: error instanceof PaymentError ? error.message : 'Unable to save recharge status. Please retry.' });
    }
  },
};
