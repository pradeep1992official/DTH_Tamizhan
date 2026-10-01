import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  BarChart3, 
  Clock, 
  RefreshCw, 
  Layers, 
  CreditCard, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Crown, 
  Info,
  Download, 
  Upload,
  Printer, 
  Plus, 
  Edit3, 
  Trash2, 
  Radio, 
  Tv, 
  ShieldCheck, 
  ChevronRight, 
  Sliders, 
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  Check,
  X,
  Send,
  Zap,
  Lock,
  ShieldAlert,
  LogIn,
  KeyRound,
  AlertTriangle,
  Power,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { 
  Language, 
  UserProfile, 
  DthOperatorId, 
  DthOperator,
  OperatorDisableCondition,
  RechargeOrder, 
  CustomerRecord, 
  PaymentReportItem,
  PlanCatalogItem,
  AdminTabId,
  AdminAccount,
  AdminAccessRequest,
  SUPER_ADMIN_EMAIL,
  isSuperAdminEmail
} from '../types';
import { OperatorTheme } from '../lib/theme';
import { PlanCatalogService } from '../lib/planCatalogService';
import { ExcelPlanImportExportModal } from './ExcelPlanImportExportModal';
import { db, auth, isFirebaseLive, sanitizePayload } from '../lib/firebase';
import { doc, setDoc, deleteDoc, collection, getDocs, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

interface AdminPortalProps {
  currentLang: Language;
  user: UserProfile | null;
  onOpenAuth: () => void;
  onUpdateUserRole?: (updated: UserProfile) => void;
  onTriggerRefresh: (operator: DthOperatorId, card: string) => void;
  onBackToCustomerFlow?: () => void;
  initialTab?: AdminTabId;
  currentTheme: OperatorTheme;
  onPathChange?: (tab: AdminTabId) => void;
}

const OPERATOR_NAMES: Record<DthOperatorId, string> = {
  sun_direct: 'Sun Direct',
  tata_play: 'Tata Play',
  airtel_dth: 'Airtel Digital TV',
  dish_tv: 'Dish TV',
  d2h: 'D2H Videocon',
};

export const AdminPortal: React.FC<AdminPortalProps> = ({
  currentLang,
  user,
  onOpenAuth,
  onUpdateUserRole,
  onTriggerRefresh,
  onBackToCustomerFlow,
  initialTab = 'customers',
  currentTheme,
  onPathChange,
}) => {
  const isLight = currentTheme.isLightMode;

  // Active Tab State (Precise Admin Sections)
  const [activeTab, setActiveTab] = useState<AdminTabId>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.includes('customer')) return 'customers';
      if (path.includes('report') && !path.includes('payment')) return 'reports';
      if (path.includes('pending') || path === '/worker' || path === '/dealer') return 'pending';
      if (path.includes('recharge')) return 'recharges';
      if (path.includes('pack') || path.includes('plan')) return 'packs';
      if (path.includes('payment')) return 'payments';
      if (path.includes('operator')) return 'operators';
      if (path.includes('approval') || path.includes('admin-access')) return 'approvals';
    }
    return initialTab;
  });

  const handleTabChange = (tab: AdminTabId) => {
    setActiveTab(tab);
    onPathChange?.(tab);
    if (typeof window !== 'undefined') {
      const newPath = `/admin/${tab}`;
      if (window.location.pathname !== newPath) {
        window.history.pushState(null, '', newPath);
      }
    }
  };

  // Toast alert
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Helper to attach verified Firebase ID token (fail closed)
  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    if (auth && auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (err) {
        console.warn('Error fetching ID token:', err);
      }
    }
    return headers;
  };

  // --- STATE FOR 1. CUSTOMER DETAILS ---
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [custLoading, setCustLoading] = useState(false);
  const [custSearch, setCustSearch] = useState('');
  const [custOpFilter, setCustOpFilter] = useState('all');
  const [custStatusFilter, setCustStatusFilter] = useState('all');

  const fetchCustomers = async () => {
    setCustLoading(true);
    try {
      let combinedCusts: CustomerRecord[] = [];

      // 1. Fetch from backend API with verified Bearer token
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/admin/customers`, {
          headers,
        });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (data.success && Array.isArray(data.customers)) {
            combinedCusts = [...data.customers];
          }
        }
      } catch (srvErr) {
        console.warn('Backend customers fetch note:', srvErr);
      }

      // 2. Fetch from Cloud Firestore (/customers)
      if (isFirebaseLive && db) {
        try {
          const custSnap = await getDocs(collection(db, 'customers'));
          if (!custSnap.empty) {
            const firestoreCusts: CustomerRecord[] = [];
            custSnap.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
              const d = docSnap.data();
              if (d && d.smartCardNumber) {
                firestoreCusts.push({
                  id: d.id || docSnap.id,
                  customerName: d.customerName || 'Subscriber',
                  registeredMobile: d.registeredMobile || '',
                  smartCardNumber: d.smartCardNumber,
                  operator: d.operator || 'sun_direct',
                  operatorName: d.operatorName || d.operator || 'DTH',
                  activePackName: d.activePackName || 'Active Pack',
                  currentBalance: typeof d.currentBalance === 'number' ? d.currentBalance : 0,
                  expiryDate: d.expiryDate || new Date().toISOString().split('T')[0],
                  status: d.status || 'active',
                  totalRechargesCount: typeof d.totalRechargesCount === 'number' ? d.totalRechargesCount : 0,
                  totalSpent: typeof d.totalSpent === 'number' ? d.totalSpent : 0,
                  lastRechargeDate: d.lastRechargeDate || 'Recent',
                  createdAt: d.createdAt || new Date().toISOString(),
                });
              }
            });

            // Merge by smartCardNumber
            const map = new Map<string, CustomerRecord>();
            combinedCusts.forEach((c) => map.set(c.smartCardNumber, c));
            firestoreCusts.forEach((c) => {
              const existing = map.get(c.smartCardNumber);
              if (!existing) {
                map.set(c.smartCardNumber, c);
              } else {
                map.set(c.smartCardNumber, { ...existing, ...c });
              }
            });

            combinedCusts = Array.from(map.values());

            // Sync to backend disk
            if (firestoreCusts.length > 0) {
              getAuthHeaders().then((headers) => {
                fetch('/api/admin/customers/sync', {
                  method: 'POST',
                  headers,
                  body: JSON.stringify({ customers: combinedCusts }),
                }).catch(() => {});
              });
            }
          }
        } catch (fbErr) {
          console.warn('Firestore customers read note:', fbErr);
        }
      }

      if (combinedCusts.length > 0) {
        setCustomers(combinedCusts);
      }
    } catch (err) {
      console.warn('Network issue fetching customers:', err);
    } finally {
      setCustLoading(false);
    }
  };

  // Customer Directory Management State
  const [showAddCustModal, setShowAddCustModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustMobile, setNewCustMobile] = useState('');
  const [newCustOperator, setNewCustOperator] = useState<DthOperatorId>('sun_direct');
  const [newCustCard, setNewCustCard] = useState('');
  const [isSavingCust, setIsSavingCust] = useState(false);

  // Customer Deletion State
  const [custToDelete, setCustToDelete] = useState<CustomerRecord | null>(null);
  const [isDeletingCust, setIsDeletingCust] = useState(false);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustMobile.trim() || !newCustCard.trim()) {
      showToast('Please enter Customer Name, Mobile Number, and Smart Card number');
      return;
    }
    setIsSavingCust(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/customers/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerName: newCustName.trim(),
          registeredMobile: newCustMobile.trim(),
          smartCardNumber: newCustCard.trim(),
          operator: newCustOperator,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Sync to Cloud Firestore (/customers/{customerId})
        if (db && data.customer) {
          try {
            const custDocRef = doc(db, 'customers', data.customer.id);
            await setDoc(custDocRef, sanitizePayload(data.customer), { merge: true });
          } catch (fbErr) {
            console.warn('[Firestore] Customer sync note:', fbErr);
          }
        }
        showToast(data.message || 'Customer saved to directory!');
        setShowAddCustModal(false);
        setNewCustName('');
        setNewCustMobile('');
        setNewCustCard('');
        await fetchCustomers();
      } else {
        showToast(data.error || 'Failed to save customer');
      }
    } catch {
      showToast('Network error saving customer');
    } finally {
      setIsSavingCust(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!custToDelete) return;
    setIsDeletingCust(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/customers/delete', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: custToDelete.id,
          smartCardNumber: custToDelete.smartCardNumber,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Delete from Cloud Firestore (/customers/{customerId})
        if (db && custToDelete.id) {
          try {
            const custDocRef = doc(db, 'customers', custToDelete.id);
            await deleteDoc(custDocRef);
          } catch (fbErr) {
            console.warn('[Firestore] Customer delete note:', fbErr);
          }
        }
        showToast('Customer record removed from directory');
        setCustToDelete(null);
        await fetchCustomers();
      } else {
        showToast(data.error || 'Failed to delete customer');
      }
    } catch {
      showToast('Network error deleting customer');
    } finally {
      setIsDeletingCust(false);
    }
  };

  // --- STATE FOR 2. REPORTS ---
  const [reportsData, setReportsData] = useState<any>(null);
  const [reportsLoading, setReportsLoading] = useState(false);

  const fetchReports = async () => {
    setReportsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/reports`, {
        headers,
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        console.warn('Non-JSON response received for reports:', res.status);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setReportsData(data);
      }
    } catch (err) {
      console.warn('Network issue loading reports:', err);
    } finally {
      setReportsLoading(false);
    }
  };

  // --- STATE FOR 3. RECHARGE PENDINGS & 4. RECHARGE UPDATION ---
  const [orders, setOrders] = useState<RechargeOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<RechargeOrder | null>(null);
  const [statusUpdateVal, setStatusUpdateVal] = useState<'pending' | 'processing' | 'completed' | 'failed'>('completed');
  const [operatorRefVal, setOperatorRefVal] = useState('');
  const [workerNotesVal, setWorkerNotesVal] = useState('');
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

  // Search & Filter for All Orders
  const [ordersSearch, setOrdersSearch] = useState('');
  const [ordersStatusFilter, setOrdersStatusFilter] = useState('all');

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      let combinedOrders: RechargeOrder[] = [];

      // 1. Fetch from backend server API
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/orders?isWorker=true`, {
          headers,
        });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (data.success && Array.isArray(data.orders)) {
            combinedOrders = [...data.orders];
          }
        }
      } catch (srvErr) {
        console.warn('Backend orders fetch note:', srvErr);
      }

      // 2. Fetch from Cloud Firestore (/recharge_orders & /pending_recharges)
      if (isFirebaseLive && db) {
        try {
          const snap1 = await getDocs(collection(db, 'recharge_orders'));
          const firestoreOrders: RechargeOrder[] = [];
          if (!snap1.empty) {
            snap1.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
              const d = docSnap.data();
              if (d && (d.orderId || docSnap.id)) {
                firestoreOrders.push({
                  orderId: d.orderId || docSnap.id,
                  user_id: d.user_id || 'guest_user',
                  operator: d.operator || 'sun_direct',
                  operatorName: d.operatorName || d.operator || 'DTH',
                  smartCardNumber: d.smartCardNumber || '',
                  registeredMobile: d.registeredMobile || '',
                  amount: typeof d.amount === 'number' ? d.amount : 0,
                  packId: d.packId || 'pack',
                  packName: d.packName || 'Recharge Pack',
                  packValidity: d.packValidity || '30 Days',
                  paymentMethod: d.paymentMethod || 'upi',
                  paymentStatus: d.paymentStatus || 'paid',
                  rechargeStatus: d.rechargeStatus || 'pending',
                  operatorRefId: d.operatorRefId || '',
                  workerNotes: d.workerNotes || '',
                  signalRefreshRequested: Boolean(d.signalRefreshRequested),
                  createdAt: d.createdAt || new Date().toISOString(),
                  updatedAt: d.updatedAt || new Date().toISOString(),
                });
              }
            });
          }

          // Merge by orderId
          const map = new Map<string, RechargeOrder>();
          combinedOrders.forEach((o) => map.set(o.orderId, o));
          firestoreOrders.forEach((o) => {
            const existing = map.get(o.orderId);
            if (!existing) {
              map.set(o.orderId, o);
            } else {
              map.set(o.orderId, { ...existing, ...o });
            }
          });

          combinedOrders = Array.from(map.values());

          // Sync to backend disk
          if (firestoreOrders.length > 0) {
            getAuthHeaders().then((headers) => {
              fetch('/api/orders/sync', {
                method: 'POST',
                headers,
                body: JSON.stringify({ orders: combinedOrders }),
              }).catch(() => {});
            });
          }
        } catch (fbErr) {
          console.warn('Firestore orders read note:', fbErr);
        }
      }

      if (combinedOrders.length > 0) {
        setOrders(combinedOrders);
        if (!selectedOrder && combinedOrders.length > 0) {
          setSelectedOrder(combinedOrders[0]);
          setOperatorRefVal(combinedOrders[0].operatorRefId || '');
          setWorkerNotesVal(combinedOrders[0].workerNotes || '');
          setStatusUpdateVal(combinedOrders[0].rechargeStatus);
        }
      }
    } catch (err) {
      console.warn('Network issue loading orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (
    orderId: string, 
    newStatus: 'pending' | 'processing' | 'completed' | 'failed',
    customRef?: string,
    notes?: string,
    refreshSignal?: boolean
  ) => {
    setIsUpdatingOrder(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/orders/update', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          orderId,
          rechargeStatus: newStatus,
          operatorRefId: customRef !== undefined ? customRef : (operatorRefVal || `TXN-REF-${Math.floor(100000 + Math.random() * 900000)}`),
          workerNotes: notes !== undefined ? notes : workerNotesVal,
          triggerSignalRefresh: refreshSignal || false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Sync updated order status to Cloud Firestore
        if (db && data.order) {
          try {
            const cleanOrder = sanitizePayload(data.order);
            setDoc(doc(db, 'recharge_orders', orderId), cleanOrder, { merge: true }).catch(() => {});
            setDoc(doc(db, 'pending_recharges', orderId), cleanOrder, { merge: true }).catch(() => {});
          } catch (fbErr) {
            console.warn('[Firestore] Order status sync:', fbErr);
          }
        }
        showToast(`Recharge #${orderId} marked as ${newStatus.toUpperCase()}`);
        await fetchOrders();
        await fetchReports();
        if (selectedOrder?.orderId === orderId) {
          setSelectedOrder((prev) => prev ? { ...prev, rechargeStatus: newStatus, operatorRefId: customRef || prev.operatorRefId } : null);
        }
      } else {
        showToast(data.error || 'Update failed');
      }
    } catch (err) {
      console.error('Failed to update order status:', err);
      showToast('Network error while updating order');
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  // --- STATE FOR 5. PACKS UPDATION ---
  const [plans, setPlans] = useState<PlanCatalogItem[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [selectedPackOp, setSelectedPackOp] = useState<DthOperatorId>('sun_direct');
  const [packTypeFilter, setPackTypeFilter] = useState<'all' | 'HD' | 'SD'>('all');
  const [isPackModalOpen, setIsPackModalOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<PlanCatalogItem | null>(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelModalTab, setExcelModalTab] = useState<'import' | 'export'>('import');
  const [packToDelete, setPackToDelete] = useState<PlanCatalogItem | null>(null);
  const [isDeletingPack, setIsDeletingPack] = useState(false);

  const [packFormData, setPackFormData] = useState({
    operator: 'sun_direct' as DthOperatorId,
    pack_type: 'HD' as 'HD' | 'SD',
    duration_months: 1 as 1 | 6 | 12,
    plan_name: '',
    amount: '' as string | number,
    is_recommended: true,
    channel_list: [] as string[],
  });
  const [channelInput, setChannelInput] = useState('');

  const fetchPacks = async () => {
    setPlansLoading(true);
    try {
      const allPlans = await PlanCatalogService.getAllPlans();
      setPlans(allPlans);
    } catch (err) {
      console.error('Failed to load packs:', err);
    } finally {
      setPlansLoading(false);
    }
  };

  const handleOpenAddPack = () => {
    setEditingPack(null);
    setPackFormData({
      operator: selectedPackOp,
      pack_type: 'HD',
      duration_months: 1,
      plan_name: '',
      amount: '',
      is_recommended: true,
      channel_list: ['Sun TV HD', 'KTV HD', 'Star Vijay HD', 'Zee Tamil HD'],
    });
    setIsPackModalOpen(true);
  };

  const handleOpenEditPack = (p: PlanCatalogItem) => {
    setEditingPack(p);
    setPackFormData({
      operator: p.operator,
      pack_type: p.pack_type,
      duration_months: p.duration_months,
      plan_name: p.plan_name,
      amount: p.amount,
      is_recommended: p.is_recommended,
      channel_list: [...p.channel_list],
    });
    setIsPackModalOpen(true);
  };

  const handleSavePack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packFormData.plan_name.trim() || !packFormData.amount) {
      showToast('Please provide a pack name and price');
      return;
    }

    try {
      const numAmount = Number(packFormData.amount);
      const planId = editingPack 
        ? editingPack.id 
        : `${packFormData.operator}_${packFormData.pack_type.toLowerCase()}_${packFormData.duration_months}m_${Date.now().toString().slice(-4)}`;

      await PlanCatalogService.savePlan(
        {
          id: planId,
          operator: packFormData.operator,
          pack_type: packFormData.pack_type,
          duration_months: packFormData.duration_months,
          plan_name: packFormData.plan_name.trim(),
          amount: numAmount,
          is_recommended: packFormData.is_recommended,
          channel_list: packFormData.channel_list,
          updated_by: user?.email || 'admin@dthtamizhan.com',
        },
        user?.email || 'admin@dthtamizhan.com'
      );
      showToast(editingPack ? 'Pack updated successfully!' : 'New Pack created!');
      setIsPackModalOpen(false);
      await fetchPacks();
    } catch (err) {
      console.error('Failed to save pack:', err);
      showToast('Error saving pack');
    }
  };

  const handleDeletePack = (plan: PlanCatalogItem) => {
    setPackToDelete(plan);
  };

  const confirmDeletePack = async () => {
    if (!packToDelete) return;
    setIsDeletingPack(true);
    try {
      await PlanCatalogService.deletePlan(packToDelete.id, user?.email || 'admin@dthtamizhan.com');
      showToast('Pack permanently deleted from catalog');
      setPackToDelete(null);
      await fetchPacks();
    } catch (err) {
      console.error('Failed to delete pack:', err);
      showToast('Error deleting pack');
    } finally {
      setIsDeletingPack(false);
    }
  };

  // --- STATE FOR 6. PAYMENT REPORTS ---
  const [payments, setPayments] = useState<PaymentReportItem[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paySearch, setPaySearch] = useState('');
  const [payStatusFilter, setPayStatusFilter] = useState('all');
  const [payOpFilter, setPayOpFilter] = useState('all');

  const fetchPayments = async () => {
    setPaymentsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/payments`, {
        headers,
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        console.warn('Non-JSON response received for payments:', res.status);
        return;
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.payments)) {
        setPayments(data.payments);
      }
    } catch (err) {
      console.warn('Network issue loading payments:', err);
    } finally {
      setPaymentsLoading(false);
    }
  };

  // --- STATE FOR 7. ADMIN AUTHORIZATION & ACCESS CONTROL ---
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);

  // Authorize check (Strictly server / Firestore / super admin verified)
  const isApprovedAdmin = useMemo(() => {
    if (!user || !user.email) return false;
    if (isSuperAdminEmail(user.email)) return true;
    const found = adminAccounts.find((a) => a.email.toLowerCase() === user.email?.toLowerCase());
    return Boolean(found && found.status === 'approved');
  }, [user, adminAccounts]);

  // Direct Admin Grant Inputs
  const [directEmail, setDirectEmail] = useState('');
  const [directName, setDirectName] = useState('');
  const [directNotes, setDirectNotes] = useState('');
  const [isDirectGranting, setIsDirectGranting] = useState(false);

  const fetchAccessList = async () => {
    setAccessLoading(true);
    try {
      let combinedAdmins: AdminAccount[] = [];

      // 1. Fetch from backend API with verified Bearer token
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/admin/access-list`, {
          headers,
        });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (data.success && Array.isArray(data.admins)) {
            combinedAdmins = [...data.admins];
          }
        }
      } catch (srvErr) {
        console.warn('Backend access-list fetch note:', srvErr);
      }

      // 2. Fetch directly from Cloud Firestore (/admins) to ensure zero data loss across container restarts
      if (isFirebaseLive && db) {
        try {
          const adminsSnap = await getDocs(collection(db, 'admins'));
          if (!adminsSnap.empty) {
            const firestoreAdmins: AdminAccount[] = [];
            adminsSnap.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
              const d = docSnap.data();
              if (d && d.email) {
                firestoreAdmins.push({
                  uid: d.uid || docSnap.id,
                  email: d.email,
                  displayName: d.displayName || d.email.split('@')[0],
                  role: (d.role as 'super_admin' | 'admin') || 'admin',
                  status: (d.status as 'approved' | 'revoked' | 'pending') || 'approved',
                  approvedBy: d.approvedBy || SUPER_ADMIN_EMAIL,
                  approvedAt: d.approvedAt || new Date().toISOString(),
                  notes: d.notes || 'Cloud Firestore Admin',
                });
              }
            });

            // Merge Firestore records with Server records (deduplicate by email)
            const map = new Map<string, AdminAccount>();
            combinedAdmins.forEach((a) => map.set(a.email.toLowerCase(), a));
            firestoreAdmins.forEach((a) => {
              const existing = map.get(a.email.toLowerCase());
              if (!existing) {
                map.set(a.email.toLowerCase(), a);
              } else if (a.status !== existing.status) {
                map.set(a.email.toLowerCase(), { ...existing, ...a });
              }
            });

            combinedAdmins = Array.from(map.values());

            // Two-way sync back to backend server memory & disk
            if (firestoreAdmins.length > 0) {
              getAuthHeaders().then((headers) => {
                fetch('/api/admin/sync-admins', {
                  method: 'POST',
                  headers,
                  body: JSON.stringify({ admins: combinedAdmins }),
                }).catch(() => {});
              });
            }
          }
        } catch (fbErr) {
          console.warn('Firestore admins read note:', fbErr);
        }
      }

      if (combinedAdmins.length > 0) {
        setAdminAccounts(combinedAdmins);
      }
    } catch (err) {
      console.warn('Network issue loading admin access list:', err);
    } finally {
      setAccessLoading(false);
    }
  };

  const handleApproveAdmin = async (
    targetEmail: string, 
    targetName?: string, 
    targetUid?: string, 
    requestId?: string, 
    notes?: string
  ) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/approve-user', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          targetEmail,
          targetName,
          targetUid,
          requestId,
          notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Administrator privileges approved for ${targetEmail}`);
        if (isFirebaseLive && db) {
          try {
            const safeDocId = (targetUid || `admin_${targetEmail}`).replace(/[^a-zA-Z0-9_-]/g, '_');
            await setDoc(doc(db, 'admins', safeDocId), {
              uid: targetUid || safeDocId,
              email: targetEmail,
              displayName: targetName || targetEmail.split('@')[0],
              role: 'admin',
              status: 'approved',
              approvedBy: SUPER_ADMIN_EMAIL,
              approvedAt: new Date().toISOString(),
              notes: notes || 'Approved by Professor Pradeep',
            }, { merge: true });
          } catch (e) {
            console.warn('Firestore admin save:', e);
          }
        }
        await fetchAccessList();
      } else {
        showToast(data.error || 'Approval failed');
      }
    } catch (err) {
      console.error('Approval failed:', err);
      showToast('Network error during admin approval');
    }
  };

  const [adminToRevoke, setAdminToRevoke] = useState<string | null>(null);
  const [isRevokingAdmin, setIsRevokingAdmin] = useState(false);

  const handleRevokeAdmin = (targetEmail: string) => {
    setAdminToRevoke(targetEmail);
  };

  const confirmRevokeAdmin = async () => {
    if (!adminToRevoke) return;
    setIsRevokingAdmin(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/revoke-user', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          targetEmail: adminToRevoke,
          notes: 'Revoked by Root Administrator',
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (isFirebaseLive && db && adminToRevoke) {
          try {
            await setDoc(doc(db, 'admins', adminToRevoke.replace(/[^a-zA-Z0-9_-]/g, '_')), {
              email: adminToRevoke,
              status: 'revoked',
              updatedAt: new Date().toISOString(),
              notes: 'Revoked by Root Administrator',
            }, { merge: true });
          } catch (e) {
            console.warn('Firestore admin revoke:', e);
          }
        }
        showToast(`Administrator privileges revoked for ${adminToRevoke}`);
        setAdminToRevoke(null);
        await fetchAccessList();
      } else {
        showToast(data.error || 'Revoke failed');
      }
    } catch (err) {
      console.error('Revoke failed:', err);
      showToast('Network error during admin revocation');
    } finally {
      setIsRevokingAdmin(false);
    }
  };

  const handleDirectGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directEmail.trim()) {
      showToast('Please enter a valid email');
      return;
    }
    setIsDirectGranting(true);
    await handleApproveAdmin(
      directEmail.trim(), 
      directName.trim() || directEmail.split('@')[0], 
      `usr_adm_${Date.now().toString().slice(-6)}`, 
      undefined, 
      directNotes.trim()
    );
    setDirectEmail('');
    setDirectName('');
    setDirectNotes('');
    setIsDirectGranting(false);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (payments.length === 0) {
      showToast('No payment transactions to export');
      return;
    }
    const headers = ['Transaction ID', 'Order ID', 'Customer Name', 'Mobile', 'Smart Card', 'Operator', 'Pack Name', 'Amount (INR)', 'Payment Method', 'Status', 'Date'];
    const rows = filteredPayments.map((p) => [
      p.transactionId,
      p.orderId,
      `"${p.customerName}"`,
      p.registeredMobile,
      p.smartCardNumber,
      `"${p.operatorName}"`,
      `"${p.packName}"`,
      p.amount,
      p.paymentMethod,
      p.paymentStatus,
      `"${new Date(p.createdAt).toLocaleString()}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DTH_Tamizhan_Payment_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Payment Report CSV downloaded!');
  };

  // --- STATE FOR OPERATOR CONTROL & CONDITIONS ---
  const [operatorList, setOperatorList] = useState<DthOperator[]>([]);
  const [operatorsLoading, setOperatorsLoading] = useState(false);
  const [selectedOperatorForModal, setSelectedOperatorForModal] = useState<DthOperator | null>(null);
  const [isConditionModalOpen, setIsConditionModalOpen] = useState(false);
  const [conditionType, setConditionType] = useState<OperatorDisableCondition>('scheduled_maintenance');
  const [customConditionLabel, setCustomConditionLabel] = useState('');
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [expectedRestoration, setExpectedRestoration] = useState('');
  const [modalTargetEnabled, setModalTargetEnabled] = useState(false);
  const [isUpdatingOperator, setIsUpdatingOperator] = useState(false);

  const CONDITION_PRESETS: Record<OperatorDisableCondition, { label: string; defaultNotice: string; defaultTime: string }> = {
    scheduled_maintenance: {
      label: 'Scheduled Maintenance',
      defaultNotice: 'Undergoing routine system maintenance and security updates. Recharges will resume shortly.',
      defaultTime: 'Within 2 hours',
    },
    gateway_down: {
      label: 'API / Gateway Downtime',
      defaultNotice: 'The operator billing gateway is currently experiencing intermittent connectivity issues.',
      defaultTime: 'Within 1 hour',
    },
    transponder_outage: {
      label: 'Satellite Transponder Outage',
      defaultNotice: 'Operator satellite transponder uplink is currently undergoing signal alignment.',
      defaultTime: 'Today by 6:00 PM',
    },
    high_failure_rate: {
      label: 'High Transaction Failure Rate',
      defaultNotice: 'Recharges temporarily paused due to automated gateway timeout prevention.',
      defaultTime: 'Within 45 minutes',
    },
    commercial_hold: {
      label: 'Commercial / Dealership Hold',
      defaultNotice: 'Recharge facility temporarily held for account reconciliation and balance replenishment.',
      defaultTime: 'Tomorrow morning',
    },
    custom: {
      label: 'Custom Operational Notice',
      defaultNotice: 'Operator recharge is temporarily disabled by system administrator.',
      defaultTime: 'Shortly',
    },
  };

  const fetchOperators = async () => {
    setOperatorsLoading(true);
    try {
      let combinedOps: DthOperator[] = [];

      // 1. Fetch from server API with verified Bearer token
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/admin/operators`, {
          headers,
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.operators)) {
          combinedOps = [...data.operators];
        }
      } catch (srvErr) {
        console.warn('Backend operators fetch note:', srvErr);
      }

      // 2. Fetch from Cloud Firestore (/operator_settings)
      if (isFirebaseLive && db) {
        try {
          const snap = await getDocs(collection(db, 'operator_settings'));
          if (!snap.empty) {
            const map = new Map<string, any>();
            snap.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
              const d = docSnap.data();
              if (d && (d.operatorId || docSnap.id)) {
                map.set(d.operatorId || docSnap.id, d);
              }
            });

            combinedOps = combinedOps.map((op) => {
              const remote = map.get(op.id);
              if (remote) {
                return {
                  ...op,
                  isEnabled: typeof remote.isEnabled === 'boolean' ? remote.isEnabled : op.isEnabled,
                  condition: remote.condition || op.condition,
                  conditionLabel: remote.conditionLabel || op.conditionLabel,
                  maintenanceMessage: remote.maintenanceMessage || op.maintenanceMessage,
                  expectedRestoration: remote.expectedRestoration || op.expectedRestoration,
                  disabledAt: remote.disabledAt || op.disabledAt,
                };
              }
              return op;
            });
          }
        } catch (fbErr) {
          console.warn('Firestore operator_settings read note:', fbErr);
        }
      }

      if (combinedOps.length > 0) {
        setOperatorList(combinedOps);
      }
    } catch (err) {
      console.warn('Network issue fetching operators:', err);
    } finally {
      setOperatorsLoading(false);
    }
  };

  const handleOpenConditionModal = (op: DthOperator, forceTargetEnable?: boolean) => {
    setSelectedOperatorForModal(op);
    const cond = op.condition || 'scheduled_maintenance';
    setConditionType(cond);
    setModalTargetEnabled(forceTargetEnable !== undefined ? forceTargetEnable : !op.isEnabled);
    setCustomConditionLabel(op.conditionLabel || CONDITION_PRESETS[cond]?.label || '');
    setMaintenanceMessage(op.maintenanceMessage || `${op.name} ${CONDITION_PRESETS[cond]?.defaultNotice || 'is temporarily offline for maintenance.'}`);
    setExpectedRestoration(op.expectedRestoration || CONDITION_PRESETS[cond]?.defaultTime || 'Shortly');
    setIsConditionModalOpen(true);
  };

  const handleConditionTypeChange = (newType: OperatorDisableCondition) => {
    setConditionType(newType);
    const preset = CONDITION_PRESETS[newType];
    if (preset && selectedOperatorForModal) {
      setCustomConditionLabel(preset.label);
      setMaintenanceMessage(`${selectedOperatorForModal.name}: ${preset.defaultNotice}`);
      setExpectedRestoration(preset.defaultTime);
    }
  };

  const handleToggleOperatorStatus = async (
    operatorId: DthOperatorId, 
    enable: boolean, 
    condition?: OperatorDisableCondition, 
    condLabel?: string, 
    msg?: string, 
    restoration?: string
  ) => {
    setIsUpdatingOperator(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/operators/toggle', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          operatorId,
          isEnabled: enable,
          condition: enable ? undefined : (condition || conditionType),
          conditionLabel: enable ? undefined : (condLabel || customConditionLabel || CONDITION_PRESETS[condition || conditionType]?.label),
          maintenanceMessage: enable ? undefined : (msg || maintenanceMessage),
          expectedRestoration: enable ? undefined : (restoration || expectedRestoration),
        }),
      });
      const data = await res.json();
      if (data.success && data.operator) {
        showToast(data.message || 'Operator status updated');
        if (db) {
          try {
            await setDoc(doc(db, 'operator_settings', operatorId), sanitizePayload(data.operator), { merge: true });
          } catch (fbErr) {
            console.warn('[Firestore] Operator status sync note:', fbErr);
          }
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('operators_updated', { detail: data.operator }));
        }
        setIsConditionModalOpen(false);
        setSelectedOperatorForModal(null);
        await fetchOperators();
      } else {
        showToast(data.error || 'Failed to update operator status');
      }
    } catch (err) {
      console.error('Error updating operator status:', err);
      showToast('Network error updating operator');
    } finally {
      setIsUpdatingOperator(false);
    }
  };

  // Initial Data Fetching
  useEffect(() => {
    fetchCustomers();
    fetchReports();
    fetchOrders();
    fetchPacks();
    fetchPayments();
    fetchOperators();
    fetchAccessList();
  }, [user?.email]);

  // Filtered Lists
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch = 
        c.customerName.toLowerCase().includes(custSearch.toLowerCase()) ||
        c.registeredMobile.includes(custSearch) ||
        c.smartCardNumber.includes(custSearch) ||
        c.activePackName.toLowerCase().includes(custSearch.toLowerCase());
      const matchesOp = custOpFilter === 'all' || c.operator === custOpFilter;
      const matchesStatus = custStatusFilter === 'all' || c.status === custStatusFilter;
      return matchesSearch && matchesOp && matchesStatus;
    });
  }, [customers, custSearch, custOpFilter, custStatusFilter]);

  const pendingOrdersList = useMemo(() => {
    return orders.filter((o) => o.rechargeStatus === 'pending' || o.rechargeStatus === 'processing');
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch = 
        o.orderId.toLowerCase().includes(ordersSearch.toLowerCase()) ||
        o.smartCardNumber.includes(ordersSearch) ||
        o.registeredMobile?.includes(ordersSearch) ||
        o.operatorName.toLowerCase().includes(ordersSearch.toLowerCase());
      const matchesStatus = ordersStatusFilter === 'all' || o.rechargeStatus === ordersStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, ordersSearch, ordersStatusFilter]);

  const filteredPacks = useMemo(() => {
    return plans.filter((p) => {
      const matchesOp = p.operator === selectedPackOp;
      const matchesType = packTypeFilter === 'all' || p.pack_type === packTypeFilter;
      return matchesOp && matchesType;
    });
  }, [plans, selectedPackOp, packTypeFilter]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchesSearch = 
        p.transactionId.toLowerCase().includes(paySearch.toLowerCase()) ||
        p.orderId.toLowerCase().includes(paySearch.toLowerCase()) ||
        p.customerName.toLowerCase().includes(paySearch.toLowerCase()) ||
        p.smartCardNumber.includes(paySearch) ||
        p.registeredMobile.includes(paySearch);
      const matchesOp = payOpFilter === 'all' || p.operator === payOpFilter;
      const matchesStatus = payStatusFilter === 'all' || p.paymentStatus === payStatusFilter;
      return matchesSearch && matchesOp && matchesStatus;
    });
  }, [payments, paySearch, payOpFilter, payStatusFilter]);

  // Master Navigation definition with the precise 7 tabs
  const adminTabs: { id: AdminTabId; label: string; icon: React.FC<{ className?: string }>; badge?: number; isSuper?: boolean }[] = [
    { id: 'customers', label: 'Customer Details', icon: Users, badge: customers.length },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'pending', label: 'Recharge Pendings', icon: Clock, badge: pendingOrdersList.length },
    { id: 'recharges', label: 'Recharge Updation', icon: RefreshCw },
    { id: 'packs', label: 'Packs Updation', icon: Layers, badge: plans.length },
    { id: 'payments', label: 'Payment Reports', icon: CreditCard, badge: payments.length },
    { id: 'operators', label: 'Operator Control', icon: Sliders, badge: operatorList.filter((o) => o.isEnabled === false).length },
    { id: 'approvals', label: 'Admin Access', icon: ShieldCheck, badge: adminAccounts.length },
  ];

  // 1. Unauthenticated Gate: User is signed out
  if (!user) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-4 animate-in fade-in duration-300">
        {toastMsg && (
          <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl font-bold text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-5">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMsg}</span>
          </div>
        )}

        <div 
          className={`border rounded-3xl shadow-2xl overflow-hidden ${
            isLight ? 'bg-white border-gray-200' : `${currentTheme.mainContainerBg} ${currentTheme.mainContainerBorder}`
          }`}
        >
          <div 
            className={`p-5 sm:p-6 border-b flex items-center justify-between gap-4 ${
              isLight ? 'bg-gray-50' : 'bg-black/30 border-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center border text-rose-500 bg-rose-500/10 border-rose-500/30">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h1 className={`text-lg sm:text-xl font-bold ${currentTheme.headingText}`}>
                  Administrator Portal Restricted
                </h1>
                <p className={`text-xs ${currentTheme.subText}`}>
                  Authentication required to access operations suite
                </p>
              </div>
            </div>
            {onBackToCustomerFlow && (
              <button
                type="button"
                onClick={onBackToCustomerFlow}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                  isLight ? 'bg-white hover:bg-gray-100 text-gray-800 border-gray-300' : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Customer View</span>
              </button>
            )}
          </div>

          <div className="p-6 sm:p-10 text-center max-w-xl mx-auto space-y-6">
            <div className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center shadow-lg border bg-rose-500/10 border-rose-500/30 text-rose-500">
              <ShieldAlert className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className={`text-2xl font-black ${currentTheme.headingText}`}>
                Sign In Required for Admin Access
              </h2>
              <p className={`text-sm ${currentTheme.subText} leading-relaxed`}>
                The DTH Tamizhan Administrator Operations Suite contains subscriber records, transponder tools, and catalog data. Direct authorization is required.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                id="admin-portal-signin-btn"
                type="button"
                onClick={onOpenAuth}
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm text-white shadow-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                style={{ backgroundColor: currentTheme.primaryColor }}
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In with Google</span>
              </button>

              {onBackToCustomerFlow && (
                <button
                  type="button"
                  onClick={onBackToCustomerFlow}
                  className={`w-full sm:w-auto px-5 py-3 rounded-xl font-semibold text-xs transition-all border ${
                    isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300' : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/15'
                  }`}
                >
                  Return to Customer Recharge
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthorized Gate: User is signed in, but NOT an authorized administrator
  if (!isApprovedAdmin) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-4 py-8 animate-in fade-in duration-300">
        {toastMsg && (
          <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl font-bold text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-5">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMsg}</span>
          </div>
        )}

        <div 
          className={`border rounded-3xl shadow-2xl p-8 text-center space-y-6 ${
            isLight ? 'bg-white border-gray-200' : `${currentTheme.mainContainerBg} ${currentTheme.mainContainerBorder}`
          }`}
        >
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-inner border"
            style={{ 
              backgroundColor: `${currentTheme.primaryColor}15`, 
              borderColor: `${currentTheme.primaryColor}30`,
              color: currentTheme.primaryColor 
            }}
          >
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span 
              className="text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full border"
              style={{
                backgroundColor: `${currentTheme.primaryColor}12`,
                borderColor: `${currentTheme.primaryColor}25`,
                color: currentTheme.primaryColor
              }}
            >
              Direct Authorization Required
            </span>
            <h1 className={`text-2xl font-bold ${currentTheme.headingText}`}>
              Administrator Access Restricted
            </h1>
            <p className={`text-xs max-w-md mx-auto leading-relaxed ${currentTheme.subText}`}>
              Access to customer databases, orders, and pricing is strictly restricted to authorized administrators. Contact your administrator for direct authorization.
            </p>
          </div>

          <div 
            className={`p-3.5 rounded-xl max-w-sm mx-auto text-xs font-mono border ${
              isLight ? 'bg-gray-50 border-gray-200 text-gray-700' : 'bg-black/30 border-white/10 text-gray-300'
            }`}
          >
            <span className="opacity-60">Signed in as: </span>
            <span className="font-semibold">{user.email || user.displayName || 'User'}</span>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onOpenAuth}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: currentTheme.primaryColor }}
            >
              <span>Switch Account</span>
            </button>

            {onBackToCustomerFlow && (
              <button
                type="button"
                onClick={onBackToCustomerFlow}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                  isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300' : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`}
              >
                <span>Return to Recharge</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. Authorized Administrator View: Render the full Operations Suite
  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 animate-in fade-in duration-300">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl font-bold text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Console Frame */}
      <div 
        className={`border rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 ${
          isLight 
            ? 'bg-white border-gray-200 shadow-gray-200/50' 
            : `${currentTheme.mainContainerBg} ${currentTheme.mainContainerBorder} backdrop-blur-md`
        }`}
      >
        {/* Top Console Header */}
        <div 
          className={`p-4 sm:p-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden ${
            isLight ? 'bg-gray-50/80 border-gray-200' : 'bg-black/30 border-white/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-xs shrink-0"
              style={{ 
                backgroundColor: `${currentTheme.primaryColor}15`, 
                borderColor: `${currentTheme.primaryColor}35`,
                color: currentTheme.primaryColor 
              }}
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-lg sm:text-xl font-bold tracking-tight ${currentTheme.headingText}`}>
                  Admin Operations Console
                </h1>
                <span 
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border"
                  style={{
                    backgroundColor: `${currentTheme.primaryColor}15`,
                    borderColor: `${currentTheme.primaryColor}30`,
                    color: currentTheme.primaryColor
                  }}
                >
                  Administrator
                </span>
              </div>
              <p className={`text-xs ${currentTheme.subText}`}>
                Direct customer management, live reports, pending fulfillment, pack catalogs & financial reconciliation.
              </p>
            </div>
          </div>

          {/* Right Action: Return to Customer Flow */}
          <div className="flex items-center gap-2.5">
            <div 
              className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 ${
                isLight ? 'bg-white border-gray-200 shadow-xs' : 'bg-black/40 border-white/15'
              }`}
            >
              <Crown className="w-3.5 h-3.5" style={{ color: currentTheme.primaryColor }} />
              <span className={`text-[11px] truncate max-w-[150px] font-medium ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                {user?.email || 'Admin User'}
              </span>
            </div>

            {onBackToCustomerFlow && (
              <button
                type="button"
                onClick={onBackToCustomerFlow}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm border ${
                  isLight
                    ? 'bg-white hover:bg-gray-100 text-gray-800 border-gray-300'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`}
                title="Switch back to Customer Recharge Screen"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Customer View</span>
              </button>
            )}
          </div>
        </div>

        {/* 6 PRECISE TABS NAVIGATION BAR */}
        <div 
          className={`px-3 sm:px-5 py-2.5 border-b flex items-center overflow-x-auto gap-2 no-scrollbar ${
            isLight ? 'bg-gray-100/70 border-gray-200' : 'bg-black/40 border-white/10'
          }`}
        >
          {adminTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`admin-tab-${tab.id}`}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap border shrink-0 ${
                  isActive
                    ? 'text-white border-transparent shadow-md'
                    : isLight
                    ? 'bg-white/80 hover:bg-white text-gray-700 border-gray-200'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                }`}
                style={{
                  backgroundColor: isActive ? currentTheme.primaryColor : undefined,
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span 
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                      isActive 
                        ? 'bg-black/30 text-white' 
                        : tab.id === 'pending'
                        ? 'bg-rose-500 text-white'
                        : isLight ? 'bg-gray-200 text-gray-800' : 'bg-white/20 text-gray-200'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ======================================================== */}
        {/* 1. CUSTOMER DETAILS */}
        {/* ======================================================== */}
        {activeTab === 'customers' && (
          <div className="p-4 sm:p-6 space-y-4 animate-in fade-in duration-200">
            {/* Dealer Domain Notice */}
            <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
              isLight ? 'bg-amber-50/80 border-amber-200 text-amber-900' : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
            }`}>
              <Info className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
              <div className="text-xs space-y-1">
                <p className="font-bold">Verified Customer Directory &amp; Dealership Orders Ledger</p>
                <p className="opacity-90 leading-relaxed">
                  DTH operators (Sun Direct, Tata Play, Airtel, Dish TV, D2H) protect subscriber internal balances and do not offer open public balance query APIs. 
                  This directory securely records your direct customer contacts (<strong>Name, Mobile, Smart Card &amp; Operator</strong>) and calculates order counts &amp; total spent directly from recharges processed through DTH Tamizhan. Renewal dates are estimated based on each customer&apos;s last purchased pack duration.
                </p>
              </div>
            </div>

            {/* Search and Filters Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${currentTheme.subText}`} />
                <input
                  type="text"
                  placeholder="Search customer name, mobile, smart card..."
                  value={custSearch}
                  onChange={(e) => setCustSearch(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border focus:outline-none transition-all ${
                    isLight 
                      ? 'bg-white border-gray-200 text-gray-800 focus:border-gray-400' 
                      : 'bg-black/30 border-white/10 text-white focus:border-white/30'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={custOpFilter}
                  onChange={(e) => setCustOpFilter(e.target.value)}
                  className={`px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                    isLight ? 'bg-white border-gray-200 text-gray-800' : 'bg-black/30 border-white/10 text-white'
                  }`}
                >
                  <option value="all">All Operators</option>
                  <option value="sun_direct">Sun Direct</option>
                  <option value="tata_play">Tata Play</option>
                  <option value="airtel_dth">Airtel Digital TV</option>
                  <option value="dish_tv">Dish TV</option>
                  <option value="d2h">D2H Videocon</option>
                </select>

                <select
                  value={custStatusFilter}
                  onChange={(e) => setCustStatusFilter(e.target.value)}
                  className={`px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                    isLight ? 'bg-white border-gray-200 text-gray-800' : 'bg-black/30 border-white/10 text-white'
                  }`}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="due_soon">Recharge Due Soon</option>
                  <option value="expired">Expired</option>
                </select>

                <button
                  type="button"
                  onClick={() => setShowAddCustModal(true)}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Customer</span>
                </button>

                <button
                  type="button"
                  onClick={fetchCustomers}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                    isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${custLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Customers Table */}
            <div className={`border rounded-2xl overflow-hidden ${isLight ? 'border-gray-200 bg-white' : 'border-white/10 bg-black/20'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className={`border-b ${isLight ? 'bg-gray-50 text-gray-600' : 'bg-black/40 text-gray-400'}`}>
                    <tr>
                      <th className="py-3 px-4 font-bold">Customer &amp; Mobile</th>
                      <th className="py-3 px-4 font-bold">Operator &amp; Smart Card</th>
                      <th className="py-3 px-4 font-bold">Last Recharged Pack</th>
                      <th className="py-3 px-4 font-bold">Orders via Tamizhan</th>
                      <th className="py-3 px-4 font-bold">Estimated Renewal</th>
                      <th className="py-3 px-4 font-bold">Status</th>
                      <th className="py-3 px-4 font-bold text-right">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLight ? 'divide-gray-100' : 'divide-white/5'}`}>
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-xs opacity-60">
                          No customer records found matching your filters. Click &quot;Add Customer&quot; above to register a new client.
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((c) => {
                        const statusColor = 
                          c.status === 'active' 
                            ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' 
                            : c.status === 'due_soon'
                            ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-600 border-rose-500/30';

                        return (
                          <tr key={c.id} className={`transition-colors ${isLight ? 'hover:bg-gray-50/70' : 'hover:bg-white/5'}`}>
                            <td className="py-3 px-4">
                              <p className={`font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{c.customerName}</p>
                              <p className="font-mono text-[11px] opacity-75">{c.registeredMobile}</p>
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-semibold">{c.operatorName}</p>
                              <p className="font-mono text-[11px] opacity-80">{c.smartCardNumber}</p>
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-medium truncate max-w-[170px]">{c.activePackName}</p>
                              <p className="text-[10px] opacity-60">Last: {c.lastRechargeDate || 'None'}</p>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-bold tabular-nums">{c.totalRechargesCount} recharges</span>
                              <p className="text-[10px] opacity-70">₹{c.totalSpent.toLocaleString()} total</p>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono text-[11px] font-semibold">{c.expiryDate}</span>
                              <span className="block text-[9px] opacity-60">Estimated due</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${statusColor}`}>
                                {c.status === 'due_soon' ? 'Renewal Due' : c.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onTriggerRefresh(c.operator as DthOperatorId, c.smartCardNumber)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 border border-amber-500/30 transition-all flex items-center gap-1"
                                  title="Send Satellite Heavy Refresh Signal"
                                >
                                  <Radio className="w-3 h-3" />
                                  <span>Signal</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleTabChange('recharges');
                                    setOrdersSearch(c.smartCardNumber);
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                                    isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-800' : 'bg-white/10 hover:bg-white/20 text-white'
                                  }`}
                                  title="View Recharge Orders"
                                >
                                  Orders
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCustToDelete(c)}
                                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/15 transition-all"
                                  title="Remove Customer Record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. REPORTS */}
        {/* ======================================================== */}
        {activeTab === 'reports' && (
          <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-200">
            {/* KPI Metric Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-gray-200' : 'bg-black/20 border-white/10'}`}>
                <span className={`text-[11px] font-medium block ${currentTheme.subText}`}>Total Revenue</span>
                <p className="text-xl sm:text-2xl font-black tabular-nums tracking-tight mt-1 text-emerald-600 dark:text-emerald-400">
                  ₹{reportsData?.metrics?.totalRevenue?.toLocaleString('en-IN') || 0}
                </p>
                <span className="text-[10px] opacity-70 mt-0.5 block font-medium">Lifetime collections</span>
              </div>

              <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-gray-200' : 'bg-black/20 border-white/10'}`}>
                <span className={`text-[11px] font-medium block ${currentTheme.subText}`}>Today's Revenue</span>
                <p className="text-xl sm:text-2xl font-black tabular-nums tracking-tight mt-1" style={{ color: currentTheme.primaryColor }}>
                  ₹{reportsData?.metrics?.todayRevenue?.toLocaleString('en-IN') || 0}
                </p>
                <span className="text-[10px] opacity-70 mt-0.5 block font-medium">Recharges settled today</span>
              </div>

              <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-gray-200' : 'bg-black/20 border-white/10'}`}>
                <span className={`text-[11px] font-medium block ${currentTheme.subText}`}>Pending Queue</span>
                <p className="text-xl sm:text-2xl font-black tabular-nums tracking-tight mt-1 text-rose-500">
                  {reportsData?.metrics?.pendingOrdersCount || pendingOrdersList.length}
                </p>
                <span className="text-[10px] opacity-70 mt-0.5 block font-medium">Awaiting fulfillment</span>
              </div>

              <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-gray-200' : 'bg-black/20 border-white/10'}`}>
                <span className={`text-[11px] font-medium block ${currentTheme.subText}`}>Success Rate</span>
                <p className="text-xl sm:text-2xl font-black tabular-nums tracking-tight mt-1 text-emerald-500">
                  {reportsData?.metrics?.successRate || 99}%
                </p>
                <span className="text-[10px] opacity-70 mt-0.5 block font-medium">Transponder delivery</span>
              </div>

              <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-gray-200' : 'bg-black/20 border-white/10'}`}>
                <span className={`text-[11px] font-medium block ${currentTheme.subText}`}>Avg. Ticket Size</span>
                <p className="text-xl sm:text-2xl font-black tabular-nums tracking-tight mt-1">
                  ₹{reportsData?.metrics?.averageOrderValue || 310}
                </p>
                <span className="text-[10px] opacity-70 mt-0.5 block font-medium">Per recharge order</span>
              </div>

              <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-gray-200' : 'bg-black/20 border-white/10'}`}>
                <span className={`text-[11px] font-medium block ${currentTheme.subText}`}>Total Subscribers</span>
                <p className="text-xl sm:text-2xl font-black tabular-nums tracking-tight mt-1">
                  {customers.length}
                </p>
                <span className="text-[10px] opacity-70 mt-0.5 block font-medium">Verified customer boxes</span>
              </div>
            </div>

            {/* Split Visual Analytics: Operator Share & Payment Modes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Operator Breakdown */}
              <div className={`p-5 rounded-2xl border ${isLight ? 'bg-white border-gray-200' : 'bg-black/20 border-white/10'}`}>
                <div className="flex items-center justify-between pb-3 border-b border-gray-500/10">
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    <Tv className="w-4 h-4" style={{ color: currentTheme.primaryColor }} />
                    <span>Revenue by DTH Operator</span>
                  </h3>
                  <span className="text-[11px] opacity-70">Tamil Nadu Market</span>
                </div>

                <div className="space-y-3.5 mt-4">
                  {(reportsData?.operatorBreakdown || [
                    { operatorId: 'sun_direct', name: 'Sun Direct', revenue: 2110, sharePercentage: 45, ordersCount: 3 },
                    { operatorId: 'tata_play', name: 'Tata Play', revenue: 1450, sharePercentage: 30, ordersCount: 2 },
                    { operatorId: 'airtel_dth', name: 'Airtel Digital TV', revenue: 620, sharePercentage: 15, ordersCount: 1 },
                    { operatorId: 'dish_tv', name: 'Dish TV & D2H', revenue: 435, sharePercentage: 10, ordersCount: 1 },
                  ]).map((op: any) => (
                    <div key={op.operatorId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="flex items-center gap-2">
                          <span 
                            className="w-2.5 h-2.5 rounded-full" 
                            style={{ 
                              backgroundColor: 
                                op.operatorId === 'sun_direct' ? '#F97316' : 
                                op.operatorId === 'tata_play' ? '#EC4899' :
                                op.operatorId === 'airtel_dth' ? '#EF4444' : '#EB5B26'
                            }} 
                          />
                          <span>{op.name}</span>
                        </span>
                        <span className="tabular-nums font-bold">
                          ₹{op.revenue?.toLocaleString('en-IN') || 0} ({op.sharePercentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${op.sharePercentage}%`,
                            backgroundColor: 
                              op.operatorId === 'sun_direct' ? '#F97316' : 
                              op.operatorId === 'tata_play' ? '#EC4899' :
                              op.operatorId === 'airtel_dth' ? '#EF4444' : '#EB5B26'
                          }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Methods Distribution */}
              <div className={`p-5 rounded-2xl border ${isLight ? 'bg-white border-gray-200' : 'bg-black/20 border-white/10'}`}>
                <div className="flex items-center justify-between pb-3 border-b border-gray-500/10">
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    <CreditCard className="w-4 h-4" style={{ color: currentTheme.primaryColor }} />
                    <span>Payment Methods Distribution</span>
                  </h3>
                  <span className="text-[11px] opacity-70">Fast Settlement</span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
                    <span className="text-[11px] font-bold block text-emerald-600">UPI Instant Pay</span>
                    <p className="text-lg font-black mt-1">65%</p>
                    <span className="text-[10px] opacity-70">GPay, PhonePe, Paytm</span>
                  </div>

                  <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
                    <span className="text-[11px] font-bold block text-blue-500">Dynamic QR Code</span>
                    <p className="text-lg font-black mt-1">20%</p>
                    <span className="text-[10px] opacity-70">Scan & Pay desk terminal</span>
                  </div>

                  <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
                    <span className="text-[11px] font-bold block text-purple-500">Debit / Credit Card</span>
                    <p className="text-lg font-black mt-1">10%</p>
                    <span className="text-[10px] opacity-70">Visa, Mastercard, RuPay</span>
                  </div>

                  <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
                    <span className="text-[11px] font-bold block text-amber-500">Net Banking</span>
                    <p className="text-lg font-black mt-1">5%</p>
                    <span className="text-[10px] opacity-70">SBI, HDFC, ICICI, IOB</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. RECHARGE PENDINGS */}
        {/* ======================================================== */}
        {activeTab === 'pending' && (
          <div className="p-4 sm:p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-rose-500" />
                  <span>Pending Recharge Queue</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white">
                    {pendingOrdersList.length} Pending
                  </span>
                </h2>
                <p className={`text-xs mt-0.5 ${currentTheme.subText}`}>
                  These recharge orders require operator transponder confirmation or manual push.
                </p>
              </div>

              <button
                onClick={fetchOrders}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                  isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${ordersLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Queue</span>
              </button>
            </div>

            {/* Pending Orders Table */}
            <div className={`border rounded-2xl overflow-hidden ${isLight ? 'border-gray-200 bg-white' : 'border-white/10 bg-black/20'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className={`border-b ${isLight ? 'bg-gray-50 text-gray-600' : 'bg-black/40 text-gray-400'}`}>
                    <tr>
                      <th className="py-3 px-4 font-bold">Order ID & Time</th>
                      <th className="py-3 px-4 font-bold">Customer Contact</th>
                      <th className="py-3 px-4 font-bold">Operator & Smart Card</th>
                      <th className="py-3 px-4 font-bold">Pack Details</th>
                      <th className="py-3 px-4 font-bold">Amount</th>
                      <th className="py-3 px-4 font-bold">Status</th>
                      <th className="py-3 px-4 font-bold text-right">One-Click Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLight ? 'divide-gray-100' : 'divide-white/5'}`}>
                    {pendingOrdersList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-xs opacity-70">
                          <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                          <p className="font-bold text-sm">All caught up! Zero pending recharges in queue.</p>
                          <p className="text-[11px] opacity-75 mt-0.5">New incoming recharges will appear here automatically.</p>
                        </td>
                      </tr>
                    ) : (
                      pendingOrdersList.map((o) => (
                        <tr key={o.orderId} className={`transition-colors ${isLight ? 'hover:bg-gray-50/70' : 'hover:bg-white/5'}`}>
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold">{o.orderId}</span>
                            <span className="block text-[10px] opacity-70 font-mono mt-0.5">
                              {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium">
                            <p>{o.registeredMobile || 'N/A'}</p>
                            <span className="text-[10px] opacity-75 uppercase font-mono">{o.paymentMethod} • PAID</span>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-semibold">{o.operatorName}</p>
                            <span className="font-mono text-[11px] opacity-80">{o.smartCardNumber}</span>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium truncate max-w-[150px]">{o.packName}</p>
                            <span className="text-[10px] opacity-70">{o.packValidity}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-black text-sm tabular-nums">₹{o.amount}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase bg-amber-500/15 text-amber-600 border-amber-500/30">
                              {o.rechargeStatus}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <button
                                type="button"
                                disabled={isUpdatingOrder}
                                onClick={() => handleUpdateOrderStatus(o.orderId, 'completed', undefined, 'Confirmed via Admin Console')}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center gap-1 shadow-xs"
                                title="Mark as Completed"
                              >
                                <Check className="w-3 h-3" />
                                <span>Complete</span>
                              </button>

                              <button
                                type="button"
                                disabled={isUpdatingOrder}
                                onClick={() => handleUpdateOrderStatus(o.orderId, 'processing', undefined, 'Processing via transponder')}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all"
                                title="Mark as Processing"
                              >
                                <span>Processing</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOrder(o);
                                  handleTabChange('recharges');
                                }}
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold border ${
                                  isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-800' : 'bg-white/10 hover:bg-white/20 text-white'
                                }`}
                                title="Inspect and edit details"
                              >
                                Details
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. RECHARGE UPDATION */}
        {/* ======================================================== */}
        {activeTab === 'recharges' && (
          <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-200">
            {/* Top Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${currentTheme.subText}`} />
                <input
                  type="text"
                  placeholder="Find order by Order ID, Smart Card, Mobile..."
                  value={ordersSearch}
                  onChange={(e) => setOrdersSearch(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border focus:outline-none transition-all ${
                    isLight ? 'bg-white border-gray-200 text-gray-800' : 'bg-black/30 border-white/10 text-white'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={ordersStatusFilter}
                  onChange={(e) => setOrdersStatusFilter(e.target.value)}
                  className={`px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                    isLight ? 'bg-white border-gray-200 text-gray-800' : 'bg-black/30 border-white/10 text-white'
                  }`}
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>

                <button
                  onClick={fetchOrders}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                    isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${ordersLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Split View: Order Selector & Interactive Status Updater */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Order List Column */}
              <div className="lg:col-span-7 space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
                {filteredOrders.length === 0 ? (
                  <div className="p-8 text-center text-xs opacity-60 border rounded-2xl">
                    No recharge orders found matching query.
                  </div>
                ) : (
                  filteredOrders.map((o) => {
                    const isSelected = selectedOrder?.orderId === o.orderId;
                    return (
                      <div
                        key={o.orderId}
                        onClick={() => {
                          setSelectedOrder(o);
                          setStatusUpdateVal(o.rechargeStatus);
                          setOperatorRefVal(o.operatorRefId || '');
                          setWorkerNotesVal(o.workerNotes || '');
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-2 shadow-md'
                            : isLight
                            ? 'bg-white border-gray-200 hover:border-gray-300'
                            : 'bg-black/20 border-white/10 hover:border-white/20'
                        }`}
                        style={{
                          borderColor: isSelected ? currentTheme.primaryColor : undefined,
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-xs">{o.orderId}</span>
                          <span 
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                              o.rechargeStatus === 'completed'
                                ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                                : o.rechargeStatus === 'pending'
                                ? 'bg-rose-500/15 text-rose-600 border-rose-500/30'
                                : o.rechargeStatus === 'processing'
                                ? 'bg-blue-500/15 text-blue-600 border-blue-500/30'
                                : 'bg-gray-500/15 text-gray-600 border-gray-500/30'
                            }`}
                          >
                            {o.rechargeStatus}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs mt-2">
                          <div>
                            <p className="font-bold">{o.operatorName} • {o.smartCardNumber}</p>
                            <p className={`text-[11px] mt-0.5 ${currentTheme.subText}`}>{o.packName}</p>
                          </div>
                          <span className="text-sm font-black tabular-nums">₹{o.amount}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Status Update Console Column */}
              <div className="lg:col-span-5">
                {selectedOrder ? (
                  <div className={`p-5 rounded-2xl border space-y-4 shadow-sm ${
                    isLight ? 'bg-white border-gray-200' : 'bg-black/30 border-white/15'
                  }`}>
                    <div className="flex items-center justify-between border-b pb-3 border-gray-500/10">
                      <div>
                        <span className="text-[10px] uppercase font-mono opacity-60">Selected Order</span>
                        <h3 className="font-mono font-bold text-sm">{selectedOrder.orderId}</h3>
                      </div>
                      <span className="text-base font-black text-emerald-600 tabular-nums">
                        ₹{selectedOrder.amount}
                      </span>
                    </div>

                    {/* Metadata summary */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] opacity-60 block">Operator</span>
                        <span className="font-semibold">{selectedOrder.operatorName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] opacity-60 block">Smart Card / VC</span>
                        <span className="font-mono font-semibold">{selectedOrder.smartCardNumber}</span>
                      </div>
                      <div>
                        <span className="text-[10px] opacity-60 block">Payment Method</span>
                        <span className="uppercase font-mono font-semibold">{selectedOrder.paymentMethod}</span>
                      </div>
                      <div>
                        <span className="text-[10px] opacity-60 block">Created At</span>
                        <span className="font-mono text-[11px]">{new Date(selectedOrder.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    {/* Status Updation Form */}
                    <div className="space-y-3 pt-2 border-t border-gray-500/10">
                      <div>
                        <label className="text-xs font-bold block mb-1">Set Recharge Status</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(['completed', 'processing', 'pending', 'failed'] as const).map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => setStatusUpdateVal(st)}
                              className={`py-1.5 px-2 rounded-xl text-xs font-bold border capitalize transition-all ${
                                statusUpdateVal === st
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                  : isLight
                                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
                                  : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold block mb-1">Operator Reference ID / RRN</label>
                        <input
                          type="text"
                          value={operatorRefVal}
                          onChange={(e) => setOperatorRefVal(e.target.value)}
                          placeholder="e.g. SUN-TXN-984210"
                          className={`w-full px-3 py-2 rounded-xl text-xs font-mono border focus:outline-none ${
                            isLight ? 'bg-gray-50 border-gray-200 text-gray-800' : 'bg-black/40 border-white/15 text-white'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold block mb-1">Admin / Operator Notes</label>
                        <input
                          type="text"
                          value={workerNotesVal}
                          onChange={(e) => setWorkerNotesVal(e.target.value)}
                          placeholder="Fulfillment verified on transponder"
                          className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                            isLight ? 'bg-gray-50 border-gray-200 text-gray-800' : 'bg-black/40 border-white/15 text-white'
                          }`}
                        />
                      </div>

                      <div className="pt-2 flex flex-col gap-2">
                        <button
                          type="button"
                          disabled={isUpdatingOrder}
                          onClick={() => handleUpdateOrderStatus(selectedOrder.orderId, statusUpdateVal, operatorRefVal, workerNotesVal)}
                          className="w-full py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center justify-center gap-1.5"
                          style={{ backgroundColor: currentTheme.primaryColor }}
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{isUpdatingOrder ? 'Saving...' : 'Update & Dispatch Recharge'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onTriggerRefresh(selectedOrder.operator, selectedOrder.smartCardNumber)}
                          className="w-full py-2 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 border border-amber-500/30 transition-all flex items-center justify-center gap-1.5"
                        >
                          <Radio className="w-3.5 h-3.5" />
                          <span>Clear E16 Error / Satellite Refresh</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs opacity-60 border rounded-2xl">
                    Select an order from the list to view and update.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 5. PACKS UPDATION */}
        {/* ======================================================== */}
        {activeTab === 'packs' && (
          <div className="p-4 sm:p-6 space-y-4 animate-in fade-in duration-200">
            {/* Operator Switcher & Add Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Operator Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {(['sun_direct', 'tata_play', 'airtel_dth', 'dish_tv', 'd2h'] as DthOperatorId[]).map((opId) => {
                  const isActive = selectedPackOp === opId;
                  return (
                    <button
                      key={opId}
                      type="button"
                      onClick={() => setSelectedPackOp(opId)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                        isActive
                          ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-xs'
                          : isLight
                          ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
                          : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                      }`}
                    >
                      {OPERATOR_NAMES[opId]}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={packTypeFilter}
                  onChange={(e) => setPackTypeFilter(e.target.value as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs border font-medium focus:outline-none ${
                    isLight ? 'bg-white border-gray-200 text-gray-800' : 'bg-black/30 border-white/10 text-white'
                  }`}
                >
                  <option value="all">All Packs (HD & SD)</option>
                  <option value="HD">HD Only</option>
                  <option value="SD">SD Only</option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setExcelModalTab('export');
                    setIsExcelModalOpen(true);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    isLight ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' : 'bg-blue-950/40 text-blue-300 border-blue-500/30 hover:bg-blue-900/50'
                  }`}
                  title="Export Current Packs or Download Template"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export / Template</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExcelModalTab('import');
                    setIsExcelModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs flex items-center gap-1.5 transition-all bg-emerald-600 hover:bg-emerald-700"
                  title="Re-upload Excel Spreadsheet to Update Packs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Import Excel</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAddPack}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm flex items-center gap-1.5 transition-all"
                  style={{ backgroundColor: currentTheme.primaryColor }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Pack</span>
                </button>
              </div>
            </div>

            {/* Packs Grid / Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPacks.length === 0 ? (
                <div className="col-span-full p-12 text-center text-xs opacity-60 border rounded-2xl">
                  No packs configured for {OPERATOR_NAMES[selectedPackOp]}. Click "Add New Pack" to create one.
                </div>
              ) : (
                filteredPacks.map((p) => (
                  <div
                    key={p.id}
                    className={`p-4 rounded-2xl border transition-all space-y-3 relative group ${
                      isLight ? 'bg-white border-gray-200 shadow-xs' : 'bg-black/20 border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            p.pack_type === 'HD' ? 'bg-amber-500/15 text-amber-600' : 'bg-blue-500/15 text-blue-600'
                          }`}>
                            {p.pack_type}
                          </span>
                          <span className="text-[10px] font-bold opacity-75">
                            {p.duration_months} Month{p.duration_months > 1 ? 's' : ''}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm mt-1 leading-snug">{p.plan_name}</h4>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-black tabular-nums" style={{ color: currentTheme.primaryColor }}>
                          ₹{p.amount}
                        </span>
                        <span className="text-[10px] opacity-60 block">₹{Math.round(p.amount / p.duration_months)}/mo</span>
                      </div>
                    </div>

                    <div className="text-[11px] opacity-75 line-clamp-2">
                      {p.channel_list.slice(0, 5).join(', ')}... ({p.channel_list.length} Channels)
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-500/10">
                      <span className="text-[10px] opacity-60 font-mono">
                        {p.is_recommended ? '★ Recommended' : 'Standard Pack'}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditPack(p)}
                          className={`p-1.5 rounded-lg border text-xs font-semibold transition-all ${
                            isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-white/10 text-gray-200'
                          }`}
                          title="Edit Pack Pricing / Details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePack(p)}
                          className="p-1.5 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-semibold transition-all"
                          title="Delete Pack"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pack Add/Edit Modal */}
            {isPackModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
                <div className={`w-full max-w-lg rounded-3xl p-6 border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${
                  isLight ? 'bg-white border-gray-200 text-gray-800' : 'bg-[#0b1428] border-white/15 text-white'
                }`}>
                  <div className="flex items-center justify-between border-b pb-3 border-gray-500/15">
                    <h3 className="font-bold text-base">
                      {editingPack ? 'Edit DTH Recharge Pack' : 'Create New DTH Pack'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsPackModalOpen(false)}
                      className="p-1 rounded-lg hover:bg-gray-500/10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSavePack} className="space-y-3.5 text-xs">
                    <div>
                      <label className="font-bold block mb-1">DTH Operator</label>
                      <select
                        value={packFormData.operator}
                        onChange={(e) => setPackFormData({ ...packFormData, operator: e.target.value as any })}
                        className={`w-full px-3 py-2 rounded-xl border font-semibold ${
                          isLight ? 'bg-gray-50 border-gray-300' : 'bg-black/30 border-white/20'
                        }`}
                      >
                        <option value="sun_direct">Sun Direct</option>
                        <option value="tata_play">Tata Play</option>
                        <option value="airtel_dth">Airtel Digital TV</option>
                        <option value="dish_tv">Dish TV</option>
                        <option value="d2h">D2H Videocon</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold block mb-1">Pack Type</label>
                        <select
                          value={packFormData.pack_type}
                          onChange={(e) => setPackFormData({ ...packFormData, pack_type: e.target.value as any })}
                          className={`w-full px-3 py-2 rounded-xl border font-semibold ${
                            isLight ? 'bg-gray-50 border-gray-300' : 'bg-black/30 border-white/20'
                          }`}
                        >
                          <option value="HD">HD Pack</option>
                          <option value="SD">SD Pack</option>
                        </select>
                      </div>

                      <div>
                        <label className="font-bold block mb-1">Duration</label>
                        <select
                          value={packFormData.duration_months}
                          onChange={(e) => setPackFormData({ ...packFormData, duration_months: Number(e.target.value) as any })}
                          className={`w-full px-3 py-2 rounded-xl border font-semibold ${
                            isLight ? 'bg-gray-50 border-gray-300' : 'bg-black/30 border-white/20'
                          }`}
                        >
                          <option value="1">1 Month</option>
                          <option value="6">6 Months Saver</option>
                          <option value="12">12 Months (Annual)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="font-bold block mb-1">Pack Name</label>
                      <input
                        type="text"
                        required
                        value={packFormData.plan_name}
                        onChange={(e) => setPackFormData({ ...packFormData, plan_name: e.target.value })}
                        placeholder="e.g. Tamil Super Value Pack"
                        className={`w-full px-3 py-2 rounded-xl border ${
                          isLight ? 'bg-gray-50 border-gray-300' : 'bg-black/30 border-white/20'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="font-bold block mb-1">Price (₹ INR)</label>
                      <input
                        type="number"
                        required
                        min="10"
                        max="50000"
                        value={packFormData.amount}
                        onChange={(e) => setPackFormData({ ...packFormData, amount: e.target.value })}
                        placeholder="e.g. 219"
                        className={`w-full px-3 py-2 rounded-xl border font-mono font-bold ${
                          isLight ? 'bg-gray-50 border-gray-300' : 'bg-black/30 border-white/20'
                        }`}
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="rec-pack-toggle"
                        checked={packFormData.is_recommended}
                        onChange={(e) => setPackFormData({ ...packFormData, is_recommended: e.target.checked })}
                        className="w-4 h-4 rounded text-emerald-600"
                      />
                      <label htmlFor="rec-pack-toggle" className="font-semibold cursor-pointer">
                        Feature as Recommended Pack in Quick Recharge
                      </label>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-500/15">
                      <button
                        type="button"
                        onClick={() => setIsPackModalOpen(false)}
                        className={`px-4 py-2 rounded-xl font-bold border ${
                          isLight ? 'bg-gray-100 text-gray-700' : 'bg-white/10 text-white'
                        }`}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl font-bold text-white shadow-sm"
                        style={{ backgroundColor: currentTheme.primaryColor }}
                      >
                        Save Pack
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 6. PAYMENT REPORTS */}
        {/* ======================================================== */}
        {activeTab === 'payments' && (
          <div className="p-4 sm:p-6 space-y-4 animate-in fade-in duration-200">
            {/* Top Toolbar: Search, Filters & Export */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${currentTheme.subText}`} />
                <input
                  type="text"
                  placeholder="Search transaction ID, order ID, phone..."
                  value={paySearch}
                  onChange={(e) => setPaySearch(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border focus:outline-none ${
                    isLight ? 'bg-white border-gray-200 text-gray-800' : 'bg-black/30 border-white/10 text-white'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={payOpFilter}
                  onChange={(e) => setPayOpFilter(e.target.value)}
                  className={`px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                    isLight ? 'bg-white border-gray-200 text-gray-800' : 'bg-black/30 border-white/10 text-white'
                  }`}
                >
                  <option value="all">All Operators</option>
                  <option value="sun_direct">Sun Direct</option>
                  <option value="tata_play">Tata Play</option>
                  <option value="airtel_dth">Airtel Digital TV</option>
                  <option value="dish_tv">Dish TV</option>
                </select>

                <select
                  value={payStatusFilter}
                  onChange={(e) => setPayStatusFilter(e.target.value)}
                  className={`px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                    isLight ? 'bg-white border-gray-200 text-gray-800' : 'bg-black/30 border-white/10 text-white'
                  }`}
                >
                  <option value="all">All Payments</option>
                  <option value="paid">Paid</option>
                  <option value="initiated">Initiated</option>
                  <option value="failed">Failed</option>
                </select>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                    isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
              </div>
            </div>

            {/* Payments Ledger Table */}
            <div className={`border rounded-2xl overflow-hidden ${isLight ? 'border-gray-200 bg-white' : 'border-white/10 bg-black/20'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className={`border-b ${isLight ? 'bg-gray-50 text-gray-600' : 'bg-black/40 text-gray-400'}`}>
                    <tr>
                      <th className="py-3 px-4 font-bold">Transaction / Payment ID</th>
                      <th className="py-3 px-4 font-bold">Order ID</th>
                      <th className="py-3 px-4 font-bold">Customer Details</th>
                      <th className="py-3 px-4 font-bold">Operator & Box</th>
                      <th className="py-3 px-4 font-bold">Amount</th>
                      <th className="py-3 px-4 font-bold">Payment Mode</th>
                      <th className="py-3 px-4 font-bold">Gateway Ref</th>
                      <th className="py-3 px-4 font-bold">Date & Time</th>
                      <th className="py-3 px-4 font-bold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLight ? 'divide-gray-100' : 'divide-white/5'}`}>
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-xs opacity-60">
                          No payment transaction logs found.
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map((p) => (
                        <tr key={p.transactionId} className={`transition-colors ${isLight ? 'hover:bg-gray-50/70' : 'hover:bg-white/5'}`}>
                          <td className="py-3 px-4 font-mono font-bold text-[11px]">
                            {p.transactionId}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] opacity-80">
                            {p.orderId}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-bold">{p.customerName}</p>
                            <p className="font-mono text-[10px] opacity-75">{p.registeredMobile}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-semibold">{p.operatorName}</p>
                            <span className="font-mono text-[10px] opacity-75">{p.smartCardNumber}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-black text-sm tabular-nums text-emerald-600 dark:text-emerald-400">
                              ₹{p.amount}
                            </span>
                          </td>
                          <td className="py-3 px-4 uppercase font-mono text-[10px]">
                            {p.paymentMethod}
                          </td>
                          <td className="py-3 px-4 font-mono text-[10px] opacity-75">
                            {p.gatewayRef}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px]">
                            {new Date(p.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                            <span className="opacity-60">{new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                              {p.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- 7. ADMIN AUTHORIZATION & ACCESS CONTROL TAB --- */}
        {activeTab === 'approvals' && (
          <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-200">
            {/* Header Banner */}
            <div 
              className={`p-5 rounded-2xl border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                isLight 
                  ? 'bg-white border-gray-200 text-gray-900' 
                  : 'bg-black/30 border-white/10 text-white'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner"
                  style={{
                    backgroundColor: `${currentTheme.primaryColor}15`,
                    borderColor: `${currentTheme.primaryColor}30`,
                    color: currentTheme.primaryColor,
                  }}
                >
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold">
                      Administrator Authorization & Team Management
                    </h3>
                    <span 
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border"
                      style={{
                        backgroundColor: `${currentTheme.primaryColor}15`,
                        color: currentTheme.primaryColor,
                        borderColor: `${currentTheme.primaryColor}30`,
                      }}
                    >
                      Admin Access
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${currentTheme.subText}`}>
                    Authorize administrative accounts directly to grant operations access across customer records, recharge orders, and catalog pricing.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchAccessList}
                  disabled={accessLoading}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all shadow-xs ${
                    isLight 
                      ? 'bg-gray-50 hover:bg-gray-100 text-gray-800 border-gray-300' 
                      : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${accessLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh List</span>
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {/* 1. Direct Administrator Authorization Form */}
              <div className={`p-5 rounded-2xl border ${isLight ? 'bg-white border-gray-200 shadow-xs' : 'bg-black/20 border-white/10'}`}>
                <div className="mb-4">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-500" />
                    Direct Administrator Authorization
                  </h4>
                  <p className={`text-xs ${currentTheme.subText}`}>
                    Add a new administrator by email to instantly grant administrative privileges.
                  </p>
                </div>

                <form onSubmit={handleDirectGrant} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="email"
                    required
                    value={directEmail}
                    onChange={(e) => setDirectEmail(e.target.value)}
                    placeholder="Admin Email (e.g. manager@gmail.com)"
                    className={`px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                      isLight ? 'bg-white border-gray-200 text-gray-800' : 'bg-black/30 border-white/10 text-white'
                    }`}
                  />
                  <input
                    type="text"
                    value={directName}
                    onChange={(e) => setDirectName(e.target.value)}
                    placeholder="Full Name / Branch (Optional)"
                    className={`px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                      isLight ? 'bg-white border-gray-200 text-gray-800' : 'bg-black/30 border-white/10 text-white'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={isDirectGranting || !directEmail.trim()}
                    className="py-2 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-all flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isDirectGranting ? 'Authorizing...' : 'Authorize Administrator'}</span>
                  </button>
                </form>
              </div>

              {/* 2. Authorized Administrators Directory */}
              <div className={`p-5 rounded-2xl border ${isLight ? 'bg-white border-gray-200 shadow-xs' : 'bg-black/20 border-white/10'}`}>
                <div className="mb-4">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Authorized Administrators Directory ({adminAccounts.length})
                  </h4>
                  <p className={`text-xs ${currentTheme.subText}`}>
                    Active administrators authorized for DTH customer management and catalog operations.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className={`border-b ${isLight ? 'bg-gray-50 text-gray-600' : 'bg-black/40 text-gray-400'}`}>
                      <tr>
                        <th className="py-3 px-4 font-bold">Admin Details</th>
                        <th className="py-3 px-4 font-bold">Role</th>
                        <th className="py-3 px-4 font-bold">Status</th>
                        <th className="py-3 px-4 font-bold">Authorized Date</th>
                        <th className="py-3 px-4 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isLight ? 'divide-gray-100' : 'divide-white/5'}`}>
                      {adminAccounts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-xs opacity-60">
                            No team administrators added yet. Use the form above to authorize administrators.
                          </td>
                        </tr>
                      ) : (
                        adminAccounts.map((adm) => {
                          const isRoot = isSuperAdminEmail(adm.email);
                          return (
                            <tr key={adm.email} className={`transition-colors ${isLight ? 'hover:bg-gray-50/70' : 'hover:bg-white/5'}`}>
                              <td className="py-3 px-4">
                                <p className="font-bold flex items-center gap-1.5">
                                  {adm.displayName || adm.email.split('@')[0]}
                                </p>
                                <p className="font-mono text-[11px] opacity-75">{adm.email}</p>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30`}>
                                  Admin
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  adm.status === 'approved' 
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' 
                                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                }`}>
                                  {adm.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono text-[11px] opacity-75">
                                {new Date(adm.approvedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {isRoot ? (
                                  <span className="text-[10px] opacity-40 font-semibold italic">Primary Admin</span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleRevokeAdmin(adm.email)}
                                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition-colors"
                                  >
                                    Revoke
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* OPERATOR CONTROL & CONDITIONAL AVAILABILITY */}
        {/* ======================================================== */}
        {activeTab === 'operators' && (
          <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-200">
            {/* Header Banner */}
            <div 
              className={`p-5 rounded-2xl border shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                isLight 
                  ? 'bg-gradient-to-r from-gray-50 via-amber-50/30 to-gray-50 border-gray-200' 
                  : 'bg-gradient-to-r from-black/40 via-amber-950/20 to-black/40 border-white/10'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 shadow-sm"
                  style={{ 
                    backgroundColor: `${currentTheme.primaryColor}15`, 
                    borderColor: `${currentTheme.primaryColor}30`,
                    color: currentTheme.primaryColor 
                  }}
                >
                  <Sliders className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className={`text-base sm:text-lg font-bold ${currentTheme.headingText}`}>
                      DTH Operator Control &amp; Availability Engine
                    </h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                      Live Gate
                    </span>
                  </div>
                  <p className={`text-xs ${currentTheme.subText} mt-0.5`}>
                    Instantly enable or disable any DTH operator with custom conditional reasons (Scheduled Maintenance, Gateway Outage, Transponder Issues, or Custom Notices).
                  </p>
                </div>
              </div>

              {/* Status summary pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${
                  isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{operatorList.filter((o) => o.isEnabled !== false).length} Active Online</span>
                </div>

                {operatorList.filter((o) => o.isEnabled === false).length > 0 && (
                  <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${
                    isLight ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                  }`}>
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    <span>{operatorList.filter((o) => o.isEnabled === false).length} Offline / Maintenance</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={fetchOperators}
                  disabled={operatorsLoading}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isLight ? 'bg-white hover:bg-gray-100 text-gray-700 border-gray-200' : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
                  }`}
                  title="Refresh Operator Status"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${operatorsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Operator Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {operatorList.map((op) => {
                const isOnline = op.isEnabled !== false;
                return (
                  <div
                    key={op.id}
                    className={`rounded-2xl border p-5 shadow-xs transition-all relative overflow-hidden flex flex-col justify-between ${
                      isLight 
                        ? isOnline ? 'bg-white border-gray-200 hover:border-gray-300' : 'bg-rose-50/30 border-rose-200'
                        : isOnline ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-rose-950/15 border-rose-500/30'
                    }`}
                  >
                    {/* Top status indicator bar */}
                    <div 
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{ backgroundColor: isOnline ? op.logoColor : '#EF4444' }}
                    />

                    <div className="space-y-4">
                      {/* Operator Brand Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-xs shrink-0"
                            style={{ backgroundColor: op.logoColor }}
                          >
                            {op.shortName ? op.shortName.slice(0, 3).toUpperCase() : op.name.slice(0, 3).toUpperCase()}
                          </div>
                          <div>
                            <h3 className={`font-bold text-sm sm:text-base leading-snug ${currentTheme.headingText}`}>
                              {op.name}
                            </h3>
                            <p className={`text-xs ${currentTheme.mutedText}`}>
                              {op.tamilName} • {op.cardName}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span 
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 flex items-center gap-1.5 ${
                            isOnline 
                              ? isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                              : isLight ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-rose-950/40 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                          {isOnline ? 'Online' : 'Disabled'}
                        </span>
                      </div>

                      {/* Condition & Notice Details */}
                      {!isOnline ? (
                        <div className={`p-3 rounded-xl border text-xs space-y-2 ${
                          isLight ? 'bg-rose-50/80 border-rose-200 text-rose-900' : 'bg-rose-950/30 border-rose-500/20 text-rose-200'
                        }`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {op.conditionLabel || 'Maintenance Active'}
                            </span>
                            {op.expectedRestoration && (
                              <span className="text-[10px] font-semibold opacity-80">
                                Resumes: {op.expectedRestoration}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] leading-relaxed opacity-90">
                            &ldquo;{op.maintenanceMessage || 'Temporarily disabled for customer orders by admin.'}&rdquo;
                          </p>
                          {op.updatedBy && (
                            <p className="text-[10px] opacity-70 border-t border-rose-200 dark:border-rose-900/50 pt-1.5">
                              Updated by {op.updatedBy}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                          isLight ? 'bg-emerald-50/50 border-emerald-200/50 text-emerald-900' : 'bg-emerald-950/20 border-emerald-500/15 text-emerald-200'
                        }`}>
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="text-[11px]">Recharge gateway healthy &amp; processing subscriber transactions normally.</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="pt-4 mt-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenConditionModal(op)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                          isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300' : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                        }`}
                      >
                        <Sliders className="w-3 h-3" />
                        <span>Configure Condition</span>
                      </button>

                      {isOnline ? (
                        <button
                          type="button"
                          onClick={() => handleOpenConditionModal(op, false)}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white shadow-xs"
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>Disable</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleOperatorStatus(op.id, true)}
                          disabled={isUpdatingOperator}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Enable Now</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Operator Condition Configuration Modal */}
      {isConditionModalOpen && selectedOperatorForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className={`w-full max-w-lg rounded-3xl p-6 border shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto ${
            isLight ? 'bg-white border-gray-200 text-gray-800' : 'bg-[#0e172a] border-white/15 text-white'
          }`}>
            <div className="flex items-center justify-between border-b pb-4 border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white text-sm shrink-0 shadow-sm"
                  style={{ backgroundColor: selectedOperatorForModal.logoColor }}
                >
                  {selectedOperatorForModal.shortName ? selectedOperatorForModal.shortName.slice(0, 3) : 'OP'}
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    Configure {selectedOperatorForModal.name} Availability
                  </h3>
                  <p className="text-xs opacity-75">
                    Control whether customers can recharge this operator and publish maintenance notices.
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsConditionModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Enable/Disable Toggle Segment */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold block opacity-80">Service Status Target</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setModalTargetEnabled(true)}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    modalTargetEnabled
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                      : isLight ? 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Online (Enabled)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalTargetEnabled(false)}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    !modalTargetEnabled
                      ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                      : isLight ? 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <Power className="w-4 h-4" />
                  <span>Offline (Disabled)</span>
                </button>
              </div>
            </div>

            {/* Condition reason (shown when disabling) */}
            {!modalTargetEnabled && (
              <div className="space-y-4 animate-in fade-in">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold block opacity-80">Select Condition / Reason</label>
                  <select
                    value={conditionType}
                    onChange={(e) => handleConditionTypeChange(e.target.value as OperatorDisableCondition)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none transition-all ${
                      isLight ? 'bg-white border-gray-300 text-gray-800' : 'bg-black/30 border-white/20 text-white'
                    }`}
                  >
                    <option value="scheduled_maintenance">🛠️ Scheduled Operator Maintenance</option>
                    <option value="gateway_down">🔌 API / Billing Gateway Downtime</option>
                    <option value="transponder_outage">📡 Satellite Transponder / Uplink Issues</option>
                    <option value="high_failure_rate">⚠️ High Transaction Failure Rate</option>
                    <option value="commercial_hold">🔒 Commercial Hold / Balance Settlement</option>
                    <option value="custom">📝 Custom Condition / Operational Notice</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold block opacity-80">Public Condition Label</label>
                  <input
                    type="text"
                    value={customConditionLabel}
                    onChange={(e) => setCustomConditionLabel(e.target.value)}
                    placeholder="e.g. Scheduled Gateway Maintenance"
                    className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none transition-all ${
                      isLight ? 'bg-white border-gray-300 text-gray-800' : 'bg-black/30 border-white/20 text-white'
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold block opacity-80">Public Customer Notice Message</label>
                  <textarea
                    rows={3}
                    value={maintenanceMessage}
                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                    placeholder="Provide a clear, reassuring message for subscribers attempting to recharge this operator..."
                    className={`w-full p-3 rounded-xl text-xs border focus:outline-none transition-all ${
                      isLight ? 'bg-white border-gray-300 text-gray-800' : 'bg-black/30 border-white/20 text-white'
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold block opacity-80">Expected Resumption / Restoration Time</label>
                  <input
                    type="text"
                    value={expectedRestoration}
                    onChange={(e) => setExpectedRestoration(e.target.value)}
                    placeholder="e.g. Within 1 hour, Today 6:00 PM, Tomorrow 8:00 AM"
                    className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none transition-all ${
                      isLight ? 'bg-white border-gray-300 text-gray-800' : 'bg-black/30 border-white/20 text-white'
                    }`}
                  />
                </div>

                {/* Live Preview Box */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-bold block text-gray-500 uppercase tracking-wider">
                    Customer Banner Preview
                  </label>
                  <div className="p-3.5 rounded-2xl border bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200 space-y-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                      <span className="font-bold text-xs">{selectedOperatorForModal.name} is Temporarily Unavailable</span>
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30">
                        {customConditionLabel || 'Under Maintenance'}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-90 pl-6">
                      {maintenanceMessage || `${selectedOperatorForModal.name} is temporarily offline.`}
                    </p>
                    {expectedRestoration && (
                      <p className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 pl-6">
                        Expected Restoration: {expectedRestoration}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-3 border-t border-gray-200 dark:border-white/10 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsConditionModalOpen(false)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border ${
                  isLight ? 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300' : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleToggleOperatorStatus(
                  selectedOperatorForModal.id,
                  modalTargetEnabled,
                  conditionType,
                  customConditionLabel,
                  maintenanceMessage,
                  expectedRestoration
                )}
                disabled={isUpdatingOperator}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 ${
                  modalTargetEnabled
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                {isUpdatingOperator ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : modalTargetEnabled ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Power className="w-3.5 h-3.5" />
                )}
                <span>{modalTargetEnabled ? 'Apply & Enable Operator' : 'Apply & Disable Operator'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Pack Deletion */}
      {packToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl space-y-4 ${
            isLight ? 'bg-white border-gray-200 text-gray-800' : 'bg-[#0f172a] border-white/15 text-white'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Delete Recharge Pack?</h3>
                <p className="text-xs opacity-70">This will permanently remove the pack from the catalog.</p>
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
              isLight ? 'bg-rose-50/50 border-rose-200/60 text-rose-900' : 'bg-rose-950/20 border-rose-500/20 text-rose-200'
            }`}>
              <div className="font-bold text-sm text-gray-900 dark:text-white">
                {packToDelete.plan_name}
              </div>
              <div className="flex items-center gap-2 text-[11px] opacity-80 flex-wrap">
                <span className="font-bold text-rose-600 dark:text-rose-400">₹{packToDelete.amount}</span>
                <span>•</span>
                <span>{packToDelete.pack_type}</span>
                <span>•</span>
                <span>{packToDelete.duration_months} Month{packToDelete.duration_months > 1 ? 's' : ''}</span>
                <span>•</span>
                <span className="capitalize">{packToDelete.operator.replace('_', ' ')}</span>
              </div>
              <p className="text-[11px] pt-1 opacity-75">
                Saved in Firebase Cloud Firestore & persistent catalog across all devices.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingPack}
                onClick={() => setPackToDelete(null)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-white/10 hover:bg-white/15 text-white'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingPack}
                onClick={confirmDeletePack}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-sm flex items-center gap-2"
              >
                {isDeletingPack ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Admin Revocation */}
      {adminToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl space-y-4 ${
            isLight ? 'bg-white border-gray-200 text-gray-800' : 'bg-[#0f172a] border-white/15 text-white'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Revoke Administrator Privileges?</h3>
                <p className="text-xs opacity-70">Access will be immediately withdrawn.</p>
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border text-xs space-y-1 ${
              isLight ? 'bg-amber-50/50 border-amber-200/60 text-amber-900' : 'bg-amber-950/20 border-amber-500/20 text-amber-200'
            }`}>
              <div className="font-mono font-bold text-xs">{adminToRevoke}</div>
              <p className="text-[11px] opacity-75">
                This administrator will no longer have access to the Admin Portal, live customer records, recharge orders, or pack catalog configuration.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isRevokingAdmin}
                onClick={() => setAdminToRevoke(null)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-white/10 hover:bg-white/15 text-white'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRevokingAdmin}
                onClick={confirmRevokeAdmin}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-sm flex items-center gap-2"
              >
                {isRevokingAdmin ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Revoking...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Revoke Privileges</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-5 ${
            isLight ? 'bg-white border-gray-200 text-gray-900' : 'bg-[#18181b] border-white/10 text-white'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Add Customer Record</h3>
                <p className="text-xs opacity-70">Save client contact details to your dealership book</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCustModal(false)}
                className="p-1 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Krishnan"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                    isLight ? 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gray-400' : 'bg-black/30 border-white/10 text-white focus:border-white/30'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Registered Mobile Number *</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="10-digit mobile (e.g. 9840123456)"
                  value={newCustMobile}
                  onChange={(e) => setNewCustMobile(e.target.value.replace(/\D/g, ''))}
                  className={`w-full px-3 py-2 rounded-xl text-xs border font-mono focus:outline-none ${
                    isLight ? 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gray-400' : 'bg-black/30 border-white/10 text-white focus:border-white/30'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">DTH Operator *</label>
                <select
                  value={newCustOperator}
                  onChange={(e) => setNewCustOperator(e.target.value as DthOperatorId)}
                  className={`w-full px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                    isLight ? 'bg-gray-50 border-gray-200 text-gray-900' : 'bg-black/30 border-white/10 text-white'
                  }`}
                >
                  <option value="sun_direct">Sun Direct</option>
                  <option value="tata_play">Tata Play</option>
                  <option value="airtel_dth">Airtel Digital TV</option>
                  <option value="dish_tv">Dish TV</option>
                  <option value="d2h">D2H Videocon</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Smart Card / VC / Subscriber ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 41289456123 or 1029384756"
                  value={newCustCard}
                  onChange={(e) => setNewCustCard(e.target.value.replace(/\s+/g, ''))}
                  className={`w-full px-3 py-2 rounded-xl text-xs border font-mono focus:outline-none ${
                    isLight ? 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gray-400' : 'bg-black/30 border-white/10 text-white focus:border-white/30'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustModal(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border ${
                    isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCust}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-1.5"
                >
                  {isSavingCust ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Customer</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Customer Confirmation Modal */}
      {custToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className={`w-full max-w-sm rounded-2xl border p-5 shadow-2xl space-y-4 ${
            isLight ? 'bg-white border-gray-200 text-gray-900' : 'bg-[#18181b] border-white/10 text-white'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Remove Customer?</h3>
                <p className="text-xs opacity-70">Remove from dealership directory</p>
              </div>
            </div>

            <div className={`p-3 rounded-xl text-xs border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
              <p className="font-bold">{custToDelete.customerName}</p>
              <p className="font-mono text-[11px] opacity-75">{custToDelete.operatorName} • {custToDelete.smartCardNumber}</p>
              <p className="font-mono text-[11px] opacity-75">Mobile: {custToDelete.registeredMobile}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isDeletingCust}
                onClick={() => setCustToDelete(null)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border ${
                  isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-white/10 hover:bg-white/15 text-white'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingCust}
                onClick={handleDeleteCustomer}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1.5"
              >
                {isDeletingCust ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <span>Delete Record</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import & Export Sync Modal */}
      <ExcelPlanImportExportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        plans={plans}
        currentTheme={currentTheme}
        user={user}
        defaultTab={excelModalTab}
        onPlansUpdated={async (newPlans) => {
          setPlans(newPlans);
          showToast(`Successfully updated packs from Excel spreadsheet!`);
          await fetchPacks();
        }}
      />
    </div>
  );
};
