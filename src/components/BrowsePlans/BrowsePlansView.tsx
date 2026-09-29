import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  SlidersHorizontal, 
  Tv, 
  Sparkles, 
  Filter, 
  ArrowUpDown, 
  Scale, 
  RotateCcw,
  Zap,
  Percent,
  Crown,
  ChevronDown,
  Info,
  Check
} from 'lucide-react';
import { BrowsePlan, DthConnection, DthOperatorId, Language, PlanFilters, UserProfile } from '../../types';
import { OperatorTheme } from '../../lib/theme';
import { INITIAL_BROWSE_PLANS, computePlanMetrics, filterAndSortPlans } from '../../lib/browsePlansData';
import { PlanFilterSidebar } from './PlanFilterSidebar';
import { PlanCard } from './PlanCard';
import { CompareDrawer } from './CompareDrawer';
import { ComparisonTable } from './ComparisonTable';
import { ApplyPlanModal } from './ApplyPlanModal';
import { db, isFirebaseLive } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

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
  priceRange: [150, 4000],
  channelRange: [50, 300],
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
  const isLight = currentTheme.isLightMode;

  // Plan catalog state: Starts with seeded master catalog, attempts Firestore /api/plans public fetch
  const [allPlans, setAllPlans] = useState<BrowsePlan[]>(INITIAL_BROWSE_PLANS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filters, setFilters] = useState<PlanFilters>(DEFAULT_FILTERS);

  // Compare tool state
  const [selectedForCompare, setSelectedForCompare] = useState<BrowsePlan[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);

  // Apply Plan state
  const [selectedPlanForApply, setSelectedPlanForApply] = useState<BrowsePlan | null>(null);

  // Mobile sidebar toggle
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);

  // Public anonymous catalog loading (Reads solely from plan_catalog collection or /api/plans)
  useEffect(() => {
    let isMounted = true;

    async function loadPublicCatalog() {
      setIsLoading(true);
      try {
        // 1. Try public Firestore plan_catalog read first if live
        if (isFirebaseLive && db) {
          try {
            const plansSnap = await getDocs(collection(db, 'plan_catalog'));
            if (!plansSnap.empty) {
              const loaded: BrowsePlan[] = [];
              plansSnap.forEach((doc) => {
                const data = doc.data();
                loaded.push({
                  id: doc.id,
                  operator: data.operator || 'sun_direct',
                  name: data.plan_name || data.name || 'DTH Pack',
                  tamilName: data.tamilName,
                  type: data.type || data.pack_type || 'HD',
                  duration_months: Number(data.duration_months) as any || 1,
                  price: Number(data.price || data.amount) || 299,
                  monthly_equivalent_rate: Number(data.monthly_equivalent_rate) || Math.round(Number(data.price || data.amount) / (Number(data.duration_months) || 1)),
                  channel_count: Number(data.channel_count || data.channel_list?.length) || 150,
                  hd_channel_count: Number(data.hd_channel_count) || (data.type === 'HD' ? 30 : 0),
                  channels: Array.isArray(data.channels) ? data.channels : (Array.isArray(data.channel_list) ? data.channel_list : []),
                  genre_tags: Array.isArray(data.genre_tags) ? data.genre_tags : ['tamil', 'entertainment'],
                  is_recommended: Boolean(data.is_recommended),
                  description: data.description,
                });
              });
              if (isMounted && loaded.length > 0) {
                setAllPlans(loaded);
                setIsLoading(false);
                return;
              }
            }
          } catch (fsErr) {
            console.warn('[BrowsePlansView] Public Firestore read fallback to API:', fsErr);
          }
        }

        // 2. Fallback to /api/plans endpoint
        const resp = await fetch('/api/plans', { headers: { 'Accept': 'application/json' } });
        if (resp.ok && resp.headers.get('content-type')?.includes('application/json')) {
          const json = await resp.json();
          if (json.success && Array.isArray(json.plans) && json.plans.length > 0) {
            if (isMounted) {
              setAllPlans(json.plans);
            }
          }
        }
      } catch (err) {
        console.warn('[BrowsePlansView] Using seeded public catalog:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadPublicCatalog();
    window.addEventListener('plan_catalog_updated', loadPublicCatalog);

    return () => {
      isMounted = false;
      window.removeEventListener('plan_catalog_updated', loadPublicCatalog);
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

  return (
    <div className="space-y-6 text-left pb-20">
      {/* Hero / Header Banner */}
      <div 
        className={`rounded-3xl border p-6 sm:p-8 relative overflow-hidden shadow-xl transition-colors duration-300 ${
          isLight 
            ? 'bg-gradient-to-br from-white via-gray-50 to-gray-100 border-gray-200' 
            : `${currentTheme.mainContainerBg} ${currentTheme.mainContainerBorder}`
        }`}
      >
        <div className="max-w-3xl space-y-3 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span 
              className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full text-white shadow-xs flex items-center gap-1.5"
              style={{ backgroundColor: currentTheme.primaryColor }}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Browse Plans</span>
            </span>
          </div>

          <h1 className={`text-2xl sm:text-4xl font-extrabold tracking-tight ${currentTheme.headingText}`}>
            {currentLang === 'ta' ? 'அனைத்து டிடிஎச் திட்டங்களை ஒப்பிடுங்கள்' : 'Discover & Compare Plans'}
          </h1>

          <p className="text-sm opacity-85 max-w-2xl leading-relaxed">
            Compare recharge packs across Sun Direct, Tata Play, Airtel, Dish TV, and D2H.
          </p>

          {/* Quick Operator Filter Chips */}
          <div className="pt-2 flex flex-wrap gap-2 items-center">
            <span className="text-xs font-bold opacity-80 mr-1">Operator:</span>
            {[
              { id: 'sun_direct', label: 'Sun Direct', color: '#F97316' },
              { id: 'tata_play', label: 'Tata Play', color: '#EC4899' },
              { id: 'airtel_dth', label: 'Airtel Digital TV', color: '#EF4444' },
              { id: 'dish_tv', label: 'Dish TV', color: '#EB5B26' },
              { id: 'd2h', label: 'D2H Videocon', color: '#8B5CF6' },
            ].map((op) => {
              const isSelected = filters.operators.includes(op.id as DthOperatorId);
              return (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setFilters((prev) => ({
                        ...prev,
                        operators: prev.operators.filter((id) => id !== op.id),
                      }));
                    } else {
                      setFilters((prev) => ({
                        ...prev,
                        operators: [...prev.operators, op.id as DthOperatorId],
                      }));
                    }
                  }}
                  className={`text-xs px-3 py-1.5 rounded-xl font-semibold border transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'text-white border-transparent shadow-sm'
                      : isLight
                      ? 'bg-white/80 border-gray-300 text-gray-700 hover:bg-gray-100'
                      : 'bg-white/5 border-white/15 text-gray-300 hover:bg-white/10'
                  }`}
                  style={{
                    backgroundColor: isSelected ? op.color : undefined,
                  }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: op.color }} />
                  <span>{op.label}</span>
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
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
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
            placeholder="Search plans or channels..."
            className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs border transition-colors ${
              isLight 
                ? 'bg-gray-50 border-gray-300 text-gray-900 focus:bg-white focus:border-black' 
                : 'bg-black/30 border-white/15 text-white focus:border-white/40'
            }`}
          />
        </div>

        {/* Sort & Mobile Filter Toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Sort Selector */}
          <div className="flex items-center gap-2 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 opacity-60 shrink-0" />
            <span className="font-bold opacity-70 hidden sm:inline">Sort by:</span>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value as any }))}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border cursor-pointer ${
                isLight 
                  ? 'bg-gray-50 border-gray-300 text-gray-900' 
                  : 'bg-white/10 border-white/15 text-white'
              }`}
            >
              <option value="recommended">Recommended</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="price_per_channel_asc">Best Value</option>
              <option value="savings_pct_desc">Highest Savings</option>
              <option value="channels_desc">Most Channels</option>
            </select>
          </div>

          {/* Mobile Filter Drawer Button */}
          <button
            type="button"
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className={`lg:hidden py-2 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
              isLight ? 'bg-gray-100 border-gray-300' : 'bg-white/10 border-white/20'
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
          {/* Results count banner */}
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-bold opacity-75">
              Showing {displayedPlans.length} {displayedPlans.length === 1 ? 'plan' : 'plans'}
            </span>

            {selectedForCompare.length > 0 && (
              <span className="text-[11px] font-mono font-bold" style={{ color: currentTheme.primaryColor }}>
                {selectedForCompare.length}/3 selected to compare
              </span>
            )}
          </div>

          {/* Cards Grid */}
          {displayedPlans.length > 0 ? (
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
            /* Enhanced Empty State with specific filter nudges */
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
                  {currentLang === 'ta' ? 'திட்டங்கள் எதுவும் கிடைக்கவில்லை' : 'No Matching DTH Plans Found'}
                </h3>
                <p className="text-xs opacity-75 leading-relaxed">
                  No plans matched your active filter criteria. Try expanding your price range, clearing specific filters, or resetting all options.
                </p>
              </div>

              {/* Active Filter Criteria Pills */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-lg mx-auto">
                <span className="text-xs font-bold opacity-80 mr-1">Active filters:</span>
                {filters.operators.length > 0 && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                    {filters.operators.map((o) => o.replace('_', ' ')).join(', ')}
                  </span>
                )}
                {filters.type !== 'all' && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                    {filters.type} Clarity
                  </span>
                )}
                {(filters.priceRange[0] > 150 || filters.priceRange[1] < 4000) && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 font-mono">
                    ₹{filters.priceRange[0]}–₹{filters.priceRange[1]}
                  </span>
                )}
                {filters.channelRange[0] > 50 && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-mono">
                    {filters.channelRange[0]}+ Channels
                  </span>
                )}
                {filters.durations.length > 0 && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                    {filters.durations.join(', ')} Mos
                  </span>
                )}
                {filters.genreTags.length > 0 && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    {filters.genreTags.join(', ')}
                  </span>
                )}
                {filters.searchQuery.trim() && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-pink-500/15 text-pink-600 dark:text-pink-400 border border-pink-500/30">
                    "{filters.searchQuery}"
                  </span>
                )}
              </div>

              {/* Quick Nudge Actions */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="py-2.5 px-5 rounded-xl text-xs font-bold text-white shadow-md inline-flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
                  style={{ backgroundColor: currentTheme.primaryColor }}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset All Filters</span>
                </button>

                {filters.operators.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilters((prev) => ({ ...prev, operators: [] }))}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors ${
                      isLight ? 'bg-gray-100 hover:bg-gray-200 border-gray-300' : 'bg-white/10 hover:bg-white/15 border-white/20'
                    }`}
                  >
                    Clear Operator Filter
                  </button>
                )}

                {filters.type !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setFilters((prev) => ({ ...prev, type: 'all' }))}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors ${
                      isLight ? 'bg-gray-100 hover:bg-gray-200 border-gray-300' : 'bg-white/10 hover:bg-white/15 border-white/20'
                    }`}
                  >
                    Show Both HD & SD
                  </button>
                )}

                {(filters.priceRange[0] > 150 || filters.priceRange[1] < 4000) && (
                  <button
                    type="button"
                    onClick={() => setFilters((prev) => ({ ...prev, priceRange: [150, 4000] }))}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors ${
                      isLight ? 'bg-gray-100 hover:bg-gray-200 border-gray-300' : 'bg-white/10 hover:bg-white/15 border-white/20'
                    }`}
                  >
                    Reset Price Range
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Compare Drawer (when 1-3 plans selected) */}
      <CompareDrawer
        selectedPlans={selectedForCompare}
        onRemovePlan={handleRemoveCompare}
        onClearAll={handleClearCompare}
        onOpenCompareModal={() => setIsCompareModalOpen(true)}
        currentTheme={currentTheme}
        currentLang={currentLang}
      />

      {/* Side-by-side comparison modal table */}
      <ComparisonTable
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        plans={selectedForCompare}
        onSelectPlan={(p) => {
          setIsCompareModalOpen(false);
          setSelectedPlanForApply(p);
        }}
        currentTheme={currentTheme}
        currentLang={currentLang}
        user={user}
        connections={connections}
        onOpenAuth={onOpenAuth}
      />

      {/* Apply Plan Modal (Hard constraints enforced: OTP login prompt only here, strict operator matching, handoff) */}
      <ApplyPlanModal
        isOpen={selectedPlanForApply !== null}
        onClose={() => setSelectedPlanForApply(null)}
        plan={selectedPlanForApply}
        user={user}
        connections={connections}
        onOpenAuth={onOpenAuth}
        onApplyPlanToBox={(plan, box) => {
          setSelectedPlanForApply(null);
          onApplyPlanToBox(plan, box);
        }}
        onAddNewConnectionAndApply={(plan, newConnData) => {
          setSelectedPlanForApply(null);
          onAddNewConnectionAndApply(plan, newConnData);
        }}
        currentTheme={currentTheme}
        currentLang={currentLang}
      />
    </div>
  );
};
