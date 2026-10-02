import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  SlidersHorizontal, 
  Tv, 
  ArrowUpDown, 
  RotateCcw,
  AlertCircle,
  RefreshCw,
  Check
} from 'lucide-react';
import { BrowsePlan, DthConnection, DthOperatorId, Language, PlanFilters, UserProfile } from '../../types';
import { OperatorTheme } from '../../lib/theme';
import { INITIAL_BROWSE_PLANS, computePlanMetrics, filterAndSortPlans, catalogItemToBrowsePlan } from '../../lib/browsePlansData';
import { PlanFilterSidebar } from './PlanFilterSidebar';
import { PlanCard } from './PlanCard';
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
  priceRange: [100, 5000],
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

  // Plan catalog state: Starts with seeded master catalog, synchronized live via Firestore onSnapshot
  const [allPlans, setAllPlans] = useState<BrowsePlan[]>(INITIAL_BROWSE_PLANS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PlanFilters>(DEFAULT_FILTERS);

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

    PlanCatalogService.getAllPlans()
      .then((items) => {
        if (items && items.length > 0) {
          setAllPlans(items.map(catalogItemToBrowsePlan));
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load plan catalog:', err);
        setFetchError(t.catalogLoadError);
        setIsLoading(false);
      });
  };

  // Authoritative live subscription to Firestore plan_catalog
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const unsubscribe = PlanCatalogService.subscribeToPlans((catalogItems) => {
      if (!isMounted) return;
      if (catalogItems && catalogItems.length > 0) {
        const mapped = catalogItems.map(catalogItemToBrowsePlan);
        setAllPlans(mapped);
        setFetchError(null);
      }
      setIsLoading(false);
    });

    const handleUpdateEvent = () => {
      fetchLivePlans();
    };

    window.addEventListener('plan_catalog_updated', handleUpdateEvent);

    return () => {
      isMounted = false;
      unsubscribe();
      window.removeEventListener('plan_catalog_updated', handleUpdateEvent);
    };
  }, []);

  // Filter & rank computation
  const displayedPlans = useMemo(() => {
    return filterAndSortPlans(allPlans, filters);
  }, [allPlans, filters]);

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

  // Fast Operator Pill toggles
  const handleToggleOperatorQuick = (opId: DthOperatorId) => {
    setFilters((prev) => {
      const exists = prev.operators.includes(opId);
      const newOps = exists
        ? prev.operators.filter((o) => o !== opId)
        : [...prev.operators, opId];
      return { ...prev, operators: newOps };
    });
  };

  const OPERATOR_PILLS: { id: DthOperatorId; label: string; color: string }[] = [
    { id: 'sun_direct', label: 'Sun Direct', color: '#F97316' },
    { id: 'tata_play', label: 'Tata Play', color: '#EC4899' },
    { id: 'airtel_dth', label: 'Airtel', color: '#EF4444' },
    { id: 'dish_tv', label: 'Dish TV', color: '#EB5B26' },
    { id: 'd2h', label: 'D2H', color: '#8B5CF6' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Hero Banner */}
      <div 
        className={`rounded-3xl border p-6 md:p-8 shadow-sm ${
          isLight ? 'bg-white border-gray-200' : `${currentTheme.mainContainerBg} ${currentTheme.mainContainerBorder}`
        }`}
      >
        <div className="max-w-3xl space-y-3">
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white shadow-sm"
              style={{ backgroundColor: currentTheme.primaryColor }}
            >
              <Tv className="w-4 h-4" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              {t.browsePacksTitle}
            </h1>
          </div>
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {t.browsePacksSubtitle}
          </p>

          {/* Quick Operator Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs font-bold text-gray-600 dark:text-gray-400 mr-1">
              {t.filterByOperator}:
            </span>
            {OPERATOR_PILLS.map((op) => {
              const isSelected = filters.operators.includes(op.id);
              return (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => handleToggleOperatorQuick(op.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-xs ${
                    isSelected
                      ? 'text-white border-transparent'
                      : isLight
                      ? 'bg-gray-50 border-gray-300 text-gray-800 hover:bg-gray-100'
                      : 'bg-white/10 border-white/20 text-gray-200 hover:bg-white/20'
                  }`}
                  style={{
                    backgroundColor: isSelected ? op.color : undefined,
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: op.color }} />
                  <span>{op.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Sort & Results Count */}
      <div 
        className={`rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm ${
          isLight ? 'bg-white border-gray-200' : `${currentTheme.mainContainerBg} ${currentTheme.mainContainerBorder}`
        }`}
      >
        {/* Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
            placeholder={t.searchPacks}
            className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs border transition-colors ${
              isLight 
                ? 'bg-gray-50 border-gray-300 text-gray-900 focus:bg-white focus:border-black' 
                : 'bg-black/30 border-white/20 text-white focus:border-white/40'
            }`}
          />
        </div>

        {/* Sort & Mobile Filter Toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Sort Selector */}
          <div className="flex items-center gap-2 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="font-bold text-gray-700 dark:text-gray-300 hidden sm:inline">{t.sortBy}:</span>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value as any }))}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border cursor-pointer ${
                isLight 
                  ? 'bg-gray-50 border-gray-300 text-gray-900' 
                  : 'bg-white/10 border-white/20 text-white'
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
            className={`lg:hidden py-2 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
              isLight ? 'bg-gray-100 border-gray-300 text-gray-900' : 'bg-white/10 border-white/20 text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Sidebar on Left, Cards on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Desktop Filter Sidebar */}
        <div className="hidden lg:block lg:col-span-1 sticky top-6">
          <PlanFilterSidebar
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
          <div className="lg:hidden col-span-1">
            <PlanFilterSidebar
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
        <div className="lg:col-span-3 space-y-4">
          {/* Error Banner with Retry */}
          {fetchError && (
            <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{fetchError}</span>
              </div>
              <button
                type="button"
                onClick={fetchLivePlans}
                className="px-3 py-1.5 rounded-lg bg-rose-500 text-white font-bold text-xs flex items-center gap-1 shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t.retryFetch}</span>
              </button>
            </div>
          )}

          {/* Results count banner */}
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-bold text-gray-700 dark:text-gray-300">
              {displayedPlans.length} {displayedPlans.length === 1 ? 'pack' : 'packs'}
            </span>

            {selectedForCompare.length > 0 && (
              <span className="text-xs font-mono font-bold" style={{ color: currentTheme.primaryColor }}>
                {selectedForCompare.length}/3 {t.comparePacks}
              </span>
            )}
          </div>

          {/* Loading Skeleton State */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div 
                  key={idx} 
                  className={`p-6 rounded-3xl border animate-pulse space-y-4 ${
                    isLight ? 'bg-gray-100 border-gray-200' : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="h-4 bg-gray-300 dark:bg-white/20 rounded w-24" />
                    <div className="h-4 bg-gray-300 dark:bg-white/20 rounded w-12" />
                  </div>
                  <div className="h-6 bg-gray-300 dark:bg-white/20 rounded w-3/4" />
                  <div className="h-16 bg-gray-300 dark:bg-white/20 rounded-2xl" />
                  <div className="h-8 bg-gray-300 dark:bg-white/20 rounded-xl" />
                </div>
              ))}
            </div>
          ) : displayedPlans.length > 0 ? (
            /* Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
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
          ) : (
            /* Empty State */
            <div 
              className={`rounded-3xl border p-8 sm:p-12 text-center space-y-5 shadow-lg ${
                isLight ? 'bg-white border-gray-200' : `${currentTheme.mainContainerBg} ${currentTheme.mainContainerBorder}`
              }`}
            >
              <div 
                className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white shadow-md"
                style={{ backgroundColor: `${currentTheme.primaryColor}25`, color: currentTheme.primaryColor }}
              >
                <SlidersHorizontal className="w-8 h-8" />
              </div>

              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="font-bold text-lg">
                  {t.noPlansMatch}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  Try expanding your price range, clearing specific filters, or resetting all options.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="py-2.5 px-5 rounded-xl text-xs font-bold text-white shadow-md inline-flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
                  style={{ backgroundColor: currentTheme.primaryColor }}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{t.resetFilters}</span>
                </button>
              </div>
            </div>
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
