import { Request, Response } from 'express';
import {
  APPROVED_ADMIN_EMAILS,
  MEMORY_ADMINS,
  MEMORY_ADMIN_REQUESTS,
  MEMORY_CUSTOMERS,
  MEMORY_RECHARGE_ORDERS,
  OPERATORS,
  refreshApprovedAdminEmails,
  saveAdminsToDisk,
  saveCustomersToDisk,
  saveOperatorSettingsToDisk,
} from '../models/store';
import {
  getSuperAdminEmail,
  isCallerAdminAuthorized,
  isSuperAdmin,
  verifyAuthToken,
} from '../middleware/auth';
import { CustomerRecord } from '../../src/types';

function forbidden(res: Response): void {
  res.status(403).json({ success: false, error: 'Forbidden. Admin privileges required.' });
}

export const adminController = {
  async verifyToken(req: Request, res: Response): Promise<void> {
    const auth = await verifyAuthToken(req);
    if (!auth) {
      res.status(401).json({ success: false, error: 'Invalid or missing token', authenticated: false });
      return;
    }
    const superAdminEmail = getSuperAdminEmail();
    const callerEmail = auth.email || '';
    const isSuper = callerEmail === superAdminEmail;
    const isApproved = APPROVED_ADMIN_EMAILS.has(callerEmail) || isSuper;
    res.json({
      success: true,
      authenticated: true,
      uid: auth.uid,
      email: callerEmail,
      role: isSuper ? 'super_admin' : (isApproved ? 'admin' : 'customer'),
      isSuperAdmin: isSuper,
      isApprovedAdmin: isApproved,
    });
  },

  async listCustomers(req: Request, res: Response): Promise<void> {
    const auth = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
    if (!auth.authorized) return forbidden(res);
    res.json({ success: true, count: MEMORY_CUSTOMERS.length, customers: MEMORY_CUSTOMERS });
  },

  async createCustomer(req: Request, res: Response): Promise<void> {
    const auth = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
    if (!auth.authorized) return forbidden(res);
    const {
      customerName, registeredMobile, smartCardNumber, operator, operatorName, activePackName,
      currentBalance, expiryDate, registeredCity, registeredPincode, planQuality,
    } = req.body;
    const customer: CustomerRecord = {
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
    MEMORY_CUSTOMERS.unshift(customer);
    saveCustomersToDisk();
    res.json({ success: true, customer });
  },

  async deleteCustomer(req: Request, res: Response): Promise<void> {
    const auth = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
    if (!auth.authorized) return forbidden(res);
    const { customerId } = req.body;
    const index = MEMORY_CUSTOMERS.findIndex((customer) => customer.id === customerId);
    if (index >= 0) {
      MEMORY_CUSTOMERS.splice(index, 1);
      saveCustomersToDisk();
    }
    res.json({ success: true, deletedId: customerId });
  },

  async syncCustomers(req: Request, res: Response): Promise<void> {
    const auth = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
    if (!auth.authorized) return forbidden(res);
    const { customers } = req.body;
    if (Array.isArray(customers) && customers.length > 0) {
      MEMORY_CUSTOMERS.length = 0;
      MEMORY_CUSTOMERS.push(...customers);
      saveCustomersToDisk();
    }
    res.json({ success: true, count: MEMORY_CUSTOMERS.length });
  },

  async reports(req: Request, res: Response): Promise<void> {
    const auth = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
    if (!auth.authorized) return forbidden(res);
    const totalRechargeVolume = MEMORY_RECHARGE_ORDERS.reduce((sum, order) => sum + (order.amount || 0), 0);
    const completedOrders = MEMORY_RECHARGE_ORDERS.filter((order) => order.rechargeStatus === 'completed').length;
    const pendingOrders = MEMORY_RECHARGE_ORDERS.filter((order) =>
      order.rechargeStatus === 'pending' || order.rechargeStatus === 'processing',
    ).length;
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
  },

  async payments(req: Request, res: Response): Promise<void> {
    const auth = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
    if (!auth.authorized) return forbidden(res);
    const payments = MEMORY_RECHARGE_ORDERS.map((order) => ({
      id: order.orderId,
      paymentMethod: order.paymentMethod,
      amount: order.amount,
      status: order.paymentStatus,
      operator: order.operator,
      customerName: order.customerName || 'Subscriber',
      createdAt: order.createdAt,
      operatorRefId: order.operatorRefId,
    }));
    res.json({ success: true, count: payments.length, payments });
  },

  async accessList(req: Request, res: Response): Promise<void> {
    const auth = await verifyAuthToken(req);
    if (!auth) {
      res.status(401).json({ success: false, error: 'Authentication required.' });
      return;
    }
    const callerEmail = auth.email || '';
    const superAdmin = isSuperAdmin(callerEmail);
    const approved = APPROVED_ADMIN_EMAILS.has(callerEmail) || superAdmin;
    if (superAdmin) {
      res.json({
        success: true,
        superAdminEmail: getSuperAdminEmail(),
        admins: MEMORY_ADMINS,
        requests: MEMORY_ADMIN_REQUESTS,
      });
      return;
    }
    res.json({
      success: true,
      superAdminEmail: getSuperAdminEmail(),
      admins: MEMORY_ADMINS.filter((admin) => admin.email.toLowerCase() === callerEmail),
      requests: MEMORY_ADMIN_REQUESTS.filter((request) => request.userEmail.toLowerCase() === callerEmail),
      isApprovedAdmin: approved,
    });
  },

  async requestAccess(req: Request, res: Response): Promise<void> {
    const auth = await verifyAuthToken(req);
    if (!auth?.email) {
      res.status(401).json({ success: false, error: 'Authentication required. Please sign in to request admin access.' });
      return;
    }
    const { reason, userPhone } = req.body;
    const existing = MEMORY_ADMIN_REQUESTS.find((request) =>
      request.userEmail.toLowerCase() === auth.email!.toLowerCase() && request.status === 'pending',
    );
    if (existing) {
      res.json({ success: true, message: 'Your request is already pending super administrator review.', request: existing });
      return;
    }
    const request = {
      id: `req_${Date.now().toString().slice(-6)}`,
      userId: auth.uid,
      userEmail: auth.email,
      userName: auth.email.split('@')[0],
      userPhone: userPhone || '',
      reason,
      status: 'pending' as const,
      requestedAt: new Date().toISOString(),
    };
    MEMORY_ADMIN_REQUESTS.unshift(request);
    res.json({ success: true, message: 'Access request submitted successfully.', request });
  },

  async approveUser(req: Request, res: Response): Promise<void> {
    const auth = await verifyAuthToken(req);
    if (!auth || !isSuperAdmin(auth.email)) {
      res.status(403).json({ success: false, error: 'Forbidden. Only the Super Administrator can grant administrative privileges.' });
      return;
    }
    const cleanEmail = req.body.userEmail.trim().toLowerCase();
    const existing = MEMORY_ADMINS.find((admin) => admin.email.toLowerCase() === cleanEmail);
    if (existing) {
      existing.status = 'approved';
      existing.approvedBy = auth.email || 'Super Admin';
      existing.approvedAt = new Date().toISOString();
    } else {
      MEMORY_ADMINS.push({
        uid: `admin_${Date.now().toString().slice(-6)}`,
        email: cleanEmail,
        displayName: cleanEmail.split('@')[0],
        role: 'admin',
        status: 'approved',
        approvedBy: auth.email || 'Super Admin',
        approvedAt: new Date().toISOString(),
      });
    }
    const request = MEMORY_ADMIN_REQUESTS.find((item) => item.userEmail.toLowerCase() === cleanEmail);
    if (request) {
      request.status = 'approved';
      request.reviewedBy = auth.email || 'Super Admin';
      request.reviewedAt = new Date().toISOString();
    }
    refreshApprovedAdminEmails();
    saveAdminsToDisk();
    res.json({ success: true, message: `Administrator access granted to ${cleanEmail}.` });
  },

  async revokeUser(req: Request, res: Response): Promise<void> {
    const auth = await verifyAuthToken(req);
    if (!auth || !isSuperAdmin(auth.email)) {
      res.status(403).json({ success: false, error: 'Forbidden. Only the Super Administrator can revoke administrative privileges.' });
      return;
    }
    const cleanEmail = req.body.userEmail.trim().toLowerCase();
    if (cleanEmail === getSuperAdminEmail()) {
      res.status(400).json({ success: false, error: 'Root Super Administrator privileges cannot be revoked.' });
      return;
    }
    const admin = MEMORY_ADMINS.find((item) => item.email.toLowerCase() === cleanEmail);
    if (admin) {
      admin.status = 'revoked';
      admin.notes = `Revoked by ${auth.email} on ${new Date().toISOString()}`;
    }
    refreshApprovedAdminEmails();
    saveAdminsToDisk();
    res.json({ success: true, message: `Administrator privileges revoked for ${cleanEmail}.` });
  },

  async syncAdmins(req: Request, res: Response): Promise<void> {
    const auth = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
    if (!auth.authorized) return forbidden(res);
    const { admins } = req.body;
    if (Array.isArray(admins) && admins.length > 0) {
      admins.forEach((admin: any) => {
        if (!admin?.email) return;
        const email = String(admin.email).trim().toLowerCase();
        const existing = MEMORY_ADMINS.find((item) => item.email.toLowerCase() === email);
        const status = admin.status === 'revoked' ? 'revoked' : 'approved';
        if (existing) existing.status = status;
        else {
          MEMORY_ADMINS.push({
            uid: admin.uid || `admin_${Date.now().toString().slice(-6)}`,
            email,
            displayName: admin.displayName || email.split('@')[0],
            role: admin.role || 'admin',
            status,
            approvedBy: admin.approvedBy || 'Firestore Sync',
            approvedAt: admin.approvedAt || new Date().toISOString(),
          });
        }
      });
      refreshApprovedAdminEmails();
      saveAdminsToDisk();
    }
    res.json({ success: true, count: MEMORY_ADMINS.length });
  },

  async operators(req: Request, res: Response): Promise<void> {
    const auth = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
    if (!auth.authorized) return forbidden(res);
    res.json({ success: true, operators: OPERATORS });
  },

  async toggleOperator(req: Request, res: Response): Promise<void> {
    const auth = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
    if (!auth.authorized) return forbidden(res);
    const { operatorId, isEnabled, condition, conditionLabel, maintenanceMessage, expectedRestoration } = req.body;
    const operator = OPERATORS.find((item) => item.id === operatorId);
    if (!operator) {
      res.status(404).json({ success: false, error: 'Operator not found.' });
      return;
    }
    const previousState = { ...operator };
    operator.isEnabled = isEnabled;
    operator.condition = isEnabled ? undefined : condition || 'custom';
    operator.conditionLabel = isEnabled ? undefined : conditionLabel || maintenanceMessage;
    operator.disableReason = operator.conditionLabel;
    operator.maintenanceMessage = isEnabled ? undefined : maintenanceMessage || conditionLabel;
    operator.expectedRestoration = isEnabled ? undefined : expectedRestoration;
    operator.updatedAt = new Date().toISOString();
    operator.updatedBy = auth.email || 'admin';

    try {
      saveOperatorSettingsToDisk();
      res.json({ success: true, operator });
    } catch (error) {
      Object.assign(operator, previousState);
      console.error('[Admin] Failed to persist operator settings:', error);
      res.status(500).json({ success: false, error: 'Unable to save operator settings.' });
    }
  },
};
