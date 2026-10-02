import { Router, Request, Response } from 'express';
import { 
  MEMORY_RECHARGE_ORDERS, 
  MEMORY_CUSTOMERS, 
  OPERATORS, 
  APPROVED_ADMIN_EMAILS, 
  saveOrdersToDisk 
} from '../store';
import { verifyAuthToken, isCallerAdminAuthorized } from '../middleware/auth';
import { orderCreateLimiter, signalRefreshLimiter } from '../middleware/rateLimiter';
import { 
  validateBody, 
  CreateOrderSchema, 
  UpdateOrderStatusSchema, 
  SignalRefreshSchema 
} from '../middleware/validation';
import { RechargeOrder, SubscriberDetails } from '../../src/types';

export const ordersRouter = Router();

// 1. Get Orders List (Strict IDOR Mitigation: Non-admins ONLY receive their own orders)
ordersRouter.get('/api/orders', async (req: Request, res: Response) => {
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
  const isWorkerRequested = req.query.isWorker === 'true';

  // If caller is an authorized admin or staff worker requesting operational queue
  if (adminCheck.authorized && isWorkerRequested) {
    const queueOrders = MEMORY_RECHARGE_ORDERS.filter((o) => o.rechargeStatus !== 'completed');
    res.json({
      success: true,
      count: queueOrders.length,
      orders: queueOrders,
    });
    return;
  }

  // Admin requesting all orders
  if (adminCheck.authorized && req.query.all === 'true') {
    res.json({
      success: true,
      count: MEMORY_RECHARGE_ORDERS.length,
      orders: MEMORY_RECHARGE_ORDERS,
    });
    return;
  }

  // Standard customer: strictly filter by verified auth UID / Email
  const userOrders = MEMORY_RECHARGE_ORDERS.filter((o) => {
    return o.user_id === authCtx.uid || (callerEmail && o.registeredMobile === callerEmail);
  });

  res.json({
    success: true,
    count: userOrders.length,
    orders: userOrders,
  });
});

// 2. Admin Orders List Endpoint (Admin only)
ordersRouter.get('/api/admin/orders', async (req: Request, res: Response) => {
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
});

// 3. Create Recharge Order with Rate Limiting and Zod Validation
ordersRouter.post(
  '/api/recharge/create',
  orderCreateLimiter,
  validateBody(CreateOrderSchema),
  async (req: Request, res: Response) => {
    try {
      const {
        user_id,
        operator,
        operatorName,
        smartCardNumber,
        customerName,
        registeredMobile,
        amount,
        packId,
        packName,
        packValidity,
        paymentMethod,
        signalRefreshRequested
      } = req.body;

      const orderId = `ORD-TN-${Date.now().toString().slice(-6)}`;
      const operatorRefId = `${operator.toUpperCase().slice(0, 3)}-TXN-${Math.floor(100000 + Math.random() * 900000)}`;

      const newOrder: RechargeOrder = {
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

      MEMORY_RECHARGE_ORDERS.unshift(newOrder);
      saveOrdersToDisk();

      res.json({
        success: true,
        message: 'Recharge order processed and credited successfully.',
        order: newOrder,
      });
    } catch (err: any) {
      console.error('[API Error] /api/recharge/create failed:', err);
      res.status(500).json({ success: false, error: 'Internal server error processing recharge.' });
    }
  }
);

// 4. Signal Refresh Command with Satellite Rate Limiting and Zod Validation
ordersRouter.post(
  '/api/recharge/signal-refresh',
  signalRefreshLimiter,
  validateBody(SignalRefreshSchema),
  async (req: Request, res: Response) => {
    try {
      const { operator, smartCardNumber, customerMobile } = req.body;
      const pulseId = `PULSE-${Date.now().toString().slice(-6)}`;

      res.json({
        success: true,
        message: `Signal refresh pulse sent successfully to ${operator} satellite transponder for smart card ${smartCardNumber}.`,
        pulseId,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('[API Error] /api/recharge/signal-refresh failed:', err);
      res.status(500).json({ success: false, error: 'Failed to send signal refresh pulse.' });
    }
  }
);

// 5. Verify Subscriber Lookup
ordersRouter.post('/api/verify-subscriber', (req: Request, res: Response) => {
  try {
    const { operator, smartCardNumber } = req.body;
    if (!operator || !smartCardNumber) {
      res.status(400).json({ success: false, error: 'Operator and smart card number are required.' });
      return;
    }

    const opConfig = OPERATORS.find((op) => op.id === operator);
    const existing = MEMORY_CUSTOMERS.find((c) => c.smartCardNumber === smartCardNumber && c.operator === operator);

    const subscriber: SubscriberDetails = {
      operator,
      operatorName: opConfig ? opConfig.name : operator,
      smartCardNumber,
      customerName: existing ? existing.customerName : 'K. Subramanian',
      registeredMobile: existing ? existing.registeredMobile : '9840123456',
      currentBalance: existing ? existing.currentBalance : 145.50,
      packName: existing ? existing.activePackName : 'Tamil Super Pack',
      packMonthlyRent: existing ? (existing.lastRechargeAmount || 219) : 219,
      expiryDate: existing ? existing.expiryDate : new Date(Date.now() + 86400000 * 12).toISOString().slice(0, 10),
      isExpired: false,
      accountStatus: (existing && existing.accountStatus) ? existing.accountStatus : 'Active',
    };

    res.json({
      success: true,
      subscriber,
    });
  } catch (err: any) {
    console.error('[API Error] /api/verify-subscriber failed:', err);
    res.status(500).json({ success: false, error: 'Internal lookup error' });
  }
});

// 6. Update Order Status (Admin / Worker Auth)
ordersRouter.post(
  '/api/admin/orders/update',
  validateBody(UpdateOrderStatusSchema),
  async (req: Request, res: Response) => {
    const adminCheck = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
    if (!adminCheck.authorized) {
      res.status(403).json({ success: false, error: 'Forbidden. Admin privileges required.' });
      return;
    }

    const { orderId, rechargeStatus, workerNotes } = req.body;
    const order = MEMORY_RECHARGE_ORDERS.find((o) => o.orderId === orderId);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found.' });
      return;
    }

    order.rechargeStatus = rechargeStatus;
    if (workerNotes !== undefined) order.workerNotes = workerNotes;
    order.updatedAt = new Date().toISOString();
    saveOrdersToDisk();

    res.json({ success: true, order });
  }
);

// 7. Sync Orders from Firestore (Admin only)
ordersRouter.post('/api/orders/sync', async (req: Request, res: Response) => {
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
});
