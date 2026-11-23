import { clientRechargeEnabled } from '../lib/rechargeFeature';
import { Link } from 'react-router-dom';
import { BUSINESS_DETAILS } from '../lib/trustContent';
import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  LogOut,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  UserCheck,
  Sliders,
  Clock,
  Ticket,
  Calendar,
  Wrench
} from '../lib/icons';
import { Language, UserProfile } from '../types';
import { AdminNavigationError, verifyAdminNavigationAccess } from '../lib/adminNavigationAccess';
import { translations } from '../lib/translations';
import { OperatorTheme } from '../lib/theme';

interface HeaderProps {
  recharge?: boolean;
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
  recharge = clientRechargeEnabled(),
  onLanguageChange,
  user,
  onOpenAuth,
  onSignOut,
  activeTab,
  onTabChange,
  currentTheme,
}) => {
  const t = translations[currentLang];
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
    const timeout = setTimeout(() => {
      if (!active) return;
      controller.abort();
      setAdminAccessError('network');
      setAdminAccess({ uid: user.uid, status: 'error' });
    }, 10000);
    verifyAdminNavigationAccess(user.uid, controller.signal).then(allowed => {
      if (active && !controller.signal.aborted) setAdminAccess({ uid: user.uid, status: allowed ? 'allowed' : 'denied' });
    }).catch(error => {
      if (active) {
        setAdminAccessError(error instanceof AdminNavigationError ? error.reason : 'server');
        setAdminAccess({ uid: user.uid, status: 'error' });
      }
    }).finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
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

  useEffect(() => { setIsMobileMenuOpen(false); }, [activeTab]);
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
        document.getElementById('header-menu-trigger')?.focus();
      }
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [isMobileMenuOpen]);
  const firstName = user?.displayName?.trim().split(/\s+/)[0]
    ?.toLocaleLowerCase(currentLang === 'ta' ? 'ta-IN' : 'en-IN')
    .replace(/(^|[-'’])\p{L}/gu, letter => letter.toLocaleUpperCase(currentLang === 'ta' ? 'ta-IN' : 'en-IN'));
  const isLight = currentTheme.isLightMode;

  return (
    <header className={`app-header ${currentTheme.headerBg}`}>
      {/* Main Navigation Bar */}
      <div className="app-header-inner">
        {/* Brand Treatment: Official DTH Tamizhan Logo */}
        <Link
          to="/"
          className="flex items-center gap-3 text-left group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current rounded-xl"
          id="brand-logo-btn"
          aria-label={translations[currentLang].uiDTHTamizhanHome}
        >
          <span className="brand-logo-mark" aria-hidden="true">
            <img className="brand-logo-image" src="/dth-tamizhan-logo.png" width="1024" height="1024" alt="" />
          </span>
          <span className="brand-title">{t.brandTitle}</span>
        </Link>

        {/* Center Navigation Links: Dynamic Token Styling */}
        <nav aria-label={t.uiMainNavigation} className="desktop-navigation">
          <Link to="/" aria-current={activeTab === 'home' ? 'page' : undefined}>{currentLang === 'ta' ? 'முகப்பு' : 'Home'}</Link>
          <Link to="/new-connection" aria-current={activeTab === 'new-connection' ? 'page' : undefined}>{t.ncNav}</Link>
          <Link to="/account/bookings" aria-current={activeTab === 'bookings' ? 'page' : undefined}>{t.ctTitle}</Link>
          <Link to="/service-request" aria-current={activeTab === 'help' ? 'page' : undefined}>{currentLang === 'ta' ? '\u0b9a\u0bc7\u0bb5\u0bc8 \u0b95\u0bcb\u0bb0\u0bbf\u0b95\u0bcd\u0b95\u0bc8' : 'Service Request'}</Link>
        </nav>

        {/* Right Action: Unified Profile & Settings Dropdown */}
        <div className="header-actions" ref={dropdownRef} onBlur={event => {
          if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setIsProfileDropdownOpen(false);
        }}>
          <details className="header-support" onKeyDown={event => {
            if (event.key === 'Escape') {
              event.currentTarget.open = false;
              event.currentTarget.querySelector('summary')?.focus();
            }
          }}>
            <summary>{currentLang === 'ta' ? 'உதவி' : 'Help'} <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" /></summary>
            <div className="header-support-panel">
              <strong>{currentLang === 'ta' ? 'வாடிக்கையாளர் உதவி' : 'Customer support'}</strong>
              <a href={`tel:${BUSINESS_DETAILS.phone.replace(/[^+0-9]/g, '')}`}>{currentLang === 'ta' ? 'அழைக்கவும்' : 'Call'} {BUSINESS_DETAILS.phone}</a>
              <a href={`https://wa.me/${BUSINESS_DETAILS.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">WhatsApp {BUSINESS_DETAILS.phone}</a>
              <p>{BUSINESS_DETAILS.supportHours}</p>
              <Link to="/contact">{currentLang === 'ta' ? 'தொடர்பு விவரங்கள்' : 'Contact details'}</Link>
            </div>
          </details>
          <div className="header-language" role="group" aria-label={t.uiLanguage}>
            <button type="button" lang="ta" aria-pressed={currentLang === 'ta'} onClick={() => onLanguageChange('ta')}>தமிழ்</button>
            <span aria-hidden="true">|</span>
            <button type="button" lang="en" aria-pressed={currentLang === 'en'} onClick={() => onLanguageChange('en')}>EN</button>
          </div>
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
              {user?.photoURL ? (
                <img className="header-avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
              ) : user ? (
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

              <div className="text-left">
                <p className={`text-xs font-bold leading-tight ${isLight ? 'text-ink' : 'text-accent-ink'}`}>
                  {firstName ? `${currentLang === 'ta' ? 'வணக்கம்' : 'Hi'}, ${firstName}` : (user?.email || (currentLang === 'ta' ? 'சுயவிவரம்' : 'Profile'))}
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
                      <span>{t.uiSignIn}</span>
                    </button>
                  </div>
                )}
                {user && (
                <>
                {/* User Summary Header */}
                <div className="profile-menu-identity px-4 py-3">
                  <p className={`font-bold text-sm truncate ${isLight ? 'text-ink' : 'text-accent-ink'}`}>
                    {user ? (user.displayName || user.email || t.customer) : t.guestUser}
                  </p>
                  <p className={`text-xs truncate mt-0.5 ${isLight ? 'text-ink-2' : 'text-muted'}`}>
                    {user ? (user.email || translations[currentLang].uiDTHAccountVerified) : t.signInPrompt}
                  </p>
                </div>

                {/* Primary Menu Actions */}
                <div className="py-1">
                  <button id="dropdown-bookings-btn" type="button" onClick={() => { setIsProfileDropdownOpen(false); onTabChange('bookings'); }} aria-current={activeTab === 'bookings' ? 'page' : undefined} className="w-full px-4 py-2 text-left flex items-center gap-2.5"><Calendar className="w-4 h-4" aria-hidden="true" /><span>{t.ctTitle}</span></button>
                  <a id="dropdown-service-request-link" href="/service-request" className="profile-tickets-link" onClick={() => setIsProfileDropdownOpen(false)}><Wrench className="w-4 h-4" aria-hidden="true" /><span>{currentLang === 'ta' ? 'சேவை கோரிக்கை' : 'Raise service request'}</span></a>
                  <a href="/my-tickets" className="profile-tickets-link" onClick={() => setIsProfileDropdownOpen(false)}><Ticket className="w-4 h-4" aria-hidden="true" /><span>{currentLang === 'ta' ? 'எனது கோரிக்கைகள்' : 'My tickets'}</span></a>
                  <button type="button" onClick={() => { setIsProfileDropdownOpen(false); onTabChange('account'); }} className="w-full px-4 py-2 text-left flex items-center gap-2.5">
                    <User className="w-4 h-4" aria-hidden="true" /><span>{translations[currentLang].uiYourAccount}</span>
                  </button>
                  {recharge && (<button type="button" onClick={() => { setIsProfileDropdownOpen(false); onTabChange('history'); }} className="w-full px-4 py-2 text-left flex items-center gap-2.5"><Clock className="w-4 h-4" /><span>{currentLang === 'ta' ? 'ரீசார்ஜ் வரலாறு' : 'Your recharge history'}</span></button>)}
                  {recharge && (<button
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
                  </button>)}


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
                      <span className="flex items-center gap-2.5 min-w-0">
                        <ShieldCheck className="w-4 h-4" style={{ color: currentTheme.primaryColor }} />
                        <span className="profile-admin-label"><span>{t.adminConsole}</span><small>{t.adminBadge}</small></span>
                      </span>
                      <ChevronRight className="w-4 h-4 shrink-0" />
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
          <button id="header-menu-trigger" type="button" className="header-menu-trigger" aria-expanded={isMobileMenuOpen} aria-controls="header-mobile-navigation" aria-label={currentLang === 'ta' ? 'Navigation menu' : 'Navigation menu'} onClick={() => setIsMobileMenuOpen(open => !open)}><span aria-hidden="true">{isMobileMenuOpen ? '\u2715' : '\u2630'}</span></button>
        </div>
      </div>

      {/* Mobile Navigation Tab Bar */}
      <nav id="header-mobile-navigation" aria-label={t.uiMainNavigation} className={`mobile-navigation header-mobile-menu ${isMobileMenuOpen ? 'is-open' : ''}`}>
        <Link to="/" onClick={() => setIsMobileMenuOpen(false)} aria-current={activeTab === 'home' ? 'page' : undefined}>{currentLang === 'ta' ? 'முகப்பு' : 'Home'}</Link>
        <button type="button" className="mobile-account-shortcut" onClick={() => { setIsMobileMenuOpen(false); setIsProfileDropdownOpen(true); }}>{firstName ? `Hi, ${firstName}` : t.uiAccount}</button>
        <div className="header-language mobile-language" role="group" aria-label={t.uiLanguage}>
          <button type="button" lang="ta" aria-pressed={currentLang === 'ta'} onClick={() => onLanguageChange('ta')}>தமிழ்</button>
          <span aria-hidden="true">|</span>
          <button type="button" lang="en" aria-pressed={currentLang === 'en'} onClick={() => onLanguageChange('en')}>EN</button>
        </div>
        <Link to="/new-connection" onClick={() => setIsMobileMenuOpen(false)} aria-current={activeTab === 'new-connection' ? 'page' : undefined}>{t.ncNav}</Link>
        <Link to="/account/bookings" onClick={() => setIsMobileMenuOpen(false)} aria-current={activeTab === 'bookings' ? 'page' : undefined}>{t.ctTitle}</Link>
        <Link to="/service-request" onClick={() => setIsMobileMenuOpen(false)} aria-current={activeTab === 'help' ? 'page' : undefined}>{currentLang === 'ta' ? '\u0b9a\u0bc7\u0bb5\u0bc8 \u0b95\u0bcb\u0bb0\u0bbf\u0b95\u0bcd\u0b95\u0bc8' : 'Service Request'}</Link>
      </nav>
      <div id="mobile-assistance-control" className="mobile-assistance-slot" />
    </header>
  );
};
