import React from 'react';
import { createRoot } from 'react-dom/client';
import { Users, Clock, RefreshCw, Layers, CreditCard, BarChart3, Radio, ShieldCheck } from 'lucide-react';
import '../src/index.css';
import '../src/admin.css';
import { Header } from '../src/components/Header';
import { CustomersTab } from '../src/components/Admin/tabs/CustomersTab';
import { PendingOrdersTab } from '../src/components/Admin/tabs/PendingOrdersTab';
import { RechargesTab } from '../src/components/Admin/tabs/RechargesTab';
import { PacksTab } from '../src/components/Admin/tabs/PacksTab';
import { PaymentsTab } from '../src/components/Admin/tabs/PaymentsTab';
import { ReportsTab } from '../src/components/Admin/tabs/ReportsTab';
import { OperatorsTab } from '../src/components/Admin/tabs/OperatorsTab';
import { ApprovalsTab } from '../src/components/Admin/tabs/ApprovalsTab';
import { getOperatorTheme } from '../src/lib/theme';
import type { CustomerRecord, RechargeOrder, PlanCatalogItem, PlanAuditLog, DthOperator, AdminAccount, AdminAccessRequest } from '../src/types';
import type { PaymentReportItem } from '../src/components/Admin/hooks/useAdminData';

// Visual-only fixtures: this page neither creates a user nor renders the auth-gated
// AdminPortal. It wraps actual exported tab components in their shared shell classes.
// The rendered region is inert, and all non-read fetch requests are blocked here.
const originalFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  const method = init?.method || (input instanceof Request ? input.method : 'GET');
  if (!['GET', 'HEAD'].includes(method.toUpperCase())) {
    return Promise.reject(new Error('Local design fixture: network mutations are disabled.'));
  }
  return originalFetch(input, init);
};

const noop = () => {};
const getAuthHeaders = async (): Promise<Record<string, string>> => ({});
const currentTheme = getOperatorTheme('sun_direct');
const shared = { currentTheme, currentLang: 'en' as const, onRefresh: noop };
const actions = { getAuthHeaders, showToast: noop };
const fixtureDate = '2026-11-10T10:00:00Z';
const customers: CustomerRecord[] = [
  { id: 'fixture-customer-1', customerName: 'Sample subscriber A', registeredMobile: '0000000000', smartCardNumber: '40000000000', operator: 'sun_direct', operatorName: 'Sun Direct', activePackName: 'Sample Tamil HD pack', currentBalance: 259, expiryDate: '2026-12-10', status: 'active', accountStatus: 'Active', planQuality: 'HD', registeredCity: 'Sample location', registeredPincode: '000000', totalRechargesCount: 2 },
  { id: 'fixture-customer-2', customerName: 'Sample subscriber B', registeredMobile: '0000000000', smartCardNumber: '1000000000', operator: 'tata_play', operatorName: 'Tata Play', activePackName: 'Sample family pack', currentBalance: 80, expiryDate: '2026-11-12', status: 'due_soon', accountStatus: 'Active', planQuality: 'SD', registeredCity: 'Sample location', registeredPincode: '000000', totalRechargesCount: 1 },
];
const orders: RechargeOrder[] = [
  { orderId: 'FIXTURE-ORDER-001', user_id: 'fixture-user', operator: 'sun_direct', operatorName: 'Sun Direct', smartCardNumber: '40000000000', customerName: 'Sample subscriber A', registeredMobile: '0000000000', amount: 259, packId: 'fixture-plan-1', packName: 'Sample Tamil HD pack', packValidity: '30 days', paymentMethod: 'upi', paymentStatus: 'paid', rechargeStatus: 'pending', operatorRefId: 'FIXTURE-REF-001', createdAt: fixtureDate, updatedAt: fixtureDate },
  { orderId: 'FIXTURE-ORDER-002', user_id: 'fixture-user', operator: 'tata_play', operatorName: 'Tata Play', smartCardNumber: '1000000000', customerName: 'Sample subscriber B', registeredMobile: '0000000000', amount: 350, packId: 'fixture-plan-2', packName: 'Sample family pack', packValidity: '30 days', paymentMethod: 'card', paymentStatus: 'paid', rechargeStatus: 'completed', operatorRefId: 'FIXTURE-REF-002', createdAt: fixtureDate, updatedAt: fixtureDate },
];
const plans: PlanCatalogItem[] = [
  { id: 'fixture-plan-1', operator: 'sun_direct', pack_type: 'HD', duration_months: 1, plan_name: 'Sample Tamil HD pack', amount: 259, is_recommended: true, channel_count: 120, channel_list: ['Sample channel A', 'Sample channel B'], updated_at: fixtureDate, updated_by: 'fixture' },
  { id: 'fixture-plan-2', operator: 'tata_play', pack_type: 'SD', duration_months: 6, plan_name: 'Sample family pack', amount: 1800, is_recommended: false, channel_count: 100, channel_list: ['Sample channel A'], updated_at: fixtureDate, updated_by: 'fixture' },
];
const auditLogs: PlanAuditLog[] = [
  { id: 'fixture-log-1', plan_id: 'fixture-plan-1', plan_name: 'Sample Tamil HD pack', operator: 'sun_direct', action: 'update', updated_at: fixtureDate, updated_by: 'fixture@example.invalid', details: 'Local visual fixture: sample catalog record updated.' },
  { id: 'fixture-log-2', plan_id: 'fixture-plan-2', plan_name: 'Sample family pack', operator: 'tata_play', action: 'create', updated_at: fixtureDate, updated_by: 'fixture@example.invalid', details: 'Local visual fixture: sample catalog record created.' },
];
const payments: PaymentReportItem[] = orders.map((o) => ({ id: `PAY-${o.orderId}`, paymentMethod: o.paymentMethod, amount: o.amount, status: o.paymentStatus, operator: o.operator, customerName: o.customerName || 'Sample subscriber', createdAt: fixtureDate, operatorRefId: o.operatorRefId }));
const operators: DthOperator[] = [
  { id: 'sun_direct', name: 'Sun Direct', tamilName: 'Sun Direct', isEnabled: true, smartCardLength: 11, cardLengthDesc: '11 digits' },
  { id: 'tata_play', name: 'Tata Play', tamilName: 'Tata Play', isEnabled: false, smartCardLength: 10, disableReason: 'Sample maintenance condition' },
];
const approvedAdmins: AdminAccount[] = [{ uid: 'fixture-admin', email: 'fixture@example.invalid', name: 'Sample administrator', status: 'approved', role: 'admin', approvedBy: 'fixture', approvedAt: fixtureDate }];
const pendingRequests: AdminAccessRequest[] = [{ id: 'fixture-access', userId: 'fixture-user', userEmail: 'request@example.invalid', userName: 'Sample requester', reason: 'Sample access request', status: 'pending', requestedAt: fixtureDate }];

const sections = [
  { id: 'customers', label: 'Customers', icon: Users }, { id: 'pending', label: 'Pending orders', icon: Clock },
  { id: 'recharges', label: 'Recharges', icon: RefreshCw }, { id: 'packs', label: 'Packs', icon: Layers },
  { id: 'payments', label: 'Payments', icon: CreditCard }, { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'operators', label: 'Operators', icon: Radio }, { id: 'approvals', label: 'Access approvals', icon: ShieldCheck },
];
const requested = new URLSearchParams(window.location.search).get('screen');
const screen = sections.some((s) => s.id === requested) ? requested! : 'customers';
const empty = new URLSearchParams(window.location.search).get('state') === 'empty';
const customerRows = empty ? [] : customers;
const orderRows = empty ? [] : orders;
const views: Record<string, React.ReactNode> = {
  customers: <CustomersTab {...shared} {...actions} customers={customerRows} custLoading={false} customersError={null} />,
  pending: <PendingOrdersTab {...shared} {...actions} orders={orderRows} ordersLoading={false} ordersError={null} />,
  recharges: <RechargesTab {...shared} {...actions} orders={orderRows} ordersLoading={false} ordersError={null} />,
  packs: <PacksTab {...shared} plans={empty ? [] : plans} plansLoading={false} plansError={null} user={null} showToast={noop} onPlansUpdated={noop} />,
  payments: <PaymentsTab {...shared} payments={empty ? [] : payments} paymentsLoading={false} />,
  reports: <ReportsTab {...shared} customers={customerRows} orders={orderRows} auditLogs={empty ? [] : auditLogs} reportsLoading={false} />,
  operators: <OperatorsTab {...shared} {...actions} operators={empty ? [] : operators} operatorsLoading={false} />,
  approvals: <ApprovalsTab {...shared} {...actions} approvedAdmins={empty ? [] : approvedAdmins} pendingRequests={empty ? [] : pendingRequests} accessLoading={false} user={null} />,
};

createRoot(document.getElementById('root')!).render(
  <>
    <div style={{ background: 'var(--color-ink)', color: 'var(--color-paper)', padding: 'var(--space-sm) var(--space-lg)', fontSize: 14, textAlign: 'center' }}>
      Design preview — local fixture data. No live account or authenticated access. Actions are disabled.
    </div>
    <div inert>
      <Header currentLang="en" onLanguageChange={noop} user={null} onOpenAuth={noop} onSignOut={noop} activeTab="admin-portal" onTabChange={noop} currentTheme={currentTheme} />
      <main className="app-main" style={{ maxWidth: 1280, marginInline: 'auto', padding: 'var(--space-xl) var(--space-lg)' }}>
        <div className="admin-shell">
          <aside className="admin-rail">
            <div className="admin-rail-heading"><div><h1 className="admin-title">Admin operations</h1><p className="admin-identity">Local fixture wrapper</p></div></div>
            <span className="admin-authorized"><ShieldCheck className="w-3.5 h-3.5" />Design review</span>
            <nav className="admin-nav" aria-label="Fixture sections">
              {sections.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={`admin-nav-item ${screen === id ? 'is-active' : ''}`} aria-current={screen === id ? 'page' : undefined}><Icon className="w-4 h-4" /><span>{label}</span></button>)}
            </nav>
          </aside>
          <section className="admin-workspace">
            <div className="admin-workspace-heading"><h2>{sections.find((s) => s.id === screen)?.label}</h2></div>
            {views[screen]}
          </section>
        </div>
      </main>
    </div>
  </>,
);
