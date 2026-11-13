import { CatalogColumnHeadings, PlanCard } from './BrowsePlans/PlanCard';
import '../recharge-heading.css';
import { catalogItemToBrowsePlan } from '../lib/browsePlansData';
import { formatMessage, localizeCustomerError } from '../lib/customerMessages';
import { OperatorCatalogNotice } from './OperatorCatalogNotice';
import { TOP_UP_LIMITS, parseTopUpAmount, validateTopUpAmount } from '../lib/topUpAmount';
import { RechargeHelp } from './RechargeHelp';
import { formatPrice, formatMonthlyEquivalent, formatDuration, formatCatalogIssues, validateCatalogPack } from '../lib/catalog';
import { subscriberError, subscriberHelp, subscriberRule, subscriberLabel, subscriberPlaceholder, normalizeSubscriberId } from '../lib/subscriberValidation';
import React, { useState, useEffect, useRef } from 'react';
import {
  Tv,
  CheckCircle2,
  AlertCircle,
  CreditCard,
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
  onLanguageChange?: (lang: Language) => void;
  user: UserProfile | null;
  onInitiatePayment: (plan: DthPlan | { name: string; price: number; validityDays: number; pack_type?: string; duration_months?: number }, subscriber: SubscriberDetails | null, operator: DthOperator, smartCard: string, saveBox: boolean) => void;
  prefillConnection?: DthConnection | null;
  requestCustomTopUp?: boolean;
  selectedOpId: DthOperatorId;
  onSelectOpId: (opId: DthOperatorId) => void;
  currentTheme: OperatorTheme;
}

export const RechargeFlow: React.FC<RechargeFlowProps> = ({
  currentLang,
  onLanguageChange,
  user,
  onInitiatePayment,
  prefillConnection,
  requestCustomTopUp = false,
  selectedOpId,
  onSelectOpId,
  currentTheme,
}) => {
  const t = translations[currentLang];
  const plansRef = useRef<HTMLDivElement>(null);
  const [packsReached, setPacksReached] = useState(false);
  const checkoutRef = useRef<HTMLDivElement>(null);
  const expandedCheckoutHeight = useRef(0);
  const [checkoutCompact, setCheckoutCompact] = useState(false);
  useEffect(() => {
    const checkout = checkoutRef.current;
    const plans = plansRef.current;
    if (!checkout || !plans) return;
    const update = () => {
      if (!checkoutCompact) expandedCheckoutHeight.current = checkout.getBoundingClientRect().height;
      const gap = parseFloat(getComputedStyle(checkout.parentElement!).rowGap) || 0;
      const bottom = parseFloat(getComputedStyle(checkout).bottom) || 0;
      // Measure the normal-flow position, so shrinking the sticky bar cannot toggle it back.
      const naturalBottom = plans.getBoundingClientRect().bottom + gap + expandedCheckoutHeight.current;
      setCheckoutCompact(packsReached && naturalBottom > window.innerHeight - bottom + 1);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    observer?.observe(plans);
    observer?.observe(checkout);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      observer?.disconnect();
    };
  }, [packsReached, checkoutCompact, currentLang, user]);
  useEffect(() => {
    // Keep the ID field unobstructed. Pin the total only after pack choices enter view.
    if (!plansRef.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setPacksReached(entry.isIntersecting), { rootMargin: '0px 0px -140px 0px' });
    observer.observe(plansRef.current);
    return () => observer.disconnect();
  }, []);

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

  useEffect(() => {
    setCollapsedBouquetTypes({ HD: false, SD: false });
  }, [selectedOpId, planTab, catalogTypeFilter, catalogDurationFilter]);

  // Default view state: 6 Months default selection
  const [hdDuration, setHdDuration] = useState<1 | 3 | 6 | 12>(6);
  const [sdDuration, setSdDuration] = useState<1 | 3 | 6 | 12>(6);
  const [selectedPackType, setSelectedPackType] = useState<'HD' | 'SD' | 'CUSTOM'>('HD');
  useEffect(() => { if (requestCustomTopUp) { setPlanTab('recommended'); setSelectedPackType('CUSTOM'); } }, [requestCustomTopUp]);

  // Change Plan tab state
  const [customSelectedPlan, setCustomSelectedPlan] = useState<PlanCatalogItem | null>(null);
  const [expandedPlanChannels, setExpandedPlanChannels] = useState<Record<string, boolean>>({});

  // Custom amount support
  const [customAmount, setCustomAmount] = useState('');
  const [amountTouched, setAmountTouched] = useState(false);
  const amountError = validateTopUpAmount(customAmount, currentLang);
  const validCustomAmount = parseTopUpAmount(customAmount);
  const showAmountError = amountTouched && !!amountError;
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
        setCatalogPlans(all || []);
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
        setCatalogPlans(items || []);
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


    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Handle prefill from saved connection
  useEffect(() => {
    if (prefillConnection) {
      onSelectOpId(canonicalizeDthOperatorId(prefillConnection.operator));
      setSmartCardNumber(prefillConnection.smartCardNumber);
      const error = subscriberError(prefillConnection.operator, prefillConnection.smartCardNumber, false, currentLang);
      setValidationError(error);
      if (error) document.getElementById('smart-card-input')?.focus();
    }
  }, [prefillConnection]);

  const currentOp = visibleOperators.find((o) => o.id === selectedOpId) || visibleOperators[0];



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
  const chooseDurationLabel = translations[currentLang].uiChooseAnAvailableDuration;

  // Active chosen plan calculation
  const activePlan = planTab === 'recommended'
    ? (selectedPackType === 'HD' ? (recHDPlan || null) : selectedPackType === 'SD' ? (recSDPlan || null) : null)
    : (customSelectedPlan && isSameDthOperatorGroup(customSelectedPlan.operator, selectedOpId)
      ? operatorCatalog.find(plan => plan.id === customSelectedPlan.id) || null
      : recHDPlan || null);

  const payablePrice = selectedPackType === 'CUSTOM'
    ? (validCustomAmount ?? NaN)
    : (activePlan?.amount ?? 0);
  const canProceed = selectedPackType === 'CUSTOM' ? validCustomAmount !== null : activePlan !== null;

  const handlePayClick = () => {
    if (selectedPackType === 'CUSTOM' && amountError) {
      setAmountTouched(true);
      document.getElementById('custom-amount-input')?.focus();
      return;
    }
    if (!currentOp) return;
    const cleanCard = normalizeSubscriberId(smartCardNumber);
    const idError = subscriberError(selectedOpId, cleanCard, true, currentLang);
    if (idError) {
      setValidationError(idError);
      document.getElementById('smart-card-input')?.focus();
      return;
    }
    if (selectedPackType !== 'CUSTOM' && !activePlan) {
      setValidationError(
        translations[currentLang].uiNoCatalogPackIsAvailableForThisOperatorChooseACustomTopUpInstead
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
      const amountNum = validCustomAmount!;
      onInitiatePayment(
        {
          name: `${provider.name} ${t.customPack} ${formatPrice(amountNum, currentLang)}`,
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
          name: `${provider.name} ${activePlan.plan_name} (${formatDuration(activePlan.duration_months, currentLang)})`,
          price: activePlan.amount,
          validityDays: activePlan.duration_months * 30,
          pack_type: activePlan.pack_type,
          duration_months: activePlan.duration_months,
          operatorId: activePlan.operator,
          category: 'tamil_base',
          tamilName: activePlan.plan_name,
          channelsCount: activePlan.channel_count ?? 0,
          hdChannelsCount: activePlan.hd_channel_count ?? 0,
          description: `${activePlan.pack_type} pack for ${formatDuration(activePlan.duration_months, currentLang)}`,
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
            {t.heroHeading}
          </h1>

          <p className={`text-sm sm:text-base font-normal leading-relaxed max-w-2xl ${currentTheme.heroSubtitleColor}`}>
            {t.heroDescription}
          </p>

        </div>

        {/* Dynamic Illustrator Graphic per Operator */}
        <div className="recharge-product" data-operator={selectedOpId}>
          <HeroIllustrativeGraphic theme={currentTheme} currentLang={currentLang} />
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

          <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{currentOp ? formatMessage(t.uiOperatorChanged, { operator: currentOp.name }) : ''}</p>

          <div className="operator-options">
            {visibleOperators.map((op) => {
              const isSelected = op.id === selectedOpId;
              const opTheme = getOperatorTheme(op.id);

              return (
                <button
                  key={op.id}
                  id={`operator-${op.id}-btn`}
                  type="button"
                  aria-pressed={isSelected}
                  data-operator={op.id}
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
            {onLanguageChange && <div className="task-language" role="group" aria-label={t.uiTaskLanguage}>
              {(['en', 'ta'] as const).map(lang => <button key={lang} type="button" lang={lang} aria-pressed={currentLang === lang} onClick={() => onLanguageChange(lang)}>{lang === 'en' ? 'English' : 'தமிழ்'}</button>)}
            </div>}
            <div className="flex flex-col items-start gap-2">
              <h2 className={`text-base font-bold flex items-center gap-2 ${currentTheme.headingText}`}>
                <span
                className="recharge-step-number"
                >
                  2
                </span>
                <span>{subscriberLabel(selectedOpId, true, currentLang)}</span>
              </h2>
              <span className={`text-xs font-medium sm:text-right ${currentTheme.subText}`}>
                {subscriberHelp(selectedOpId, true, currentLang)}
              </span>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <input
                  id="smart-card-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={smartCardNumber}
                  onChange={(e) => {
                    setSmartCardNumber(e.target.value.replace(/[^0-9]/g, ''));
                    setValidationError(null);
                  }}
                  placeholder={subscriberPlaceholder(selectedOpId, true, currentLang)}
                  aria-invalid={!!validationError}
                  aria-describedby={validationError ? 'subscriber-error' : undefined}
                  aria-label={`${currentOp.name} ${subscriberLabel(selectedOpId, true, currentLang)}`}
                  className={`w-full ${currentTheme.inputBg} ${currentTheme.inputBorder} ${currentTheme.inputFocusBorder} ${currentTheme.inputText} ${currentTheme.inputPlaceholder} ${currentTheme.inputStyleClass} font-mono text-base focus:outline-none transition-colors`}
                />
              </div>

              {validationError && (
                <div className="p-3 rounded-xl bg-error-soft border border-rule text-error  text-xs flex items-center gap-2  ">
                  <AlertCircle className="w-4 h-4 shrink-0 text-error" />
                  <span id="subscriber-error" role="alert" className="font-medium">{subscriberError(selectedOpId, smartCardNumber, true, currentLang) || localizeCustomerError(validationError, currentLang)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Select Plan or Enter Amount */}
        <div ref={plansRef} className={`recharge-plans`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className={`text-base font-bold flex items-center gap-2 ${currentTheme.headingText}`}>
              <span
                className="recharge-step-number"
              >
                3
              </span>
              <span>{t.selectPlan.replace(/^\d+\.\s*/, '')}</span>
            </h2>

            {/* Pack view toggle */}
            <div className="pack-view-toggle" role="group" aria-label={translations[currentLang].uiPackView}>
              <button
                type="button"
                id="recommended-packs-tab"
                aria-pressed={planTab === 'recommended'}
                onClick={() => setPlanTab('recommended')}
              >
                {t.recommendedPacks}
              </button>
              <button
                type="button"
                id="change-plan-tab"
                aria-pressed={planTab === 'change_plan'}
                onClick={() => {
                  setPlanTab('change_plan');
                  if (selectedPackType === 'CUSTOM') setSelectedPackType('HD');
                }}
              >
                {t.changePacks.replace('{brand}', currentLang === 'ta' ? currentOp?.tamilName || '' : currentOp?.shortName || currentOp?.name || '')}
                <span className="pack-view-count">{operatorCatalog.length}</span>
              </button>
            </div>
          </div>

          {/* Catalog Fetch Error Banner */}
          {catalogError && (
            <div role="alert" className="p-4 rounded-2xl bg-error-soft border border-rule text-error flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-error shrink-0" />
                <span className="font-medium">{localizeCustomerError(catalogError, currentLang)}</span>
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
            <OperatorCatalogNotice operator={selectedOpId} currentLang={currentLang} onChoose={() => {
              setPlanTab('recommended'); setSelectedPackType('CUSTOM');
              requestAnimationFrame(() => { document.getElementById('custom-recharge-card')?.scrollIntoView({ block: 'start' }); document.getElementById('custom-amount-input')?.focus({ preventScroll: true }); });
            }} />
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
                  currentLang={currentLang}
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
                            (translations[currentLang].uiHDPackUnavailable))}
                        </span>
                      </h3>
                      {recHDPlan && validateCatalogPack(recHDPlan).length > 0 && <p className="text-error text-xs">{translations[currentLang].uiCatalogReview}: {formatCatalogIssues(recHDPlan, currentLang)}</p>}
                    </div>

                    {/* Duration Toggle */}
                    <div className="my-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                      <div
                        className="duration-selector"
                        role="group"
                        aria-label={translations[currentLang].uiSelectHDDuration}
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
                          {recHDPlan ? formatDuration(recHDPlan.duration_months, currentLang) : `${t.uiUnavailable}: ${formatDuration(hdDuration, currentLang)}`}
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
                            {recHDPlan ? formatPrice(recHDPlan.amount, currentLang) : '-'}
                          </span>
                          {recHDPlan && (
                            <span className={`text-xs font-medium ${currentTheme.subText}`}>
                              / {formatDuration(recHDPlan.duration_months, currentLang)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Monthly equivalent */}
                      <div className="text-right">
                        {recHDPlan && (
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-md border ${currentTheme.savingsBadgeBg} ${currentTheme.savingsBadgeText} ${currentTheme.savingsBadgeBorder}`}>
                            <span>
                              {formatMonthlyEquivalent(recHDPlan.amount, recHDPlan.duration_months, currentLang)}
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
                          ? (selectedPackType === 'HD' ? t.selectedAction : t.selectThisPack)
                          : hasHDOptions ? chooseDurationLabel : (translations[currentLang].uiUnavailable)}
                      </span>
                    </button>
                  </div>
                </PackCard>

                {/* 2. RECOMMENDED SD PACK CARD */}
                <PackCard
                  currentLang={currentLang}
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
                            (translations[currentLang].uiSDPackUnavailable))}
                        </span>
                      </h3>
                      {recSDPlan && validateCatalogPack(recSDPlan).length > 0 && <p className="text-error text-xs">{translations[currentLang].uiCatalogReview}: {formatCatalogIssues(recSDPlan, currentLang)}</p>}
                    </div>

                    {/* Duration Toggle */}
                    <div className="my-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                      <div
                        className="duration-selector"
                        role="group"
                        aria-label={translations[currentLang].uiSelectSDDuration}
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
                          {recSDPlan ? formatDuration(recSDPlan.duration_months, currentLang) : `${t.uiUnavailable}: ${formatDuration(sdDuration, currentLang)}`}
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
                            {recSDPlan ? formatPrice(recSDPlan.amount, currentLang) : '-'}
                          </span>
                          {recSDPlan && (
                            <span className={`text-xs font-medium ${currentTheme.subText}`}>
                              / {formatDuration(recSDPlan.duration_months, currentLang)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Monthly equivalent */}
                      <div className="text-right">
                        {recSDPlan && (
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-md border ${currentTheme.savingsBadgeBg} ${currentTheme.savingsBadgeText} ${currentTheme.savingsBadgeBorder}`}>
                            <span>
                              {formatMonthlyEquivalent(recSDPlan.amount, recSDPlan.duration_months, currentLang)}
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
                          ? (selectedPackType === 'SD' ? t.selectedAction : t.selectThisPack)
                          : hasSDOptions ? chooseDurationLabel : (translations[currentLang].uiUnavailable)}
                      </span>
                    </button>
                  </div>
                </PackCard>

                {/* 3. FLEXIBLE TOP-UP CARD */}
                <PackCard
                  currentLang={currentLang}
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
                        {t.customDescription}
                      </p>
                    </div>

                    {/* Custom Amount Input & Quick Pills */}
                    <div className="my-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <span className="absolute left-3.5 top-2.5 font-bold text-base" style={{ color: currentTheme.packFlexibleBandBg }}>Rs. </span>
                        <input
                          id="custom-amount-input"
                          type="text"
                          inputMode="decimal"
                          placeholder={t.enterAmount}
                          aria-label={t.enterAmount}
                          aria-invalid={showAmountError || undefined}
                          aria-describedby={showAmountError ? "custom-amount-help custom-amount-error" : "custom-amount-help"}
                          value={customAmount}
                          onChange={(e) => {
                            setCustomAmount(e.target.value);
                            setAmountTouched(true);
                            setSelectedPackType('CUSTOM');
                          }}
                          onFocus={() => setSelectedPackType('CUSTOM')}
                          onBlur={() => setAmountTouched(true)}
                          onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); handlePayClick(); } }}
                          className={`w-full ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputPlaceholder} rounded-xl pl-14 pr-3 py-2 font-mono text-base font-bold border-2 focus:outline-none transition-colors shadow-inner`}
                          style={{
                            borderColor: selectedPackType === 'CUSTOM' ? currentTheme.packFlexibleBandBg : undefined,
                          }}
                        />
                      </div>

                      <p id="custom-amount-help" className="text-xs">{formatMessage(t.uiAmountHelp, { min: TOP_UP_LIMITS.min, max: TOP_UP_LIMITS.max.toLocaleString('en-IN'), decimals: TOP_UP_LIMITS.decimalPlaces })}</p>
                      {showAmountError && <p id="custom-amount-error" role="alert" className="text-error text-sm">{amountError}</p>}
                      {/* Quick select pills */}
                      <div className="grid grid-cols-5 gap-1.5" aria-label={translations[currentLang].uiQuickAmountChoices}>
                        {[100, 200, 350, 500, 1000].map((quick) => (
                          <button
                            key={quick}
                            type="button"
                            aria-pressed={customAmount === String(quick) && selectedPackType === 'CUSTOM'}
                            onClick={() => {
                              setCustomAmount(String(quick));
                              setAmountTouched(true);
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
                            Rs. {quick}
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
                            {validCustomAmount !== null ? formatPrice(validCustomAmount, currentLang) : '-'}
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
                      <span>{selectedPackType === 'CUSTOM' ? t.selectedAction : t.customPack}</span>
                    </button>
                  </div>
                </PackCard>

              </div>
            </div>
          ) : (
            /* All packs for the selected operator. */
            <div className="bouquet-explore recharge-catalog">
              <div className="all-packs-results" role="status">
                {catalogTypeFilter === 'all' && catalogDurationFilter === 'all'
                  ? `${visibleBouquets.length} ${currentLang === 'ta' ? t.browsePacksTitle : 'packs'}`
                  : currentLang === 'ta'
                    ? `${visibleBouquets.length} / ${operatorCatalog.length} ${t.browsePacksTitle}`
                    : `${formatMessage(t.uiPackCount, { shown: visibleBouquets.length, total: operatorCatalog.length })}`}
              </div>
              <div className="bouquet-filters" aria-label={translations[currentLang].uiPackFilters}>
                <div className="all-packs-filter-field">
                  <span className="all-packs-filter-label">{currentLang === 'ta' ? t.allQuality : 'Picture quality'}</span>
                  <div className="bouquet-filter-group" role="group" aria-label={translations[currentLang].uiPictureQuality}>
                    {([['all', translations[currentLang].uiAll], ['HD', 'HD'], ['SD', 'SD']] as const).map(([value, label]) => (
                      <button key={value} type="button" aria-pressed={catalogTypeFilter === value} onClick={() => setCatalogTypeFilter(value)} className="bouquet-filter-button">{label}</button>
                    ))}
                  </div>
                </div>
                <div className="all-packs-filter-field">
                  <span className="all-packs-filter-label">{t.filterByDuration}</span>
                  <div className="bouquet-filter-group" role="group" aria-label={t.filterByDuration}>
                    {([['all', t.allDurations], [1, `1 ${t.month}`], [3, `3 ${t.months}`], [6, `6 ${t.months}`], [12, `12 ${t.months}`]] as const).map(([value, label]) => (
                      <button key={value} type="button" aria-pressed={catalogDurationFilter === value} onClick={() => setCatalogDurationFilter(value)} className="bouquet-filter-button">{label}</button>
                    ))}
                  </div>
                </div>
              </div>
              {visibleBouquets.length === 0 ? (
                <div className="all-packs-empty">
                  <Tv className="w-6 h-6" />
                  <p>{t.noPlansMatch}</p>
                  <button type="button" onClick={() => { setCatalogTypeFilter('all'); setCatalogDurationFilter('all'); }}>{currentLang === 'ta' ? t.allDurations : 'Clear filters'}</button>
                </div>
              ) : (
                <div className="bouquet-category-list">
                  {(['HD', 'SD'] as const).map(type => {
                    const plans = visibleBouquets.filter(plan => plan.pack_type === type);
                    if (!plans.length) return null;
                    return <section key={type} className="recharge-catalog-group">
                      <button type="button" className="bouquet-category-heading" aria-expanded={!collapsedBouquetTypes[type]}
                        onClick={() => setCollapsedBouquetTypes(current => ({ ...current, [type]: !current[type] }))}>
                        <span className="compact-plan-pill compact-plan-quality" data-quality={type}>{type}</span>
                        <strong>{type === 'HD' ? t.uiHighDefinitionPacks : t.uiStandardDefinitionPacks}</strong>
                        <span className="all-packs-category-count">{plans.length}</span>
                        {collapsedBouquetTypes[type] ? <ChevronDown className="bouquet-category-chevron" /> : <ChevronUp className="bouquet-category-chevron" />}
                      </button>
                      {!collapsedBouquetTypes[type] && <div className="catalog-plans">
                        <CatalogColumnHeadings currentLang={currentLang} />
                        {plans.map(plan => {
                          const isSelected = activePlan?.id === plan.id && selectedPackType !== 'CUSTOM';
                          const isExpanded = !!expandedPlanChannels[plan.id];
                          return <PlanCard key={plan.id} plan={catalogItemToBrowsePlan(plan)} currentLang={currentLang} currentTheme={currentTheme}
                            showCompare={false} isSelected={isSelected}
                            onSelectPlan={() => { setCustomSelectedPlan(plan); setSelectedPackType(plan.pack_type); setCustomAmount(''); }}>
                            {plan.is_recommended && <span className="bouquet-recommended">{t.recommendedBadge}</span>}
                            {plan.channel_list.length > 0 && <div className="catalog-channel-details">
                              <button type="button" aria-expanded={isExpanded} aria-controls={`pack-channels-${plan.id}`} onClick={() => toggleChannelExpand(plan.id)}>
                                {t.viewChannels}{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                              {isExpanded && <div id={`pack-channels-${plan.id}`} className="all-packs-channel-list">{plan.channel_list.map((channel, i) => <span key={i}>{channel}</span>)}</div>}
                            </div>}
                          </PlanCard>;
                        })}
                      </div>}
                    </section>;
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Primary Checkout CTA */}
        <div ref={checkoutRef} className={`recharge-checkout ${packsReached ? 'is-sticky' : ''} ${checkoutCompact ? 'is-compact' : ''}`}>
          <div>
            <h2 className={`mb-2 flex items-center gap-2 text-base font-bold ${currentTheme.headingText}`}>
              <span className="recharge-step-number">4</span>
              <span>{t.step4ReviewPay}</span>
            </h2>
            <span className={`text-xs block font-medium ${currentTheme.subText}`}>{t.totalPayable}</span>
            <div className="flex items-baseline gap-2">
              <span id="total-payable" aria-live="polite" className="text-3xl font-bold tabular-nums tracking-tight" style={{ color: currentTheme.primaryColor }}>
                <span key={`${payablePrice}-${canProceed}`}>{canProceed && Number.isFinite(payablePrice) && payablePrice > 0 ? formatPrice(payablePrice, currentLang) : '-'}</span>
              </span>
              <span className={`text-xs font-medium ${currentTheme.headingText}`}>
                ({selectedPackType === 'CUSTOM' ? t.customPack : `${activePlan?.pack_type || selectedPackType} ${t.pack} • ${formatDuration(activePlan?.duration_months || (selectedPackType === 'HD' ? hdDuration : sdDuration), currentLang)}`})
              </span>
            </div>
        {/* Save Connection Checkbox for Logged In User */}
        {user && (
          <div className="checkout-save-connection">
            <label className={`flex items-center gap-2.5 text-xs cursor-pointer ${currentTheme.subText}`}>
              <input
                type="checkbox"
                checked={saveConnection}
                onChange={(e) => setSaveConnection(e.target.checked)}
                className="rounded border-rule-strong focus:ring-2"
                style={{ accentColor: currentTheme.primaryColor }}
              />
              <span className="font-medium">
                {currentLang === 'ta' ? t.saveBoxPrompt : 'Save this connection for faster recharges'}
              </span>
            </label>
          </div>
        )}

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
      <p className="payment-facts">{t.uiPaymentFacts}</p>
      <RechargeHelp currentLang={currentLang} />
    </div>
  );
};
