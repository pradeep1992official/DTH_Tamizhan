import { getAuth } from 'firebase-admin/auth';
import { customersFromPaidRecharges } from '../../src/lib/rechargeCustomers';
import { getRechargeOrders } from '../models/paidRechargeOrders';
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
  getAdminFirestore,
  getSuperAdminEmail,
  isCallerAdminAuthorized,
  isSuperAdmin,
  verifyAuthToken,
} from '../middleware/auth';
import { CustomerRecord } from '../../src/types';
import { readPaymentLedger, recordProviderPayment } from '../models/paymentLedger';
import { razorpayClient } from '../razorpay';

function forbidden(res: Response): void {
  res.status(403).json({ success: false, error: 'Forbidden. Admin privileges required.' });
}

export const adminController = {
  async auditLogs(req: Request, res: Response): Promise<void> {
    const verdict = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
    if (!verdict.authorized) return forbidden(res);
    try {
      const records = await getAdminFirestore().collection('plan_audit_logs').orderBy('updated_at', 'desc').limit(20).get();
      res.json({ success: true, logs: records.docs.map(record => ({ ...record.data(), id: record.id })) });
    } catch { res.status(503).json({ success: false, error: 'Unable to load audit logs.' }); }
  },
  async verifyToken(req: Request, res: Response): Promise<void> {
    const auth = await verifyAuthToken(req);
    if (!auth) {
      res.status(401).json({ success: false, error: 'Invalid or missing token', authenticated: false });
      return;
    }
    const superAdminEmail = getSuperAdminEmail();
    const callerEmail = auth.email || '';
    const verdict = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
    const isSuper = verdict.isSuperAdmin;
    const isApproved = verdict.authorized;
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
    try {
      const customers = customersFromPaidRecharges(getRechargeOrders());
      // Older payments can recover contact details from their bound account.
      const profiles = new Map<string, Promise<{ name?: string; phone?: string }>>();
      for (const customer of customers) {
        const uid = customer.customerUid;
        if (!uid || uid === 'legacy-unassigned' || (customer.customerName !== 'Subscriber' && customer.registeredMobile)) continue;
        if (!profiles.has(uid)) profiles.set(uid, (async () => {
          const [profile, account] = await Promise.all([
            getAdminFirestore().collection('users').doc(uid).get().then(doc => doc.data()).catch(() => undefined),
            Promise.resolve().then(() => getAuth().getUser(uid)).catch(() => undefined),
          ]);
          const name = profile?.displayName || account?.displayName;
          const phone = profile?.phoneNumber || account?.phoneNumber;
          return { name: typeof name === 'string' ? name.slice(0, 100) : undefined,
            phone: typeof phone === 'string' ? phone.slice(0, 20) : undefined };
        })());
      }
      await Promise.all(customers.map(async customer => {
        const profile = customer.customerUid ? await profiles.get(customer.customerUid) : undefined;
        if (profile?.name && customer.customerName === 'Subscriber') customer.customerName = profile.name;
        if (profile?.phone && !customer.registeredMobile) customer.registeredMobile = profile.phone;
      }));
      res.setHeader('Cache-Control', 'no-store');
      res.json({ success: true, count: customers.length, customers });
    } catch { res.status(503).json({ success: false, error: 'Unable to load customers from recorded payments.' }); }
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
    const legacyPayments = MEMORY_RECHARGE_ORDERS.map((order) => ({
      id: order.orderId,
      paymentMethod: order.paymentMethod,
      amount: order.amount,
      status: order.paymentStatus,
      operator: order.operator,
      customerName: order.customerName || 'Subscriber',
      createdAt: order.createdAt,
      operatorRefId: order.operatorRefId,
    }));
    try {
      const ledger = readPaymentLedger();
      const ids = new Set(ledger.map(entry => entry.id));
      const payments = [...ledger, ...legacyPayments.filter(entry => !ids.has(entry.id))]
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      res.setHeader('Cache-Control', 'no-store');
      res.json({ success: true, count: payments.length, payments });
    } catch { res.status(503).json({ success: false, error: 'Unable to read recorded payments.' }); }
  },

  async syncPayments(req: Request, res: Response): Promise<void> {
    const verdict = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
    if (!verdict.authorized) return forbidden(res);
    if (!verdict.isSuperAdmin) return forbidden(res);
    try {
      const client = razorpayClient();
      const result = await client.payments.all({ count: 100 });
      let imported = 0;
      for (const payment of result.items) {
        if (!payment.order_id) continue;
        const order = await client.orders.fetch(payment.order_id);
        recordProviderPayment(payment, order);
        imported++;
      }
      res.json({ success: true, imported, message: `Synced ${imported} of the latest 100 Razorpay payments for the configured account and key mode.` });
    } catch { res.status(503).json({ success: false, error: 'Unable to sync Razorpay payments. Check provider credentials and retry. Previously imported records are retained.' }); }
  },

  async accessList(req: Request, res: Response): Promise<void> {
    const auth = await verifyAuthToken(req);
    if (!auth) {
      res.status(401).json({ success: false, error: 'Authentication required.' });
      return;
    }
    const verdict = await isCallerAdminAuthorized(req, APPROVED_ADMIN_EMAILS);
    if (!verdict.authorized) return forbidden(res);
    try {
      const records = await getAdminFirestore().collection('admins').get();
      const listedAdmins = records.docs.map(record => ({ ...record.data(), uid: record.id } as any))
        .filter(record => record.status === 'approved' && (verdict.isSuperAdmin || record.uid === auth.uid));
      // Legacy root-email documents are duplicate directory entries, not extra
      // root identities. Prefer the verified caller's canonical UID record.
      const rootEntries = listedAdmins.filter(record => isSuperAdmin(record.email));
      const rootEntry = rootEntries.find(record => record.uid === auth.uid) || rootEntries[0];
      const admins = listedAdmins.filter(record => !isSuperAdmin(record.email) || record === rootEntry);
      res.json({ success: true, admins, requests: verdict.isSuperAdmin ? MEMORY_ADMIN_REQUESTS : [], isApprovedAdmin: true });
    } catch { res.status(503).json({ success: false, error: 'Administrator registry unavailable.' }); }
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
    if (!auth || !auth.emailVerified || !isSuperAdmin(auth.email)) {
      res.status(403).json({ success: false, error: 'Forbidden. Only the Super Administrator can grant administrative privileges.' });
      return;
    }
    const cleanEmail = req.body.userEmail.trim().toLowerCase();
    let target;
    try {
      target = await getAuth().getUserByEmail(cleanEmail);
    } catch (error: any) {
      if (error?.code === 'auth/user-not-found') {
        res.status(404).json({ success: false, code: 'ADMIN_ACCOUNT_NOT_REGISTERED', error: 'This email has not registered with this app. Ask the person to sign in with Google once, then grant access again.' }); return;
      }
      res.status(503).json({ success: false, code: 'ADMIN_AUTH_UNAVAILABLE', error: 'Unable to look up the Firebase account. Check the server Firebase credentials and Authentication permissions, then retry.' }); return;
    }
    const targetUid = target.uid;
    try {
      await getAdminFirestore().collection('admins').doc(targetUid).set({ uid: targetUid, email: cleanEmail,
        displayName: req.body.name || target.displayName || cleanEmail, role: 'admin', status: 'approved',
        approvedBy: auth.email, approvedAt: new Date().toISOString() }, { merge: true });
    } catch { res.status(503).json({ success: false, code: 'ADMIN_REGISTRY_UNAVAILABLE', error: 'Unable to save administrator access. Check the server Firestore permissions, then retry.' }); return; }
    const existing = MEMORY_ADMINS.find((admin) => admin.email.toLowerCase() === cleanEmail);
    if (existing) {
      existing.status = 'approved';
      if (req.body.name) existing.displayName = req.body.name;
      existing.approvedBy = auth.email || 'Super Admin';
      existing.approvedAt = new Date().toISOString();
    } else {
      MEMORY_ADMINS.push({
        uid: targetUid,
        email: cleanEmail,
        displayName: req.body.name || cleanEmail.split('@')[0],
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
    if (!auth || !auth.emailVerified || !isSuperAdmin(auth.email)) {
      res.status(403).json({ success: false, error: 'Forbidden. Only the Super Administrator can revoke administrative privileges.' });
      return;
    }
    const cleanEmail = req.body.userEmail.trim().toLowerCase();
    if (cleanEmail === getSuperAdminEmail() || req.body.uid === auth.uid) {
      res.status(400).json({ success: false, error: 'Root Super Administrator privileges cannot be revoked.' });
      return;
    }
    try {
      // The listed registry ID is authoritative, even if the Auth account was deleted
      // or its email changed. Bind it to the listed email before changing access.
      const targetUid = req.body.uid || (await getAuth().getUserByEmail(cleanEmail)).uid;
      if (targetUid === auth.uid) {
        res.status(400).json({ success: false, error: 'Root Super Administrator privileges cannot be revoked.' }); return;
      }
      const db = getAdminFirestore();
      const reference = db.collection('admins').doc(targetUid);
      const failure = await db.runTransaction(async transaction => {
        const record = await transaction.get(reference);
        const data = record.data();
        if (!record.exists) return { status: 404, error: 'Administrator record no longer exists. Refresh the admin list.' };
        if (typeof data?.email !== 'string' || data.email.trim().toLowerCase() !== cleanEmail) {
          return { status: 409, error: 'Administrator details changed. Refresh the admin list before revoking access.' };
        }
        if (isSuperAdmin(data.email)) return { status: 400, error: 'Root Super Administrator privileges cannot be revoked.' };
        if (data.status !== 'revoked') transaction.update(reference, { status: 'revoked', revokedBy: auth.email, revokedAt: new Date().toISOString() });
        return null;
      });
      if (failure) { res.status(failure.status).json({ success: false, error: failure.error }); return; }
    } catch (error: any) {
      if (error?.code === 'auth/user-not-found') {
        res.status(404).json({ success: false, error: 'Firebase account not found. Refresh the admin list and revoke the listed record.' }); return;
      }
      res.status(503).json({ success: false, error: 'Unable to update the administrator registry. Check the server Firebase credentials and permissions, then retry.' }); return;
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
