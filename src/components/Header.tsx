import React, { useState, useRef, useEffect } from 'react';
import {
  Tv,
  User,
  LogOut,
  ShieldCheck,
  ChevronDown,
  UserCheck,
  Sliders
} from '../lib/icons';
import { Language, UserProfile } from '../types';
import { AdminNavigationError, verifyAdminNavigationAccess } from '../lib/adminNavigationAccess';
import { translations } from '../lib/translations';
import { OperatorTheme } from '../lib/theme';

interface HeaderProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  user: UserProfile | null;
  onOpenAuth: () => void;
  onUpdateProfile: (updates: Pick<UserProfile, 'displayName' | 'phoneNumber'>) => Promise<void>;
  onSignOut: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentTheme: OperatorTheme;
}

export const Header: React.FC<HeaderProps> = ({
  currentLang,
  onLanguageChange,
  user,
  onOpenAuth,
  onSignOut,
  activeTab,
  onTabChange,
  currentTheme,
}) => {
  const t = translations[currentLang];
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [adminAccess, setAdminAccess] = useState<{ uid: string; status: 'checking' | 'allowed' | 'denied' | 'error' } | null>(null);
  const [adminAccessRetry, setAdminAccessRetry] = useState(0);
  const [adminAccessError, setAdminAccessError] = useState<'session' | 'server' | 'network'>('server');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isAdmin = !!user && adminAccess?.uid === user.uid && adminAccess.status === 'allowed';

  useEffect(() => {
    if (!user || !isProfileDropdownOpen) { setAdminAccess(null); return; }
    let active = true;
    const controller = new AbortController();
    setAdminAccess({ uid: user.uid, status: 'checking' });
    verifyAdminNavigationAccess(user.uid, controller.signal).then(allowed => {
      if (active) setAdminAccess({ uid: user.uid, status: allowed ? 'allowed' : 'denied' });
    }).catch(error => {
      if (active) {
        setAdminAccessError(error instanceof AdminNavigationError ? error.reason : 'server');
        setAdminAccess({ uid: user.uid, status: 'error' });
      }
    });
    return () => { active = false; controller.abort(); };
  }, [user?.uid, isProfileDropdownOpen, adminAccessRetry]);

  useEffect(() => {
    if (!isProfileDropdownOpen) return;
    dropdownRef.current?.querySelector<HTMLButtonElement>('#profile-settings-panel button')?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsProfileDropdownOpen(false);
      document.getElementById('profile-dropdown-trigger-btn')?.focus();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isProfileDropdownOpen]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isLight = currentTheme.isLightMode;

  return (
    <header className={`app-header ${currentTheme.headerBg}`}>
      {/* Main Navigation Bar */}
      <div className="app-header-inner">
        {/* Brand Treatment: Official DTH Tamizhan Logo */}
        <button
          type="button"
          onClick={() => onTabChange('recharge')}
          className="flex items-center gap-3 text-left group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current rounded-xl"
          id="brand-logo-btn"
          aria-label={translations[currentLang].uiDTHTamizhanHome}
        >
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-colors border ${
              isLight
                ? 'bg-paper border-rule shadow-sm'
                : 'bg-ink border-rule-strong shadow-black/40'
            }`}
            style={{ borderColor: `color-mix(in oklab, ${currentTheme.primaryColor} 31%, transparent)` }}
          >
            <Tv
              className="w-5 h-5 transition-transform "
              style={{ color: currentTheme.primaryColor }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-sans font-bold text-xl tracking-tight ${isLight ? 'text-ink' : 'text-accent-ink'}`}>
                DTH <span style={{ color: currentTheme.primaryColor }}>தமிழன்</span>
              </span>
            </div>
            <p className={`text-xs hidden sm:block ${isLight ? 'text-ink-2' : 'text-muted'}`}>
              {t.brandTagline}
            </p>
          </div>
        </button>

        {/* Center Navigation Links: Dynamic Token Styling */}
        <nav aria-label={translations[currentLang].uiMainNavigation} className={`desktop-navigation`}>
          <button
            id="nav-recharge-btn"
            onClick={() => onTabChange('recharge')}
            aria-current={activeTab === 'recharge' ? 'page' : undefined}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold  transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${
              activeTab === 'recharge'
                ? `${currentTheme.navActiveBg} ${currentTheme.navActiveText} shadow-sm`
                : `${currentTheme.navInactiveText} ${currentTheme.navInactiveHoverBg}`
            }`}
          >
            {t.navRecharge}
          </button>
          <button
            id="nav-plans-btn"
            onClick={() => onTabChange('plans')}
            aria-current={activeTab === 'plans' ? 'page' : undefined}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold  transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${
              activeTab === 'plans'
                ? `${currentTheme.navActiveBg} ${currentTheme.navActiveText} shadow-sm`
                : `${currentTheme.navInactiveText} ${currentTheme.navInactiveHoverBg}`
            }`}
          >
            {t.navPlans}
          </button>
          <button
            id="nav-connections-btn"
            onClick={() => onTabChange('connections')}
            aria-current={activeTab === 'connections' ? 'page' : undefined}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold  transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${
              activeTab === 'connections'
                ? `${currentTheme.navActiveBg} ${currentTheme.navActiveText} shadow-sm`
                : `${currentTheme.navInactiveText} ${currentTheme.navInactiveHoverBg}`
            }`}
          >
            {t.navConnections}
          </button>

        </nav>

        {/* Right Action: Unified Profile & Settings Dropdown */}
        <div className="flex items-center gap-3" ref={dropdownRef} onBlur={event => {
          if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setIsProfileDropdownOpen(false);
        }}>
          <div className="relative">
            <button
              id="profile-dropdown-trigger-btn"
              type="button"
              aria-label={[t.uiAccount, user?.displayName || user?.email].filter(Boolean).join(': ')}
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              onKeyDown={event => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setIsProfileDropdownOpen(true);
                  dropdownRef.current?.querySelector<HTMLButtonElement>('#profile-settings-panel button')?.focus();
                }
              }}
              aria-expanded={isProfileDropdownOpen}
              aria-controls="profile-settings-panel"
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-colors shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${
                isLight
                  ? 'bg-paper hover:bg-paper border-rule text-ink'
                  : 'bg-ink hover:bg-ink border-accent text-accent-ink'
              }`}
            >
              {user ? (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-inner"
                  style={{ backgroundColor: `color-mix(in oklab, ${currentTheme.primaryColor} 15%, transparent)`, color: currentTheme.primaryColor, border: `1px solid color-mix(in oklab, ${currentTheme.primaryColor} 31%, transparent)` }}
                >
                  {user.displayName ? user.displayName[0].toUpperCase() : (user.email ? user.email[0].toUpperCase() : 'U')}
                </div>
              ) : (
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isLight ? 'bg-paper text-ink-2' : 'bg-ink text-muted'}`}>
                  <User className="w-3.5 h-3.5" />
                </div>
              )}

              <div className="text-left hidden sm:block">
                <p className={`text-xs font-bold leading-tight ${isLight ? 'text-ink' : 'text-accent-ink'}`}>
                  {user ? (user.displayName || (user.email ? user.email.split('@')[0] : t.customer)) : (translations[currentLang].uiAccount)}
                </p>

              </div>

              <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Floating Profile Dropdown Menu */}
            {isProfileDropdownOpen && (
              <div id="profile-settings-panel" className={`profile-menu absolute right-0 mt-2 w-72 rounded-2xl shadow-2xl text-xs z-50 divide-y border ${
                isLight
                  ? 'bg-paper border-rule text-ink-2 divide-rule'
                  : 'bg-ink border-accent text-accent-ink divide-accent'
              }`}>
                {!user && (
                  <div className="profile-signin-row">
                    <button id="dropdown-signin-btn" type="button" onClick={() => { setIsProfileDropdownOpen(false); onOpenAuth(); }}>
                      <User className="w-4 h-4" aria-hidden="true" />
                      <span>{t.googleOption}</span>
                    </button>
                  </div>
                )}
                {user && (
                <>
                {/* User Summary Header */}
                <div className="px-4 py-3">
                  <p className={`font-bold text-sm truncate ${isLight ? 'text-ink' : 'text-accent-ink'}`}>
                    {user ? (user.displayName || user.email || t.customer) : t.guestUser}
                  </p>
                  <p className={`text-xs truncate mt-0.5 ${isLight ? 'text-ink-2' : 'text-muted'}`}>
                    {user ? (user.email || translations[currentLang].uiDTHAccountVerified) : t.signInPrompt}
                  </p>
                </div>

                {/* Primary Menu Actions */}
                <div className="py-1">
                  <button type="button" onClick={() => { setIsProfileDropdownOpen(false); onTabChange('account'); }} className="w-full px-4 py-2 text-left flex items-center gap-2.5">
                    <User className="w-4 h-4" aria-hidden="true" /><span>{translations[currentLang].uiYourAccount}</span>
                  </button>
                  <button
                    id="dropdown-view-profile-btn"
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      if (!user) onOpenAuth();
                      else onTabChange('connections');
                    }}
                    className={`w-full px-4 py-2 text-left flex items-center gap-2.5 transition-colors ${
                      isLight ? 'hover:bg-paper hover:text-ink' : 'hover:bg-ink hover:text-accent-ink'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 opacity-70" />
                    <span>{t.viewSavedBoxes}</span>
                  </button>


                </div>

                </>
                )}

                <div className="profile-language-row">
                  <span className="text-sm text-ink-2">{translations[currentLang].uiLanguage}</span>
                  <div className="profile-language-options" role="group" aria-label={t.language}>
                    <button type="button" onClick={() => onLanguageChange('en')} aria-pressed={currentLang === 'en'}>{translations[currentLang].uiEnglish}</button>
                    <button type="button" onClick={() => onLanguageChange('ta')} aria-pressed={currentLang === 'ta'}>தமிழ்</button>
                  </div>
                </div>

                {/* Admin Operations Console - Restricted to authenticated admins */}
                {user && adminAccess?.uid === user.uid && adminAccess.status === 'checking' && (
                  <p role="status" className="px-4 py-2 text-muted">{translations[currentLang].uiCheckingAdminAccess}</p>
                )}
                {user && adminAccess?.uid === user.uid && adminAccess.status === 'error' && (
                  <div className="px-4 py-2 space-y-2">
                    <p role="alert">{translations[currentLang].uiUnableToVerifyAdminAccess}</p>
                    <p className="text-xs text-muted">{currentLang === 'ta'
                      ? adminAccessError === 'session' ? 'வெளியேறி மீண்டும் உள்நுழையவும். சிக்கல் தொடர்ந்தால் சேவையக Firebase அமைப்பைச் சரிபார்க்கவும்.' : 'சேவையக இணைப்பு மற்றும் Firebase நிர்வாக அமைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.'
                      : adminAccessError === 'session' ? 'Sign out and sign in again. If this continues, check the server Firebase credentials.'
                      : adminAccessError === 'network' ? 'Check your connection and retry. The authentication server could not be reached.'
                      : 'The server could not confirm access. Check the server Firebase configuration and retry.'}</p>
                    <button type="button" onClick={() => setAdminAccessRetry(value => value + 1)}>{translations[currentLang].uiRetryAccessCheck}</button>
                  </div>
                )}
                {isAdmin && (
                  <div className="py-1 border-t border-b border-rule-strong">
                    <button
                      id="dropdown-admin-portal-btn"
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        onTabChange('admin-portal');
                      }}
                      className={`w-full px-4 py-2.5 text-left flex items-center justify-between transition-colors ${
                        isLight ? 'hover:bg-paper hover:text-ink' : 'hover:bg-ink hover:text-accent-ink'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <ShieldCheck className="w-4 h-4" style={{ color: currentTheme.primaryColor }} />
                        <span className="font-bold text-xs">{t.adminConsole}</span>
                      </span>
                      <span
                        className="text-xs font-bold  font-mono px-1.5 py-0.5 rounded border"
                        style={{
                          backgroundColor: `color-mix(in oklab, ${currentTheme.primaryColor} 8%, transparent)`,
                          color: currentTheme.primaryColor,
                          borderColor: `color-mix(in oklab, ${currentTheme.primaryColor} 19%, transparent)`,
                        }}
                      >
                        {t.adminBadge}
                      </span>
                    </button>
                  </div>
                )}

                {user && (
                  <div className="py-1">
                    <button
                      id="dropdown-logout-btn"
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        onSignOut();
                      }}
                      className="w-full px-4 py-2 text-left text-error hover:bg-error-soft hover:text-error flex items-center gap-2.5 transition-colors font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t.signOut}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Tab Bar */}
      <nav aria-label={translations[currentLang].uiMainNavigation} className={`mobile-navigation ${currentTheme.statusStripBg}`}>
        <button
          id="mobile-nav-recharge-btn"
          onClick={() => onTabChange('recharge')}
          aria-current={activeTab === 'recharge' ? 'page' : undefined}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap text-center transition-colors ${
            activeTab === 'recharge'
              ? `${currentTheme.navActiveBg} ${currentTheme.navActiveText}`
              : `${currentTheme.navContainerBg} ${currentTheme.navInactiveText}`
          }`}
        >
          {t.navRecharge}
        </button>
        <button
          id="mobile-nav-plans-btn"
          onClick={() => onTabChange('plans')}
          aria-current={activeTab === 'plans' ? 'page' : undefined}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap text-center transition-colors ${
            activeTab === 'plans'
              ? `${currentTheme.navActiveBg} ${currentTheme.navActiveText}`
              : `${currentTheme.navContainerBg} ${currentTheme.navInactiveText}`
          }`}
        >
          {t.navPlans}
        </button>
        <button
          id="mobile-nav-connections-btn"
          onClick={() => onTabChange('connections')}
          aria-current={activeTab === 'connections' ? 'page' : undefined}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap text-center transition-colors ${
            activeTab === 'connections'
              ? `${currentTheme.navActiveBg} ${currentTheme.navActiveText}`
              : `${currentTheme.navContainerBg} ${currentTheme.navInactiveText}`
          }`}
        >
          {t.navConnections}
        </button>

      </nav>
    </header>
  );
};
