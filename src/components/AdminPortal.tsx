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
  KeyRound
} from 'lucide-react';
import { 
  Language, 
  UserProfile, 
  DthOperatorId, 
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
import { db, isFirebaseLive, sanitizePayload } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

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

  // --- STATE FOR 1. CUSTOMER DETAILS ---
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [custLoading, setCustLoading] = useState(false);
  const [custSearch, setCustSearch] = useState('');
  const [custOpFilter, setCustOpFilter] = useState('all');
  const [custStatusFilter, setCustStatusFilter] = useState('all');

  const fetchCustomers = async () => {
    setCustLoading(true);
    try {
      const res = await fetch(`/api/admin/customers?callerEmail=${encodeURIComponent(user?.email || '')}`);
      const data = await res.json();
      if (data.success && data.customers) {
        setCustomers(data.customers);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setCustLoading(false);
    }
  };

  // --- STATE FOR 2. REPORTS ---
  const [reportsData, setReportsData] = useState<any>(null);
  const [reportsLoading, setReportsLoading] = useState(false);

  const fetchReports = async () => {
    setReportsLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?callerEmail=${encodeURIComponent(user?.email || '')}`);
      const data = await res.json();
      if (data.success) {
        setReportsData(data);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
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
      const res = await fetch(`/api/orders?isWorker=true&callerEmail=${encodeURIComponent(user?.email || '')}`);
      const data = await res.json();
      if (data.success && data.orders) {
        setOrders(data.orders);
        if (!selectedOrder && data.orders.length > 0) {
          setSelectedOrder(data.orders[0]);
          setOperatorRefVal(data.orders[0].operatorRefId || '');
          setWorkerNotesVal(data.orders[0].workerNotes || '');
          setStatusUpdateVal(data.orders[0].rechargeStatus);
        }
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
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
      const res = await fetch('/api/admin/orders/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          rechargeStatus: newStatus,
          operatorRefId: customRef !== undefined ? customRef : (operatorRefVal || `TXN-REF-${Math.floor(100000 + Math.random() * 900000)}`),
          workerNotes: notes !== undefined ? notes : workerNotesVal,
          triggerSignalRefresh: refreshSignal || false,
          callerEmail: user?.email || '',
        }),
      });
      const data = await res.json();
      if (data.success) {
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

  const handleDeletePack = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this recharge pack?')) return;
    try {
      await PlanCatalogService.deletePlan(planId, user?.email || 'admin@dthtamizhan.com');
      showToast('Pack deleted from catalog');
      await fetchPacks();
    } catch (err) {
      console.error('Failed to delete pack:', err);
      showToast('Error deleting pack');
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
      const res = await fetch(`/api/admin/payments?callerEmail=${encodeURIComponent(user?.email || '')}`);
      const data = await res.json();
      if (data.success && data.payments) {
        setPayments(data.payments);
      }
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setPaymentsLoading(false);
    }
  };

  // --- STATE FOR 7. ADMIN APPROVALS & ACCESS CONTROL (Strictly professorpradeeps@gmail.com) ---
  const isSuperAdmin = isSuperAdminEmail(user?.email);
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([]);
  const [adminRequests, setAdminRequests] = useState<AdminAccessRequest[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);

  // Authorize check: Super admin OR approved in Admin list
  const isApprovedAdmin = useMemo(() => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    if (user.role === 'admin' || user.is_plan_admin) {
      const found = adminAccounts.find((a) => a.email.toLowerCase() === user.email?.toLowerCase());
      if (found && found.status === 'approved') return true;
    }
    return false;
  }, [user, isSuperAdmin, adminAccounts]);

  // Direct Admin Grant Inputs
  const [directEmail, setDirectEmail] = useState('');
  const [directName, setDirectName] = useState('');
  const [directNotes, setDirectNotes] = useState('');
  const [isDirectGranting, setIsDirectGranting] = useState(false);

  // Customer Request Inputs
  const [requestReason, setRequestReason] = useState('');
  const [requestPhone, setRequestPhone] = useState(user?.phoneNumber || '');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestFeedback, setRequestFeedback] = useState<string | null>(null);

  const fetchAccessList = async () => {
    setAccessLoading(true);
    try {
      const res = await fetch(`/api/admin/access-list?callerEmail=${encodeURIComponent(user?.email || '')}`);
      const data = await res.json();
      if (data.success) {
        if (data.admins) setAdminAccounts(data.admins);
        if (data.requests) setAdminRequests(data.requests);
      }
    } catch (err) {
      console.error('Failed to load admin access list:', err);
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
      const res = await fetch('/api/admin/approve-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerEmail: user?.email || SUPER_ADMIN_EMAIL,
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
        if (isFirebaseLive && db && targetUid) {
          try {
            await setDoc(doc(db, 'admins', targetUid), {
              uid: targetUid,
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

  const handleRevokeAdmin = async (targetEmail: string) => {
    if (!confirm(`Are you sure you want to revoke Administrator access for ${targetEmail}?`)) return;
    try {
      const res = await fetch('/api/admin/revoke-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerEmail: user?.email || SUPER_ADMIN_EMAIL,
          targetEmail,
          notes: 'Revoked by Professor Pradeep',
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Administrator privileges revoked for ${targetEmail}`);
        await fetchAccessList();
      } else {
        showToast(data.error || 'Revoke failed');
      }
    } catch (err) {
      console.error('Revoke failed:', err);
      showToast('Network error during admin revocation');
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

  const handleSubmitAdminRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestReason.trim()) {
      setRequestFeedback('Please enter a reason for requesting administrator access.');
      return;
    }
    setIsSubmittingRequest(true);
    setRequestFeedback(null);
    try {
      const res = await fetch('/api/admin/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.uid || `usr_${Date.now()}`,
          userEmail: user?.email || '',
          userName: user?.displayName || user?.email?.split('@')[0] || 'Subscriber',
          userPhone: requestPhone,
          reason: requestReason.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRequestFeedback('Your request has been successfully submitted to Professor Pradeep for review.');
        showToast('Admin request submitted to Professor Pradeep!');
        setRequestReason('');
        await fetchAccessList();
      } else {
        setRequestFeedback(data.error || 'Failed to submit request.');
      }
    } catch (err) {
      console.error('Request submission error:', err);
      setRequestFeedback('Network error. Please retry.');
    } finally {
      setIsSubmittingRequest(false);
    }
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

  // Initial Data Fetching
  useEffect(() => {
    fetchCustomers();
    fetchReports();
    fetchOrders();
    fetchPacks();
    fetchPayments();
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

  const pendingAdminRequests = useMemo(() => {
    return adminRequests.filter((r) => r.status === 'pending');
  }, [adminRequests]);

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
    { id: 'approvals', label: 'Admin Approvals', icon: Crown, badge: pendingAdminRequests.length, isSuper: true },
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
                The DTH Tamizhan Administrator Operations Suite contains sensitive subscriber records, operator balances, transponder refresh tools, and financial ledger data.
              </p>
            </div>

            <div className={`p-4 rounded-2xl border text-left space-y-2 text-xs ${
              isLight ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-amber-950/30 border-amber-700/40 text-amber-200'
            }`}>
              <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400">
                <Crown className="w-4 h-4 shrink-0" />
                <span>Super Administrator Authority</span>
              </div>
              <p className="leading-relaxed">
                Super administrator root ownership is assigned exclusively to <strong className="font-mono underline">professorpradeeps@gmail.com</strong>. Only Professor Pradeep can approve administrative permissions.
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
                <span>Sign In as Administrator</span>
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

  // 2. Unauthorized Customer Gate: User is signed in, but NOT an approved administrator
  if (!isApprovedAdmin) {
    const existingPendingRequest = adminRequests.find(
      (r) => r.userEmail.toLowerCase() === user.email?.toLowerCase() && r.status === 'pending'
    );

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
            className={`p-5 sm:p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              isLight ? 'bg-gray-50' : 'bg-black/30 border-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center border text-amber-500 bg-amber-500/10 border-amber-500/30">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className={`text-lg sm:text-xl font-bold ${currentTheme.headingText}`}>
                    Administrator Access Restricted
                  </h1>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-600">
                    Customer Account
                  </span>
                </div>
                <p className={`text-xs ${currentTheme.subText}`}>
                  Signed in as: <span className="font-semibold">{user.email || user.displayName || user.phoneNumber}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenAuth}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  isLight ? 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300' : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`}
              >
                Switch Account
              </button>
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
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div className={`p-5 rounded-2xl border flex items-start gap-4 ${
              isLight ? 'bg-amber-50/70 border-amber-200 text-amber-950' : 'bg-amber-950/20 border-amber-700/40 text-amber-200'
            }`}>
              <Crown className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs leading-relaxed">
                <h3 className="font-bold text-sm text-amber-600 dark:text-amber-400">
                  Super Administrator Approval Required
                </h3>
                <p>
                  Access to customer databases, orders, and pricing is strictly restricted. Only Super Admin <strong className="font-mono underline">professorpradeeps@gmail.com</strong> can approve administrator accounts.
                </p>
                <p className="opacity-90">
                  If you are a regional counter operator or technician, submit your application below. Professor Pradeep will review and authorize your account.
                </p>
              </div>
            </div>

            {/* Pending Request Status or Application Form */}
            {(existingPendingRequest || requestFeedback) ? (
              <div className={`p-6 rounded-2xl border text-center space-y-3 ${
                isLight ? 'bg-blue-50/80 border-blue-200 text-blue-950' : 'bg-blue-950/30 border-blue-700/40 text-blue-200'
              }`}>
                <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-blue-500/20 text-blue-500">
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="font-bold text-base">Application Under Review</h3>
                <p className="text-xs max-w-md mx-auto opacity-90">
                  Your request for administrator privileges has been submitted to <strong>Professor Pradeep</strong> and is pending review. You will receive access upon approval.
                </p>
                {existingPendingRequest?.requestedAt && (
                  <p className="text-[11px] font-mono opacity-70">
                    Submitted on: {new Date(existingPendingRequest.requestedAt).toLocaleString()}
                  </p>
                )}
              </div>
            ) : (
              <div className={`p-6 rounded-2xl border space-y-4 ${
                isLight ? 'bg-gray-50 border-gray-200' : 'bg-black/20 border-white/10'
              }`}>
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-500" />
                  <h3 className={`font-bold text-sm ${currentTheme.headingText}`}>
                    Request Administrator Privileges
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-[11px] font-bold mb-1 ${currentTheme.subText}`}>
                        Your Email
                      </label>
                      <input
                        type="email"
                        readOnly
                        value={user.email || 'No email associated'}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-mono border ${
                          isLight ? 'bg-gray-100 border-gray-300 text-gray-700' : 'bg-white/5 border-white/15 text-gray-300'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-bold mb-1 ${currentTheme.subText}`}>
                        Contact Mobile
                      </label>
                      <input
                        type="tel"
                        value={requestPhone}
                        onChange={(e) => setRequestPhone(e.target.value)}
                        placeholder="+91 98401 23456"
                        className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                          isLight ? 'bg-white border-gray-300 focus:border-amber-500' : 'bg-black/40 border-white/20 focus:border-amber-400'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-[11px] font-bold mb-1 ${currentTheme.subText}`}>
                      Reason / Branch / Operational Role <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={requestReason}
                      onChange={(e) => setRequestReason(e.target.value)}
                      placeholder="e.g., Regional DTH recharge operator in Madurai branch, handling customer signal refreshes and pack management."
                      className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                        isLight ? 'bg-white border-gray-300 focus:border-amber-500' : 'bg-black/40 border-white/20 focus:border-amber-400'
                      }`}
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isSubmittingRequest || !requestReason.trim()}
                    onClick={handleSubmitAdminRequest}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs text-white transition-all flex items-center justify-center gap-2 shadow-md ${
                      isSubmittingRequest || !requestReason.trim() ? 'opacity-50 cursor-not-allowed bg-gray-500' : 'hover:opacity-90'
                    }`}
                    style={{ backgroundColor: !isSubmittingRequest && requestReason.trim() ? currentTheme.primaryColor : undefined }}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmittingRequest ? 'Submitting Application...' : 'Submit Request to Professor Pradeep'}</span>
                  </button>
                </div>
              </div>
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
                      <th className="py-3 px-4 font-bold">Customer & Mobile</th>
                      <th className="py-3 px-4 font-bold">Operator & Smart Card</th>
                      <th className="py-3 px-4 font-bold">Active Pack</th>
                      <th className="py-3 px-4 font-bold">Balance</th>
                      <th className="py-3 px-4 font-bold">Expiry Date</th>
                      <th className="py-3 px-4 font-bold">Status</th>
                      <th className="py-3 px-4 font-bold">Total Recharges</th>
                      <th className="py-3 px-4 font-bold text-right">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLight ? 'divide-gray-100' : 'divide-white/5'}`}>
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-xs opacity-60">
                          No customer records found matching your filters.
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
                              <p className="font-medium truncate max-w-[160px]">{c.activePackName}</p>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-bold tabular-nums">₹{c.currentBalance.toFixed(2)}</span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px]">
                              {c.expiryDate}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${statusColor}`}>
                                {c.status === 'due_soon' ? 'Due Soon' : c.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px]">
                              {c.totalRechargesCount} recharges <span className="opacity-70">(₹{c.totalSpent})</span>
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
                                >
                                  Orders
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
                          onClick={() => handleDeletePack(p.id)}
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

        {/* --- 7. ADMIN APPROVALS & SUPER ADMIN ACCESS CONTROL TAB --- */}
        {activeTab === 'approvals' && (
          <div className="p-4 sm:p-6 space-y-6">
            {/* Super Admin Ownership Banner */}
            <div 
              className={`p-5 rounded-2xl border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                isLight 
                  ? 'bg-amber-50/70 border-amber-200 text-amber-950' 
                  : 'bg-amber-950/20 border-amber-500/30 text-amber-100'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold">
                      Super Administrator Authority
                    </h3>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded">
                      Root Super Admin
                    </span>
                  </div>
                  <p className="text-xs opacity-90 mt-0.5">
                    Root Owner: <strong className="font-mono">{SUPER_ADMIN_EMAIL}</strong>. Only Professor Pradeep can approve, grant, or revoke Administrator privileges.
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
                      ? 'bg-white hover:bg-gray-50 text-gray-800 border-amber-300' 
                      : 'bg-black/40 hover:bg-black/60 text-white border-amber-500/40'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${accessLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh Queue</span>
                </button>
              </div>
            </div>

            {isSuperAdmin ? (
              /* SUPER ADMIN INTERFACE */
              <div className="space-y-6">
                {/* 1. Pending Access Requests Queue */}
                <div className={`p-5 rounded-2xl border ${isLight ? 'bg-white border-gray-200 shadow-xs' : 'bg-black/20 border-white/10'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-bold flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-500" />
                        Pending Admin Access Requests ({pendingAdminRequests.length})
                      </h4>
                      <p className={`text-xs ${currentTheme.subText}`}>
                        Review and approve applicants requesting administrator operations.
                      </p>
                    </div>
                  </div>

                  {pendingAdminRequests.length === 0 ? (
                    <div className={`p-8 text-center rounded-xl border border-dashed ${isLight ? 'border-gray-200 bg-gray-50/50' : 'border-white/10 bg-white/5'}`}>
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                      <p className="text-xs font-semibold">No pending administrator requests.</p>
                      <p className="text-[11px] opacity-60 mt-0.5">All applications have been reviewed.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pendingAdminRequests.map((req) => (
                        <div 
                          key={req.id} 
                          className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                            isLight ? 'bg-gray-50/80 border-gray-200' : 'bg-white/5 border-white/10'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h5 className="text-xs font-bold">{req.userName}</h5>
                                <p className="text-[11px] font-mono text-amber-500 font-semibold">{req.userEmail}</p>
                                {req.userPhone && (
                                  <p className="text-[10px] font-mono opacity-70">📱 {req.userPhone}</p>
                                )}
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30">
                                Pending
                              </span>
                            </div>

                            <div className={`mt-2.5 p-2.5 rounded-lg text-xs italic ${isLight ? 'bg-white border border-gray-200 text-gray-700' : 'bg-black/30 border border-white/5 text-gray-300'}`}>
                              "{req.reason}"
                            </div>
                            <p className="text-[10px] opacity-50 mt-1.5 font-mono">
                              Requested: {new Date(req.requestedAt).toLocaleString()}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-gray-500/10">
                            <button
                              type="button"
                              onClick={() => handleApproveAdmin(req.userEmail, req.userName, req.userId, req.id, 'Approved by Professor Pradeep')}
                              className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center justify-center gap-1 shadow-xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve Admin Role</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRevokeAdmin(req.userEmail)}
                              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 border ${
                                isLight 
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200' 
                                  : 'bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 border-rose-500/30'
                              }`}
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Direct Administrator Authorization Form */}
                <div className={`p-5 rounded-2xl border ${isLight ? 'bg-white border-gray-200 shadow-xs' : 'bg-black/20 border-white/10'}`}>
                  <div className="mb-4">
                    <h4 className="text-sm font-bold flex items-center gap-2">
                      <Plus className="w-4 h-4 text-emerald-500" />
                      Direct Administrator Authorization
                    </h4>
                    <p className={`text-xs ${currentTheme.subText}`}>
                      Grant Admin rights directly to any registered team member or dealer email.
                    </p>
                  </div>

                  <form onSubmit={handleDirectGrant} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="email"
                      required
                      value={directEmail}
                      onChange={(e) => setDirectEmail(e.target.value)}
                      placeholder="Admin Email (e.g. dealer@gmail.com)"
                      className={`px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                        isLight ? 'bg-white border-gray-200 text-gray-800' : 'bg-black/30 border-white/10 text-white'
                      }`}
                    />
                    <input
                      type="text"
                      value={directName}
                      onChange={(e) => setDirectName(e.target.value)}
                      placeholder="Name / Branch (Optional)"
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
                      <span>{isDirectGranting ? 'Authorizing...' : 'Grant Admin Role'}</span>
                    </button>
                  </form>
                </div>

                {/* 3. Approved Administrators Directory */}
                <div className={`p-5 rounded-2xl border ${isLight ? 'bg-white border-gray-200 shadow-xs' : 'bg-black/20 border-white/10'}`}>
                  <div className="mb-4">
                    <h4 className="text-sm font-bold flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#dfb86c]" />
                      Approved Administrators Directory ({adminAccounts.length})
                    </h4>
                    <p className={`text-xs ${currentTheme.subText}`}>
                      Active administrators authorized to access customer data, recharge queues, and pack catalogs.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className={`border-b ${isLight ? 'bg-gray-50 text-gray-600' : 'bg-black/40 text-gray-400'}`}>
                        <tr>
                          <th className="py-3 px-4 font-bold">Admin Details</th>
                          <th className="py-3 px-4 font-bold">Role Tier</th>
                          <th className="py-3 px-4 font-bold">Status</th>
                          <th className="py-3 px-4 font-bold">Authorized By</th>
                          <th className="py-3 px-4 font-bold">Approved Date</th>
                          <th className="py-3 px-4 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isLight ? 'divide-gray-100' : 'divide-white/5'}`}>
                        {adminAccounts.map((adm) => {
                          const isRoot = isSuperAdminEmail(adm.email);
                          return (
                            <tr key={adm.email} className={`transition-colors ${isLight ? 'hover:bg-gray-50/70' : 'hover:bg-white/5'}`}>
                              <td className="py-3 px-4">
                                <p className="font-bold flex items-center gap-1.5">
                                  {adm.displayName || adm.email.split('@')[0]}
                                  {isRoot && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                                </p>
                                <p className="font-mono text-[11px] opacity-75">{adm.email}</p>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  isRoot 
                                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30' 
                                    : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                                }`}>
                                  {isRoot ? 'Super Admin' : 'Admin'}
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
                              <td className="py-3 px-4 font-mono text-[11px] opacity-80">
                                {adm.approvedBy}
                              </td>
                              <td className="py-3 px-4 font-mono text-[11px] opacity-75">
                                {new Date(adm.approvedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {isRoot ? (
                                  <span className="text-[10px] opacity-40 font-semibold italic">Protected (Root)</span>
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
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              /* NON-SUPER ADMIN VIEW: REQUEST SUBMISSION FORM */
              <div className={`p-6 rounded-2xl border ${isLight ? 'bg-white border-gray-200' : 'bg-black/20 border-white/10'} space-y-5 max-w-2xl mx-auto`}>
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 rounded-full bg-amber-500/15 text-amber-500 mx-auto flex items-center justify-center border border-amber-500/30 mb-2">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold">
                    Request Administrator Privileges
                  </h4>
                  <p className={`text-xs ${currentTheme.subText}`}>
                    Admin management and access approval is strictly handled by Professor Pradeep S (<span className="font-mono font-semibold">{SUPER_ADMIN_EMAIL}</span>).
                  </p>
                </div>

                {requestFeedback && (
                  <div className={`p-3.5 rounded-xl text-xs font-semibold border flex items-center gap-2 ${
                    requestFeedback.includes('successfully') 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                  }`}>
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{requestFeedback}</span>
                  </div>
                )}

                <form onSubmit={handleSubmitAdminRequest} className="space-y-4">
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                      Your Email
                    </label>
                    <input
                      type="email"
                      disabled
                      value={user?.email || 'Not logged in (Please Sign in first)'}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs border font-mono opacity-80 ${
                        isLight ? 'bg-gray-100 border-gray-200 text-gray-800' : 'bg-white/5 border-white/10 text-white'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                      Contact Phone Number
                    </label>
                    <input
                      type="tel"
                      value={requestPhone}
                      onChange={(e) => setRequestPhone(e.target.value)}
                      placeholder="e.g. +91 98401 23456"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs border font-medium focus:outline-none ${
                        isLight ? 'bg-white border-gray-200 text-gray-800' : 'bg-black/30 border-white/10 text-white'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                      Reason for Admin Access Request
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={requestReason}
                      onChange={(e) => setRequestReason(e.target.value)}
                      placeholder="Describe your role (e.g. DTH store operator, transponder fulfillment agent, pack pricing coordinator)..."
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs border font-medium focus:outline-none resize-none ${
                        isLight ? 'bg-white border-gray-200 text-gray-800' : 'bg-black/30 border-white/10 text-white'
                      }`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingRequest || !user}
                    className="w-full py-3 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black transition-all flex items-center justify-center gap-2 shadow-md font-bold"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmittingRequest ? 'Submitting to Professor Pradeep...' : 'Submit Admin Application'}</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

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
