import { Request, Response } from 'express';
import {
  APPROVED_ADMIN_EMAILS,
  MEMORY_CUSTOMERS,
  MEMORY_RECHARGE_ORDERS,
  OPERATORS,
} from '../models/store';
import { isCallerAdminAuthorized, verifyAuthToken } from '../middleware/auth';
import { SubscriberDetails } from '../../src/types';
import { getRechargeOrders, updatePaidRechargeStatus } from '../models/paidRechargeOrders';
import { UpdateOrderStatusSchema } from '../middleware/validation';
import { PaymentError } from '../payments';

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

    const callerEmail = authCtx.email || '';
    let allOrders;
    try { allOrders = getRechargeOrders(); }
    catch { res.status(503).json({ success: false, error: 'Unable to load recorded recharge payments.', orders: [] }); return; }
    const adminCheck = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
    if (adminCheck.authorized && req.query.isWorker === 'true') {
      const orders = allOrders.filter((order) => order.rechargeStatus !== 'completed');
      res.json({ success: true, count: orders.length, orders });
      return;
    }
    if (adminCheck.authorized && req.query.all === 'true') {
      res.json({
        success: true,
        count: allOrders.length,
        orders: allOrders,
      });
      return;
    }

    const orders = allOrders.filter((order) =>
      order.user_id === authCtx.uid || (callerEmail && order.registeredMobile === callerEmail),
    );
    res.json({ success: true, count: orders.length, orders });
  },

  async listAdmin(req: Request, res: Response): Promise<void> {
    const adminCheck = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
    if (!adminCheck.authorized) {
      res.status(403).json({ success: false, error: 'Forbidden. Admin privileges required.' });
      return;
    }
    try {
      const orders = getRechargeOrders();
      res.setHeader('Cache-Control', 'no-store');
      res.json({ success: true, count: orders.length, orders });
    } catch { res.status(503).json({ success: false, error: 'Unable to load recorded recharge payments.', orders: [] }); }
  },

  verifySubscriber(req: Request, res: Response): void {
    try {
      const { operator, smartCardNumber } = req.body;
      if (!operator || !smartCardNumber) {
        res.status(400).json({ success: false, error: 'Operator and smart card number are required.' });
        return;
      }

      const operatorConfig = OPERATORS.find((item) => item.id === operator);
      const existing = MEMORY_CUSTOMERS.find((customer) =>
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
      const order = updatePaidRechargeStatus(parsed.data.orderId, parsed.data.rechargeStatus, parsed.data.workerNotes);
      res.json({ success: true, order });
    } catch (error) {
      res.status(error instanceof PaymentError ? error.status : 500).json({ success: false,
        error: error instanceof PaymentError ? error.message : 'Unable to save recharge status. Please retry.' });
    }
  },
};
