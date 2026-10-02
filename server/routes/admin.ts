import { Router, Request, Response } from 'express';
import { 
  MEMORY_CUSTOMERS, 
  MEMORY_RECHARGE_ORDERS, 
  MEMORY_ADMINS, 
  MEMORY_ADMIN_REQUESTS, 
  OPERATORS, 
  APPROVED_ADMIN_EMAILS,
  saveCustomersToDisk,
  saveAdminsToDisk,
  saveOrdersToDisk,
  refreshApprovedAdminEmails
} from '../store';
import { 
  verifyAuthToken, 
  isCallerAdminAuthorized, 
  getSuperAdminEmail, 
  isSuperAdmin 
} from '../middleware/auth';
import { adminLimiter } from '../middleware/rateLimiter';
import { 
  validateBody, 
  CreateCustomerSchema, 
  RequestAccessSchema, 
  ApproveUserSchema, 
  RevokeUserSchema, 
  ToggleOperatorSchema 
} from '../middleware/validation';
import { CustomerRecord } from '../../src/types';

export const adminRouter = Router();

// 1. Verify Token Endpoint
adminRouter.get('/api/admin/verify-token', async (req: Request, res: Response) => {
  const authCtx = await verifyAuthToken(req);
  if (!authCtx) {
    res.status(401).json({ success: false, error: 'Invalid or missing token', authenticated: false });
    return;
  }

  const superAdminEmail = getSuperAdminEmail();
  const callerEmail = authCtx.email || '';
  const isSuper = callerEmail === superAdminEmail;
  const isApproved = APPROVED_ADMIN_EMAILS.has(callerEmail) || isSuper;

  res.json({
    success: true,
    authenticated: true,
    uid: authCtx.uid,
    email: callerEmail,
    role: isSuper ? 'super_admin' : (isApproved ? 'admin' : 'customer'),
    isSuperAdmin: isSuper,
    isApprovedAdmin: isApproved,
  });
});

// 2. Customers List
adminRouter.get('/api/admin/customers', async (req: Request, res: Response) => {
  const adminCheck = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
  if (!adminCheck.authorized) {
    res.status(403).json({ success: false, error: 'Forbidden. Admin privileges required.' });
    return;
  }

  res.json({
    success: true,
    count: MEMORY_CUSTOMERS.length,
    customers: MEMORY_CUSTOMERS,
  });
});

// 3. Create Customer
adminRouter.post(
  '/api/admin/customers/create',
  adminLimiter,
  validateBody(CreateCustomerSchema),
  async (req: Request, res: Response) => {
    const adminCheck = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
    if (!adminCheck.authorized) {
      res.status(403).json({ success: false, error: 'Forbidden. Admin privileges required.' });
      return;
    }

    const {
      customerName,
      registeredMobile,
      smartCardNumber,
      operator,
      operatorName,
      activePackName,
      currentBalance,
      expiryDate,
      registeredCity,
      registeredPincode,
      planQuality
    } = req.body;

    const newCustomer: CustomerRecord = {
      id: `cust_${Date.now().toString().slice(-6)}`,
      customerName,
      registeredMobile,
      smartCardNumber,
      operator,
      operatorName,
      activePackName,
      currentBalance: Number(currentBalance),
      expiryDate,
      accountStatus: 'Active',
      registeredCity: registeredCity || 'Chennai, TN',
      registeredPincode: registeredPincode || '600001',
      planQuality: planQuality || 'HD',
      lastRechargeAmount: 299,
      lastRechargeDate: new Date().toISOString().slice(0, 10),
    };

    MEMORY_CUSTOMERS.unshift(newCustomer);
    saveCustomersToDisk();
    res.json({ success: true, customer: newCustomer });
  }
);

// 4. Delete Customer
adminRouter.post('/api/admin/customers/delete', adminLimiter, async (req: Request, res: Response) => {
  const adminCheck = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
  if (!adminCheck.authorized) {
    res.status(403).json({ success: false, error: 'Forbidden. Admin privileges required.' });
    return;
  }

  const { customerId } = req.body;
  const idx = MEMORY_CUSTOMERS.findIndex((c) => c.id === customerId);
  if (idx >= 0) {
    MEMORY_CUSTOMERS.splice(idx, 1);
    saveCustomersToDisk();
  }

  res.json({ success: true, deletedId: customerId });
});

// 5. Sync Customers from Firestore
adminRouter.post('/api/admin/customers/sync', async (req: Request, res: Response) => {
  const adminCheck = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
  if (!adminCheck.authorized) {
    res.status(403).json({ success: false, error: 'Forbidden. Admin privileges required.' });
    return;
  }

  const { customers } = req.body;
  if (Array.isArray(customers) && customers.length > 0) {
    MEMORY_CUSTOMERS.length = 0;
    MEMORY_CUSTOMERS.push(...customers);
    saveCustomersToDisk();
  }

  res.json({ success: true, count: MEMORY_CUSTOMERS.length });
});

// 6. Reports
adminRouter.get('/api/admin/reports', async (req: Request, res: Response) => {
  const adminCheck = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
  if (!adminCheck.authorized) {
    res.status(403).json({ success: false, error: 'Forbidden. Admin privileges required.' });
    return;
  }

  const totalRechargeVolume = MEMORY_RECHARGE_ORDERS.reduce((acc, o) => acc + (o.amount || 0), 0);
  const completedOrders = MEMORY_RECHARGE_ORDERS.filter((o) => o.rechargeStatus === 'completed').length;
  const pendingOrders = MEMORY_RECHARGE_ORDERS.filter((o) => o.rechargeStatus === 'pending' || o.rechargeStatus === 'processing').length;

  res.json({
    success: true,
    summary: {
      totalCustomers: MEMORY_CUSTOMERS.length,
      totalOrders: MEMORY_RECHARGE_ORDERS.length,
      completedOrders,
      pendingOrders,
      totalRechargeVolume,
    },
    orders: MEMORY_RECHARGE_ORDERS.slice(0, 50),
  });
});

// 7. Payments
adminRouter.get('/api/admin/payments', async (req: Request, res: Response) => {
  const adminCheck = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
  if (!adminCheck.authorized) {
    res.status(403).json({ success: false, error: 'Forbidden. Admin privileges required.' });
    return;
  }

  const payments = MEMORY_RECHARGE_ORDERS.map((o) => ({
    id: o.orderId,
    paymentMethod: o.paymentMethod,
    amount: o.amount,
    status: o.paymentStatus,
    operator: o.operator,
    customerName: o.customerName || 'Subscriber',
    createdAt: o.createdAt,
    operatorRefId: o.operatorRefId,
  }));

  res.json({
    success: true,
    count: payments.length,
    payments,
  });
});

// 8. Access List (Admin / Approvals)
adminRouter.get('/api/admin/access-list', async (req: Request, res: Response) => {
  const authCtx = await verifyAuthToken(req);
  if (!authCtx) {
    res.status(401).json({ success: false, error: 'Authentication required.' });
    return;
  }

  const callerEmail = authCtx.email || '';
  const isSuper = isSuperAdmin(callerEmail);
  const isApproved = APPROVED_ADMIN_EMAILS.has(callerEmail) || isSuper;

  if (isSuper) {
    res.json({
      success: true,
      superAdminEmail: getSuperAdminEmail(),
      admins: MEMORY_ADMINS,
      requests: MEMORY_ADMIN_REQUESTS,
    });
    return;
  }

  // Non super-admin view: returns caller status without exposing entire directory
  res.json({
    success: true,
    superAdminEmail: getSuperAdminEmail(),
    admins: MEMORY_ADMINS.filter((a) => a.email.toLowerCase() === callerEmail),
    requests: MEMORY_ADMIN_REQUESTS.filter((r) => r.userEmail.toLowerCase() === callerEmail),
    isApprovedAdmin: isApproved,
  });
});

// 9. Request Access
adminRouter.post(
  '/api/admin/request-access',
  adminLimiter,
  validateBody(RequestAccessSchema),
  async (req: Request, res: Response) => {
    const authCtx = await verifyAuthToken(req);
    if (!authCtx || !authCtx.email) {
      res.status(401).json({ success: false, error: 'Authentication required. Please sign in to request admin access.' });
      return;
    }

    const { reason, userPhone } = req.body;
    const existingReq = MEMORY_ADMIN_REQUESTS.find((r) => r.userEmail.toLowerCase() === authCtx.email!.toLowerCase() && r.status === 'pending');
    if (existingReq) {
      res.json({ success: true, message: 'Your request is already pending super administrator review.', request: existingReq });
      return;
    }

    const newReq = {
      id: `req_${Date.now().toString().slice(-6)}`,
      userId: authCtx.uid,
      userEmail: authCtx.email,
      userName: authCtx.email.split('@')[0],
      userPhone: userPhone || '',
      reason,
      status: 'pending' as const,
      requestedAt: new Date().toISOString(),
    };

    MEMORY_ADMIN_REQUESTS.unshift(newReq);
    res.json({ success: true, message: 'Access request submitted successfully.', request: newReq });
  }
);

// 10. Approve User (Super Admin only)
adminRouter.post(
  '/api/admin/approve-user',
  adminLimiter,
  validateBody(ApproveUserSchema),
  async (req: Request, res: Response) => {
    const authCtx = await verifyAuthToken(req);
    if (!authCtx || !isSuperAdmin(authCtx.email)) {
      res.status(403).json({ success: false, error: 'Forbidden. Only the Super Administrator can grant administrative privileges.' });
      return;
    }

    const { userEmail } = req.body;
    const cleanEmail = userEmail.trim().toLowerCase();

    const existingAdmin = MEMORY_ADMINS.find((a) => a.email.toLowerCase() === cleanEmail);
    if (existingAdmin) {
      existingAdmin.status = 'approved';
      existingAdmin.approvedBy = authCtx.email || 'Super Admin';
      existingAdmin.approvedAt = new Date().toISOString();
    } else {
      MEMORY_ADMINS.push({
        uid: `admin_${Date.now().toString().slice(-6)}`,
        email: cleanEmail,
        displayName: cleanEmail.split('@')[0],
        role: 'admin',
        status: 'approved',
        approvedBy: authCtx.email || 'Super Admin',
        approvedAt: new Date().toISOString(),
      });
    }

    const reqMatch = MEMORY_ADMIN_REQUESTS.find((r) => r.userEmail.toLowerCase() === cleanEmail);
    if (reqMatch) {
      reqMatch.status = 'approved';
      reqMatch.reviewedBy = authCtx.email || 'Super Admin';
      reqMatch.reviewedAt = new Date().toISOString();
    }

    refreshApprovedAdminEmails();
    saveAdminsToDisk();

    res.json({ success: true, message: `Administrator access granted to ${cleanEmail}.` });
  }
);

// 11. Revoke User (Super Admin only)
adminRouter.post(
  '/api/admin/revoke-user',
  adminLimiter,
  validateBody(RevokeUserSchema),
  async (req: Request, res: Response) => {
    const authCtx = await verifyAuthToken(req);
    if (!authCtx || !isSuperAdmin(authCtx.email)) {
      res.status(403).json({ success: false, error: 'Forbidden. Only the Super Administrator can revoke administrative privileges.' });
      return;
    }

    const { userEmail } = req.body;
    const cleanEmail = userEmail.trim().toLowerCase();

    if (cleanEmail === getSuperAdminEmail()) {
      res.status(400).json({ success: false, error: 'Root Super Administrator privileges cannot be revoked.' });
      return;
    }

    const existingAdmin = MEMORY_ADMINS.find((a) => a.email.toLowerCase() === cleanEmail);
    if (existingAdmin) {
      existingAdmin.status = 'revoked';
      existingAdmin.notes = `Revoked by ${authCtx.email} on ${new Date().toISOString()}`;
    }

    refreshApprovedAdminEmails();
    saveAdminsToDisk();

    res.json({ success: true, message: `Administrator privileges revoked for ${cleanEmail}.` });
  }
);

// 12. Sync Admins from Firestore
adminRouter.post('/api/admin/sync-admins', async (req: Request, res: Response) => {
  const adminCheck = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
  if (!adminCheck.authorized) {
    res.status(403).json({ success: false, error: 'Forbidden. Admin privileges required.' });
    return;
  }

  const { admins } = req.body;
  if (Array.isArray(admins) && admins.length > 0) {
    admins.forEach((adm: any) => {
      if (adm && adm.email) {
        const cleanEmail = String(adm.email).trim().toLowerCase();
        const existing = MEMORY_ADMINS.find((a) => a.email.toLowerCase() === cleanEmail);
        if (existing) {
          existing.status = adm.status === 'revoked' ? 'revoked' : 'approved';
        } else {
          MEMORY_ADMINS.push({
            uid: adm.uid || `admin_${Date.now().toString().slice(-6)}`,
            email: cleanEmail,
            displayName: adm.displayName || cleanEmail.split('@')[0],
            role: adm.role || 'admin',
            status: adm.status === 'revoked' ? 'revoked' : 'approved',
            approvedBy: adm.approvedBy || 'Firestore Sync',
            approvedAt: adm.approvedAt || new Date().toISOString(),
          });
        }
      }
    });
    refreshApprovedAdminEmails();
    saveAdminsToDisk();
  }

  res.json({ success: true, count: MEMORY_ADMINS.length });
});

// 13. Get Operators Status
adminRouter.get('/api/admin/operators', async (req: Request, res: Response) => {
  const adminCheck = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
  if (!adminCheck.authorized) {
    res.status(403).json({ success: false, error: 'Forbidden. Admin privileges required.' });
    return;
  }

  res.json({
    success: true,
    operators: OPERATORS,
  });
});

// 14. Toggle Operator Status
adminRouter.post(
  '/api/admin/operators/toggle',
  adminLimiter,
  validateBody(ToggleOperatorSchema),
  async (req: Request, res: Response) => {
    const adminCheck = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
    if (!adminCheck.authorized) {
      res.status(403).json({ success: false, error: 'Forbidden. Admin privileges required.' });
      return;
    }

    const { operatorId, isEnabled, condition, conditionLabel, maintenanceMessage, expectedRestoration } = req.body;
    const op = OPERATORS.find((o) => o.id === operatorId);
    if (!op) {
      res.status(404).json({ success: false, error: 'Operator not found.' });
      return;
    }

    op.isEnabled = isEnabled;
    op.condition = condition;
    op.conditionLabel = conditionLabel;
    op.maintenanceMessage = maintenanceMessage;
    op.expectedRestoration = expectedRestoration;
    op.updatedAt = new Date().toISOString();
    op.updatedBy = adminCheck.email || 'admin';

    res.json({ success: true, operator: op });
  }
);
