import { customersFromSuccessfulRecharges } from '../../../lib/rechargeCustomers';
import { seedDemoAdminData } from '../../../lib/seedDemoAdminData';
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
import { auth, db, isFirebaseConfigured, sanitizePayload } from '../../../lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { PlanCatalogService } from '../../../lib/planCatalogService';

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
    if (auth && auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
      } catch (err) {
        console.warn('[Admin] Failed to get current ID token:', err);
      }
    }
    return headers;
  }, []);

  // Fetch Customers
  const fetchCustomers = useCallback(async () => {
    setCustLoading(true);
    setCustomersError(null);
    try {
      if (isFirebaseConfigured && db) {
        try {
          const snapshot = await getDocs(collection(db, 'recharge_orders'));
          const successfulOrders: RechargeOrder[] = [];
          snapshot.forEach((d) => successfulOrders.push({ ...d.data(), orderId: d.id } as RechargeOrder));
          setCustomers(customersFromSuccessfulRecharges(successfulOrders));
          return;
        } catch (fsErr) {
          console.warn('[AdminData] Firestore fetch customers fallback to server API:', fsErr);
        }
      }

      const headers = await getAuthHeaders();
      const endpoint = '/api/admin/customers';
      const res = await fetch(endpoint, { headers });
      const data = await readApiResponse(res, endpoint);
      if (!res.ok || !isRecord(data) || data.success !== true || !Array.isArray(data.customers)) {
        const error = isRecord(data) && typeof data.error === 'string' ? data.error : null;
        throw new Error(error || `Unable to load customers (${res.status})`);
      }
      setCustomers(data.customers as CustomerRecord[]);
    } catch (err) {
      console.error('[AdminData] Error fetching customers:', err);
      setCustomersError(err instanceof Error ? err.message : 'Unable to load customers. Please try again.');
    } finally {
      setCustLoading(false);
    }
  }, [getAuthHeaders]);

  // Completed recharges automatically update the directory while the portal is open.
  useEffect(() => {
    if (!user || !isFirebaseConfigured || !db) return;
    return onSnapshot(collection(db, 'recharge_orders'), (snapshot) => {
      const records = snapshot.docs.map(d => ({ ...d.data(), orderId: d.id } as RechargeOrder));
      setCustomers(customersFromSuccessfulRecharges(records));
      setCustomersError(null);
    }, () => { void fetchCustomers(); });
  }, [user?.uid, fetchCustomers]);

  // Fetch Orders
  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      if (isFirebaseConfigured && db) {
        try {
          await seedDemoAdminData();
          const snapshot = await getDocs(collection(db, 'recharge_orders'));
          if (!snapshot.empty) {
            const firestoreOrders: RechargeOrder[] = [];
            snapshot.forEach((d) => firestoreOrders.push({ ...d.data(), orderId: d.id } as RechargeOrder));
            setOrders(firestoreOrders);
            setOrdersLoading(false);
            return;
          }
        } catch (fsErr) {
          console.warn('[AdminData] Firestore orders fallback to server:', fsErr);
        }
      }

      const headers = await getAuthHeaders();
      const endpoint = '/api/admin/orders';
      const res = await fetch(endpoint, { headers });
      const data = await readApiResponse(res, endpoint);
      if (!res.ok || !isRecord(data) || data.success !== true || !Array.isArray(data.orders)) {
        const error = isRecord(data) && typeof data.error === 'string' ? data.error : null;
        throw new Error(error || `Unable to load orders (${res.status})`);
      }
      setOrders(data.orders as RechargeOrder[]);
    } catch (err) {
      console.error('[AdminData] Error fetching orders:', err);
      setOrdersError(err instanceof Error ? err.message : 'Unable to load orders. Please try again.');
    } finally {
      setOrdersLoading(false);
    }
  }, [getAuthHeaders]);

  // Fetch Plans
  const fetchPacks = useCallback(async () => {
    setPlansLoading(true);
    setPlansError(null);
    try {
      await PlanCatalogService.seedAirtelPlansIntoLiveCatalog();
      await PlanCatalogService.applyAirtelRecommendationFlags();
      await PlanCatalogService.seedSunDirectPlansIntoLiveCatalog();
      await PlanCatalogService.seedTataPlayPlansIntoLiveCatalog();
      const allPlans = await PlanCatalogService.getAllPlans({ allowFallback: false });
      setPlans(allPlans);
    } catch (err: any) {
      console.error('[AdminData] Error loading packs:', err);
      setPlansError(err?.message || 'Failed to load plan catalog');
    } finally {
      setPlansLoading(false);
    }
  }, []);

  // Fetch Reports
  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const logs = await PlanCatalogService.getRecentAuditLogs();
      setAuditLogs(logs);
    } catch (err) {
      console.error('[AdminData] Error loading reports:', err);
    } finally {
      setReportsLoading(false);
    }
  }, []);

  // Fetch Payments
  const fetchPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/payments', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.payments)) {
          setPayments(data.payments);
        }
      }
    } catch (err) {
      console.error('[AdminData] Error fetching payments:', err);
    } finally {
      setPaymentsLoading(false);
    }
  }, [getAuthHeaders]);

  // Fetch Operators
  const fetchOperators = useCallback(async () => {
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
      setOperators(data.operators as DthOperator[]);
    } catch (err) {
      console.error('[AdminData] Error fetching operators:', err);
      setOperatorsError(err instanceof Error ? err.message : 'Unable to load operators. Please try again.');
    } finally {
      setOperatorsLoading(false);
    }
  }, [getAuthHeaders]);

  // Fetch Access List & Approvals
  const fetchAccessList = useCallback(async () => {
    setAccessLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/access-list', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (Array.isArray(data.admins)) setApprovedAdmins(data.admins.filter((admin: AdminAccount) => admin.status === 'approved'));
          if (Array.isArray(data.requests)) setPendingRequests(data.requests);
        }
      }
    } catch (err) {
      console.error('[AdminData] Error fetching access list:', err);
    } finally {
      setAccessLoading(false);
    }
  }, [getAuthHeaders]);

  // Subscribe to live plan catalog updates
  useEffect(() => {
    const unsub = PlanCatalogService.subscribeToPlans(
      (newPlans: PlanCatalogItem[]) => {
        setPlans(newPlans);
        setPlansError(null);
      },
      (err: Error) => {
        setPlansError(err.message || 'Failed to sync plan catalog');
      }
    );
    return () => unsub();
  }, []);

  return {
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
