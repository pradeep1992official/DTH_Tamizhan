import React, { useState, useEffect } from 'react';
import { 
  BrowserRouter, 
  Routes, 
  Route, 
  Navigate, 
  useNavigate, 
  useLocation, 
  useParams 
} from 'react-router-dom';
import { Header } from './components/Header';
import { RechargeFlow } from './components/RechargeFlow';
import { AuthModal } from './components/AuthModal';
import { PaymentModal } from './components/PaymentModal';
import { ReceiptModal } from './components/ReceiptModal';
import { SignalRefreshModal } from './components/SignalRefreshModal';
import { SavedConnections } from './components/SavedConnections';
import { AdminPortal } from './components/AdminPortal';
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
  AdminTabId,
  isUserAdmin
} from './types';
import { translations } from './lib/translations';
import { getOperatorTheme, OPERATOR_THEMES } from './lib/theme';
import { db, isFirebaseLive, sanitizePayload } from './lib/firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, query, where, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { 
  Tv, 
  ShieldCheck, 
  Heart,
} from 'lucide-react';

function AdminRouteWrapper({
  currentLang,
  user,
  onOpenAuth,
  onUpdateUserRole,
  onTriggerRefresh,
  currentTheme,
}: {
  currentLang: Language;
  user: UserProfile | null;
  onOpenAuth: () => void;
  onUpdateUserRole?: (updated: UserProfile) => void;
  onTriggerRefresh: (operator: DthOperatorId, card: string) => void;
  currentTheme: any;
}) {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();

  const mapSubTab = (param?: string): AdminTabId => {
    if (!param) return 'customers';
    if (param === 'customer' || param === 'customers') return 'customers';
    if (param === 'pending' || param === 'worker' || param === 'dealer') return 'pending';
    if (param === 'recharge' || param === 'recharges' || param === 'orders') return 'recharges';
    if (param === 'pack' || param === 'packs' || param === 'plan' || param === 'plans') return 'packs';
    if (param === 'payment' || param === 'payments') return 'payments';
    if (param === 'report' || param === 'reports' || param === 'audit') return 'reports';
    if (param === 'operator' || param === 'operators') return 'operators';
    if (param === 'approval' || param === 'approvals' || param === 'admin-access') return 'approvals';
    return 'customers';
  };

  const currentTab = mapSubTab(tab);

  return (
    <AdminPortal
      currentLang={currentLang}
      user={user}
      onOpenAuth={onOpenAuth}
      onUpdateUserRole={onUpdateUserRole}
      onTriggerRefresh={onTriggerRefresh}
      onBackToCustomerFlow={() => navigate('/')}
      initialTab={currentTab}
      currentTheme={currentTheme}
      onPathChange={(newTab) => {
        navigate(`/admin/${newTab}`);
      }}
    />
  );
}

function MainApp() {
  const navigate = useNavigate();
  const location = useLocation();

  // Language state
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

  // Selected Operator / Theme
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

  // Saved Connections
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

  // Modals
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

  // Persist User
  useEffect(() => {
    if (user) {
      localStorage.setItem('dth_tamizhan_user', JSON.stringify(user));
      if (isFirebaseLive && db && user.uid) {
        const q = query(collection(db, 'dth_connections'), where('user_id', '==', user.uid));
        getDocs(q).then((snap) => {
          if (!snap.empty) {
            const remoteConns: DthConnection[] = [];
            snap.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
              const d = docSnap.data();
              if (d && d.smartCardNumber) {
                remoteConns.push({
                  id: d.id || docSnap.id,
                  user_id: d.user_id || user.uid,
                  operator: d.operator || 'sun_direct',
                  operatorName: d.operatorName || d.operator || 'DTH',
                  smartCardNumber: d.smartCardNumber,
                  nickname: d.nickname || `${d.operatorName || 'DTH'} Box`,
                  customerName: d.customerName || 'Subscriber',
                  balance: typeof d.balance === 'number' ? d.balance : 0,
                  expiryDate: d.expiryDate || new Date().toISOString().split('T')[0],
                  monthlyPackPrice: typeof d.monthlyPackPrice === 'number' ? d.monthlyPackPrice : 299,
                  packName: d.packName || 'Active Pack',
                  createdAt: d.createdAt || new Date().toISOString(),
                });
              }
            });
            if (remoteConns.length > 0) {
              setConnections((prev) => {
                const map = new Map<string, DthConnection>();
                prev.forEach((c) => map.set(`${c.operator}_${c.smartCardNumber}`, c));
                remoteConns.forEach((c) => map.set(`${c.operator}_${c.smartCardNumber}`, c));
                return Array.from(map.values());
              });
            }
          }
        }).catch((err) => {
          console.warn('[Firestore] Connections query note:', err);
        });
      }
    } else {
      localStorage.removeItem('dth_tamizhan_user');
    }
  }, [user]);

  // Persist Connections
  useEffect(() => {
    localStorage.setItem('dth_tamizhan_connections', JSON.stringify(connections));
  }, [connections]);

  const handleAuthSuccess = (profile: UserProfile) => {
    setUser(profile);
    setIsAuthOpen(false);
  };

  const handleSignOut = () => {
    setUser(null);
    localStorage.removeItem('dth_tamizhan_user');
    navigate('/');
  };

  const handleTriggerRefreshModal = (operator: DthOperatorId, card: string) => {
    setRefreshTargetOp(operator);
    setRefreshTargetCard(card);
    setIsRefreshOpen(true);
  };

  const handleInitiatePayment = (
    plan: DthPlan | { name: string; price: number; validityDays: number; pack_type?: string; duration_months?: number },
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

  const handlePaymentSuccess = async (completedOrder: RechargeOrder) => {
    setIsPaymentOpen(false);
    setLastCompletedOrder(completedOrder);
    setIsReceiptOpen(true);

    if (activeSaveBox) {
      const newConn: DthConnection = {
        id: `conn-${Date.now()}`,
        user_id: user?.uid || 'guest_user',
        operator: completedOrder.operator,
        operatorName: completedOrder.operatorName,
        smartCardNumber: completedOrder.smartCardNumber,
        nickname: `${completedOrder.operatorName} Box`,
        customerName: completedOrder.customerName,
        balance: 150.00,
        expiryDate: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
        monthlyPackPrice: completedOrder.amount,
        packName: completedOrder.packName,
        createdAt: new Date().toISOString(),
      };

      setConnections((prev) => {
        const filtered = prev.filter(
          (c) => !(c.operator === newConn.operator && c.smartCardNumber === newConn.smartCardNumber)
        );
        return [newConn, ...filtered];
      });

      if (isFirebaseLive && db && user?.uid) {
        try {
          const cleanDoc = sanitizePayload(newConn);
          await setDoc(doc(db, 'dth_connections', newConn.id), cleanDoc);
        } catch (dbErr) {
          console.warn('[Firestore] Error saving connection:', dbErr);
        }
      }
    }
  };

  const handleQuickRechargeFromSaved = (conn: DthConnection) => {
    setPrefillConn(conn);
    handleSelectOpId(conn.operator);
    navigate('/recharge');
  };

  const handleAddConnection = async (conn: Omit<DthConnection, 'id' | 'createdAt'> | DthConnection) => {
    const fullConn: DthConnection = {
      ...conn,
      id: 'id' in conn && conn.id ? conn.id : `conn-${Date.now()}`,
      createdAt: 'createdAt' in conn && conn.createdAt ? conn.createdAt : new Date().toISOString(),
    };
    setConnections((prev) => [fullConn, ...prev]);
    if (isFirebaseLive && db && user?.uid) {
      try {
        const cleanDoc = sanitizePayload({ ...fullConn, user_id: user.uid });
        await setDoc(doc(db, 'dth_connections', fullConn.id), cleanDoc);
      } catch (err) {
        console.warn('[Firestore] Add connection error:', err);
      }
    }
  };

  const handleDeleteConnection = async (id: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== id));
    if (isFirebaseLive && db) {
      try {
        await deleteDoc(doc(db, 'dth_connections', id));
      } catch (err) {
        console.warn('[Firestore] Delete connection error:', err);
      }
    }
  };

  const handleApplyPlanFromBrowse = (plan: BrowsePlan, connection: DthConnection) => {
    setPrefillConn(connection);
    handleSelectOpId(plan.operator);
    navigate('/recharge');
  };

  const handleAddNewConnectionAndApply = (
    plan: BrowsePlan,
    newConnData: { smartCardNumber: string; nickname: string; customerName?: string }
  ) => {
    const newConn: DthConnection = {
      id: `conn-${Date.now()}`,
      user_id: user?.uid || 'guest_user',
      operator: plan.operator,
      operatorName: plan.operatorName || plan.operator,
      smartCardNumber: newConnData.smartCardNumber,
      nickname: newConnData.nickname || `${plan.name}`,
      customerName: newConnData.customerName || 'DTH Subscriber',
      balance: 0,
      expiryDate: new Date().toISOString().split('T')[0],
      monthlyPackPrice: plan.price,
      packName: plan.name,
      createdAt: new Date().toISOString(),
    };
    handleAddConnection(newConn);
    handleApplyPlanFromBrowse(plan, newConn);
  };

  // Determine active tab name for header navigation highlighting
  const getActiveNavTab = () => {
    const path = location.pathname;
    if (path.startsWith('/admin') || path === '/worker' || path === '/dealer') return 'admin-portal';
    if (path.startsWith('/plans')) return 'plans';
    if (path.startsWith('/connections')) return 'connections';
    if (path.startsWith('/security')) return 'security';
    return 'recharge';
  };

  const handleNavTabChange = (tab: string) => {
    if (tab === 'recharge') navigate('/recharge');
    else if (tab === 'plans') navigate('/plans');
    else if (tab === 'connections') navigate('/connections');
    else if (tab === 'security') navigate('/security');
    else if (tab === 'admin-portal') navigate('/admin/customers');
    else if (tab === 'refresh') setIsRefreshOpen(true);
    else if (tab === 'new-dish') setIsNewDishOpen(true);
  };

  const t = translations[currentLang];
  const isLight = currentTheme.isLightMode;

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${currentTheme.pageBg} ${currentTheme.pageText}`}>
      <Header
        currentLang={currentLang}
        onLanguageChange={handleLanguageChange}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSignOut={handleSignOut}
        activeTab={getActiveNavTab()}
        onTabChange={handleNavTabChange}
        currentTheme={currentTheme}
        onSelectTheme={handleSelectOpId}
      />

      {/* Main Content View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 md:py-8 space-y-8">
        <Routes>
          <Route
            path="/"
            element={
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
            }
          />
          <Route
            path="/recharge"
            element={
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
            }
          />
          <Route
            path="/plans"
            element={
              <BrowsePlansView
                currentTheme={currentTheme}
                currentLang={currentLang}
                user={user}
                connections={connections}
                onOpenAuth={() => setIsAuthOpen(true)}
                onApplyPlanToBox={handleApplyPlanFromBrowse}
                onAddNewConnectionAndApply={handleAddNewConnectionAndApply}
              />
            }
          />
          <Route
            path="/connections"
            element={
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
            }
          />
          <Route path="/security" element={<SecurityNotice />} />

          {/* Admin Routes with react-router parameterization */}
          <Route
            path="/admin"
            element={
              <Navigate to="/admin/customers" replace />
            }
          />
          <Route
            path="/admin/:tab"
            element={
              <AdminRouteWrapper
                currentLang={currentLang}
                user={user}
                onOpenAuth={() => setIsAuthOpen(true)}
                onUpdateUserRole={(updated) => setUser(updated)}
                onTriggerRefresh={handleTriggerRefreshModal}
                currentTheme={currentTheme}
              />
            }
          />

          {/* Legacy route redirects */}
          <Route path="/worker" element={<Navigate to="/admin/pending" replace />} />
          <Route path="/dealer" element={<Navigate to="/admin/pending" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer */}
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

            {/* Admin Portal Link */}
            {isUserAdminRole && (
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
                <button
                  id="footer-admin-dealer-portal-link"
                  onClick={() => navigate('/admin/customers')}
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

export default function App() {
  return (
    <BrowserRouter>
      <MainApp />
    </BrowserRouter>
  );
}
