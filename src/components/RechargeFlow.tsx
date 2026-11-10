import React, { useState, useEffect } from 'react';
import {
  Tv,
  CheckCircle2,
  AlertCircle,
  Zap,
  Sparkles,
  CreditCard,
  ShieldCheck,
  Crown,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  Coins,
  RefreshCw
} from '../lib/icons';
import {
  DthOperator,
  DthOperatorId,
  DthPlan,
  SubscriberDetails,
  Language,
  UserProfile,
  DthConnection,
  PlanCatalogItem,
  canonicalizeDthOperatorId,
  isSameDthOperatorGroup,
  resolveDishFamilyOperatorId,
} from '../types';
import { translations } from '../lib/translations';
import { PlanCatalogService } from '../lib/planCatalogService';
import { getOperatorTheme, OperatorTheme } from '../lib/theme';
import { PackCard } from './PackCard';
import { HeroIllustrativeGraphic, OperatorCardLogo } from './BrandAssets';

interface RechargeFlowProps {
  currentLang: Language;
  user: UserProfile | null;
  onInitiatePayment: (plan: DthPlan | { name: string; price: number; validityDays: number; pack_type?: string; duration_months?: number }, subscriber: SubscriberDetails | null, operator: DthOperator, smartCard: string, saveBox: boolean) => void;
  prefillConnection?: DthConnection | null;
  selectedOpId: DthOperatorId;
  onSelectOpId: (opId: DthOperatorId) => void;
  currentTheme: OperatorTheme;
}

export const RechargeFlow: React.FC<RechargeFlowProps> = ({
  currentLang,
  user,
  onInitiatePayment,
  prefillConnection,
  selectedOpId,
  onSelectOpId,
  currentTheme,
}) => {
  const t = translations[currentLang];

  const [operators, setOperators] = useState<DthOperator[]>([]);
  const [smartCardNumber, setSmartCardNumber] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Plan Catalog state with loading & error handling
  const [catalogPlans, setCatalogPlans] = useState<PlanCatalogItem[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState<boolean>(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [planTab, setPlanTab] = useState<'recommended' | 'change_plan'>('recommended');
  const [catalogTypeFilter, setCatalogTypeFilter] = useState<'all' | 'HD' | 'SD'>('all');
  const [catalogDurationFilter, setCatalogDurationFilter] = useState<'all' | 1 | 3 | 6 | 12>('all');
  const [collapsedBouquetTypes, setCollapsedBouquetTypes] = useState<Partial<Record<'HD' | 'SD', boolean>>>({});

  // Default view state: 6 Months default selection
  const [hdDuration, setHdDuration] = useState<1 | 3 | 6 | 12>(6);
  const [sdDuration, setSdDuration] = useState<1 | 3 | 6 | 12>(6);
  const [selectedPackType, setSelectedPackType] = useState<'HD' | 'SD' | 'CUSTOM'>('HD');

  // Change Plan tab state
  const [customSelectedPlan, setCustomSelectedPlan] = useState<PlanCatalogItem | null>(null);
  const [expandedPlanChannels, setExpandedPlanChannels] = useState<Record<string, boolean>>({});

  // Custom amount support
  const [customAmount, setCustomAmount] = useState('');
  const [saveConnection, setSaveConnection] = useState(true);

  const visibleOperators = operators
    .filter((operator) => operator.id !== 'd2h')
    .map((operator) => {
      if (operator.id !== 'dish_tv') return operator;

      const d2hOperator = operators.find((candidate) => candidate.id === 'd2h');
      return {
        ...operator,
        name: 'Dish TV & D2H',
        shortName: 'Dish TV & D2H',
        tamilName: 'டிஷ் டிவி & டி2எச்',
        cardName: 'Viewing Card / Customer ID',
        cardLengthDesc: 'Dish TV: 11 digits (015/025); D2H: 8–11 digits',
        cardPattern: '^(?:0(?:15|25)[0-9]{8}|[0-9]{8,11})$',
        isEnabled: [operator, d2hOperator].some((candidate) => candidate && candidate.isEnabled !== false),
        maintenanceMessage: [operator, d2hOperator].find((candidate) => candidate?.isEnabled !== false)?.maintenanceMessage,
      };
    });

  // Fetch operators from backend API & listen for admin status toggles
  useEffect(() => {
    const loadOps = () => {
      fetch('/api/operators')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.operators) {
            setOperators(data.operators);
          }
        })
        .catch((err) => console.error('Failed to load operators:', err));
    };

    loadOps();
    window.addEventListener('operators_updated', loadOps);
    return () => window.removeEventListener('operators_updated', loadOps);
  }, []);

  const fetchCatalog = () => {
    setIsCatalogLoading(true);
    setCatalogError(null);

    PlanCatalogService.getAllPlans({ allowFallback: false })
      .then((all) => {
        if (all && all.length > 0) {
          setCatalogPlans(all);
          setCatalogError(null);
        } else {
          setCatalogError(t.catalogLoadError);
        }
        setIsCatalogLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load plan catalog:', err);
        setCatalogError(err instanceof Error ? err.message : t.catalogLoadError);
        setIsCatalogLoading(false);
      });
  };

  const handleLoadOfflineCatalog = () => {
    const offline = PlanCatalogService.getOfflineSeedCatalog();
    setCatalogPlans(offline);
    setCatalogError(null);
    setIsCatalogLoading(false);
  };

  // Live subscription to PlanCatalogService
  useEffect(() => {
    let isMounted = true;
    setIsCatalogLoading(true);

    const unsubscribe = PlanCatalogService.subscribeToPlans(
      (items) => {
        if (!isMounted) return;
        if (items && items.length > 0) {
          setCatalogPlans(items);
          setCatalogError(null);
        }
        setIsCatalogLoading(false);
      },
      (err) => {
        if (!isMounted) return;
        console.error('Plan catalog subscription error:', err);
        setCatalogError(err.message || t.catalogLoadError);
        setIsCatalogLoading(false);
      }
    );

    const handleUpdate = () => fetchCatalog();
    window.addEventListener('plan_catalog_updated', handleUpdate);

    return () => {
      isMounted = false;
      unsubscribe();
      window.removeEventListener('plan_catalog_updated', handleUpdate);
    };
  }, []);

  // Handle prefill from saved connection
  useEffect(() => {
    if (prefillConnection) {
      onSelectOpId(canonicalizeDthOperatorId(prefillConnection.operator));
      setSmartCardNumber(prefillConnection.smartCardNumber);
    }
  }, [prefillConnection]);

  const currentOp = visibleOperators.find((o) => o.id === selectedOpId) || visibleOperators[0];

  const handleQuickCardFill = (sampleId: string) => {
    setSmartCardNumber(sampleId);
    setValidationError(null);
  };

  // Filtered catalog for customer's selected operator
  const operatorCatalog = catalogPlans.filter((p) => isSameDthOperatorGroup(p.operator, selectedOpId));
  const visibleBouquets = operatorCatalog
    .filter((plan) =>
      (catalogTypeFilter === 'all' || plan.pack_type === catalogTypeFilter) &&
      (catalogDurationFilter === 'all' || plan.duration_months === catalogDurationFilter)
    )
    .sort((left, right) =>
      left.pack_type.localeCompare(right.pack_type) ||
      left.duration_months - right.duration_months ||
      left.plan_name.localeCompare(right.plan_name)
    );

  // Recommended Plans for selected operator from catalog
  const recHDPlan = PlanCatalogService.getRecommendedPlan(catalogPlans, selectedOpId, 'HD', hdDuration) ||
    operatorCatalog.find((p) => p.pack_type === 'HD' && p.duration_months === hdDuration);

  const recSDPlan = PlanCatalogService.getRecommendedPlan(catalogPlans, selectedOpId, 'SD', sdDuration) ||
    operatorCatalog.find((p) => p.pack_type === 'SD' && p.duration_months === sdDuration);
  const hasDurationPlan = (type: 'HD' | 'SD', duration: 1 | 3 | 6 | 12) =>
    operatorCatalog.some((plan) => plan.pack_type === type && plan.duration_months === duration);
  const hasHDOptions = ([1, 3, 6, 12] as const).some((duration) => hasDurationPlan('HD', duration));
  const hasSDOptions = ([1, 3, 6, 12] as const).some((duration) => hasDurationPlan('SD', duration));
  const chooseDurationLabel = currentLang === 'ta' ? 'கிடைக்கும் காலத்தைத் தேர்ந்தெடுக்கவும்' : 'Choose an available duration';

  // Active chosen plan calculation
  const activePlan = planTab === 'recommended'
    ? (selectedPackType === 'HD' ? (recHDPlan || null) : selectedPackType === 'SD' ? (recSDPlan || null) : null)
    : (customSelectedPlan && isSameDthOperatorGroup(customSelectedPlan.operator, selectedOpId)
      ? customSelectedPlan
      : recHDPlan || null);

  const payablePrice = selectedPackType === 'CUSTOM'
    ? (Number(customAmount) || 0)
    : (activePlan?.amount ?? 0);
  const canProceed = selectedPackType === 'CUSTOM' || activePlan !== null;

  const handlePayClick = () => {
    if (!currentOp) return;
    const cleanCard = smartCardNumber.trim().replace(/\s+/g, '');
    if (!cleanCard) {
      setValidationError(currentLang === 'ta' ? 'ஸ்மார்ட் கார்டு எண்ணை உள்ளிடவும்' : 'Please enter your Smart Card or Subscriber ID');
      return;
    }
    if (selectedPackType !== 'CUSTOM' && !activePlan) {
      setValidationError(
        currentLang === 'ta'
          ? 'இந்த இயக்குநருக்கான திட்டம் இல்லை. விருப்பத் தொகை ரீசார்ஜைத் தேர்ந்தெடுக்கவும்.'
          : 'No catalog pack is available for this operator. Choose a custom top-up instead.'
      );
      return;
    }

    const providerId = selectedOpId === 'dish_tv'
      ? resolveDishFamilyOperatorId(cleanCard)
      : selectedOpId;
    const provider = operators.find((operator) => operator.id === providerId) || (
      selectedOpId === 'dish_tv'
        ? { ...currentOp, id: providerId, name: providerId === 'dish_tv' ? 'Dish TV' : 'D2H' }
        : currentOp
    );
    if (provider.isEnabled === false) {
      setValidationError(
        provider.maintenanceMessage ||
        `${provider.name} is temporarily offline for maintenance. Expected restoration shortly.`
      );
      return;
    }

    if (selectedPackType === 'CUSTOM') {
      const amountNum = Number(customAmount);
      if (!amountNum || amountNum < 10) {
        setValidationError(currentLang === 'ta' ? 'குறைந்தபட்ச தொகை ₹10 உள்ளிடவும்' : 'Please enter a valid amount of at least ₹10');
        return;
      }
      onInitiatePayment(
        {
          name: `${provider.name} Custom Top-Up ₹${amountNum}`,
          price: amountNum,
          validityDays: 30,
        },
        null,
        provider,
        cleanCard,
        saveConnection
      );
    } else if (activePlan) {
      onInitiatePayment(
        {
          id: activePlan.id,
          name: `${provider.name} ${activePlan.plan_name} (${activePlan.duration_months}M)`,
          price: activePlan.amount,
          validityDays: activePlan.duration_months * 30,
          pack_type: activePlan.pack_type,
          duration_months: activePlan.duration_months,
          operatorId: activePlan.operator,
          category: 'tamil_base',
          tamilName: activePlan.plan_name,
          channelsCount: activePlan.channel_list.length,
          hdChannelsCount: activePlan.pack_type === 'HD' ? 25 : 0,
          description: `${activePlan.pack_type} pack for ${activePlan.duration_months} Month(s)`,
          tamilChannelsHighlight: activePlan.channel_list.slice(0, 5),
        } as any,
        null,
        provider,
        cleanCard,
        saveConnection
      );
    }
  };

  const toggleChannelExpand = (planId: string) => {
    setExpandedPlanChannels((prev) => ({
      ...prev,
      [planId]: !prev[planId],
    }));
  };

  const isLight = currentTheme.isLightMode;

  return (
    <div className="recharge-page">
      {/* Hero Welcome & Quick Stats */}
      <div
        className={`page-heading recharge-heading`}
      >
        <div className="relative z-10 max-w-3xl space-y-3.5">
          <h1 className={`text-2xl font-bold tracking-tight leading-tight ${currentTheme.fontHeadingClass} ${currentTheme.heroTitleColor}`}>
            {currentLang === 'ta' ? (
              <>
                அனைத்து <span className={currentTheme.heroTitleHighlight}>டிடிஎச் ரீசார்ஜ்</span> தளம்
              </>
            ) : (
              <>
                Recharge your DTH connection
              </>
            )}
          </h1>

          <p className={`text-sm sm:text-base font-normal leading-relaxed max-w-2xl ${currentTheme.heroSubtitleColor}`}>
            {currentLang === 'ta'
              ? 'சன் டைரக்ட், டாடா பிளே, ஏர்டெல், டிஷ் டிவி, டி2எச் உள்ளிட்ட அனைத்து இணைப்புகளுக்கும் விரைவான, பாதுகாப்பான ரீசார்ஜ்.'
              : 'Recharge any DTH connection — Sun Direct, Tata Play, Airtel DTH, Dish TV, D2H — instantly, securely, with zero hidden fees.'}
          </p>

          <div className="recharge-assurances">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${currentTheme.heroBadgeItemBg} ${currentTheme.heroBadgeItemText} ${currentTheme.heroBadgeItemBorder}`}>
              <Zap className="w-4 h-4 text-warning" />
              <span className="font-medium">{currentLang === 'ta' ? 'விரைவு பரிவர்த்தனை' : 'Instant Activation'}</span>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${currentTheme.heroBadgeItemBg} ${currentTheme.heroBadgeItemText} ${currentTheme.heroBadgeItemBorder}`}>
              <ShieldCheck className="w-4 h-4 text-success" />
              <span className="font-medium">{currentLang === 'ta' ? 'பாதுகாப்பான கட்டணம்' : 'Secure Encryption'}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Illustrator Graphic per Operator */}
        <div className="recharge-product" data-operator={selectedOpId}>
          <HeroIllustrativeGraphic theme={currentTheme} />
        </div>
      </div>

      {/* Main Recharge Form Box */}
      <div className={`recharge-workbench`}>

        {/* Step 1: Select Operator */}
        <section className="recharge-operator">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h2 className={`text-base font-bold flex items-center gap-2 ${currentTheme.headingText}`}>
              <span
                className="recharge-step-number"
              >
                1
              </span>
              <span>{t.selectOperator.replace(/^\d+\.\s*/, '')}</span>
            </h2>
          </div>

          <div className="operator-options">
            {visibleOperators.map((op) => {
              const isSelected = op.id === selectedOpId;
              const opTheme = getOperatorTheme(op.id);

              return (
                <button
                  key={op.id}
                  id={`operator-${op.id}-btn`}
                  type="button"
                  onClick={() => {
                    onSelectOpId(op.id);
                    setValidationError(null);
                  }}
                  className={`p-3.5 sm:p-4 rounded-2xl border text-center transition-colors relative overflow-hidden group flex flex-col items-center justify-center gap-2 ${
                    isSelected
                      ? `${opTheme.cardActiveBg} ${opTheme.cardActiveBorder} ${opTheme.cardActiveRing} shadow-lg ring-2`
                      : `${currentTheme.cardInactiveBg} ${currentTheme.cardInactiveBorder} ${currentTheme.cardInactiveHoverBorder}`
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5">
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" style={{ color: opTheme.primaryColor }} />
                    </div>
                  )}

                  {op.isEnabled === false && (
                    <div className="absolute top-2 left-2 z-10">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-error text-accent-ink shadow-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Offline
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-center w-full">
                    <OperatorCardLogo operatorId={op.id} />
                  </div>

                  <div className="w-full text-center">
                    <p className={`font-bold text-sm sm:text-base leading-snug text-center transition-colors ${isSelected ? opTheme.cardActiveText : currentTheme.cardInactiveText}`}>
                      {op.name}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Operator Offline Maintenance Notice Banner */}
        {currentOp && currentOp.isEnabled === false && (
          <div className="p-4 rounded-2xl border bg-error-soft border-rule text-error  flex items-start gap-3.5   duration-200">
            <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm">{currentOp.name} is Temporarily Unavailable</span>
                <span className="text-xs font-bold   px-2 py-0.5 rounded bg-error-soft text-error  border border-rule">
                  Maintenance
                </span>
              </div>
              <p className="text-xs leading-relaxed text-error ">
                {currentOp.maintenanceMessage || t.operatorDisabledAlert}
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Enter Smart Card / Customer ID */}
        {currentOp && (
          <div className={`recharge-subscriber`}>
            <div className="flex flex-col items-start gap-2">
              <h2 className={`text-base font-bold flex items-center gap-2 ${currentTheme.headingText}`}>
                <span
                className="recharge-step-number"
                >
                  2
                </span>
                <span>{t.enterCardNumber.replace(/^\d+\.\s*/, '')}</span>
              </h2>
              <span className={`text-xs font-medium sm:text-right ${currentTheme.subText}`}>
                {currentOp.cardName} ({currentOp.cardLengthDesc})
              </span>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <input
                  id="smart-card-input"
                  type="text"
                  value={smartCardNumber}
                  onChange={(e) => {
                    setSmartCardNumber(e.target.value.replace(/[^0-9]/g, ''));
                    setValidationError(null);
                  }}
                  placeholder={`e.g. ${currentOp.sampleId || currentOp.sampleSmartCard || ''}`}
                  aria-label={`${currentOp.name} ${currentOp.cardName}`}
                  className={`w-full ${currentTheme.inputBg} ${currentTheme.inputBorder} ${currentTheme.inputFocusBorder} ${currentTheme.inputText} ${currentTheme.inputPlaceholder} ${currentTheme.inputStyleClass} font-mono text-base focus:outline-none transition-colors`}
                />
              </div>

              {/* Helper quick fill */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                <span className={`flex items-center gap-1.5 ${currentTheme.subText}`}>
                  <Info className="w-3.5 h-3.5" style={{ color: currentTheme.primaryColor }} />
                  <span>{t.sampleCard}</span>
                  <button
                    type="button"
                    onClick={() => handleQuickCardFill(currentOp.sampleId || currentOp.sampleSmartCard || '')}
                    className="hover:underline font-mono font-bold"
                    style={{ color: currentTheme.primaryColor }}
                  >
                    {currentOp.sampleId || currentOp.sampleSmartCard}
                  </button>
                </span>
              </div>

              {validationError && (
                <div className="p-3 rounded-xl bg-error-soft border border-rule text-error  text-xs flex items-center gap-2  ">
                  <AlertCircle className="w-4 h-4 shrink-0 text-error" />
                  <span className="font-medium">{validationError}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Select Plan or Enter Amount */}
        <div className={`recharge-plans`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className={`text-base font-bold flex items-center gap-2 ${currentTheme.headingText}`}>
              <span
                className="recharge-step-number"
              >
                3
              </span>
              <span>{t.selectPlan.replace(/^\d+\.\s*/, '')}</span>
            </h2>

            {/* Tab switch */}
            <div className={`inline-flex p-1 rounded-xl border self-start sm:self-auto ${currentTheme.durationPillContainerBg}`}>
              <button
                type="button"
                id="recommended-packs-tab"
                onClick={() => setPlanTab('recommended')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  planTab === 'recommended'
                    ? `${currentTheme.durationPillActive} shadow-sm`
                    : `${currentTheme.durationPillInactive}`
                }`}
              >
                {t.recommendedPacks}
              </button>
              <button
                type="button"
                id="change-plan-tab"
                onClick={() => {
                  setPlanTab('change_plan');
                  if (selectedPackType === 'CUSTOM') setSelectedPackType('HD');
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  planTab === 'change_plan'
                    ? `${currentTheme.durationPillActive} shadow-sm`
                    : `${currentTheme.durationPillInactive}`
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{t.changePacks} ({operatorCatalog.length})</span>
              </button>
            </div>
          </div>

          {/* Catalog Fetch Error Banner */}
          {catalogError && (
            <div role="alert" className="p-4 rounded-2xl bg-error-soft border border-rule text-error flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-error shrink-0" />
                <span className="font-medium">{catalogError}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchCatalog}
                  className="px-3 py-1.5 rounded-lg bg-error text-accent-ink font-bold text-xs flex items-center gap-1 shrink-0 hover:bg-error transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t.retryFetch}</span>
                </button>
                {catalogPlans.length === 0 && (
                  <button
                    type="button"
                    onClick={handleLoadOfflineCatalog}
                    className="px-3 py-1.5 rounded-lg border border-rule-strong text-accent-ink text-xs font-medium hover:bg-paper transition-colors"
                  >
                    <span>{t.useOfflineCatalog}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {!isCatalogLoading && !catalogError && operatorCatalog.length === 0 && (
            <div
              role="status"
              className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs ${currentTheme.inputBg} ${currentTheme.inputBorder} ${currentTheme.subText}`}
            >
              <span>
                {currentLang === 'ta'
                  ? `${currentOp?.name || 'இந்த இயக்குநர்'}-க்கான திட்டங்கள் தற்போது இல்லை.`
                  : `No catalog packs are currently available for ${currentOp?.name || 'this operator'}.`}
              </span>
              <button
                type="button"
                onClick={() => setSelectedPackType('CUSTOM')}
                className="px-3 py-1.5 rounded-lg font-bold text-xs"
                style={{ backgroundColor: currentTheme.packFlexibleBandBg, color: currentTheme.packFlexibleBandText }}
              >
                {currentLang === 'ta' ? 'விருப்பத் தொகை ரீசார்ஜ்' : 'Choose custom top-up'}
              </button>
            </div>
          )}

          {/* Loading Skeleton */}
          {isCatalogLoading ? (
            <div className="recharge-pack-options">
              {[1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`p-6 rounded-3xl border animate-pulse space-y-4 ${
                    isLight ? 'bg-paper-2 border-rule' : 'bg-paper border-rule-strong'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="h-4 bg-paper-3  rounded w-28" />
                    <div className="h-4 bg-paper-3  rounded w-12" />
                  </div>
                  <div className="h-6 bg-paper-3  rounded w-3/4" />
                  <div className="h-16 bg-paper-3  rounded-2xl" />
                  <div className="h-9 bg-paper-3  rounded-xl" />
                </div>
              ))}
            </div>
          ) : planTab === 'recommended' ? (
            /* VIEW 1: RECOMMENDED 3-CARD BALANCED GRID */
            <div className="space-y-4">
              <div className="recharge-pack-options">

                {/* 1. RECOMMENDED HD PACK CARD */}
                <PackCard
                  id="recommended-hd-card"
                  type="HD"
                  operatorTheme={currentTheme}
                  isSelected={Boolean(recHDPlan) && selectedPackType === 'HD'}
                  isUnavailable={!hasHDOptions}
                  onClick={() => {
                    if (!recHDPlan) return;
                    setSelectedPackType('HD');
                    setCustomAmount('');
                  }}
                >
                  <div>
                    {/* Card Title */}
                    <div className="space-y-1 mb-3">
                      <h3 className={`text-xl sm:text-2xl font-bold flex items-center gap-2 ${selectedPackType === 'HD' ? currentTheme.cardActiveText : currentTheme.cardInactiveText}`}>
                        <span>
                          {recHDPlan?.plan_name || (hasHDOptions ? chooseDurationLabel :
                            (currentLang === 'ta' ? 'எச்டி பேக் கிடைக்கவில்லை' : 'HD pack unavailable'))}
                        </span>
                      </h3>
                    </div>

                    {/* Duration Toggle */}
                    <div className="my-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                      <div
                        className="duration-selector"
                        role="group"
                        aria-label="Select HD duration"
                      >
                        {([1, 3, 6, 12] as const).map((dur) => (
                          <button
                            key={dur}
                            type="button"
                            disabled={!hasDurationPlan('HD', dur)}
                            aria-pressed={hdDuration === dur && hasDurationPlan('HD', dur)}
                            title={hasDurationPlan('HD', dur) ? `${dur} ${dur === 1 ? t.month : t.months}` : `${dur} ${t.months}: ${currentLang === 'ta' ? t.noPlansMatch : 'Unavailable'}`}
                            onClick={() => {
                              if (!hasDurationPlan('HD', dur)) return;
                              setHdDuration(dur);
                              setSelectedPackType('HD');
                              setCustomAmount('');
                            }}
                            className={`py-1.5 px-1 text-xs font-bold rounded-lg transition-colors ${
                              !hasDurationPlan('HD', dur)
                                ? 'opacity-45 cursor-not-allowed'
                                : hdDuration === dur
                                ? `${currentTheme.durationPillActive} shadow-md`
                                : `${currentTheme.durationPillInactive}`
                            }`}
                          >
                            <span className="duration-value">{dur}</span>
                            <span className="duration-unit">{dur === 1 ? t.month : t.months}</span>
                            <CheckCircle2 className="duration-tick w-3 h-3" aria-hidden="true" />
                          </button>
                        ))}
                      </div>
                      <div className={`px-2.5 py-1.5 rounded-xl border text-xs flex items-center justify-between ${currentTheme.inputBg} ${currentTheme.inputBorder}`}>
                        <span className={`font-medium ${currentTheme.subText}`}>
                          {recHDPlan ? `${hdDuration * 30} ${t.days} ${t.validity}` : (currentLang === 'ta' ? 'இந்த காலத்திற்கு திட்டம் இல்லை' : `No ${hdDuration}-month plan available`)}
                        </span>
                        <span className={`text-xs font-bold ${currentTheme.mutedText}`}>
                          {recHDPlan
                            ? (recHDPlan.hd_channel_count || recHDPlan.channel_list.length) > 0
                              ? `${recHDPlan.hd_channel_count || recHDPlan.channel_list.length} ${t.hdChannels}`
                              : ''
                            : hasHDOptions ? '' : (currentLang === 'ta' ? 'கிடைக்கவில்லை' : 'Unavailable')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Price and Dynamic Savings */}
                  <div>
                    <div className={`pt-3 border-t ${currentTheme.surfaceBorder} flex items-center justify-between`}>
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight"
                            style={{ color: currentTheme.packHdBandBg }}
                          >
                            {recHDPlan ? `₹${recHDPlan.amount}` : '—'}
                          </span>
                          {recHDPlan && (
                            <span className={`text-xs font-medium ${currentTheme.subText}`}>
                              / {hdDuration}M
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Monthly equivalent */}
                      <div className="text-right">
                        {recHDPlan && (
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-md border ${currentTheme.savingsBadgeBg} ${currentTheme.savingsBadgeText} ${currentTheme.savingsBadgeBorder}`}>
                            <span>
                              ₹{new Intl.NumberFormat(currentLang === 'ta' ? 'ta-IN' : 'en-IN')
                                .format(Math.ceil(recHDPlan.amount / hdDuration))} {t.perMonth}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Select Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!recHDPlan) {
                          document.querySelector<HTMLButtonElement>('#recommended-hd-card .duration-selector button:not(:disabled)')?.focus();
                          return;
                        }
                        setSelectedPackType('HD');
                        setCustomAmount('');
                      }}
                      disabled={!hasHDOptions}
                      aria-pressed={Boolean(recHDPlan) && selectedPackType === 'HD'}
                      className="mt-3 w-full py-2.5 rounded-xl font-bold text-sm transition-colors shadow-md flex items-center justify-center"
                      style={{
                        backgroundColor: currentTheme.packHdBandBg,
                        color: currentTheme.packHdBandText,
                      }}
                    >
                      <span>
                        {recHDPlan
                          ? (selectedPackType === 'HD' ? 'Selected' : t.selectThisPack)
                          : hasHDOptions ? chooseDurationLabel : (currentLang === 'ta' ? 'கிடைக்கவில்லை' : 'Unavailable')}
                      </span>
                    </button>
                  </div>
                </PackCard>

                {/* 2. RECOMMENDED SD PACK CARD */}
                <PackCard
                  id="recommended-sd-card"
                  type="SD"
                  operatorTheme={currentTheme}
                  isSelected={Boolean(recSDPlan) && selectedPackType === 'SD'}
                  isUnavailable={!hasSDOptions}
                  onClick={() => {
                    if (!recSDPlan) return;
                    setSelectedPackType('SD');
                    setCustomAmount('');
                  }}
                >
                  <div>
                    {/* Card Title */}
                    <div className="space-y-1 mb-3">
                      <h3 className={`text-xl sm:text-2xl font-bold flex items-center gap-2 ${selectedPackType === 'SD' ? currentTheme.cardActiveText : currentTheme.cardInactiveText}`}>
                        <span>
                          {recSDPlan?.plan_name || (hasSDOptions ? chooseDurationLabel :
                            (currentLang === 'ta' ? 'எஸ்டி பேக் கிடைக்கவில்லை' : 'SD pack unavailable'))}
                        </span>
                      </h3>
                    </div>

                    {/* Duration Toggle */}
                    <div className="my-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                      <div
                        className="duration-selector"
                        role="group"
                        aria-label="Select SD duration"
                      >
                        {([1, 3, 6, 12] as const).map((dur) => (
                          <button
                            key={dur}
                            type="button"
                            disabled={!hasDurationPlan('SD', dur)}
                            aria-pressed={sdDuration === dur && hasDurationPlan('SD', dur)}
                            title={hasDurationPlan('SD', dur) ? `${dur} ${dur === 1 ? t.month : t.months}` : `${dur} ${t.months}: ${currentLang === 'ta' ? t.noPlansMatch : 'Unavailable'}`}
                            onClick={() => {
                              if (!hasDurationPlan('SD', dur)) return;
                              setSdDuration(dur);
                              setSelectedPackType('SD');
                              setCustomAmount('');
                            }}
                            className={`py-1.5 px-1 text-xs font-bold rounded-lg transition-colors ${
                              !hasDurationPlan('SD', dur)
                                ? 'opacity-45 cursor-not-allowed'
                                : sdDuration === dur
                                ? 'text-accent-ink shadow-md'
                                : `${currentTheme.durationPillInactive}`
                            }`}
                            style={{
                              backgroundColor: sdDuration === dur ? currentTheme.packSdBandBg : undefined,
                            }}
                          >
                            <span className="duration-value">{dur}</span>
                            <span className="duration-unit">{dur === 1 ? t.month : t.months}</span>
                            <CheckCircle2 className="duration-tick w-3 h-3" aria-hidden="true" />
                          </button>
                        ))}
                      </div>
                      <div className={`px-2.5 py-1.5 rounded-xl border text-xs flex items-center justify-between ${currentTheme.inputBg} ${currentTheme.inputBorder}`}>
                        <span className={`font-medium ${currentTheme.subText}`}>
                          {recSDPlan ? `${sdDuration * 30} ${t.days} ${t.validity}` : (currentLang === 'ta' ? 'இந்த காலத்திற்கு திட்டம் இல்லை' : `No ${sdDuration}-month plan available`)}
                        </span>
                        <span className={`text-xs font-bold ${currentTheme.mutedText}`}>
                          {recSDPlan
                            ? recSDPlan.channel_list.length > 0 ? `${recSDPlan.channel_list.length} ${t.channels}` : ''
                            : hasSDOptions ? '' : (currentLang === 'ta' ? 'கிடைக்கவில்லை' : 'Unavailable')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Price and Dynamic Savings */}
                  <div>
                    <div className={`pt-3 border-t ${currentTheme.surfaceBorder} flex items-center justify-between`}>
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight"
                            style={{ color: currentTheme.packSdBandBg }}
                          >
                            {recSDPlan ? `₹${recSDPlan.amount}` : '—'}
                          </span>
                          {recSDPlan && (
                            <span className={`text-xs font-medium ${currentTheme.subText}`}>
                              / {sdDuration}M
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Monthly equivalent */}
                      <div className="text-right">
                        {recSDPlan && (
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-md border ${currentTheme.savingsBadgeBg} ${currentTheme.savingsBadgeText} ${currentTheme.savingsBadgeBorder}`}>
                            <span>
                              ₹{new Intl.NumberFormat(currentLang === 'ta' ? 'ta-IN' : 'en-IN')
                                .format(Math.ceil(recSDPlan.amount / sdDuration))} {t.perMonth}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Select Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!recSDPlan) {
                          document.querySelector<HTMLButtonElement>('#recommended-sd-card .duration-selector button:not(:disabled)')?.focus();
                          return;
                        }
                        setSelectedPackType('SD');
                        setCustomAmount('');
                      }}
                      disabled={!hasSDOptions}
                      aria-pressed={Boolean(recSDPlan) && selectedPackType === 'SD'}
                      className="mt-3 w-full py-2.5 rounded-xl font-bold text-sm transition-colors shadow-md flex items-center justify-center"
                      style={{
                        backgroundColor: currentTheme.packSdBandBg,
                        color: currentTheme.packSdBandText,
                      }}
                    >
                      <span>
                        {recSDPlan
                          ? (selectedPackType === 'SD' ? 'Selected' : t.selectThisPack)
                          : hasSDOptions ? chooseDurationLabel : (currentLang === 'ta' ? 'கிடைக்கவில்லை' : 'Unavailable')}
                      </span>
                    </button>
                  </div>
                </PackCard>

                {/* 3. FLEXIBLE TOP-UP CARD */}
                <PackCard
                  id="custom-recharge-card"
                  type="FLEXIBLE"
                  operatorTheme={currentTheme}
                  isSelected={selectedPackType === 'CUSTOM'}
                  onClick={() => {
                    setSelectedPackType('CUSTOM');
                  }}
                >
                  <div>
                    {/* Card Title & Description */}
                    <div className="space-y-1 mb-3">
                      <h3 className={`text-xl sm:text-2xl font-bold flex items-center gap-2 ${selectedPackType === 'CUSTOM' ? currentTheme.cardActiveText : currentTheme.cardInactiveText}`}>
                        <span>{t.customPack}</span>
                      </h3>
                      <p className={`text-xs sm:text-sm font-medium ${currentTheme.subText}`}>
                        {currentLang === 'ta' ? 'விருப்பத் தொகைக்கான நேரடி வாலட் ரீசார்ஜ்.' : 'Direct balance credit for any custom amount.'}
                      </p>
                    </div>

                    {/* Custom Amount Input & Quick Pills */}
                    <div className="my-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <span className="absolute left-3.5 top-2.5 font-bold text-base" style={{ color: currentTheme.packFlexibleBandBg }}>₹</span>
                        <input
                          id="custom-amount-input"
                          type="number"
                          min={10}
                          max={20000}
                          placeholder={t.enterAmount}
                          aria-label="Recharge amount"
                          value={customAmount}
                          onChange={(e) => {
                            setCustomAmount(e.target.value);
                            setSelectedPackType('CUSTOM');
                          }}
                          onFocus={() => setSelectedPackType('CUSTOM')}
                          className={`w-full ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputPlaceholder} rounded-xl pl-9 pr-3 py-2 font-mono text-base font-bold border-2 focus:outline-none transition-colors shadow-inner`}
                          style={{
                            borderColor: selectedPackType === 'CUSTOM' ? currentTheme.packFlexibleBandBg : undefined,
                          }}
                        />
                      </div>

                      {/* Quick select pills */}
                      <div className="grid grid-cols-5 gap-1.5" aria-label="Quick amount choices">
                        {[100, 200, 350, 500, 1000].map((quick) => (
                          <button
                            key={quick}
                            type="button"
                            aria-pressed={customAmount === String(quick) && selectedPackType === 'CUSTOM'}
                            onClick={() => {
                              setCustomAmount(String(quick));
                              setSelectedPackType('CUSTOM');
                            }}
                            className={`py-1.5 px-1 rounded-lg text-xs font-mono font-bold transition-colors border ${
                              customAmount === String(quick) && selectedPackType === 'CUSTOM'
                                ? 'text-accent-ink shadow-sm font-bold'
                                : `${currentTheme.durationPillInactive} ${currentTheme.inputBorder}`
                            }`}
                            style={{
                              backgroundColor: customAmount === String(quick) && selectedPackType === 'CUSTOM' ? currentTheme.packFlexibleBandBg : undefined,
                              borderColor: customAmount === String(quick) && selectedPackType === 'CUSTOM' ? currentTheme.packFlexibleBandBg : undefined,
                            }}
                          >
                            ₹{quick}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Summary & Direct Action Button */}
                  <div>
                    <div className={`pt-3 border-t ${currentTheme.surfaceBorder} flex items-center justify-between`}>
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight"
                            style={{ color: currentTheme.packFlexibleBandBg }}
                          >
                            ₹{Number(customAmount) || 0}
                          </span>
                          <span className={`text-xs font-medium ${currentTheme.subText}`}>
                            / Top-up
                          </span>
                        </div>
                      </div>

                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-md border"
                        style={{
                          backgroundColor: `color-mix(in oklab, ${currentTheme.packFlexibleBandBg} 9%, transparent)`,
                          borderColor: `color-mix(in oklab, ${currentTheme.packFlexibleBandBg} 21%, transparent)`,
                          color: currentTheme.packFlexibleBandBg
                        }}
                      >
                        Flexible
                      </span>
                    </div>

                    {/* Card Select Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedPackType('CUSTOM')}
                      className="mt-3 w-full py-2.5 rounded-xl font-bold text-sm transition-colors shadow-md flex items-center justify-center"
                      style={{
                        backgroundColor: currentTheme.packFlexibleBandBg,
                        color: currentTheme.packFlexibleBandText,
                      }}
                    >
                      <span>{selectedPackType === 'CUSTOM' ? 'Selected' : t.customPack}</span>
                    </button>
                  </div>
                </PackCard>

              </div>
            </div>
          ) : (
            /* VIEW 2: "CHANGE PLAN" ALL PLANS LIST */
            <div className="bouquet-explore">
              <div className={`bouquet-results-count ${currentTheme.subText}`}>
                <span className="font-medium">
                  <strong className={`font-bold ${currentTheme.headingText}`}>{visibleBouquets.length}</strong> {t.browsePacksTitle}
                </span>
              </div>

              <div className="bouquet-filters" aria-label={currentLang === 'ta' ? 'திட்ட வடிப்பான்கள்' : 'Bouquet filters'}>
                <div className="bouquet-filter-group" role="group" aria-label={currentLang === 'ta' ? 'திட்ட வகை' : 'Plan type'}>
                  {([
                    ['all', t.allQuality],
                    ['HD', 'HD'],
                    ['SD', 'SD'],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={catalogTypeFilter === value}
                      onClick={() => setCatalogTypeFilter(value)}
                      className="bouquet-filter-button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="bouquet-filter-group" role="group" aria-label={t.filterByDuration}>
                  {([
                    ['all', t.allDurations],
                    [1, `1 ${t.month}`],
                    [3, `3 ${t.months}`],
                    [6, `6 ${t.months}`],
                    [12, `12 ${t.months}`],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={catalogDurationFilter === value}
                      onClick={() => setCatalogDurationFilter(value)}
                      className="bouquet-filter-button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {visibleBouquets.length === 0 ? (
                <div className={`rounded-xl border p-4 text-sm ${currentTheme.inputBg} ${currentTheme.inputBorder} ${currentTheme.subText}`}>
                  {t.noPlansMatch}
                </div>
              ) : (
              <div className="bouquet-category-list">
                {visibleBouquets.map((plan, index) => {
                  const isSelected = activePlan?.id === plan.id && selectedPackType !== 'CUSTOM';
                  const isExpanded = !!expandedPlanChannels[plan.id];

                  return (
                    <React.Fragment key={plan.id}>
                      {(index === 0 || visibleBouquets[index - 1].pack_type !== plan.pack_type) && (
                        <button
                          type="button"
                          className={`bouquet-category-heading bouquet-category-${plan.pack_type.toLowerCase()}`}
                          aria-expanded={!collapsedBouquetTypes[plan.pack_type]}
                          onClick={() => setCollapsedBouquetTypes((current) => ({
                            ...current,
                            [plan.pack_type]: !current[plan.pack_type],
                          }))}
                        >
                          <span>{plan.pack_type} {currentLang === 'ta' ? 'பேக்குகள்' : 'Bouquets'}</span>
                          <span>{visibleBouquets.filter((item) => item.pack_type === plan.pack_type).length}</span>
                          {!collapsedBouquetTypes[plan.pack_type]
                            ? <ChevronUp className="bouquet-category-chevron" aria-hidden="true" />
                            : <ChevronDown className="bouquet-category-chevron" aria-hidden="true" />}
                        </button>
                      )}
                      {!collapsedBouquetTypes[plan.pack_type] && (
                      <div
                        onClick={() => {
                          setCustomSelectedPlan(plan);
                          setSelectedPackType(plan.pack_type);
                          setCustomAmount('');
                        }}
                        className={`bouquet-plan-card border transition-colors cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? `${currentTheme.cardActiveBg} ${currentTheme.cardActiveBorder} ${currentTheme.cardActiveRing}`
                            : `${currentTheme.cardInactiveBg} ${currentTheme.cardInactiveBorder} ${currentTheme.cardInactiveHoverBorder}`
                        }`}
                      >
                      <div>
                        {/* Top Badges */}
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="bouquet-duration">
                              {plan.duration_months} {plan.duration_months > 1 ? t.months : t.month}
                            </span>
                            {plan.is_recommended && (
                              <span className="bouquet-recommended">
                                <Crown className="w-3 h-3" />
                                {t.popularBadge}
                              </span>
                            )}
                          </div>

                          <div className="text-right">
                            <span className="text-lg font-bold tabular-nums tracking-tight" style={{ color: currentTheme.primaryColor }}>
                              ₹{plan.amount}
                            </span>
                          </div>
                        </div>

                        {/* Plan Name */}
                        <h4 className={`font-bold text-sm ${isSelected ? currentTheme.cardActiveText : currentTheme.cardInactiveText}`}>
                          {plan.plan_name}
                        </h4>

                        {/* Expandable Channel List */}
                        {(plan.channel_count || plan.hd_channel_count || plan.channel_list.length) > 0 && (
                        <div className={`mt-2 pt-2 border-t ${currentTheme.surfaceBorder}`}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleChannelExpand(plan.id);
                            }}
                            className={`w-full py-1.5 px-2 rounded-lg border text-xs font-medium flex items-center justify-between transition-colors ${currentTheme.inputBg} ${currentTheme.inputBorder} ${currentTheme.subText}`}
                          >
                            <span className="flex items-center gap-1.5 font-bold">
                              <Tv className="w-4 h-4" style={{ color: currentTheme.primaryColor }} />
                              <span>
                                {plan.pack_type === 'HD'
                                  ? `${plan.hd_channel_count || plan.channel_list.length} ${t.hdChannels}`
                                  : `${plan.channel_count || plan.channel_list.length} ${t.channels}`}
                              </span>
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>

                          {isExpanded && (
                            <div className={`mt-2 p-3 rounded-xl border max-h-40 overflow-y-auto space-y-1.5   duration-200 ${currentTheme.inputBg} ${currentTheme.inputBorder}`}>
                              <div className="flex flex-wrap gap-1.5">
                                {plan.channel_list.map((ch, idx) => (
                                  <span
                                    key={idx}
                                    className={`text-xs font-medium px-2.5 py-1 rounded-lg border ${isLight ? 'bg-paper text-ink border-rule' : 'bg-ink text-accent-ink border-accent'}`}
                                  >
                                    {ch}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        )}
                      </div>

                      {/* Select Plan Button */}
                      <div className={`mt-2 pt-2 border-t ${currentTheme.surfaceBorder} flex justify-end`}>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomSelectedPlan(plan);
                            setSelectedPackType(plan.pack_type);
                            setCustomAmount('');
                          }}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                            isSelected
                              ? `${currentTheme.cardButtonActive}`
                              : `${currentTheme.cardButtonInactive}`
                          }`}
                        >
                          {isSelected ? 'Selected' : t.selectThisPack}
                        </button>
                      </div>
                      </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
              )}
            </div>
          )}

        </div>

        {/* Save Connection Checkbox for Logged In User */}
        {user && (
          <div className={`pt-2 border-t ${currentTheme.surfaceBorder}`}>
            <label className={`flex items-center gap-2.5 text-xs cursor-pointer ${currentTheme.subText}`}>
              <input
                type="checkbox"
                checked={saveConnection}
                onChange={(e) => setSaveConnection(e.target.checked)}
                className="rounded border-rule-strong focus:ring-2"
                style={{ accentColor: currentTheme.primaryColor }}
              />
              <span className="font-medium">
                {t.saveBoxPrompt}
              </span>
            </label>
          </div>
        )}

        {/* Primary Checkout CTA */}
        <div className={`recharge-checkout`}>
          <div>
            <h2 className={`mb-2 flex items-center gap-2 text-base font-bold ${currentTheme.headingText}`}>
              <span className="recharge-step-number">4</span>
              <span>{t.step4ReviewPay}</span>
            </h2>
            <span className={`text-xs block font-medium ${currentTheme.subText}`}>{t.totalPayable}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums tracking-tight" style={{ color: currentTheme.primaryColor }}>
                {selectedPackType === 'CUSTOM' || activePlan ? `₹${payablePrice}` : '—'}
              </span>
              <span className={`text-xs font-medium ${currentTheme.headingText}`}>
                ({selectedPackType === 'CUSTOM' ? t.customPack : `${activePlan?.pack_type || selectedPackType} Pack • ${activePlan?.duration_months || (selectedPackType === 'HD' ? hdDuration : sdDuration)}M`})
              </span>
            </div>
            <span className={`text-xs block mt-0.5 font-medium ${currentTheme.mutedText}`}>
              (Includes 18% GST • Zero Service Fee)
            </span>
          </div>

          <button
            id="proceed-to-pay-btn"
            type="button"
            onClick={handlePayClick}
            disabled={currentOp?.isEnabled === false || !canProceed}
            className={`w-full sm:w-auto px-10 py-3.5 font-bold text-sm transition-colors flex items-center justify-center gap-2 ${
              currentOp?.isEnabled === false
                ? 'bg-error-soft text-error  border border-rule cursor-not-allowed'
                : !canProceed
                  ? 'bg-ink text-muted border border-rule-strong cursor-not-allowed'
                : ` active:scale-[0.99] ${currentTheme.ctaButtonClass}`
            }`}
          >
            {currentOp?.isEnabled === false ? (
              <>
                <AlertCircle className="w-4 h-4 text-error shrink-0" />
                <span>{currentOp.name} is Offline for Maintenance</span>
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                <span>{t.proceedToPay}</span>

              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
