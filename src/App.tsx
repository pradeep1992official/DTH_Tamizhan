import { assistantPages } from './lib/assistantActions';
import { connectionCacheKey, ownedConnections, readConnectionCache } from './lib/connectionCache';
import { RouteEffects } from './components/RouteEffects';
import { AccountPage } from './components/AccountPage';
import { CustomerHistoryPage } from './components/CustomerHistoryPage';
import { EmailLinkSignInPage } from './components/EmailLinkSignInPage';
import { ErrorPage } from './components/ErrorPages';
import { pageMetadata } from './lib/pageMetadata';
import { PolicyPage } from './components/PolicyPage';
import { PolicyLinks } from './components/TrustContent';
import { POLICY_ROUTES } from './lib/trustContent';
import { subscriberError } from './lib/subscriberValidation';
import { calculateConnectionExpiry, getPackDuration } from './lib/connectionExpiry';
import React, { useState, useEffect, useRef } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
  useLocation,
  useParams
} from 'react-router-dom';
import { Header } from './components/Header';
import { RechargeFlow } from './components/RechargeFlow';
import { AuthModal } from './components/AuthModal';
import { PaymentModal } from './components/PaymentModal';
import { RechargeAssistant } from './components/RechargeAssistant';
import { ReceiptModal } from './components/ReceiptModal';
import { SavedConnections } from './components/SavedConnections';
import { AdminPortal } from './components/AdminPortal';
import { NewConnectionModal } from './components/NewConnectionModal';
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
  canonicalizeDthOperatorId,
  resolveDishFamilyOperatorId,
} from './types';
import { translations } from './lib/translations';
import { getOperatorTheme, OPERATOR_THEMES } from './lib/theme';
import { auth, db, isFirebaseConfigured, sanitizePayload } from './lib/firebase';
import { saveAccountProfile } from './lib/accountProfile';
import { observeAccountSession, signOutAccount } from './lib/accountSession';
import { collection, doc, getDocs, setDoc, deleteDoc, query, where, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import {
  Tv,
} from './lib/icons';

function AdminRouteWrapper({
  currentLang,
  user,
  onOpenAuth,
  onUpdateUserRole,
  currentTheme,
}: {
  currentLang: Language;
  user: UserProfile | null;
  onOpenAuth: () => void;
  onUpdateUserRole?: (updated: UserProfile) => void;
  currentTheme: any;
}) {
  const { tab } = useParams<{ tab?: string }>();
  const routeLocation = useLocation();
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
  if (pageMetadata(routeLocation.pathname).status === 404) return <ErrorPage status={404} currentLang={currentLang} />;

  return (
    <AdminPortal
      currentLang={currentLang}
      user={user}
      onOpenAuth={onOpenAuth}
      onUpdateUserRole={onUpdateUserRole}
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
  const requestCustomTopUp = new URLSearchParams(location.search).get('topup') === '1';
  useEffect(() => {
    const operator = new URLSearchParams(location.search).get('operator');
    if (['sun_direct', 'tata_play', 'airtel_dth', 'dish_tv', 'd2h'].includes(operator || '')) handleSelectOpId(operator as DthOperatorId);
  }, [location.search]);

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
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessionError, setSessionError] = useState('');
  const signingOut = useRef(false);


  // Selected Operator / Theme
  const [selectedOpId, setSelectedOpId] = useState<DthOperatorId>(() => {
    try {
      const saved = localStorage.getItem('dth_selected_operator');
      if (saved && OPERATOR_THEMES[saved as DthOperatorId]) {
        return canonicalizeDthOperatorId(saved as DthOperatorId);
      }
    } catch {}
    return 'sun_direct';
  });

  const handleSelectOpId = (opId: DthOperatorId) => {
    const canonicalOpId = canonicalizeDthOperatorId(opId);
    setSelectedOpId(canonicalOpId);
    try {
      localStorage.setItem('dth_selected_operator', canonicalOpId);
    } catch {}
  };

  const currentTheme = getOperatorTheme(selectedOpId);

  // Saved Connections
  const [connectionOwner, setConnectionOwner] = useState(user?.uid || null);
  const [storedConnections, setConnections] = useState<DthConnection[]>(() => readConnectionCache(localStorage, user?.uid));
  const connections = ownedConnections(storedConnections, user?.uid);
  useEffect(() => {
    setConnections(readConnectionCache(localStorage, user?.uid));
    setConnectionOwner(user?.uid || null);
    setPrefillConn(null);
  }, [user?.uid]);

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isNewDishOpen, setIsNewDishOpen] = useState(false);

  // Active Transaction Data
  const [activePaymentPlan, setActivePaymentPlan] = useState<any>(null);
  const [activeSubscriber, setActiveSubscriber] = useState<SubscriberDetails | null>(null);
  const [activeOperator, setActiveOperator] = useState<DthOperator | null>(null);
  const [activeSmartCard, setActiveSmartCard] = useState<string>('');
  const [activeSaveBox, setActiveSaveBox] = useState<boolean>(true);

  const [lastCompletedOrder, setLastCompletedOrder] = useState<RechargeOrder | null>(null);
  const [prefillConn, setPrefillConn] = useState<DthConnection | null>(null);

  useEffect(() => {
    try { localStorage.removeItem('dth_tamizhan_user'); } catch {}
    if (!auth) return;
    return observeAccountSession(auth, db, profile => {
      setSessionError(''); setUser(profile);
      if (!profile) {
        setConnections([]); setConnectionOwner(null); setPrefillConn(null);
        setIsPaymentOpen(false); setIsReceiptOpen(false); setIsNewDishOpen(false);
        setActivePaymentPlan(null); setActiveSubscriber(null); setActiveOperator(null); setActiveSmartCard('');
        setLastCompletedOrder(null);
      }
    }, setSessionError);
  }, []);

  // Load saved connections only for the active Firebase-backed account.
  useEffect(() => {
    let cancelled = false;
    if (user) {
      if (isFirebaseConfigured && db && user.uid) {
        const q = query(collection(db, 'dth_connections'), where('user_id', '==', user.uid));
        getDocs(q).then((snap) => {
          if (cancelled || auth?.currentUser?.uid !== user.uid) return;
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
                  expiryDate: d.expiryDate || undefined,
                  lastRechargeDate: d.lastRechargeDate,
                  rechargeCompletedAt: d.rechargeCompletedAt,
                  packDurationMonths: d.packDurationMonths,
                  monthlyPackPrice: typeof d.monthlyPackPrice === 'number' ? d.monthlyPackPrice : 299,
                  packName: d.packName || 'Active Pack',
                  createdAt: d.createdAt || new Date().toISOString(),
                });
              }
            });
            if (remoteConns.length > 0) {
              setConnections((prev) => {
                const map = new Map<string, DthConnection>();
                ownedConnections(prev, user.uid).forEach((c) => map.set(`${c.operator}_${c.smartCardNumber}`, c));
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
    return () => { cancelled = true; };
  }, [user?.uid]);

  // Persist Connections
  useEffect(() => {
    if (!user?.uid || connectionOwner !== user.uid) return;
    localStorage.setItem(connectionCacheKey(user.uid), JSON.stringify(ownedConnections(storedConnections, user.uid)));
  }, [storedConnections, connectionOwner, user?.uid]);

  const handleAuthSuccess = () => {
    setIsAuthOpen(false);
  };

  const handleUpdateProfile = async (updates: Pick<UserProfile, 'displayName' | 'phoneNumber'>) => {
    if (!user) throw new Error(t.uiSignInEdit);

    if (!isFirebaseConfigured || !db || !auth) throw new Error(t.uiUnableToSaveProfilePleaseTryAgain);
    await saveAccountProfile(db, auth, user.uid, updates, t.uiSignInEdit);
    if (auth?.currentUser?.uid === user.uid) setUser(previous => previous?.uid === user.uid ? { ...previous, ...updates } : previous);
  };

  const handleSignOut = async () => {
    if (signingOut.current) return;
    signingOut.current = true; setSessionError('');
    try {
      await signOutAccount(auth);
      try { if (user?.uid) localStorage.removeItem(connectionCacheKey(user.uid)); } catch {}
      setConnections([]);
      setConnectionOwner(null);
      setPrefillConn(null);
      setIsPaymentOpen(false);
      setIsReceiptOpen(false);
      setLastCompletedOrder(null);
      setUser(null);
      try { localStorage.removeItem('dth_tamizhan_user'); } catch {}
      navigate('/');
    } catch {
      setSessionError(currentLang === 'ta' ? 'வெளியேற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.' : 'Sign-out did not complete. Please try again.');
    } finally { signingOut.current = false; }
  };

  const handleInitiatePayment = (
    plan: DthPlan | { name: string; price: number; validityDays: number; pack_type?: string; duration_months?: number },
    subscriber: SubscriberDetails | null,
    operator: DthOperator,
    smartCard: string,
    saveBox: boolean
  ) => {
    if (!user || !auth?.currentUser || auth.currentUser.uid !== user.uid) {
      setIsAuthOpen(true);
      return;
    }
    if (subscriberError(operator.id, smartCard)) {
      setPrefillConn({ operator: operator.id, smartCardNumber: smartCard } as DthConnection);
      navigate('/recharge');
      return;
    }
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

    const existingBox = connections.find((c) => c.operator === completedOrder.operator && c.smartCardNumber === completedOrder.smartCardNumber);
    if (user && completedOrder.user_id === user.uid && (activeSaveBox || existingBox)) {
      const rechargeDate = completedOrder.createdAt;
      const packDurationMonths = Number(activePaymentPlan?.duration_months) || getPackDuration(completedOrder.packValidity) || (Number(activePaymentPlan?.validityDays) / 30) || undefined;
      const newConn: DthConnection = {
        id: existingBox?.id || `conn-${Date.now()}`,
        user_id: user?.uid || 'guest_user',
        operator: completedOrder.operator,
        operatorName: completedOrder.operatorName,
        smartCardNumber: completedOrder.smartCardNumber,
        nickname: existingBox?.nickname || `${completedOrder.operatorName} Box`,
        customerName: completedOrder.customerName,
        balance: existingBox?.balance,
        lastRechargeDate: rechargeDate,
        rechargeCompletedAt: completedOrder.rechargeStatus === 'completed' ? completedOrder.completedAt || completedOrder.updatedAt : undefined,
        packDurationMonths,
        expiryDate: completedOrder.rechargeStatus === 'completed' && packDurationMonths
          ? calculateConnectionExpiry(completedOrder.completedAt || completedOrder.updatedAt, packDurationMonths) : undefined,
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

      if (isFirebaseConfigured && db && user?.uid) {
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
    if (!user || conn.user_id !== user.uid) return;
    setPrefillConn(conn);
    handleSelectOpId(conn.operator);
    navigate('/recharge');
  };

  const handleAddConnection = async (conn: Omit<DthConnection, 'id' | 'createdAt'> | DthConnection) => {
    if (!user || conn.user_id !== user.uid) return;
    const fullConn: DthConnection = {
      ...conn,
      user_id: user.uid,
      id: 'id' in conn && conn.id ? conn.id : `conn-${Date.now()}`,
      createdAt: 'createdAt' in conn && conn.createdAt ? conn.createdAt : new Date().toISOString(),
    };
    if (subscriberError(fullConn.operator, fullConn.smartCardNumber)) return;
    setConnections((prev) => [fullConn, ...prev.filter(c => c.id !== fullConn.id)]);
    if (isFirebaseConfigured && db && user?.uid) {
      try {
        const cleanDoc = sanitizePayload({ ...fullConn, user_id: user.uid });
        await setDoc(doc(db, 'dth_connections', fullConn.id), cleanDoc);
      } catch (err) {
        console.warn('[Firestore] Add connection error:', err);
      }
    }
  };

  const handleDeleteConnection = async (id: string) => {
    if (!user || !connections.some(conn => conn.id === id && conn.user_id === user.uid)) return;
    setConnections((prev) => prev.filter((c) => c.id !== id));
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'dth_connections', id));
      } catch (err) {
        console.warn('[Firestore] Delete connection error:', err);
      }
    }
  };

  const handleApplyPlanFromBrowse = (plan: BrowsePlan, connection: DthConnection) => {
    if (!user || connection.user_id !== user.uid) return;
    setPrefillConn(connection);
    handleSelectOpId(plan.operator);
    navigate('/recharge');
  };

  const handleAddNewConnectionAndApply = (
    plan: BrowsePlan,
    newConnData: { smartCardNumber: string; nickname: string; customerName?: string }
  ) => {
    const operator = canonicalizeDthOperatorId(plan.operator) === 'dish_tv'
      ? resolveDishFamilyOperatorId(newConnData.smartCardNumber)
      : plan.operator;
    const operatorName = operator === 'dish_tv' ? 'Dish TV' : operator === 'd2h' ? 'D2H' : plan.operatorName || plan.operator;
    const newConn: DthConnection = {
      id: `conn-${Date.now()}`,
      user_id: user?.uid || 'guest_user',
      operator,
      operatorName,
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
    if (pageMetadata(path).status !== 200) return 'error';
    if (POLICY_ROUTES.some(route => route.path === path)) return 'policies';
    if (path.startsWith('/admin') || path === '/worker' || path === '/dealer') return 'admin-portal';
    if (path.startsWith('/plans')) return 'plans';
    if (path.startsWith('/connections')) return 'connections';
    if (path === '/account') return 'account';
    if (path === '/history') return 'history';
    return 'recharge';
  };

  const handleNavTabChange = (tab: string) => {
    if (tab === 'recharge') navigate('/recharge');
    else if (tab === 'plans') navigate('/plans');
    else if (tab === 'connections') navigate('/connections');
    else if (tab === 'account') navigate('/account');
    else if (tab === 'history') navigate('/history');
    else if (tab === 'admin-portal') navigate('/admin/customers');
    else if (tab === 'new-dish') setIsNewDishOpen(true);
  };

  const t = translations[currentLang];
  const isLight = currentTheme.isLightMode;

  return (
    <div className={`app-shell min-h-screen flex flex-col ${currentTheme.pageBg} ${currentTheme.pageText}`}>
      <RouteEffects currentLang={currentLang} />
      <a href="#main-content" className="skip-link">{t.uiSkipContent}</a>
      <Header
        currentLang={currentLang}
        onLanguageChange={handleLanguageChange}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onUpdateProfile={handleUpdateProfile}
        onSignOut={handleSignOut}
        activeTab={getActiveNavTab()}
        onTabChange={handleNavTabChange}
        currentTheme={currentTheme}
      />

      {/* Main Content View Container */}
      <main id="main-content" className="app-main">
        {sessionError && <p role="alert" className="border border-rule rounded-lg p-3 my-3 text-error">{sessionError}</p>}
        {user && (Object.values(assistantPages) as string[]).includes(location.pathname) && <RechargeAssistant key={user.uid} currentLang={currentLang} displayName={user.displayName}
          onCheckout={(plan, box, operator) => handleInitiatePayment(plan, null, operator, box.smartCardNumber, false)} />}
        <Routes>
          <Route
            path="/"
            element={
              <RechargeFlow
                currentLang={currentLang}
                onLanguageChange={handleLanguageChange}
                user={user}
                onInitiatePayment={handleInitiatePayment}
                requestCustomTopUp={requestCustomTopUp}
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
                onLanguageChange={handleLanguageChange}
                user={user}
                onInitiatePayment={handleInitiatePayment}
                requestCustomTopUp={requestCustomTopUp}
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
                onAddConnection={handleAddConnection}
                onDeleteConnection={handleDeleteConnection}
                onOpenAuth={() => setIsAuthOpen(true)}
                currentTheme={currentTheme}
              />
            }
          />
          {POLICY_ROUTES.map(route => <Route key={route.key} path={route.path} element={<PolicyPage policy={route.key} currentLang={currentLang} />} />)}
          <Route path="/account" element={<AccountPage key={user?.uid || 'guest'} user={user} connections={connections} currentLang={currentLang} onOpenAuth={() => setIsAuthOpen(true)} onSignOut={handleSignOut} onUpdateProfile={handleUpdateProfile} />} />
          <Route path="/history" element={<CustomerHistoryPage user={user} currentLang={currentLang} onOpenAuth={() => setIsAuthOpen(true)} />} />
          <Route path="/auth/email-link" element={<EmailLinkSignInPage user={user} currentLang={currentLang} onOpenAuth={() => setIsAuthOpen(true)} />} />
          <Route path="/500" element={<ErrorPage status={500} currentLang={currentLang} />} />

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
                currentTheme={currentTheme}
              />
            }
          />

          {/* Legacy route redirects */}
          <Route path="/worker" element={<Navigate to="/admin/pending" replace />} />
          <Route path="/dealer" element={<Navigate to="/admin/pending" replace />} />
          <Route path="*" element={<ErrorPage status={404} currentLang={currentLang} />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className={`app-footer ${currentTheme.footerBg} ${currentTheme.footerText}`}>
        <div className="app-footer-inner">
          <div className="footer-overview">
            <div className="footer-brand">
              <span className="font-sans font-bold text-base tracking-tight">
                DTH <span style={{ color: currentTheme.primaryColor }}>தமிழன்</span>
              </span>
            </div>
            <p className="footer-tagline">{t.brandTagline}</p>
            <p className="footer-disclaimer">{t.madeWithLove} {t.footerDisclaimer}</p>
          </div>
          <div className="footer-link-group">
            <h2>{currentLang === 'ta' ? 'விரைவு இணைப்புகள்' : 'Quick links'}</h2>
            <nav aria-label={currentLang === 'ta' ? 'விரைவு இணைப்புகள்' : 'Quick links'}>
              <Link to="/recharge">{t.navRecharge}</Link>
              <Link to="/plans">{t.navPlans}</Link>
              <Link to="/connections">{t.navConnections}</Link>
              <Link to="/account">{currentLang === 'ta' ? 'என் கணக்கு' : 'My account'}</Link>
            </nav>
          </div>
          <div className="footer-link-group">
            <h2>{currentLang === 'ta' ? 'உதவி மற்றும் கொள்கைகள்' : 'Support & policies'}</h2>
            <PolicyLinks currentLang={currentLang} />
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      <AuthModal
        currentUser={user}
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentLang={currentLang}
        onSuccess={handleAuthSuccess}
      />

      {activeOperator && (
        <PaymentModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          currentLang={currentLang}
          currentTheme={currentTheme}
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
