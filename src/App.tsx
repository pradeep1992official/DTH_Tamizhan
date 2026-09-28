import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { RechargeFlow } from './components/RechargeFlow';
import { AuthModal } from './components/AuthModal';
import { PaymentModal } from './components/PaymentModal';
import { ReceiptModal } from './components/ReceiptModal';
import { SignalRefreshModal } from './components/SignalRefreshModal';
import { SavedConnections } from './components/SavedConnections';
import { AdminDealerPortal, AdminPathTab } from './components/AdminDealerPortal';
import { NewConnectionModal } from './components/NewConnectionModal';
import { SecurityNotice } from './components/SecurityNotice';
import { BrowsePlansView } from './components/BrowsePlans/BrowsePlansView';
import { 
  Language, 
  UserProfile, 
  DthConnection, 
  DthPlan, 
  DthOperator, 
  SubscriberDetails, 
  RechargeOrder, 
  DthOperatorId,
  BrowsePlan,
  isUserAdmin
} from './types';
import { translations } from './lib/translations';
import { getOperatorTheme, OPERATOR_THEMES } from './lib/theme';
import { 
  Tv, 
  ShieldCheck, 
  CheckCircle2, 
  Heart,
  Palette,
  Sparkles
} from 'lucide-react';

export default function App() {
  // Prompt 2: Default to English on first load; persist manual user toggles in localStorage
  const [currentLang, setCurrentLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('dth_tamizhan_lang');
      if (saved === 'ta' || saved === 'en') return saved;
    } catch {}
    return 'en';
  });

  const handleLanguageChange = (lang: Language) => {
    setCurrentLang(lang);
    try {
      localStorage.setItem('dth_tamizhan_lang', lang);
    } catch {}
  };

  // User Authentication State
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('dth_tamizhan_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const isUserAdminRole = isUserAdmin(user);

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const search = window.location.search;
      const isAdminRoute = path.startsWith('/admin') || path === '/worker' || path === '/dealer' || hash.includes('admin') || search.includes('admin') || search.includes('mode=worker');
      if (isAdminRoute) {
        try {
          const saved = localStorage.getItem('dth_tamizhan_user');
          const parsed = saved ? JSON.parse(saved) : null;
          if (isUserAdmin(parsed)) {
            return 'admin-portal';
          }
        } catch {}
        // Non-admin or unauthenticated: Direct URL routing to admin portal is restricted
        return 'recharge';
      }
    }
    return 'recharge';
  });

  const [adminPortalSubTab, setAdminPortalSubTab] = useState<AdminPathTab>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.includes('customer')) return 'customers';
      if (path.includes('report') && !path.includes('payment')) return 'reports';
      if (path.includes('pending') || path === '/worker' || path === '/dealer') return 'pending';
      if (path.includes('recharge')) return 'recharges';
      if (path.includes('pack') || path.includes('plan')) return 'packs';
      if (path.includes('payment')) return 'payments';
      if (path.includes('approval') || path.includes('admin-access')) return 'approvals';
      if (path.startsWith('/admin')) return 'customers';
    }
    return 'customers';
  });

  // Dynamic Theme state (Changes when operator is selected or manually switched)
  const [selectedOpId, setSelectedOpId] = useState<DthOperatorId>(() => {
    try {
      const saved = localStorage.getItem('dth_selected_operator');
      if (saved && OPERATOR_THEMES[saved as DthOperatorId]) {
        return saved as DthOperatorId;
      }
    } catch {}
    return 'sun_direct';
  });

  const handleSelectOpId = (opId: DthOperatorId) => {
    setSelectedOpId(opId);
    try {
      localStorage.setItem('dth_selected_operator', opId);
    } catch {}
  };

  const currentTheme = getOperatorTheme(selectedOpId);

  // Saved Connections State
  const [connections, setConnections] = useState<DthConnection[]>(() => {
    try {
      const saved = localStorage.getItem('dth_tamizhan_connections');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'conn-1',
        user_id: 'default',
        operator: 'sun_direct',
        operatorName: 'Sun Direct',
        smartCardNumber: '41289456123',
        nickname: 'Living Room TV (Sun Direct)',
        customerName: 'Ramesh K',
        balance: 42.50,
        expiryDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
        monthlyPackPrice: 219,
        packName: 'Tamil Value Pack',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'conn-2',
        user_id: 'default',
        operator: 'tata_play',
        operatorName: 'Tata Play',
        smartCardNumber: '1029384756',
        nickname: 'Bedroom TV (Tata Play)',
        customerName: 'Priya R',
        balance: 110.00,
        expiryDate: new Date(Date.now() + 86400000 * 22).toISOString().split('T')[0],
        monthlyPackPrice: 360,
        packName: 'South Special HD Premium',
        createdAt: new Date().toISOString(),
      }
    ];
  });

  // Modal Controls
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isRefreshOpen, setIsRefreshOpen] = useState(false);
  const [isNewDishOpen, setIsNewDishOpen] = useState(false);

  // Active Transaction Data
  const [activePaymentPlan, setActivePaymentPlan] = useState<any>(null);
  const [activeSubscriber, setActiveSubscriber] = useState<SubscriberDetails | null>(null);
  const [activeOperator, setActiveOperator] = useState<DthOperator | null>(null);
  const [activeSmartCard, setActiveSmartCard] = useState<string>('');
  const [activeSaveBox, setActiveSaveBox] = useState<boolean>(true);

  const [lastCompletedOrder, setLastCompletedOrder] = useState<RechargeOrder | null>(null);
  const [refreshTargetOp, setRefreshTargetOp] = useState<DthOperatorId>('sun_direct');
  const [refreshTargetCard, setRefreshTargetCard] = useState<string>('');

  const [prefillConn, setPrefillConn] = useState<DthConnection | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Persist user and connections
  useEffect(() => {
    if (user) {
      localStorage.setItem('dth_tamizhan_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('dth_tamizhan_user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('dth_tamizhan_connections', JSON.stringify(connections));
  }, [connections]);

  // Synchronize browser history and path for direct URL access (/admin/*, /worker, /dealer)
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const search = window.location.search;
      const isAdminRoute = path.startsWith('/admin') || path === '/worker' || path === '/dealer' || hash.includes('admin') || search.includes('admin') || search.includes('mode=worker');
      
      if (isAdminRoute) {
        if (isUserAdminRole) {
          setActiveTab('admin-portal');
          if (path.includes('customer') || hash.includes('customer')) {
            setAdminPortalSubTab('customers');
          } else if ((path.includes('report') && !path.includes('payment')) || hash.includes('report')) {
            setAdminPortalSubTab('reports');
          } else if (path.includes('pending') || path === '/worker' || path === '/dealer' || hash.includes('pending') || hash.includes('worker')) {
            setAdminPortalSubTab('pending');
          } else if (path.includes('recharge') || path === '/admin/orders') {
            setAdminPortalSubTab('recharges');
          } else if (path.includes('pack') || path.includes('plan')) {
            setAdminPortalSubTab('packs');
          } else if (path.includes('payment')) {
            setAdminPortalSubTab('payments');
          } else if (path.includes('approval') || path.includes('admin-access')) {
            setAdminPortalSubTab('approvals');
          } else {
            setAdminPortalSubTab('customers');
          }
        } else {
          // If not logged in as admin, direct URL routing to admin portal is restricted!
          if (window.location.pathname.startsWith('/admin') || window.location.pathname === '/worker' || window.location.pathname === '/dealer') {
            window.history.replaceState(null, '', '/');
          }
          setActiveTab('recharge');
          showToast(currentLang === 'ta' ? 'நிர்வாக அணுகல் தடைசெய்யப்பட்டுள்ளது (Admin Login Required)' : 'Access Restricted: Administrator sign-in required');
        }
      }
    };

    // If activeTab is admin-portal but user is not an admin, bounce to recharge
    if (activeTab === 'admin-portal' && !isUserAdminRole) {
      if (window.location.pathname.startsWith('/admin') || window.location.pathname === '/worker' || window.location.pathname === '/dealer') {
        window.history.replaceState(null, '', '/');
      }
      setActiveTab('recharge');
    }

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, [isUserAdminRole, activeTab, currentLang]);

  const navigateToTab = (tab: string, subTab?: AdminPathTab) => {
    if (tab === 'admin-portal' || tab === 'admin-plans' || tab === 'admin-roles' || tab === 'worker') {
      if (!isUserAdminRole) {
        showToast(currentLang === 'ta' ? 'நிர்வாக அணுகல் தடைசெய்யப்பட்டுள்ளது' : 'Access Restricted: Administrator sign-in required');
        setIsAuthOpen(true);
        return;
      }
      setActiveTab('admin-portal');
      const targetSubTab: AdminPathTab = subTab || (tab === 'worker' ? 'pending' : 'customers');
      setAdminPortalSubTab(targetSubTab);
      window.history.pushState(null, '', `/admin/${targetSubTab}`);
    } else {
      setActiveTab(tab);
      if (window.location.pathname.startsWith('/admin') || window.location.pathname === '/worker' || window.location.pathname === '/dealer') {
        window.history.pushState(null, '', '/');
      }
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleAuthSuccess = (profile: UserProfile) => {
    setUser(profile);
    showToast(currentLang === 'ta' ? 'வெற்றிகரமாக உள்நுழைந்தீர்கள்!' : 'Signed in successfully!');
  };

  const handleSignOut = () => {
    setUser(null);
    showToast(currentLang === 'ta' ? 'வெளியேறிவிட்டீர்கள்' : 'Signed out successfully');
  };

  const handleInitiatePayment = (
    plan: any,
    subscriber: SubscriberDetails | null,
    operator: DthOperator,
    smartCard: string,
    saveBox: boolean
  ) => {
    setActivePaymentPlan(plan);
    setActiveSubscriber(subscriber);
    setActiveOperator(operator);
    setActiveSmartCard(smartCard);
    setActiveSaveBox(saveBox);
    setIsPaymentOpen(true);
  };

  const handlePaymentSuccess = (order: RechargeOrder) => {
    setIsPaymentOpen(false);
    setLastCompletedOrder(order);
    setIsReceiptOpen(true);

    // Save connection if user requested
    if (activeSaveBox && activeOperator) {
      const exists = connections.find(
        (c) => c.operator === activeOperator.id && c.smartCardNumber === activeSmartCard
      );
      if (!exists) {
        const newConn: DthConnection = {
          id: `conn-${Date.now()}`,
          user_id: user?.uid || 'guest_user',
          operator: activeOperator.id,
          operatorName: activeOperator.name,
          smartCardNumber: activeSmartCard,
          nickname: `${activeOperator.name} Box`,
          customerName: activeSubscriber?.customerName || 'Subscriber',
          balance: order.amount,
          expiryDate: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
          monthlyPackPrice: order.amount,
          packName: order.packName,
          createdAt: new Date().toISOString(),
        };
        setConnections((prev) => [newConn, ...prev]);
      }
    }

    showToast(currentLang === 'ta' ? 'ரீசார்ஜ் வெற்றிகரமாக முடிந்தது!' : 'DTH Recharge Successful!');
  };

  const handleTriggerRefreshModal = (operator: DthOperatorId, card: string) => {
    setRefreshTargetOp(operator);
    setRefreshTargetCard(card);
    setIsRefreshOpen(true);
  };

  const handleQuickRechargeFromSaved = (conn: DthConnection) => {
    setPrefillConn(conn);
    handleSelectOpId(conn.operator);
    setActiveTab('recharge');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddConnection = (connData: Omit<DthConnection, 'id' | 'createdAt'>) => {
    const newConn: DthConnection = {
      ...connData,
      id: `conn-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setConnections((prev) => [newConn, ...prev]);
    showToast(currentLang === 'ta' ? 'புதிய பாக்ஸ் சேர்க்கப்பட்டது!' : 'Set-Top Box saved!');
  };

  const handleDeleteConnection = (id: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== id));
    showToast(currentLang === 'ta' ? 'இணைப்பு நீக்கப்பட்டது' : 'Connection removed');
  };

  // Browse Plans -> Apply to Box Handoff (Enforcing Compatibility Rule 2)
  const handleApplyPlanFromBrowse = (plan: BrowsePlan, connection: DthConnection) => {
    if (connection.operator !== plan.operator) {
      showToast('Cannot apply plan to an incompatible Set-Top Box operator');
      return;
    }

    handleSelectOpId(plan.operator);
    setPrefillConn(connection);

    const adaptedPlan: DthPlan = {
      id: plan.id,
      operatorId: plan.operator,
      name: plan.name,
      tamilName: plan.tamilName || plan.name,
      category: 'tamil_base',
      price: plan.price,
      validityDays: plan.duration_months * 30,
      channelsCount: plan.channel_count,
      hdChannelsCount: plan.hd_channel_count || (plan.type === 'HD' ? 30 : 0),
      description: plan.description || `${plan.duration_months} Months ${plan.type} Pack`,
      tamilChannelsHighlight: plan.channels.slice(0, 5),
    };

    const op = {
      id: plan.operator,
      name: plan.operator === 'sun_direct' ? 'Sun Direct' : plan.operator === 'tata_play' ? 'Tata Play' : plan.operator === 'airtel_dth' ? 'Airtel Digital TV' : plan.operator === 'dish_tv' ? 'Dish TV' : 'D2H Videocon',
      shortName: plan.operator,
      tamilName: plan.operator,
      logoColor: currentTheme.primaryColor,
      cardName: 'Smart Card Number',
      cardPattern: '^[0-9]{8,12}$',
      cardLengthDesc: 'Valid card number',
      sampleId: connection.smartCardNumber,
      tollFree: '1800 123 4567',
      smsRefreshFormat: 'SMS REFRESH to 56677',
      popularPacksCount: 15,
    };

    const subscriberInfo: SubscriberDetails = {
      operator: plan.operator,
      operatorName: op.name,
      smartCardNumber: connection.smartCardNumber,
      customerName: connection.customerName || user?.displayName || 'Subscriber',
      registeredMobile: user?.phoneNumber || '+91 98401 23456',
      currentBalance: connection.balance || 0,
      packName: plan.name,
      packMonthlyRent: plan.monthly_equivalent_rate || Math.round(plan.price / plan.duration_months),
      expiryDate: connection.expiryDate || new Date().toISOString().split('T')[0],
      isExpired: false,
      accountStatus: 'Active',
    };

    handleInitiatePayment(adaptedPlan, subscriberInfo, op, connection.smartCardNumber, false);
    showToast(`Applied ${plan.name} to ${connection.nickname}!`);
  };

  const handleAddNewConnectionAndApply = (
    plan: BrowsePlan,
    newConnData: { smartCardNumber: string; nickname: string; customerName?: string }
  ) => {
    const opName = plan.operator === 'sun_direct' ? 'Sun Direct' : plan.operator === 'tata_play' ? 'Tata Play' : plan.operator === 'airtel_dth' ? 'Airtel Digital TV' : plan.operator === 'dish_tv' ? 'Dish TV' : 'D2H Videocon';
    const newConn: DthConnection = {
      id: `conn-${Date.now()}`,
      user_id: user?.uid || 'guest_user',
      operator: plan.operator,
      operatorName: opName,
      smartCardNumber: newConnData.smartCardNumber,
      nickname: newConnData.nickname || `${opName} Box`,
      customerName: newConnData.customerName || user?.displayName || 'Subscriber',
      balance: 0,
      expiryDate: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
      monthlyPackPrice: plan.price,
      packName: plan.name,
      createdAt: new Date().toISOString(),
    };

    setConnections((prev) => [newConn, ...prev]);
    handleApplyPlanFromBrowse(plan, newConn);
  };

  const t = translations[currentLang];
  const isLight = currentTheme.isLightMode;

  return (
    <div className={`min-h-screen ${currentTheme.pageBg} ${currentTheme.pageText} flex flex-col font-sans transition-colors duration-300`}>
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-white px-4 py-2.5 rounded-2xl font-bold text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Global Header with Dynamic Theme & Brand Logo */}
      <Header
        currentLang={currentLang}
        onLanguageChange={handleLanguageChange}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSignOut={handleSignOut}
        activeTab={activeTab}
        onTabChange={(tab) => {
          navigateToTab(tab);
          if (tab === 'refresh') setIsRefreshOpen(true);
          if (tab === 'new-dish') setIsNewDishOpen(true);
        }}
        currentTheme={currentTheme}
        onSelectTheme={handleSelectOpId}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 md:py-8 space-y-8">
        {/* Merged Admin & Dealer Portal */}
        {activeTab === 'admin-portal' && (
          <AdminDealerPortal
            currentLang={currentLang}
            user={user}
            onOpenAuth={() => setIsAuthOpen(true)}
            onUpdateUserRole={(updated: UserProfile) => setUser(updated)}
            onTriggerRefresh={handleTriggerRefreshModal}
            onBackToCustomerFlow={() => navigateToTab('recharge')}
            initialSubTab={adminPortalSubTab}
            currentTheme={currentTheme}
            onPathChange={(p) => setAdminPortalSubTab(p)}
          />
        )}

        {activeTab === 'recharge' && (
          <RechargeFlow
            currentLang={currentLang}
            user={user}
            onInitiatePayment={handleInitiatePayment}
            onTriggerRefresh={handleTriggerRefreshModal}
            prefillConnection={prefillConn}
            selectedOpId={selectedOpId}
            onSelectOpId={handleSelectOpId}
            currentTheme={currentTheme}
          />
        )}

        {/* Public Anonymous Browse & Compare Plans */}
        {activeTab === 'plans' && (
          <BrowsePlansView
            currentTheme={currentTheme}
            currentLang={currentLang}
            user={user}
            connections={connections}
            onOpenAuth={() => setIsAuthOpen(true)}
            onApplyPlanToBox={handleApplyPlanFromBrowse}
            onAddNewConnectionAndApply={handleAddNewConnectionAndApply}
          />
        )}

        {activeTab === 'connections' && (
          <SavedConnections
            connections={connections}
            currentLang={currentLang}
            user={user}
            onQuickRecharge={handleQuickRechargeFromSaved}
            onTriggerRefresh={handleTriggerRefreshModal}
            onAddConnection={handleAddConnection}
            onDeleteConnection={handleDeleteConnection}
            onOpenAuth={() => setIsAuthOpen(true)}
            currentTheme={currentTheme}
          />
        )}

        {activeTab === 'security' && <SecurityNotice />}
      </main>

      {/* Footer: Fully Themed (Dark #333333 on Airtel, Themed on Others) */}
      <footer className={`${currentTheme.footerBg} ${currentTheme.footerBorder} border-t py-8 px-4 text-xs ${currentTheme.footerText} mt-auto transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto space-y-6">
          <div className={`flex flex-wrap items-center justify-between gap-4 border-b ${currentTheme.footerBorder} pb-6`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div 
                  className={`w-7 h-7 rounded-xl flex items-center justify-center border ${
                    isLight ? 'bg-white border-gray-300' : 'bg-[#0e1933] border-white/10'
                  }`}
                  style={{ borderColor: `${currentTheme.primaryColor}50` }}
                >
                  <Tv className="w-3.5 h-3.5" style={{ color: currentTheme.primaryColor }} />
                </div>
                <span className={`font-sans font-extrabold text-base tracking-tight ${isLight ? 'text-[#111827]' : 'text-[#f5f2eb]'}`}>
                  DTH <span style={{ color: currentTheme.primaryColor }}>தமிழன்</span>
                </span>
                <span className="text-[11px] opacity-75 border px-1.5 py-0.5 rounded font-mono ml-1">
                  v2.0
                </span>
              </div>
              <p className="text-xs opacity-80 max-w-md mt-2">
                {t.brandTagline}
              </p>
            </div>

            {/* Quick Links: Unified Admin Portal - Only displayed for authenticated Admins */}
            {isUserAdminRole && (
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
                <button
                  id="footer-admin-dealer-portal-link"
                  onClick={() => navigateToTab('admin-portal', 'customers')}
                  className={`transition-colors flex items-center gap-1.5 font-bold ${currentTheme.footerLinkHover}`}
                  style={{ color: currentTheme.primaryColor }}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Admin Operations Portal</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 text-[11px] opacity-70">
            <p>
              Compatible with {currentTheme.name} services. All trademarks, logos and brand names are property of their respective owners.
            </p>
            <div className="flex items-center gap-1">
              <span>Made with</span>
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              <span>for DTH Viewers Across Tamil Nadu</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentLang={currentLang}
        onSuccess={handleAuthSuccess}
        currentUser={user}
      />

      {activeOperator && (
        <PaymentModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          currentLang={currentLang}
          user={user}
          plan={activePaymentPlan}
          subscriber={activeSubscriber}
          operator={activeOperator}
          smartCard={activeSmartCard}
          saveBox={activeSaveBox}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      <ReceiptModal
        order={lastCompletedOrder}
        onClose={() => setIsReceiptOpen(false)}
        currentLang={currentLang}
        onTriggerRefresh={handleTriggerRefreshModal}
      />

      <SignalRefreshModal
        isOpen={isRefreshOpen}
        onClose={() => setIsRefreshOpen(false)}
        currentLang={currentLang}
        initialOperator={refreshTargetOp}
        initialCard={refreshTargetCard}
      />

      <NewConnectionModal
        isOpen={isNewDishOpen}
        onClose={() => setIsNewDishOpen(false)}
        currentLang={currentLang}
      />
    </div>
  );
}
