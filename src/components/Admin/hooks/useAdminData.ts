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
import { auth, db, isFirebaseLive, sanitizePayload } from '../../../lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { PlanCatalogService } from '../../../lib/planCatalogService';

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

  // 2. Orders & Recharges State
  const [orders, setOrders] = useState<RechargeOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // 3. Plan Catalog State
  const [plans, setPlans] = useState<PlanCatalogItem[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);

  // 4. Reports & Audit Logs State
  const [auditLogs, setAuditLogs] = useState<PlanAuditLog[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // 5. Payment Reports State
  const [payments, setPayments] = useState<PaymentReportItem[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  // 6. Operators State
  const [operators, setOperators] = useState<DthOperator[]>([]);
  const [operatorsLoading, setOperatorsLoading] = useState(false);

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
    try {
      if (isFirebaseLive && db) {
        try {
          const snapshot = await getDocs(collection(db, 'admin_customers'));
          if (!snapshot.empty) {
            const firestoreCusts: CustomerRecord[] = [];
            snapshot.forEach((d) => firestoreCusts.push({ ...d.data(), id: d.id } as CustomerRecord));
            setCustomers(firestoreCusts);
            setCustLoading(false);
            return;
          }
        } catch (fsErr) {
          console.warn('[AdminData] Firestore fetch customers fallback to server API:', fsErr);
        }
      }

      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/customers', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.customers)) {
          setCustomers(data.customers);
        }
      }
    } catch (err) {
      console.error('[AdminData] Error fetching customers:', err);
    } finally {
      setCustLoading(false);
    }
  }, [getAuthHeaders]);

  // Fetch Orders
  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      if (isFirebaseLive && db) {
        try {
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
      const res = await fetch('/api/admin/orders', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.orders)) {
          setOrders(data.orders);
        }
      }
    } catch (err) {
      console.error('[AdminData] Error fetching orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  }, [getAuthHeaders]);

  // Fetch Plans
  const fetchPacks = useCallback(async () => {
    setPlansLoading(true);
    try {
      const allPlans = await PlanCatalogService.getAllPlans();
      setPlans(allPlans);
    } catch (err) {
      console.error('[AdminData] Error loading packs:', err);
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
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/operators', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.operators)) {
          setOperators(data.operators);
        }
      }
    } catch (err) {
      console.error('[AdminData] Error fetching operators:', err);
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
          if (Array.isArray(data.admins)) setApprovedAdmins(data.admins);
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
    const unsub = PlanCatalogService.subscribeToPlans((newPlans: PlanCatalogItem[]) => {
      setPlans(newPlans);
    });
    return () => unsub();
  }, []);

  return {
    getAuthHeaders,
    customers,
    custLoading,
    fetchCustomers,
    setCustomers,
    orders,
    ordersLoading,
    fetchOrders,
    setOrders,
    plans,
    plansLoading,
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
    fetchOperators,
    setOperators,
    approvedAdmins,
    pendingRequests,
    accessLoading,
    fetchAccessList,
  };
}
