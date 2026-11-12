import { localizeCustomerError } from '../../lib/customerMessages';
import { missingCatalogOperators } from '../../lib/catalogAvailability';
import { OperatorCatalogNotice } from '../OperatorCatalogNotice';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  Tv,
  ArrowUpDown,
  RotateCcw,
  AlertCircle,
  RefreshCw,
} from '../../lib/icons';
import { BrowsePlan, DthConnection, Language, PlanFilters, UserProfile, isSameDthOperatorGroup } from '../../types';
import { OperatorTheme } from '../../lib/theme';
import { filterAndSortPlans, catalogItemToBrowsePlan, catalogPriceMaximum } from '../../lib/browsePlansData';
import { PlanFilterSidebar } from './PlanFilterSidebar';
import { CatalogColumnHeadings, PlanCard } from './PlanCard';
import { CompareDrawer } from './CompareDrawer';
import { ComparisonTable } from './ComparisonTable';
import { ApplyPlanModal } from './ApplyPlanModal';
import { PlanCatalogService } from '../../lib/planCatalogService';
import { translations } from '../../lib/translations';

interface BrowsePlansViewProps {
  currentTheme: OperatorTheme;
  currentLang: Language;
  user: UserProfile | null;
  connections: DthConnection[];
  onOpenAuth: () => void;
  onApplyPlanToBox: (plan: BrowsePlan, connection: DthConnection) => void;
  onAddNewConnectionAndApply: (
    plan: BrowsePlan,
    newConnData: { smartCardNumber: string; nickname: string; customerName?: string }
  ) => void;
}

const DEFAULT_FILTERS: PlanFilters = {
  operators: [],
  type: 'all',
  durations: [],
  priceRange: [100, Infinity],
  channelRange: [0, 500],
  genreTags: [],
  sortBy: 'recommended',
  searchQuery: '',
};

export const BrowsePlansView: React.FC<BrowsePlansViewProps> = ({
  currentTheme,
  currentLang,
  user,
  connections,
  onOpenAuth,
  onApplyPlanToBox,
  onAddNewConnectionAndApply,
}) => {
  const t = translations[currentLang];
  const isLight = currentTheme.isLightMode;

  // Plan catalog state: Starts empty to allow authentic loading state, synchronized live via Firestore onSnapshot
  const [allPlans, setAllPlans] = useState<BrowsePlan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PlanFilters>(DEFAULT_FILTERS);
  const priceMaximum = catalogPriceMaximum(allPlans);

  // Compare tool state
  const [selectedForCompare, setSelectedForCompare] = useState<BrowsePlan[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);

  // Apply Plan state
  const [selectedPlanForApply, setSelectedPlanForApply] = useState<BrowsePlan | null>(null);

  // Mobile sidebar toggle
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);

  const fetchLivePlans = () => {
    setIsLoading(true);
    setFetchError(null);

    PlanCatalogService.getAllPlans({ allowFallback: false })
      .then((items) => {
        setAllPlans((items || []).map(catalogItemToBrowsePlan));
        if (items && items.length > 0) {
          setAllPlans(items.map(catalogItemToBrowsePlan));
          setFetchError(null);
        } else {
          setFetchError(t.catalogLoadError);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load plan catalog:', err);
        setFetchError(err instanceof Error ? err.message : t.catalogLoadError);
        setIsLoading(false);
      });
  };

  const handleLoadOfflineCatalog = () => {
    const offline = PlanCatalogService.getOfflineSeedCatalog();
    setAllPlans(offline.map(catalogItemToBrowsePlan));
    setFetchError(null);
    setIsLoading(false);
  };

  // Subscribe to the same server catalog used by recharge and admin.
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const unsubscribe = PlanCatalogService.subscribeToPlans(
      (catalogItems) => {
        if (!isMounted) return;
        setAllPlans((catalogItems || []).map(catalogItemToBrowsePlan));
        if (catalogItems && catalogItems.length > 0) {
          const mapped = catalogItems.map(catalogItemToBrowsePlan);
          setAllPlans(mapped);
          setFetchError(null);
        }
        setIsLoading(false);
      },
      (err) => {
        if (!isMounted) return;
        console.error('Live plan subscription error:', err);
        setFetchError(err.message || t.catalogLoadError);
        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Filter & rank computation
  const displayedPlans = useMemo(() => {
    return filterAndSortPlans(allPlans, filters);
  }, [allPlans, filters]);

  const missingOperators = missingCatalogOperators(allPlans, filters.operators);
  const hasSelectedCatalog = filters.operators.some(operator => allPlans.some(plan => isSameDthOperatorGroup(plan.operator, operator)));

  // Compare handlers
  const handleToggleCompare = (plan: BrowsePlan) => {
    setSelectedForCompare((prev) => {
      const exists = prev.some((p) => p.id === plan.id);
      if (exists) {
        return prev.filter((p) => p.id !== plan.id);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, plan];
    });
  };

  const handleRemoveCompare = (planId: string) => {
    setSelectedForCompare((prev) => prev.filter((p) => p.id !== planId));
  };

  const handleClearCompare = () => {
    setSelectedForCompare([]);
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  return (
    <div className="plans-page">
      {/* Top Hero Banner */}
      <div
        className={`page-heading ${
          isLight ? 'bg-paper border-rule' : `${currentTheme.mainContainerBg} ${currentTheme.mainContainerBorder}`
        }`}
      >
        <div className="max-w-3xl space-y-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              {t.browsePacksTitle}
            </h1>
          </div>
          <p className={`text-sm leading-relaxed ${isLight ? 'text-ink-2' : 'text-muted'}`}>
            {t.browsePacksSubtitle}
          </p>
        </div>
      </div>

      {/* Control Bar: Search, Sort & Results Count */}
      <div
        className={`catalog-toolbar flex flex-wrap items-center justify-between gap-4 ${
          isLight ? 'bg-paper border-rule' : `${currentTheme.mainContainerBg} ${currentTheme.mainContainerBorder}`
        }`}
      >
        {/* Search input */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            aria-label={t.searchPacks}
            value={filters.searchQuery}
            onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
            placeholder={t.searchPacks}
            className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs border transition-colors ${
              isLight
                ? 'bg-paper-2 border-rule text-ink focus:bg-paper focus:border-rule-strong'
                : 'bg-scrim/30 border-rule-strong text-accent-ink focus:border-rule-strong'
            }`}
          />
        </div>

        {/* Sort & Mobile Filter Toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Sort Selector */}
          <div className="flex items-center gap-2 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted shrink-0" />
            <span className={`font-bold hidden sm:inline ${isLight ? 'text-ink' : 'text-muted'}`}>{t.sortBy}:</span>
            <select
              aria-label={t.sortBy}
              value={filters.sortBy}
              onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value as PlanFilters['sortBy'] }))}
              className={`py-2 px-3 rounded-xl text-xs font-medium border cursor-pointer ${
                isLight
                  ? 'bg-paper-2 border-rule text-ink'
                  : 'bg-paper border-rule-strong text-accent-ink'
              }`}
            >
              <option value="recommended">{t.sortRecommended}</option>
              <option value="price_asc">{t.sortPriceAsc}</option>
              <option value="price_desc">{t.sortPriceDesc}</option>
              <option value="price_per_channel_asc">{t.saveBadge}</option>
              <option value="savings_pct_desc">{t.sortSavingsDesc}</option>
              <option value="channels_desc">{t.sortChannelsDesc}</option>
            </select>
          </div>

          {/* Mobile Filter Drawer Button */}
          <button
            type="button"
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            aria-expanded={isMobileFilterOpen}
            aria-controls="catalog-mobile-filters"
            className={`xl:hidden py-2 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
              isLight ? 'bg-paper-2 border-rule text-ink' : 'bg-paper border-rule-strong text-accent-ink'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{t.filters}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Sidebar on Left, Cards on Right */}
      <div className="catalog-layout">
        {/* Desktop Filter Sidebar */}
        <div className="hidden xl:block catalog-filters">
          <PlanFilterSidebar
            priceMaximum={priceMaximum}
            filters={filters}
            onChange={(updated) => setFilters(updated)}
            onReset={handleResetFilters}
            currentTheme={currentTheme}
            currentLang={currentLang}
            totalResults={displayedPlans.length}
          />
        </div>

        {/* Mobile Filter Drawer */}
        {isMobileFilterOpen && (
          <div id="catalog-mobile-filters" className="xl:hidden col-span-1">
            <PlanFilterSidebar
              priceMaximum={priceMaximum}
              filters={filters}
              onChange={(updated) => setFilters(updated)}
              onReset={handleResetFilters}
              currentTheme={currentTheme}
              currentLang={currentLang}
              totalResults={displayedPlans.length}
            />
          </div>
        )}

        {/* Plans Grid Area */}
        <div className="catalog-results space-y-4">
          {/* Error State when no plans loaded */}
          {fetchError && allPlans.length === 0 ? (
            <div
              role="alert"
              className={`rounded-3xl border p-8 sm:p-12 text-center space-y-5 shadow-lg border-rule ${
                isLight ? 'bg-error-soft text-error' : 'bg-error-soft text-error'
              }`}
            >
              <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-error-soft text-error shadow-md">
                <AlertCircle className="w-8 h-8" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h3 className={`font-bold text-lg ${isLight ? 'text-error' : 'text-error'}`}>
                  {t.failedToLoadCatalog}
                </h3>
                <p className={`text-sm leading-relaxed ${isLight ? 'text-ink' : 'text-muted'}`}>
                  {localizeCustomerError(fetchError, currentLang)}
                </p>
                <p className={`text-sm font-medium ${isLight ? 'text-ink-2' : 'text-muted'}`}>
                  {t.checkConnectionOrRetry}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={fetchLivePlans}
                  className="py-2.5 px-5 rounded-xl text-xs font-bold text-accent-ink bg-error hover:bg-error shadow-md inline-flex items-center gap-2 transition-transform  active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{t.retryFetch}</span>
                </button>
                <button
                  type="button"
                  onClick={handleLoadOfflineCatalog}
                  className="py-2.5 px-4 rounded-xl text-xs font-medium border border-rule-strong  hover:bg-scrim/5  transition-colors"
                >
                  <span>{t.useOfflineCatalog}</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Error Banner with Retry (if plans were already loaded previously) */}
              {fetchError && (
                <div role="alert" className="p-4 rounded-2xl bg-error-soft border border-rule text-error  flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-error shrink-0" />
                    <span className="font-medium">{localizeCustomerError(fetchError, currentLang)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={fetchLivePlans}
                    className="px-3 py-1.5 rounded-lg bg-error hover:bg-error text-accent-ink font-bold text-xs flex items-center gap-1 shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{t.retryFetch}</span>
                  </button>
                </div>
              )}

              {!isLoading && missingOperators.map(operator => <OperatorCatalogNotice key={operator} operator={operator} currentLang={currentLang} />)}
              {/* Results count banner */}
              <div aria-live="polite" className="flex items-center justify-between text-xs px-1">
                <span className={`font-bold ${isLight ? 'text-ink' : 'text-muted'}`}>
                  {displayedPlans.length} {displayedPlans.length === 1 ? t.pack : t.packs}
                </span>

                {selectedForCompare.length > 0 && (
                  <span className="text-xs font-mono font-bold" style={{ color: currentTheme.primaryColor }}>
                    {selectedForCompare.length}/3 {t.comparePacks}
                  </span>
                )}
              </div>

              {/* Loading Skeleton State */}
              {isLoading ? (
                <div className="space-y-4">
                  <div className="p-3 rounded-2xl bg-warning-soft border border-rule text-warning  text-xs font-medium flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-warning shrink-0" />
                    <span>{t.loadingLiveCatalog}</span>
                  </div>
                  <div className="catalog-plans">
                    {[1, 2, 3, 4, 5, 6].map((idx) => (
                      <div
                        key={idx}
                        className={`p-6 rounded-3xl border animate-pulse space-y-4 ${
                          isLight ? 'bg-paper-2 border-rule' : 'bg-paper border-rule-strong'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="h-4 bg-paper-3  rounded w-24" />
                          <div className="h-4 bg-paper-3  rounded w-12" />
                        </div>
                        <div className="h-6 bg-paper-3  rounded w-3/4" />
                        <div className="h-16 bg-paper-3  rounded-2xl" />
                        <div className="h-8 bg-paper-3  rounded-xl" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : displayedPlans.length > 0 ? (
                /* Cards Grid */
                <div className="catalog-plans">
                  <CatalogColumnHeadings currentLang={currentLang} />
                  {displayedPlans.map((plan) => {
                    const isSelectedForCompare = selectedForCompare.some((p) => p.id === plan.id);
                    return (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        currentTheme={currentTheme}
                        currentLang={currentLang}
                        isSelectedForCompare={isSelectedForCompare}
                        onToggleCompare={handleToggleCompare}
                        canAddToCompare={selectedForCompare.length < 3}
                        onSelectPlan={(p) => setSelectedPlanForApply(p)}
                      />
                    );
                  })}
                </div>
              ) : missingOperators.length > 0 && !hasSelectedCatalog ? null : (
                /* Empty State */
                <div
                  className={`rounded-3xl border p-8 sm:p-12 text-center space-y-5 shadow-lg ${
                    isLight ? 'bg-paper border-rule' : `${currentTheme.mainContainerBg} ${currentTheme.mainContainerBorder}`
                  }`}
                >
                  <div
                    className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-accent-ink shadow-md"
                    style={{ backgroundColor: `color-mix(in oklab, ${currentTheme.primaryColor} 15%, transparent)`, color: currentTheme.primaryColor }}
                  >
                    <SlidersHorizontal className="w-8 h-8" />
                  </div>

                  <div className="space-y-1.5 max-w-md mx-auto">
                    <h3 className="font-bold text-lg">
                      {translations[currentLang].uiNoMatchingPacks}
                    </h3>
                    <p className="text-xs text-ink-2  leading-relaxed">
                      {translations[currentLang].uiTryAnotherSearchOrClearYourFilters}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="py-2.5 px-5 rounded-xl text-xs font-bold text-accent-ink shadow-md inline-flex items-center gap-2 transition-transform  active:scale-95"
                      style={{ backgroundColor: currentTheme.primaryColor }}
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>{currentLang === 'ta' ? t.resetFilters : translations[currentLang].uiClearFilters}</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Floating Comparison Drawer */}
      <CompareDrawer
        selectedPlans={selectedForCompare}
        onRemovePlan={handleRemoveCompare}
        onClearAll={handleClearCompare}
        onOpenCompareModal={() => setIsCompareModalOpen(true)}
        currentTheme={currentTheme}
        currentLang={currentLang}
      />

      {/* Comparison Full Modal */}
      <ComparisonTable
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        plans={selectedForCompare}
        onRemovePlan={handleRemoveCompare}
        onSelectPlan={(p) => {
          setIsCompareModalOpen(false);
          setSelectedPlanForApply(p);
        }}
        currentTheme={currentTheme}
        currentLang={currentLang}
      />

      {/* Apply Plan to Set-Top Box Modal */}
      <ApplyPlanModal
        isOpen={Boolean(selectedPlanForApply)}
        onClose={() => setSelectedPlanForApply(null)}
        plan={selectedPlanForApply}
        user={user}
        connections={connections}
        onOpenAuth={onOpenAuth}
        onApplyPlanToBox={(p, conn) => {
          setSelectedPlanForApply(null);
          onApplyPlanToBox(p, conn);
        }}
        onAddNewConnectionAndApply={(p, data) => {
          setSelectedPlanForApply(null);
          onAddNewConnectionAndApply(p, data);
        }}
        currentTheme={currentTheme}
        currentLang={currentLang}
      />
    </div>
  );
};
