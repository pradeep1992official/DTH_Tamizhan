import { LaunchHome } from './components/NewConnection/LaunchHome';
import { clientRechargeEnabled, setClientRechargeEnabled, rechargeReturnTarget } from './lib/rechargeFeature';
import { paymentAuthHeaders } from './lib/paymentAuth';
import { MyBookings } from './components/NewConnection/MyBookings';
import { assistantPages } from './lib/assistantActions';
import { connectionCacheKey, ownedConnections, readConnectionCache } from './lib/connectionCache';
import { RouteEffects } from './components/RouteEffects';
import { AccountPage } from './components/AccountPage';
const CustomerHistoryPage = React.lazy(() => import('./components/CustomerHistoryPage').then(module => ({ default: module.CustomerHistoryPage })));
const SupportTicketsPage = React.lazy(() => import('./components/SupportTicketsPage').then(module => ({ default: module.SupportTicketsPage })));
import { HelpPage } from './components/HelpPage';
import { EmailLinkSignInPage } from './components/EmailLinkSignInPage';
import { ErrorPage } from './components/ErrorPages';
import { pageMetadata } from './lib/pageMetadata';
import { PolicyPage } from './components/PolicyPage';
import { PolicyLinks } from './components/TrustContent';
import { BUSINESS_DETAILS, POLICY_ROUTES } from './lib/trustContent';
import { businessDetails } from './lib/policyTranslations';
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
const RechargeFlow = React.lazy(() => import('./components/RechargeFlow').then(module => ({ default: module.RechargeFlow })));
import { AuthModal } from './components/AuthModal';
const PaymentModal = React.lazy(() => import('./components/PaymentModal').then(module => ({ default: module.PaymentModal })));
const RechargeAssistant = React.lazy(() => import('./components/RechargeAssistant').then(module => ({ default: module.RechargeAssistant })));
const ReceiptModal = React.lazy(() => import('./components/ReceiptModal').then(module => ({ default: module.ReceiptModal })));
const SavedConnections = React.lazy(() => import('./components/SavedConnections').then(module => ({ default: module.SavedConnections })));
const AdminPortal = React.lazy(() => import('./components/AdminPortal').then(module => ({ default: module.AdminPortal })));
const NewConnectionModal = React.lazy(() => import('./components/NewConnectionModal').then(module => ({ default: module.NewConnectionModal })));
const NewConnectionPages = React.lazy(() => import('./components/NewConnection/NewConnectionPages').then(module => ({ default: module.NewConnectionPages })));
const BrowsePlansView = React.lazy(() => import('./components/BrowsePlans/BrowsePlansView').then(module => ({ default: module.BrowsePlansView })));
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
} from './types';
import { translations } from './lib/translations';
import { getOperatorTheme, OPERATOR_THEMES } from './lib/theme';
import { auth, db, isFirebaseConfigured, sanitizePayload } from './lib/firebase';
import { saveAccountProfile } from './lib/accountProfile';
import { observeAccountSession, signOutAccount } from './lib/accountSession';
import { collection, doc, onSnapshot, setDoc, deleteDoc, query, where, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import {
  Tv,
} from './lib/icons';

function AdminRouteWrapper({
  authChecking,
  currentLang,
  user,
  onOpenAuth,
  onUpdateUserRole,
  currentTheme,
}: {
  authChecking: boolean;
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
    if (param === 'new-connections') return 'new-connections';
    if (param === 'catalog') return 'catalog';
    if (param === 'tickets') return 'tickets';
    if (param === 'api-test') return 'api-test';
    if (!param) return 'customers';
    if (param === 'ai') return 'ai';
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
      authChecking={authChecking}
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


export function MainApp() {
  const [recharge, setRecharge] = useState(clientRechargeEnabled);
  useEffect(() => {
    let active = true;
    fetch('/api/auth/config', { cache: 'no-store' }).then(async response => { if (!response.ok) return; const data = await response.json(); if (active) { setClientRechargeEnabled(data.rechargeEnabled === true); setRecharge(data.rechargeEnabled === true); } }).catch(() => { /* Bootstrap remains authoritative; missing configuration fails closed. */ });
    return () => { active = false; };
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const requestCustomTopUp = new URLSearchParams(location.search).get('topup') === '1';
  const requestedPublicPlan = location.pathname === '/recharge' ? new URLSearchParams(location.search).get('plan') : null;
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
  const [authInitializing, setAuthInitializing] = useState(!!auth);
  const [sessionError, setSessionError] = useState('');
  const [pastOrders, setPastOrders] = useState<{ uid: string; has: boolean } | null>(null);
  const hasPastRecharges = !!user && pastOrders?.uid === user.uid && pastOrders.has;
  useEffect(() => {
    let active = true; setPastOrders(null);
    if (user && !recharge) void (async () => { try {
      const response = await fetch('/api/my/history-presence', { headers: await paymentAuthHeaders(), cache: 'no-store' });
      if (!response.ok) return; const data = await response.json();
      if (active) setPastOrders({ uid: user.uid, has: data.hasOrders === true });
    } catch { /* Historical shortcut is optional, never expose another account's state. */ } })();
    return () => { active = false; };
  }, [user?.uid, recharge]);

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
    if (canonicalOpId !== selectedOpId) setPrefillPlanId(null);
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
    // Clear account-owned details while preserving a public catalog selection.
    setPrefillConn(null); setPrefillPlanId(requestedPublicPlan); setConnectionError('');
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
  const [prefillPlanId, setPrefillPlanId] = useState<string | null>(null);
  useEffect(() => {
    if (location.pathname === '/recharge') {
      const plan = new URLSearchParams(location.search).get('plan');
      if (plan) setPrefillPlanId(plan);
    }
  }, [location.pathname, location.search, user?.uid]);
  const [connectionError, setConnectionError] = useState('');

  useEffect(() => {
    try { localStorage.removeItem('dth_tamizhan_user'); } catch {}
    if (!auth) { setAuthInitializing(false); return; }
    return observeAccountSession(auth, db, profile => {
      setAuthInitializing(false); setSessionError(''); setUser(profile);
      if (!profile) {
        setConnections([]); setConnectionOwner(null); setPrefillConn(null); setConnectionError('');
        setIsPaymentOpen(false); setIsReceiptOpen(false); setIsNewDishOpen(false);
        setActivePaymentPlan(null); setActiveSubscriber(null); setActiveOperator(null); setActiveSmartCard('');
        setLastCompletedOrder(null);
      }
    }, error => { setAuthInitializing(false); setSessionError(error); });
  }, []);

  // Load saved connections only for the active Firebase-backed account.
  useEffect(() => {
    let cancelled = false; let unsubscribe: (() => void) | undefined;
    if (user && recharge) {
      if (isFirebaseConfigured && db && user.uid) {
        const q = query(collection(db, 'dth_connections'), where('user_id', '==', user.uid));
        unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snap) => {
          if (cancelled || auth?.currentUser?.uid !== user.uid) return;
          if (!snap.metadata.fromCache && !snap.metadata.hasPendingWrites) {
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
            setConnections(remoteConns);
          }
        }, (err) => {
          console.warn('[Firestore] Connections query note:', err);
        });
      }
    } else {
      localStorage.removeItem('dth_tamizhan_user');
    }
    return () => { cancelled = true; unsubscribe?.(); };
  }, [user?.uid, recharge]);

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
      setPrefillConn(null); setPrefillPlanId(null); setConnectionError('');
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

      await handleAddConnection(newConn);
    }
  };

  const handleQuickRechargeFromSaved = (conn: DthConnection) => {
    if (!user || conn.user_id !== user.uid) return;
    setPrefillPlanId(null);
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
    const uid = user.uid;
    setConnectionError('');
    try {
      if (isFirebaseConfigured && db) await setDoc(doc(db, 'dth_connections', fullConn.id), sanitizePayload(fullConn));
      if (auth?.currentUser?.uid !== uid) return false;
      if (!isFirebaseConfigured || !db) setConnections(prev => [fullConn, ...ownedConnections(prev, uid).filter(c => c.id !== fullConn.id)]);
      return true;
    } catch {
      if (auth?.currentUser?.uid === uid) setConnectionError(currentLang === 'ta' ? '\u0b9a\u0bc7\u0bae\u0bbf\u0b95\u0bcd\u0b95 \u0bae\u0bc1\u0b9f\u0bbf\u0baf\u0bb5\u0bbf\u0bb2\u0bcd\u0bb2\u0bc8. \u0bae\u0bc0\u0ba3\u0bcd\u0b9f\u0bc1\u0bae\u0bcd \u0bae\u0bc1\u0baf\u0bb1\u0bcd\u0b9a\u0bbf\u0b95\u0bcd\u0b95\u0bb5\u0bc1\u0bae\u0bcd.' : 'Your connection could not be saved. Please try again.');
      return false;
    }
  };

  const handleDeleteConnection = async (id: string) => {
    if (!user || !connections.some(conn => conn.id === id && conn.user_id === user.uid)) return false;
    const uid = user.uid;
    setConnectionError('');
    try {
      if (isFirebaseConfigured && db) await deleteDoc(doc(db, 'dth_connections', id));
      if (auth?.currentUser?.uid !== uid) return false;
      if (!isFirebaseConfigured || !db) setConnections(prev => ownedConnections(prev, uid).filter(c => c.id !== id));
      return true;
    } catch {
      if (auth?.currentUser?.uid === uid) setConnectionError(currentLang === 'ta' ? '\u0ba8\u0bc0\u0b95\u0bcd\u0b95 \u0bae\u0bc1\u0b9f\u0bbf\u0baf\u0bb5\u0bbf\u0bb2\u0bcd\u0bb2\u0bc8. \u0bae\u0bc0\u0ba3\u0bcd\u0b9f\u0bc1\u0bae\u0bcd \u0bae\u0bc1\u0baf\u0bb1\u0bcd\u0b9a\u0bbf\u0b95\u0bcd\u0b95\u0bb5\u0bc1\u0bae\u0bcd.' : 'Your connection could not be removed. Please try again.');
      return false;
    }
  };

  const handleApplyPlanFromBrowse = (plan: BrowsePlan, connection: DthConnection) => {
    if (!user || connection.user_id !== user.uid) return;
    setPrefillConn(connection);
    handleSelectOpId(plan.operator);
    setPrefillPlanId(plan.id);
    navigate('/recharge');
  };
  const handleChooseBrowsePlan = (plan: BrowsePlan) => {
    setPrefillConn(null);
    handleSelectOpId(plan.operator);
    setPrefillPlanId(plan.id);
    navigate('/recharge?' + new URLSearchParams({ operator: plan.operator, plan: plan.id }));
  };

  const handleAddNewConnectionAndApply = async (
    plan: BrowsePlan,
    newConnData: { smartCardNumber: string; nickname: string; customerName?: string }
  ) => {
    const operator = plan.operator;
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
    if (!await handleAddConnection(newConn)) return false;
    handleApplyPlanFromBrowse(plan, newConn);
    return true;
  };

  // Determine active tab name for header navigation highlighting
  const getActiveNavTab = () => {
    const path = location.pathname;
    if (path === '/') return 'home';
    if (path === '/help' || path === '/service-request' || path === '/my-tickets') return 'help';
    if (pageMetadata(path).status !== 200) return 'error';
    if (POLICY_ROUTES.some(route => route.path === path)) return 'policies';
    if (path.startsWith('/admin') || path === '/worker' || path === '/dealer') return 'admin-portal';
    if (path.startsWith('/new-connection')) return 'new-connection';
    if (path.startsWith('/plans')) return 'plans';
    if (path.startsWith('/connections')) return 'connections';
    if (path === '/account/bookings') return 'bookings';
    if (path === '/account' || path.startsWith('/account/')) return 'account';
    if (path === '/history') return 'history';
    return 'recharge';
  };

  const handleNavTabChange = (tab: string) => {
    if (tab === 'recharge') navigate('/recharge');
    else if (tab === 'bookings') navigate('/account/bookings');
    else if (tab === 'new-connection') navigate('/new-connection');
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
      <RouteEffects recharge={recharge} currentLang={currentLang} />
      <a href="#main-content" className="skip-link">{t.uiSkipContent}</a>
      <Header
        recharge={recharge}
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
        {connectionError && <p role="alert" className="border border-rule rounded-lg p-3 my-3 text-error">{connectionError}</p>}
        {sessionError && <p role="alert" className="border border-rule rounded-lg p-3 my-3 text-error">{sessionError}</p>}
        {recharge && location.pathname !== '/' && user && (Object.values(assistantPages) as string[]).includes(location.pathname) && <React.Suspense fallback={null}><RechargeAssistant key={user.uid} currentLang={currentLang} displayName={user.displayName}
          onCheckout={(plan, box, operator) => handleInitiatePayment(plan, null, operator, box.smartCardNumber, false)} /></React.Suspense>}
        {recharge && location.pathname === '/recharge' && <aside className="flex flex-wrap items-center justify-between gap-3 border border-rule rounded-xl bg-accent-soft p-4 mb-5"><div><h2 className="text-base font-bold">{t.ncHomeTitle}</h2><p className="text-sm text-muted mt-1">{t.ncHomeText}</p></div><Link to="/new-connection" className="bg-accent text-accent-ink px-4 py-2.5 rounded-lg text-sm font-bold">{t.ncBrowse}</Link></aside>}
        <React.Suspense fallback={<p role="status">{translations[currentLang].loadingCatalog}</p>}>
        <Routes>
          <Route path="/new-connection/*" element={<NewConnectionPages currentLang={currentLang} user={user} onOpenAuth={() => setIsAuthOpen(true)} />} />
          <Route path="/" element={rechargeReturnTarget(location.search).startsWith('/history') ? <Navigate to={rechargeReturnTarget(location.search)} replace /> : <LaunchHome currentLang={currentLang} user={user} isSignedIn={!!user} recharge={recharge} connections={connections} onOpenAuth={() => setIsAuthOpen(true)} onRechargeConnection={handleQuickRechargeFromSaved} />} />
          <Route
            path="/recharge"
            element={
              recharge ? (
              <RechargeFlow
                onOpenAuth={() => setIsAuthOpen(true)}
                currentLang={currentLang}
                onLanguageChange={handleLanguageChange}
                user={user}
                onInitiatePayment={handleInitiatePayment}
                requestCustomTopUp={requestCustomTopUp}
                prefillConnection={prefillConn}
                initialPlanId={prefillPlanId}
                selectedOpId={selectedOpId}
                onSelectOpId={handleSelectOpId}
                currentTheme={currentTheme}
              />
              ) : <Navigate to={rechargeReturnTarget(location.search)} replace />
            }
          />
          <Route
            path="/plans"
            element={
              recharge ? (
              <BrowsePlansView
                currentTheme={currentTheme}
                currentLang={currentLang}
                user={user}
                connections={connections}
                onOpenAuth={() => setIsAuthOpen(true)}
                onApplyPlanToBox={handleApplyPlanFromBrowse}
                onChoosePlan={handleChooseBrowsePlan}
                onAddNewConnectionAndApply={handleAddNewConnectionAndApply}
              />
              ) : <Navigate to={rechargeReturnTarget(location.search)} replace />
            }
          />
          <Route
            path="/connections"
            element={
              recharge ? (
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
              ) : <Navigate to={rechargeReturnTarget(location.search)} replace />
            }
          />
          {!recharge && ['/recharge/*', '/plans/*', '/connections/*'].map(path => <Route key={path} path={path} element={<Navigate to={rechargeReturnTarget(location.search)} replace />} />)}
          {POLICY_ROUTES.map(route => <Route key={route.key} path={route.path} element={<PolicyPage policy={route.key} currentLang={currentLang} />} />)}
          <Route path="/account/bookings" element={<MyBookings key={user?.uid || 'guest'} user={user} lang={currentLang} onOpenAuth={() => setIsAuthOpen(true)} />} />
          <Route path="/account" element={<AccountPage recharge={recharge} hasPastRecharges={hasPastRecharges} key={user?.uid || 'guest'} user={user} connections={connections} currentLang={currentLang} onOpenAuth={() => setIsAuthOpen(true)} onSignOut={handleSignOut} onUpdateProfile={handleUpdateProfile} />} />
          <Route path="/history" element={<CustomerHistoryPage user={user} currentLang={currentLang} onOpenAuth={() => setIsAuthOpen(true)} />} />
          <Route path="/help" element={<HelpPage key={`${user?.uid || 'guest'}-${location.key}`} user={user} currentLang={currentLang} onOpenAuth={() => setIsAuthOpen(true)} />} />
          <Route path="/support" element={<Navigate to="/help" replace state={location.state} />} />
          <Route path="/service-request" element={<Navigate to="/help" replace state={location.state} />} />
          <Route path="/my-tickets" element={<SupportTicketsPage key={user?.uid || 'guest'} user={user} list onOpenAuth={() => setIsAuthOpen(true)} />} />
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
                authChecking={authInitializing}
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
        </React.Suspense>
      </main>

      {/* Footer */}
      <footer id="site-footer" tabIndex={-1} className={`app-footer ${currentTheme.footerBg} ${currentTheme.footerText}`}>
        <div className="app-footer-inner">
          <div className="footer-overview">
            <Link to="/" className="footer-brand" aria-label={t.uiDTHTamizhanHome}>
              <span className="brand-logo-mark" aria-hidden="true"><img className="brand-logo-image" src="/dth-tamizhan-logo.png" width="1024" height="1024" alt="" /></span>
              <span className="footer-brand-title">{t.brandTitle}</span>
            </Link>
            <p className="footer-tagline">{recharge ? t.brandTagline : t.launchTagline}</p>
            <div className="footer-support">
              <a href={`tel:${BUSINESS_DETAILS.phone.replace(/[^+0-9]/g, '')}`}>{currentLang === 'ta' ? 'அழைக்கவும்' : 'Call'} {BUSINESS_DETAILS.phone}</a>
              <a href={`https://wa.me/${BUSINESS_DETAILS.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
              <p>{businessDetails(currentLang).supportHours}</p>
            </div>
          </div>
          <div className="footer-link-group">
            <h2>{currentLang === 'ta' ? 'விரைவு இணைப்புகள்' : 'Quick links'}</h2>
            <nav aria-label={currentLang === 'ta' ? 'விரைவு இணைப்புகள்' : 'Quick links'}>
{recharge ? <>              <Link to="/recharge">{t.navRecharge}</Link>
              <Link to="/plans">{t.navPlans}</Link>
              <Link to="/connections">{t.navConnections}</Link></> : <><Link to="/new-connection">{t.ncNav}</Link><Link to="/new-connection/compare">{t.ncCompareTitle}</Link><Link to="/account/bookings">{t.ctTitle}</Link></>}
            </nav>
          </div>
          <div className="footer-link-group">
            <h2>{currentLang === 'ta' ? 'உதவி மற்றும் கணக்கு' : 'Help & account'}</h2>
            <nav aria-label={currentLang === 'ta' ? 'உதவி மற்றும் கணக்கு' : 'Help and account'}>
              <Link to="/help">{currentLang === 'ta' ? 'உதவி பெறுங்கள்' : 'Get help'}</Link>
              <Link to="/my-tickets">{currentLang === 'ta' ? 'எனது கோரிக்கைகள்' : 'My tickets'}</Link>
{recharge && (              <Link to="/history">{currentLang === 'ta' ? 'ரீசார்ஜ் வரலாறு' : 'Recharge history'}</Link>)}
              <Link to="/account">{currentLang === 'ta' ? 'என் கணக்கு' : 'My account'}</Link>
            </nav>
          </div>
          <div className="footer-link-group">
            <h2>{currentLang === 'ta' ? 'கொள்கைகள்' : 'Policies'}</h2>
            <PolicyLinks currentLang={currentLang} />
          </div>
        </div>
        <div className="footer-bottom">
          <p className="footer-copyright">© {new Date().getFullYear()} {BUSINESS_DETAILS.legalName} · {t.brandTitle}</p>
          <p className="footer-disclaimer">{recharge ? t.footerDisclaimer : t.launchFooter}</p>
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

      <React.Suspense fallback={null}>
      {recharge && activeOperator && (
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

      {lastCompletedOrder && <ReceiptModal
        order={lastCompletedOrder}
        onClose={() => setIsReceiptOpen(false)}
        currentLang={currentLang}
      />}

      {recharge && isNewDishOpen && <NewConnectionModal
        isOpen={isNewDishOpen}
        onClose={() => setIsNewDishOpen(false)}
        currentLang={currentLang}
      />}
      </React.Suspense>
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
