import React, { useState, useRef, useEffect } from 'react';
import { 
  Tv,
  Languages, 
  User, 
  LogOut, 
  ShieldCheck,
  ChevronDown,
  Briefcase,
  Settings,
  UserCheck,
  Sliders,
  Sparkles,
  Palette
} from 'lucide-react';
import { Language, UserProfile, DthOperatorId, isSuperAdminEmail, isUserAdmin, SUPER_ADMIN_EMAIL } from '../types';
import { translations } from '../lib/translations';
import { OperatorTheme, OPERATOR_THEMES } from '../lib/theme';

interface HeaderProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  user: UserProfile | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentTheme: OperatorTheme;
  onSelectTheme?: (opId: DthOperatorId) => void;
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
  onSelectTheme,
}) => {
  const t = translations[currentLang];
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [showSettingsSubmenu, setShowSettingsSubmenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = isUserAdmin(user);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
        setShowSettingsSubmenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isLight = currentTheme.isLightMode;

  return (
    <header className={`sticky top-0 z-40 ${currentTheme.headerBg} backdrop-blur-md ${currentTheme.headerBorder} border-b transition-colors duration-300`}>
      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand Treatment: Official DTH Tamizhan Logo */}
        <button
          type="button"
          onClick={() => onTabChange('recharge')} 
          className="flex items-center gap-3 text-left group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current rounded-xl"
          id="brand-logo-btn"
          aria-label="DTH Tamizhan home"
        >
          <div 
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-all border ${
              isLight 
                ? 'bg-[#FFFFFF] border-[#E0E0E0] shadow-sm' 
                : 'bg-[#0f1b38] border-white/10 shadow-black/40'
            }`}
            style={{ borderColor: `${currentTheme.primaryColor}50` }}
          >
            <Tv 
              className="w-5 h-5 transition-transform group-hover:scale-110" 
              style={{ color: currentTheme.primaryColor }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-sans font-extrabold text-xl tracking-tight ${isLight ? 'text-[#111827]' : 'text-[#f5f2eb]'}`}>
                DTH <span style={{ color: currentTheme.primaryColor }}>தமிழன்</span>
              </span>
            </div>
            <p className={`text-xs hidden sm:block ${isLight ? 'text-[#4B5563]' : 'text-[#9ca3af]'}`}>
              {t.brandTagline}
            </p>
          </div>
        </button>

        {/* Center Navigation Links: Dynamic Token Styling */}
        <nav aria-label="Main navigation" className={`hidden lg:flex items-center gap-1 p-1 rounded-xl border ${currentTheme.navContainerBg} ${currentTheme.navContainerBorder}`}>
          <button
            id="nav-recharge-btn"
            onClick={() => onTabChange('recharge')}
            aria-current={activeTab === 'recharge' ? 'page' : undefined}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${
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
            className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${
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
            className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${
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
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current flex items-center gap-1.5 ${
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
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${
                isLight
                  ? 'bg-[#FFFFFF] hover:bg-[#F5F5F5] border-[#D4D4D4] text-[#000000]'
                  : 'bg-[#0d172e] hover:bg-[#142244] border-[#1e2f54] text-[#f5f2eb]'
              }`}
            >
              {user ? (
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-inner"
                  style={{ backgroundColor: `${currentTheme.primaryColor}25`, color: currentTheme.primaryColor, border: `1px solid ${currentTheme.primaryColor}50` }}
                >
                  {user.displayName ? user.displayName[0].toUpperCase() : (user.email ? user.email[0].toUpperCase() : 'U')}
                </div>
              ) : (
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isLight ? 'bg-[#E5E5E5] text-[#333333]' : 'bg-[#172545] text-[#9aa7be]'}`}>
                  <User className="w-3.5 h-3.5" />
                </div>
              )}

              <div className="text-left hidden sm:block">
                <p className={`text-xs font-bold leading-tight ${isLight ? 'text-[#000000]' : 'text-[#f5f2eb]'}`}>
                  {user ? (user.displayName || (user.email ? user.email.split('@')[0] : t.customer)) : t.profileSettings}
                </p>
                <p className="text-xs leading-none mt-0.5 font-semibold" style={{ color: currentTheme.primaryColor }}>
                  {isAdmin ? t.adminBadge : (user ? t.customerBadge : t.accountOptions)}
                </p>
              </div>

              <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Floating Profile Dropdown Menu */}
            {isProfileDropdownOpen && (
              <div id="profile-settings-panel" className={`absolute right-0 mt-2 w-72 rounded-2xl shadow-2xl py-2 text-xs z-50 animate-in fade-in zoom-in-95 divide-y border ${
                isLight 
                  ? 'bg-[#FFFFFF] border-[#E0E0E0] text-[#333333] divide-[#EBEBEB]' 
                  : 'bg-[#0a1226] border-[#1d2d52] text-[#c7d2e5] divide-[#162342]'
              }`}>
                {/* User Summary Header */}
                <div className="px-4 py-3">
                  <p className={`font-bold text-sm truncate ${isLight ? 'text-[#000000]' : 'text-[#f5f2eb]'}`}>
                    {user ? (user.displayName || user.email || t.customer) : t.guestUser}
                  </p>
                  <p className={`text-xs truncate mt-0.5 ${isLight ? 'text-[#666666]' : 'text-[#8e9cb4]'}`}>
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
                      isLight ? 'hover:bg-[#F5F5F5] hover:text-[#000000]' : 'hover:bg-[#121f3f] hover:text-[#f5f2eb]'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 opacity-70" />
                    <span>{t.viewSavedBoxes}</span>
                  </button>

                  <button
                    id="dropdown-edit-profile-btn"
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      onOpenAuth();
                    }}
                    className={`w-full px-4 py-2 text-left flex items-center gap-2.5 transition-colors ${
                      isLight ? 'hover:bg-[#F5F5F5] hover:text-[#000000]' : 'hover:bg-[#121f3f] hover:text-[#f5f2eb]'
                    }`}
                  >
                    <Sliders className="w-4 h-4 opacity-70" />
                    <span>{user ? t.editProfile : (currentLang === 'ta' ? 'கூகிள் மூலம் உள்நுழைக' : 'Sign in with Google')}</span>
                  </button>
                </div>

                {/* Settings & Preferences Section: Theme + Language */}
                <div className="p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase tracking-wider text-xs opacity-75 flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5" />
                      {t.settingsPreferences}
                    </span>
                  </div>

                  {/* Language Toggle */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold flex items-center gap-1.5 opacity-80">
                      <Languages className="w-3.5 h-3.5" style={{ color: currentTheme.primaryColor }} />
                      {t.language}
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-gray-500/10 border border-gray-500/20">
                      <button
                        type="button"
                        onClick={() => onLanguageChange('en')}
                        className={`py-1.5 rounded-lg font-bold text-xs transition-all ${
                          currentLang === 'en'
                            ? 'bg-white text-black shadow-sm dark:bg-slate-800 dark:text-white font-bold'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        English
                      </button>
                      <button
                        type="button"
                        onClick={() => onLanguageChange('ta')}
                        className={`py-1.5 rounded-lg font-bold text-xs transition-all ${
                          currentLang === 'ta'
                            ? 'bg-white text-black shadow-sm dark:bg-slate-800 dark:text-white font-bold'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        தமிழ்
                      </button>
                    </div>
                  </div>

                  {/* Operator Theme Selector */}
                  {onSelectTheme && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold flex items-center gap-1.5 opacity-80">
                        <Palette className="w-3.5 h-3.5" style={{ color: currentTheme.primaryColor }} />
                        {t.brandTheme}
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['sun_direct', 'tata_play', 'airtel_dth', 'dish_tv'] as DthOperatorId[]).map((opId) => {
                          const opTh = OPERATOR_THEMES[opId];
                          const isActive = opTh.id === currentTheme.id;
                          return (
                            <button
                              key={opId}
                              type="button"
                              onClick={() => {
                                onSelectTheme(opId);
                              }}
                              className={`p-2 rounded-xl text-left border flex items-center gap-2 transition-all ${
                                isActive
                                  ? 'border-2 shadow-sm font-bold'
                                  : 'border-gray-500/20 hover:border-gray-500/40 bg-gray-500/5'
                              }`}
                              style={{
                                borderColor: isActive ? opTh.primaryColor : undefined,
                                backgroundColor: isActive ? `${opTh.primaryColor}15` : undefined,
                              }}
                            >
                              <span 
                                className="w-3 h-3 rounded-full flex-shrink-0" 
                                style={{ backgroundColor: opTh.primaryColor }}
                              />
                              <span className="truncate text-xs">{opTh.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Admin Operations Console - Restricted to authenticated admins */}
                {isAdmin && (
                  <div className="py-1 border-t border-b border-gray-500/10">
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
                        isLight ? 'hover:bg-[#F5F5F5] hover:text-[#000000]' : 'hover:bg-[#121f3f] hover:text-[#f5f2eb]'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <ShieldCheck className="w-4 h-4" style={{ color: currentTheme.primaryColor }} />
                        <span className="font-bold text-xs">Admin Console</span>
                      </span>
                      <span 
                        className="text-[9px] font-bold uppercase font-mono px-1.5 py-0.5 rounded border"
                        style={{
                          backgroundColor: `${currentTheme.primaryColor}15`,
                          color: currentTheme.primaryColor,
                          borderColor: `${currentTheme.primaryColor}30`,
                        }}
                      >
                        Admin
                      </span>
                    </button>
                  </div>
                )}

                {/* Sign Out / Sign In Footer */}
                <div className="py-1">
                  {user ? (
                    <button
                      id="dropdown-logout-btn"
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        onSignOut();
                      }}
                      className="w-full px-4 py-2 text-left text-rose-500 hover:bg-rose-50 hover:text-rose-600 flex items-center gap-2.5 transition-colors font-semibold"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </button>
                  ) : (
                    <button
                      id="dropdown-signin-btn"
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        onOpenAuth();
                      }}
                      className="w-full px-4 py-2 text-left flex items-center gap-2.5 transition-colors font-bold"
                      style={{ color: currentTheme.primaryColor }}
                    >
                      <User className="w-4 h-4" />
                      <span>Sign In with Google</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Tab Bar */}
      <nav aria-label="Main navigation" className={`flex lg:hidden overflow-x-auto py-2 px-3 gap-2 border-t ${currentTheme.statusStripBg} ${currentTheme.statusStripBorder}`}>
        <button
          id="mobile-nav-recharge-btn"
          onClick={() => onTabChange('recharge')}
          aria-current={activeTab === 'recharge' ? 'page' : undefined}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap text-center transition-all ${
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
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap text-center transition-all ${
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
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap text-center transition-all ${
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
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap text-center transition-all flex items-center justify-center gap-1 ${
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
    </header>
  );
};
