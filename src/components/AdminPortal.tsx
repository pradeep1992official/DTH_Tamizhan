import React, { useState, useEffect } from 'react';
import { 
  Users, 
  BarChart3, 
  Clock, 
  RefreshCw, 
  Layers, 
  CreditCard, 
  ArrowLeft, 
  ShieldCheck, 
  Radio
} from 'lucide-react';
import { 
  Language, 
  UserProfile, 
  DthOperatorId, 
  AdminTabId, 
  isUserAdmin
} from '../types';
import { OperatorTheme } from '../lib/theme';
import { useAdminData } from './Admin/hooks/useAdminData';
import { CustomersTab } from './Admin/tabs/CustomersTab';
import { PendingOrdersTab } from './Admin/tabs/PendingOrdersTab';
import { RechargesTab } from './Admin/tabs/RechargesTab';
import { PacksTab } from './Admin/tabs/PacksTab';
import { PaymentsTab } from './Admin/tabs/PaymentsTab';
import { ReportsTab } from './Admin/tabs/ReportsTab';
import { OperatorsTab } from './Admin/tabs/OperatorsTab';
import { ApprovalsTab } from './Admin/tabs/ApprovalsTab';

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

  // Active Tab State
  const [activeTab, setActiveTab] = useState<AdminTabId>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabChange = (tab: AdminTabId) => {
    setActiveTab(tab);
    onPathChange?.(tab);
  };

  // Toast notifications
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Unified Admin Data Hook
  const adminData = useAdminData(user, showToast);
  const {
    getAuthHeaders,
    customers,
    custLoading,
    fetchCustomers,
    orders,
    ordersLoading,
    fetchOrders,
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
    approvedAdmins,
    pendingRequests,
    accessLoading,
    fetchAccessList,
  } = adminData;

  // Fetch relevant tab data on tab switch or mount
  useEffect(() => {
    switch (activeTab) {
      case 'customers':
        fetchCustomers();
        break;
      case 'pending':
      case 'recharges':
        fetchOrders();
        break;
      case 'packs':
        fetchPacks();
        break;
      case 'payments':
        fetchPayments();
        break;
      case 'reports':
        fetchReports();
        fetchCustomers();
        fetchOrders();
        break;
      case 'operators':
        fetchOperators();
        break;
      case 'approvals':
        fetchAccessList();
        break;
    }
  }, [activeTab, fetchCustomers, fetchOrders, fetchPacks, fetchPayments, fetchReports, fetchOperators, fetchAccessList]);

  const isAdmin = isUserAdmin(user, approvedAdmins.map((a) => a.email));

  if (!user || !isAdmin) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 text-center rounded-3xl border shadow-xl bg-white dark:bg-[#0f172a] border-gray-200 dark:border-white/10">
        <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-rose-500/10 text-rose-500 border border-rose-500/20">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold mb-2">Restricted Access</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
          You must be logged in as an authorized administrator to view operational records and manage catalogs.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onOpenAuth}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm"
          >
            Sign In with Google
          </button>
          {onBackToCustomerFlow && (
            <button
              type="button"
              onClick={onBackToCustomerFlow}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
            >
              Back to Home
            </button>
          )}
        </div>
      </div>
    );
  }

  const pendingCount = orders.filter((o) => o.rechargeStatus === 'pending' || o.rechargeStatus === 'processing').length;

  const NAV_ITEMS: { id: AdminTabId; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'customers', label: 'Customers', icon: <Users className="w-4 h-4" /> },
    { id: 'pending', label: 'Pending Orders', icon: <Clock className="w-4 h-4" />, badge: pendingCount },
    { id: 'recharges', label: 'Recharge History', icon: <RefreshCw className="w-4 h-4" /> },
    { id: 'packs', label: 'Plan Catalog', icon: <Layers className="w-4 h-4" /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports & Audits', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'operators', label: 'Operators Control', icon: <Radio className="w-4 h-4" /> },
    { id: 'approvals', label: 'Admin Team', icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-white/20 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          {toastMsg}
        </div>
      )}

      {/* Top Header & Navigation Bar */}
      <div className={`p-4 sm:p-5 rounded-3xl border shadow-sm ${isLight ? 'bg-white border-gray-200' : 'bg-[#0f172a] border-white/10'}`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-4 mb-4 border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            {onBackToCustomerFlow && (
              <button
                type="button"
                onClick={onBackToCustomerFlow}
                className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                title="Back to Customer Portal"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold">Admin & Dealer Operations</h1>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border"
                  style={{
                    backgroundColor: `${currentTheme.primaryColor}15`,
                    color: currentTheme.primaryColor,
                    borderColor: `${currentTheme.primaryColor}30`,
                  }}
                >
                  Authorized
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Logged in as: <span className="font-medium text-gray-700 dark:text-gray-200">{user.email}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabChange(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-amber-400 text-gray-900' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Contents */}
      <div className={`rounded-3xl border shadow-sm overflow-hidden ${isLight ? 'bg-white border-gray-200' : 'bg-[#0f172a] border-white/10'}`}>
        {activeTab === 'customers' && (
          <CustomersTab
            customers={customers}
            custLoading={custLoading}
            onRefresh={fetchCustomers}
            getAuthHeaders={getAuthHeaders}
            currentTheme={currentTheme}
            currentLang={currentLang}
            showToast={showToast}
          />
        )}

        {activeTab === 'pending' && (
          <PendingOrdersTab
            orders={orders}
            ordersLoading={ordersLoading}
            onRefresh={fetchOrders}
            getAuthHeaders={getAuthHeaders}
            currentTheme={currentTheme}
            currentLang={currentLang}
            showToast={showToast}
            onTriggerRefresh={onTriggerRefresh}
          />
        )}

        {activeTab === 'recharges' && (
          <RechargesTab
            orders={orders}
            ordersLoading={ordersLoading}
            onRefresh={fetchOrders}
            getAuthHeaders={getAuthHeaders}
            currentTheme={currentTheme}
            currentLang={currentLang}
            showToast={showToast}
            onTriggerRefresh={onTriggerRefresh}
          />
        )}

        {activeTab === 'packs' && (
          <PacksTab
            plans={plans}
            plansLoading={plansLoading}
            onRefresh={fetchPacks}
            user={user}
            currentTheme={currentTheme}
            currentLang={currentLang}
            showToast={showToast}
            onPlansUpdated={(newPlans) => setPlans(newPlans)}
          />
        )}

        {activeTab === 'payments' && (
          <PaymentsTab
            payments={payments}
            paymentsLoading={paymentsLoading}
            onRefresh={fetchPayments}
            currentTheme={currentTheme}
            currentLang={currentLang}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsTab
            auditLogs={auditLogs}
            customers={customers}
            orders={orders}
            reportsLoading={reportsLoading}
            onRefresh={fetchReports}
            currentTheme={currentTheme}
            currentLang={currentLang}
          />
        )}

        {activeTab === 'operators' && (
          <OperatorsTab
            operators={operators}
            operatorsLoading={operatorsLoading}
            onRefresh={fetchOperators}
            getAuthHeaders={getAuthHeaders}
            currentTheme={currentTheme}
            currentLang={currentLang}
            showToast={showToast}
          />
        )}

        {activeTab === 'approvals' && (
          <ApprovalsTab
            approvedAdmins={approvedAdmins}
            pendingRequests={pendingRequests}
            accessLoading={accessLoading}
            onRefresh={fetchAccessList}
            getAuthHeaders={getAuthHeaders}
            currentTheme={currentTheme}
            currentLang={currentLang}
            showToast={showToast}
            user={user}
          />
        )}
      </div>
    </div>
  );
};
