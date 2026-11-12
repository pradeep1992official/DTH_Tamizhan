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
} from '../lib/icons';
import {
  Language,
  UserProfile,
  AdminTabId,
  isUserAdmin
} from '../types';
import { OperatorTheme } from '../lib/theme';
import { translations } from '../lib/translations';
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
  onBackToCustomerFlow,
  initialTab = 'customers',
  currentTheme,
  onPathChange,
}) => {
  const t = translations[currentLang];
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
    adminAuthorized,
    adminError,
    getAuthHeaders,
    customers,
    custLoading,
    customersError,
    fetchCustomers,
    orders,
    ordersLoading,
    ordersError,
    fetchOrders,
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
    approvedAdmins,
    pendingRequests,
    accessLoading,
    fetchAccessList,
  } = adminData;

  // Fetch relevant tab data on tab switch or mount
  useEffect(() => {
    if (!user || !adminAuthorized) return;

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
  }, [activeTab, user, adminAuthorized, fetchCustomers, fetchOrders, fetchPacks, fetchPayments, fetchReports, fetchOperators, fetchAccessList]);

  const isAdmin = adminAuthorized;

  if (!user || !isAdmin) {
    return (
      <div className="admin-access">
        {adminError && <p role="alert" className="text-error">{adminError}</p>}
        <div className="admin-access-icon">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h2 className={`text-xl font-bold mb-2 ${isLight ? 'text-ink' : 'text-accent-ink'}`}>{t.restrictedAccess}</h2>
        <p className={`text-sm mb-6 ${isLight ? 'text-ink' : 'text-muted'}`}>
          {t.restrictedAccessDesc}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onOpenAuth}
            className="admin-primary w-full sm:w-auto"
          >
            {t.googleOption}
          </button>
          {onBackToCustomerFlow && (
            <button
              type="button"
              onClick={onBackToCustomerFlow}
              className="admin-quiet w-full sm:w-auto"
            >
              {t.backToCustomerPortal}
            </button>
          )}
        </div>
      </div>
    );
  }

  const pendingCount = orders.filter((o) => o.rechargeStatus === 'pending' || o.rechargeStatus === 'processing').length;

  const NAV_ITEMS: { id: AdminTabId; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'customers', label: t.customersTab, icon: <Users className="w-4 h-4" /> },
    { id: 'pending', label: t.pendingOrdersTab, icon: <Clock className="w-4 h-4" />, badge: pendingCount },
    { id: 'recharges', label: t.rechargesTab, icon: <RefreshCw className="w-4 h-4" /> },
    { id: 'packs', label: t.packsTab, icon: <Layers className="w-4 h-4" /> },
    { id: 'payments', label: t.paymentsTab, icon: <CreditCard className="w-4 h-4" /> },
    { id: 'reports', label: t.reportsTab, icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'operators', label: t.operatorsTab, icon: <Radio className="w-4 h-4" /> },
    { id: 'approvals', label: t.approvalsTab, icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="admin-shell">
      {adminError && <p role="alert" className="text-error">{adminError}</p>}
      {/* Toast */}
      {toastMsg && (
        <div role="status" className="admin-toast">
          {toastMsg}
        </div>
      )}

      <aside className="admin-rail">
        <div className="admin-rail-heading">
          {onBackToCustomerFlow && (
            <button type="button" onClick={onBackToCustomerFlow} className="admin-back" title={t.backToCustomerPortal} aria-label={t.backToCustomerPortal}>
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h1 className="admin-title">{t.adminOperations}</h1>
          </div>
        </div>
        <div className="admin-account">
          <p className="admin-identity">
            <span className="admin-identity-label">{t.loggedInAs}</span>
            <strong className="admin-email" title={user.email}>{user.email}</strong>
          </p>
          <span className="admin-authorized"><ShieldCheck className="w-3.5 h-3.5" />{t.authorizedBadge}</span>
        </div>
        <nav aria-label="Admin sections" className="admin-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabChange(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`admin-nav-item active:translate-y-px ${isActive ? 'is-active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 && <span className="admin-count">{item.badge}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Tab Contents */}
      <div className="admin-workspace">
        <div className="admin-workspace-heading"><h2>{NAV_ITEMS.find((item) => item.id === activeTab)?.label}</h2></div>
        {activeTab === 'customers' && (
          <CustomersTab
            customers={customers}
            custLoading={custLoading}
            customersError={customersError}
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
            ordersError={ordersError}
            onRefresh={fetchOrders}
            getAuthHeaders={getAuthHeaders}
            currentTheme={currentTheme}
            currentLang={currentLang}
            showToast={showToast}
          />
        )}

        {activeTab === 'recharges' && (
          <RechargesTab
            orders={orders}
            ordersLoading={ordersLoading}
            ordersError={ordersError}
            onRefresh={fetchOrders}
            getAuthHeaders={getAuthHeaders}
            currentTheme={currentTheme}
            currentLang={currentLang}
            showToast={showToast}
          />
        )}

        {activeTab === 'packs' && (
          <PacksTab
            plans={plans}
            plansLoading={plansLoading}
            plansError={plansError}
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
            operatorsError={operatorsError}
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
