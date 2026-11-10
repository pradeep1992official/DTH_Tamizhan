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
import { Language, UserProfile, isUserAdmin } from '../types';
import { translations } from '../lib/translations';
import { OperatorTheme } from '../lib/theme';
import { useAccessibleModal } from '../lib/useAccessibleModal';

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
  onUpdateProfile,
  onSignOut,
  activeTab,
  onTabChange,
  currentTheme,
}) => {
  const t = translations[currentLang];
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { modalRef: profileModalRef } = useAccessibleModal({
    isOpen: isEditProfileOpen,
    onClose: () => setIsEditProfileOpen(false),
  });

  const isAdmin = isUserAdmin(user);

  useEffect(() => {
    if (!isProfileDropdownOpen) return;
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

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const displayName = profileName.trim();
    const phoneNumber = profilePhone.trim();
    if (displayName.length < 2) {
      setProfileError(currentLang === 'ta' ? 'பெயர் குறைந்தது 2 எழுத்துகள் இருக்க வேண்டும்.' : 'Name must be at least 2 characters.');
      return;
    }

    setIsSavingProfile(true);
    setProfileError(null);
    try {
      await onUpdateProfile({ displayName, phoneNumber: phoneNumber || undefined });
      setIsEditProfileOpen(false);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Unable to save profile. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

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
          aria-label="DTH Tamizhan home"
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
        <nav aria-label="Main navigation" className={`desktop-navigation`}>
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
          {isAdmin && (
            <button
              id="nav-admin-btn"
              onClick={() => onTabChange('admin-portal')}
              aria-current={activeTab === 'admin-portal' ? 'page' : undefined}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold  transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current flex items-center gap-1.5 ${
                activeTab === 'admin-portal'
                  ? `${currentTheme.navActiveBg} ${currentTheme.navActiveText} shadow-sm`
                  : `${currentTheme.navInactiveText} ${currentTheme.navInactiveHoverBg}`
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
            </button>
          )}
        </nav>

        {/* Right Action: Unified Profile & Settings Dropdown */}
        <div className="flex items-center gap-3" ref={dropdownRef}>
          <div className="relative">
            <button
              id="profile-dropdown-trigger-btn"
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
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
                  {user ? (user.displayName || (user.email ? user.email.split('@')[0] : t.customer)) : (currentLang === 'ta' ? 'கணக்கு' : 'Account')}
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
                    {user ? (user.email || 'DTH Account Verified') : t.signInPrompt}
                  </p>
                </div>

                {/* Primary Menu Actions */}
                <div className="py-1">
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

                  {user && (
                  <button
                    id="dropdown-edit-profile-btn"
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      setProfileName(user.displayName || '');
                      setProfilePhone(user.phoneNumber || '');
                      setProfileError(null);
                      setIsEditProfileOpen(true);
                    }}
                    className={`w-full px-4 py-2 text-left flex items-center gap-2.5 transition-colors ${
                      isLight ? 'hover:bg-paper hover:text-ink' : 'hover:bg-ink hover:text-accent-ink'
                    }`}
                  >
                    <Sliders className="w-4 h-4 opacity-70" />
                    <span>{user ? t.editProfile : (currentLang === 'ta' ? 'கூகிள் மூலம் உள்நுழைக' : 'Sign in with Google')}</span>
                  </button>
                  )}
                </div>

                </>
                )}

                <div className="profile-language-row">
                  <span className="text-sm text-ink-2">{currentLang === 'ta' ? 'மொழி' : 'Language'}</span>
                  <div className="profile-language-options" role="group" aria-label={t.language}>
                    <button type="button" onClick={() => onLanguageChange('en')} aria-pressed={currentLang === 'en'}>English</button>
                    <button type="button" onClick={() => onLanguageChange('ta')} aria-pressed={currentLang === 'ta'}>தமிழ்</button>
                  </div>
                </div>

                {/* Admin Operations Console - Restricted to authenticated admins */}
                {isAdmin && (
                  <div className="py-1 border-t border-b border-rule-strong">
                    <button
                      id="dropdown-admin-portal-btn"
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        if (typeof window !== 'undefined') {
                          window.history.pushState(null, '', '/admin/customers');
                        }
                        onTabChange('admin-portal');
                      }}
                      className={`w-full px-4 py-2.5 text-left flex items-center justify-between transition-colors ${
                        isLight ? 'hover:bg-paper hover:text-ink' : 'hover:bg-ink hover:text-accent-ink'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <ShieldCheck className="w-4 h-4" style={{ color: currentTheme.primaryColor }} />
                        <span className="font-bold text-xs">Admin Console</span>
                      </span>
                      <span
                        className="text-xs font-bold  font-mono px-1.5 py-0.5 rounded border"
                        style={{
                          backgroundColor: `color-mix(in oklab, ${currentTheme.primaryColor} 8%, transparent)`,
                          color: currentTheme.primaryColor,
                          borderColor: `color-mix(in oklab, ${currentTheme.primaryColor} 19%, transparent)`,
                        }}
                      >
                        Admin
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
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Tab Bar */}
      <nav aria-label="Main navigation" className={`mobile-navigation ${currentTheme.statusStripBg}`}>
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
        {isAdmin && (
          <button
            id="mobile-nav-admin-btn"
            onClick={() => onTabChange('admin-portal')}
            aria-current={activeTab === 'admin-portal' ? 'page' : undefined}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap text-center transition-colors flex items-center justify-center gap-1 ${
              activeTab === 'admin-portal'
                ? `${currentTheme.navActiveBg} ${currentTheme.navActiveText}`
                : `${currentTheme.navContainerBg} ${currentTheme.navInactiveText}`
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        )}
      </nav>
      {isEditProfileOpen && user && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsEditProfileOpen(false);
          }}
        >
          <div
            ref={profileModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
            className={`w-full max-w-md rounded-xl border p-5 shadow-xl ${isLight ? 'border-rule bg-paper text-ink' : 'border-rule-strong bg-ink text-accent-ink'}`}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="edit-profile-title" className="text-lg font-bold">{t.editProfile}</h2>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                aria-label={t.close}
                className="rounded-lg px-2 py-1 text-muted hover:bg-paper-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-current"
              >
                ×
              </button>
            </div>
            <p className="mb-4 break-all text-sm text-muted">{user.email}</p>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <label className="block space-y-1.5 text-sm font-medium">
                <span>{t.customerFullName}</span>
                <input
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={100}
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  className="w-full rounded-lg border border-rule bg-paper px-3 py-2.5 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
                />
              </label>
              <label className="block space-y-1.5 text-sm font-medium">
                <span>{t.registeredMobile}</span>
                <input
                  type="tel"
                  autoComplete="tel"
                  maxLength={20}
                  value={profilePhone}
                  onChange={(event) => setProfilePhone(event.target.value)}
                  className="w-full rounded-lg border border-rule bg-paper px-3 py-2.5 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
                />
              </label>
              {profileError && <p role="alert" className="text-sm text-error">{profileError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="rounded-lg border border-rule px-4 py-2 text-sm font-medium hover:bg-paper-2"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink disabled:opacity-60"
                >
                  {isSavingProfile ? (currentLang === 'ta' ? 'சேமிக்கிறது…' : 'Saving…') : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
