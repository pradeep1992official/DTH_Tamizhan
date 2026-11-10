import { Request, Response } from 'express';
import {
  APPROVED_ADMIN_EMAILS,
  MEMORY_CUSTOMERS,
  MEMORY_RECHARGE_ORDERS,
  OPERATORS,
  saveOrdersToDisk,
} from '../models/store';
import { isCallerAdminAuthorized, verifyAuthToken } from '../middleware/auth';
import { RechargeOrder, SubscriberDetails } from '../../src/types';

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
    const adminCheck = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
    if (adminCheck.authorized && req.query.isWorker === 'true') {
      const orders = MEMORY_RECHARGE_ORDERS.filter((order) => order.rechargeStatus !== 'completed');
      res.json({ success: true, count: orders.length, orders });
      return;
    }
    if (adminCheck.authorized && req.query.all === 'true') {
      res.json({
        success: true,
        count: MEMORY_RECHARGE_ORDERS.length,
        orders: MEMORY_RECHARGE_ORDERS,
      });
      return;
    }

    const orders = MEMORY_RECHARGE_ORDERS.filter((order) =>
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
    res.json({
      success: true,
      count: MEMORY_RECHARGE_ORDERS.length,
      orders: MEMORY_RECHARGE_ORDERS,
    });
  },

  async create(req: Request, res: Response): Promise<void> {
    try {
      const {
        user_id, operator, operatorName, smartCardNumber, customerName, registeredMobile,
        amount, packId, packName, packValidity, paymentMethod, signalRefreshRequested,
      } = req.body;
      const orderId = `ORD-TN-${Date.now().toString().slice(-6)}`;
      const operatorRefId = `${operator.toUpperCase().slice(0, 3)}-TXN-${Math.floor(100000 + Math.random() * 900000)}`;
      const order: RechargeOrder = {
        orderId,
        user_id,
        operator,
        operatorName,
        smartCardNumber,
        customerName: customerName || 'Valued Subscriber',
        registeredMobile: registeredMobile || '9840000000',
        amount,
        packId,
        packName,
        packValidity,
        paymentMethod,
        paymentStatus: 'paid',
        rechargeStatus: 'completed',
        operatorRefId,
        workerNotes: 'Auto-credited via Gateway',
        signalRefreshRequested: signalRefreshRequested || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      MEMORY_RECHARGE_ORDERS.unshift(order);
      saveOrdersToDisk();
      res.json({ success: true, message: 'Recharge order processed and credited successfully.', order });
    } catch (error) {
      console.error('[API Error] /api/recharge/create failed:', error);
      res.status(500).json({ success: false, error: 'Internal server error processing recharge.' });
    }
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
      const subscriber: SubscriberDetails = {
        operator,
        operatorName: operatorConfig ? operatorConfig.name : operator,
        smartCardNumber,
        customerName: existing ? existing.customerName : 'K. Subramanian',
        registeredMobile: existing ? existing.registeredMobile : '9840123456',
        currentBalance: existing ? existing.currentBalance : 145.50,
        packName: existing ? existing.activePackName : 'Tamil Super Pack',
        packMonthlyRent: existing ? (existing.lastRechargeAmount || 219) : 219,
        expiryDate: existing ? existing.expiryDate : new Date(Date.now() + 86400000 * 12).toISOString().slice(0, 10),
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
    const { orderId, rechargeStatus, workerNotes } = req.body;
    const order = MEMORY_RECHARGE_ORDERS.find((item) => item.orderId === orderId);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found.' });
      return;
    }
    order.rechargeStatus = rechargeStatus;
    if (workerNotes !== undefined) order.workerNotes = workerNotes;
    order.updatedAt = new Date().toISOString();
    saveOrdersToDisk();
    res.json({ success: true, order });
  },

  async sync(req: Request, res: Response): Promise<void> {
    const adminCheck = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
    if (!adminCheck.authorized) {
      res.status(403).json({ success: false, error: 'Forbidden. Admin privileges required.' });
      return;
    }
    const { orders } = req.body;
    if (Array.isArray(orders)) {
      MEMORY_RECHARGE_ORDERS.length = 0;
      MEMORY_RECHARGE_ORDERS.push(...orders);
      saveOrdersToDisk();
    }
    res.json({ success: true, count: MEMORY_RECHARGE_ORDERS.length });
  },
};
