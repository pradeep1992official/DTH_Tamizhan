import { Request, Response } from 'express';
import {
  APPROVED_ADMIN_EMAILS,
  MEMORY_CUSTOMERS,
  MEMORY_RECHARGE_ORDERS,
  OPERATORS,
} from '../models/store';
import { isCallerAdminAuthorized, verifyAuthToken } from '../middleware/auth';
import { SubscriberDetails } from '../../src/types';

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
    res.status(503).json({ success: false, error: 'Order changes require verified payment provenance. Payment verification is not configured.' });
  },
};
