import { useState, useCallback, useEffect } from 'react';
import { 
  CustomerRecord, 
  RechargeOrder, 
  PlanCatalogItem, 
  PlanAuditLog, 
  DthOperator, 
  AdminAccount, 
  AdminAccessRequest, 
  UserProfile, 
  SUPER_ADMIN_EMAIL 
} from '../../../types';
import { auth } from '../../../lib/firebase';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function readApiResponse(response: Response, endpoint: string): Promise<unknown> {
  const body = await response.text();
  if (!body.trim()) {
    throw new Error(`${endpoint} returned an empty response (HTTP ${response.status}).`);
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    const contentType = response.headers.get('content-type') || 'unknown content type';
    throw new Error(`${endpoint} returned invalid JSON (HTTP ${response.status}, ${contentType}).`);
  }
}

export interface PaymentReportItem {
  id: string;
  paymentMethod: string;
  amount: number;
  status: string;
  operator: string;
  customerName: string;
  createdAt: string;
  operatorRefId: string;
}

export function useAdminData(user: UserProfile | null, showToast: (msg: string) => void) {
  const [authorizedUid, setAuthorizedUid] = useState<string | null>(null);
  const adminAuthorized = !!user && authorizedUid === user.uid;
  const [adminError, setAdminError] = useState<string | null>(null);
  // 1. Customer State
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [custLoading, setCustLoading] = useState(false);
  const [customersError, setCustomersError] = useState<string | null>(null);

  // 2. Orders & Recharges State
  const [orders, setOrders] = useState<RechargeOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  // 3. Plan Catalog State
  const [plans, setPlans] = useState<PlanCatalogItem[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);

  // 4. Reports & Audit Logs State
  const [auditLogs, setAuditLogs] = useState<PlanAuditLog[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // 5. Payment Reports State
  const [payments, setPayments] = useState<PaymentReportItem[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  // 6. Operators State
  const [operators, setOperators] = useState<DthOperator[]>([]);
  const [operatorsLoading, setOperatorsLoading] = useState(false);
  const [operatorsError, setOperatorsError] = useState<string | null>(null);

  // 7. Access & Approvals State
  const [approvedAdmins, setApprovedAdmins] = useState<AdminAccount[]>([]);
  const [pendingRequests, setPendingRequests] = useState<AdminAccessRequest[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);

  // Auth Header Helper
  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    await auth?.authStateReady?.();
    if (!user || !auth?.currentUser || auth.currentUser.uid !== user.uid) throw new Error('Sign in to access admin data.');
    headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
    return headers;
  }, [user?.uid]);

  useEffect(() => {
    let active = true;
    setAuthorizedUid(null); setAdminError(null);
    setCustomers([]); setOrders([]); setPlans([]); setAuditLogs([]); setPayments([]);
    setOperators([]); setApprovedAdmins([]); setPendingRequests([]);
    if (user) {
      getAuthHeaders().then(headers => fetch('/api/admin/verify-token', { headers }))
        .then(async response => {
          const data = await response.json();
          if (active && response.ok && data.isApprovedAdmin === true && data.uid === user.uid) setAuthorizedUid(user.uid);
        }).catch(() => { if (active) setAdminError('Unable to verify administrator access. Please sign in again.'); });
    }
    return () => { active = false; };
  }, [user?.uid, getAuthHeaders]);

  // Fetch Customers
  const fetchCustomers = useCallback(async () => {
    if (!adminAuthorized) return;
    setCustLoading(true);
    setCustomersError(null);
    setCustomers([]);
    try {
      const headers = await getAuthHeaders();
      const endpoint = '/api/admin/customers';
      const res = await fetch(endpoint, { headers });
      const data = await readApiResponse(res, endpoint);
      if (!res.ok || !isRecord(data) || data.success !== true || !Array.isArray(data.customers)) {
        const error = isRecord(data) && typeof data.error === 'string' ? data.error : null;
        throw new Error(error || `Unable to load customers (${res.status})`);
      }
      if (auth?.currentUser?.uid !== user?.uid) return;
      setCustomers(data.customers as CustomerRecord[]);
    } catch (err) {

      setCustomersError(err instanceof Error ? err.message : 'Unable to load customers. Please try again.');
    } finally {
      setCustLoading(false);
    }
  }, [getAuthHeaders, adminAuthorized]);

  // Fetch Orders
  const fetchOrders = useCallback(async () => {
    if (!adminAuthorized) return;
    setOrdersLoading(true);
    setOrdersError(null);
    setOrders([]);
    try {
      const headers = await getAuthHeaders();
      const endpoint = '/api/admin/orders';
      const res = await fetch(endpoint, { headers });
      const data = await readApiResponse(res, endpoint);
      if (!res.ok || !isRecord(data) || data.success !== true || !Array.isArray(data.orders)) {
        const error = isRecord(data) && typeof data.error === 'string' ? data.error : null;
        throw new Error(error || `Unable to load orders (${res.status})`);
      }
      if (auth?.currentUser?.uid !== user?.uid) return;
      setOrders(data.orders as RechargeOrder[]);
    } catch (err) {

      setOrdersError(err instanceof Error ? err.message : 'Unable to load orders. Please try again.');
    } finally {
      setOrdersLoading(false);
    }
  }, [getAuthHeaders, adminAuthorized]);

  // Fetch Plans
  const fetchPacks = useCallback(async () => {
    if (!adminAuthorized) return;
    setPlansLoading(true);
    setPlansError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/plans', { headers });
      const data = await res.json();
      if (!res.ok || !data.success || !Array.isArray(data.plans)) throw new Error(data.error || 'Unable to load plans.');
      const allPlans = data.plans;
      if (auth?.currentUser?.uid !== user?.uid) return;
      setPlans(allPlans);
    } catch (err: any) {

      setPlansError(err?.message || 'Failed to load plan catalog');
    } finally {
      setPlansLoading(false);
    }
  }, [getAuthHeaders, adminAuthorized]);

  // Fetch Reports
  const fetchReports = useCallback(async () => {
    if (!adminAuthorized) return;
    setReportsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/audit-logs', { headers });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Unable to load audit logs.');
      const logs = data.logs;
      if (auth?.currentUser?.uid !== user?.uid) return;
      setAuditLogs(logs);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Unable to load admin data.');
    } finally {
      setReportsLoading(false);
    }
  }, [getAuthHeaders, adminAuthorized]);

  // Fetch Payments
  const fetchPayments = useCallback(async () => {
    if (!adminAuthorized) return;
    setPaymentsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/payments', { headers });
      if (!res.ok) { setPayments([]); throw new Error(`Unable to load payments (${res.status}).`); }
      if (res.ok) {
        const data = await res.json();
        if (auth?.currentUser?.uid !== user?.uid) return;
        if (data.success && Array.isArray(data.payments)) {
          setPayments(data.payments);
        }
      }
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Unable to load admin data.');
    } finally {
      setPaymentsLoading(false);
    }
  }, [getAuthHeaders, adminAuthorized]);

  // Fetch Operators
  const fetchOperators = useCallback(async () => {
    if (!adminAuthorized) return;
    setOperatorsLoading(true);
    setOperatorsError(null);
    try {
      const headers = await getAuthHeaders();
      const endpoint = '/api/admin/operators';
      const res = await fetch(endpoint, { headers });
      const data = await readApiResponse(res, endpoint);
      if (!res.ok || !isRecord(data) || data.success !== true || !Array.isArray(data.operators)) {
        const error = isRecord(data) && typeof data.error === 'string' ? data.error : null;
        throw new Error(error || `Unable to load operators (${res.status})`);
      }
      if (auth?.currentUser?.uid !== user?.uid) return;
      setOperators(data.operators as DthOperator[]);
    } catch (err) {

      setOperatorsError(err instanceof Error ? err.message : 'Unable to load operators. Please try again.');
    } finally {
      setOperatorsLoading(false);
    }
  }, [getAuthHeaders, adminAuthorized]);

  // Fetch Access List & Approvals
  const fetchAccessList = useCallback(async () => {
    if (!adminAuthorized) return;
    setAccessLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/access-list', { headers });
      if (!res.ok) { setApprovedAdmins([]); setPendingRequests([]); throw new Error(`Unable to load admin registry (${res.status}).`); }
      if (res.ok) {
        const data = await res.json();
        if (auth?.currentUser?.uid !== user?.uid) return;
        if (data.success) {
          if (Array.isArray(data.admins)) setApprovedAdmins(data.admins.filter((admin: AdminAccount) => admin.status === 'approved'));
          if (Array.isArray(data.requests)) setPendingRequests(data.requests);
        }
      }
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Unable to load admin data.');
    } finally {
      setAccessLoading(false);
    }
  }, [getAuthHeaders, adminAuthorized]);

  return {
    adminAuthorized,
    adminError,
    getAuthHeaders,
    customers,
    custLoading,
    customersError,
    fetchCustomers,
    setCustomers,
    orders,
    ordersLoading,
    ordersError,
    fetchOrders,
    setOrders,
    plans,
    plansLoading,
    plansError,
    fetchPacks,
    setPlans,
    auditLogs,
    reportsLoading,
    fetchReports,
    payments,
    paymentsLoading,
    fetchPayments,
    operators,
    operatorsLoading,
    operatorsError,
    fetchOperators,
    setOperators,
    approvedAdmins,
    pendingRequests,
    accessLoading,
    fetchAccessList,
  };
}
