// Local design fixture only. This file is outside the application entry and is not deployed.
// All UI uses the actual component source; no success response or auth state is fabricated.
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import { AuthModal } from '../src/components/AuthModal';
import { PaymentModal } from '../src/components/PaymentModal';
import { ReceiptModal } from '../src/components/ReceiptModal';
import { NewConnectionModal } from '../src/components/NewConnectionModal';
import { ExcelPlanImportExportModal } from '../src/components/ExcelPlanImportExportModal';
import { ApplyPlanModal } from '../src/components/BrowsePlans/ApplyPlanModal';
import { ComparisonTable } from '../src/components/BrowsePlans/ComparisonTable';
import { CompareDrawer } from '../src/components/BrowsePlans/CompareDrawer';
import { getOperatorTheme } from '../src/lib/theme';
import type { BrowsePlan, DthConnection, DthOperator, PlanCatalogItem, RechargeOrder, UserProfile } from '../src/types';

const params = new URLSearchParams(window.location.search);
const screen = params.get('screen') || 'auth';
const language = params.get('lang') === 'ta' ? 'ta' : 'en';
const noop = () => {};
const timestamp = '2026-11-10T06:30:00.000Z';
const theme = getOperatorTheme('sun_direct');
const operator: DthOperator = { id: 'sun_direct', name: 'Sun Direct', tamilName: 'Sun Direct', isEnabled: true };
const plan: BrowsePlan = {
  id: 'local-design-pack-1', operator: 'sun_direct', operatorName: 'Sun Direct',
  name: 'Sample Tamil HD pack', type: 'HD', duration_months: 1, price: 259,
  monthly_equivalent_rate: 259, channel_count: 210, hd_channel_count: 32,
  channels: ['Sample channel'], genre_tags: ['Tamil'], is_recommended: true,
};
const secondPlan: BrowsePlan = { ...plan, id: 'local-design-pack-2', name: 'Sample annual HD pack', duration_months: 12, price: 3100, monthly_equivalent_rate: 258 };
const catalog: PlanCatalogItem = {
  id: plan.id, operator: 'sun_direct', pack_type: 'HD', duration_months: 1,
  plan_name: plan.name, amount: 259, is_recommended: true, channel_list: ['Sample channel'],
  updated_by: 'local-design-fixture', updated_at: timestamp,
};
const sampleUser: UserProfile = {
  uid: 'local-design-fixture', displayName: 'Sample subscriber', email: 'sample@example.invalid',
  is_worker: false, role: 'customer', createdAt: timestamp, lastLoginAt: timestamp, authProviders: [],
};
const connection: DthConnection = {
  id: 'local-design-box', user_id: sampleUser.uid, operator: 'sun_direct', operatorName: 'Sun Direct',
  smartCardNumber: '40000000000', nickname: 'Sample living room', customerName: 'Sample subscriber', createdAt: timestamp,
};
const order: RechargeOrder = {
  orderId: 'SAMPLE-ORDER', user_id: sampleUser.uid, operator: 'sun_direct', operatorName: 'Sun Direct',
  smartCardNumber: connection.smartCardNumber, customerName: 'Sample subscriber', amount: 259,
  packId: plan.id, packName: plan.name, packValidity: '30 days', paymentMethod: 'upi',
  paymentStatus: 'paid', rechargeStatus: 'completed', operatorRefId: 'SAMPLE-REFERENCE',
  createdAt: timestamp, updatedAt: timestamp,
};

// Defense in depth: neither network mutations nor click/submit handlers run in this read-only fixture.
const originalFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) return Promise.reject(new Error('Local design fixture blocks service mutations.'));
  return originalFetch(input, init);
};

function Preview() {
  let content: React.ReactNode;
  const common = { isOpen: true, onClose: noop, currentLang: language } as const;
  switch (screen) {
    case 'payment': content = <PaymentModal {...common} currentTheme={theme} user={null} plan={{name: plan.name, price: plan.price, validityDays: 30}} subscriber={null} operator={operator} smartCard={connection.smartCardNumber} saveBox={false} onPaymentSuccess={noop} />; break;
    case 'receipt': content = <ReceiptModal order={order} onClose={noop} currentLang={language} />; break;
    case 'installation': content = <NewConnectionModal {...common} />; break;
    case 'excel': content = <ExcelPlanImportExportModal isOpen onClose={noop} plans={[catalog]} currentTheme={theme} user={null} onPlansUpdated={noop} defaultTab={params.get('tab') === 'export' ? 'export' : 'import'} />; break;
    case 'apply': content = <ApplyPlanModal {...common} plan={plan} user={params.get('state') === 'saved' ? sampleUser : null} connections={[connection]} onOpenAuth={noop} onApplyPlanToBox={noop} onAddNewConnectionAndApply={noop} currentTheme={theme} />; break;
    case 'compare': content = <ComparisonTable {...common} plans={[plan, secondPlan]} onRemovePlan={noop} onSelectPlan={noop} currentTheme={theme} />; break;
    case 'drawer': content = <CompareDrawer selectedPlans={params.get('state') === 'one' ? [plan] : [plan, secondPlan]} onRemovePlan={noop} onClearAll={noop} onOpenCompareModal={noop} currentTheme={theme} currentLang={language} />; break;
    default: content = <AuthModal {...common} onSuccess={noop} currentUser={null} />;
  }
  return <div onClickCapture={(event) => { event.preventDefault(); event.stopPropagation(); }} onSubmitCapture={(event) => { event.preventDefault(); event.stopPropagation(); }}>
    <p className="fixed bottom-0 left-0 z-[60] bg-paper px-3 py-1 text-sm text-muted">Local design fixture / sample data / actions disabled</p>
    {content}
  </div>;
}
createRoot(document.getElementById('root')!).render(<Preview />);
