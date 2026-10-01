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
  Coins
} from 'lucide-react';
import { 
  DthOperator, 
  DthOperatorId, 
  DthPlan, 
  SubscriberDetails, 
  Language, 
  UserProfile, 
  DthConnection,
  PlanCatalogItem 
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
  onTriggerRefresh?: (operator: DthOperatorId, card: string) => void;
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

  // Plan Catalog state
  const [catalogPlans, setCatalogPlans] = useState<PlanCatalogItem[]>([]);
  const [planTab, setPlanTab] = useState<'recommended' | 'change_plan'>('recommended');
  
  // Default view state: 6 Months default selection
  const [hdDuration, setHdDuration] = useState<1 | 6 | 12>(6);
  const [sdDuration, setSdDuration] = useState<1 | 6 | 12>(6);
  const [selectedPackType, setSelectedPackType] = useState<'HD' | 'SD' | 'CUSTOM'>('HD');

  // Change Plan tab state
  const [customSelectedPlan, setCustomSelectedPlan] = useState<PlanCatalogItem | null>(null);
  const [expandedPlanChannels, setExpandedPlanChannels] = useState<Record<string, boolean>>({});
  
  // Custom amount support
  const [customAmount, setCustomAmount] = useState('');
  const [saveConnection, setSaveConnection] = useState(true);

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

  // Fetch live plan catalog from PlanCatalogService & listen for real-time Excel updates
  useEffect(() => {
    const loadCatalog = () => {
      PlanCatalogService.getAllPlans()
        .then((all) => {
          setCatalogPlans(all);
        })
        .catch((err) => console.error('Failed to load plan catalog:', err));
    };

    loadCatalog();
    window.addEventListener('plan_catalog_updated', loadCatalog);
    return () => window.removeEventListener('plan_catalog_updated', loadCatalog);
  }, []);

  // Handle prefill from saved connection
  useEffect(() => {
    if (prefillConnection) {
      onSelectOpId(prefillConnection.operator);
      setSmartCardNumber(prefillConnection.smartCardNumber);
    }
  }, [prefillConnection]);

  const currentOp = operators.find((o) => o.id === selectedOpId) || operators[0];

  const handleQuickCardFill = (sampleId: string) => {
    setSmartCardNumber(sampleId);
    setValidationError(null);
  };

  // Filtered catalog for customer's selected operator
  const operatorCatalog = catalogPlans.filter((p) => p.operator === selectedOpId);

  // Recommended Plans for selected operator from catalog
  const recHDPlan = PlanCatalogService.getRecommendedPlan(catalogPlans, selectedOpId, 'HD', hdDuration) ||
    operatorCatalog.find((p) => p.pack_type === 'HD' && p.is_recommended);

  const recSDPlan = PlanCatalogService.getRecommendedPlan(catalogPlans, selectedOpId, 'SD', sdDuration) ||
    operatorCatalog.find((p) => p.pack_type === 'SD' && p.is_recommended);

  // Dynamic Savings per month calculated from catalog
  const hdSavings = PlanCatalogService.calculateSavings(catalogPlans, selectedOpId, 'HD', hdDuration);
  const sdSavings = PlanCatalogService.calculateSavings(catalogPlans, selectedOpId, 'SD', sdDuration);

  // Active chosen plan calculation
  const activePlan = planTab === 'recommended'
    ? (selectedPackType === 'HD' ? (recHDPlan || null) : selectedPackType === 'SD' ? (recSDPlan || null) : null)
    : (customSelectedPlan || recHDPlan || null);

  const payablePrice = selectedPackType === 'CUSTOM'
    ? (Number(customAmount) || 0)
    : (activePlan ? activePlan.amount : 1650);

  const handlePayClick = () => {
    if (!currentOp) return;
    if (currentOp.isEnabled === false) {
      setValidationError(
        currentOp.maintenanceMessage || 
        `${currentOp.name} is temporarily offline for maintenance (${currentOp.conditionLabel || 'Maintenance'}). Expected restoration: ${currentOp.expectedRestoration || 'Shortly'}.`
      );
      return;
    }
    const cleanCard = smartCardNumber.trim().replace(/\s+/g, '');
    if (!cleanCard) {
      setValidationError(currentLang === 'ta' ? 'ஸ்மார்ட் கார்டு எண்ணை உள்ளிடவும்' : 'Please enter your Smart Card or Subscriber ID');
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
          name: `${currentOp.name} Custom Top-Up ₹${amountNum}`,
          price: amountNum,
          validityDays: 30,
        },
        null,
        currentOp,
        cleanCard,
        saveConnection
      );
    } else if (activePlan) {
      onInitiatePayment(
        {
          id: activePlan.id,
          name: `${currentOp.name} ${activePlan.plan_name} (${activePlan.duration_months}M)`,
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
        currentOp,
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
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Welcome & Quick Stats */}
      <div 
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${currentTheme.heroGradient} ${currentTheme.heroBorder} border p-6 md:p-8 shadow-2xl transition-all duration-500`}
      >
        <div className="relative z-10 max-w-3xl space-y-3.5">
          <h1 className={`text-2xl sm:text-4xl font-bold tracking-tight leading-tight ${currentTheme.fontHeadingClass} ${currentTheme.heroTitleColor}`}>
            {currentLang === 'ta' ? (
              <>
                அனைத்து <span className={currentTheme.heroTitleHighlight}>டிடிஎச் ரீசார்ஜ்</span> தளம்
              </>
            ) : (
              <>
                All-in-One <span className={currentTheme.heroTitleHighlight}>DTH Recharge</span> Platform
              </>
            )}
          </h1>
          
          <p className={`text-sm sm:text-base font-normal leading-relaxed max-w-2xl ${currentTheme.heroSubtitleColor}`}>
            {currentLang === 'ta'
              ? 'சன் டைரக்ட், டாடா பிளே, ஏர்டெல், டிஷ் டிவி, டி2எச் உள்ளிட்ட அனைத்து இணைப்புகளுக்கும் விரைவான, பாதுகாப்பான ரீசார்ஜ்.'
              : 'Recharge any DTH connection — Sun Direct, Tata Play, Airtel DTH, Dish TV, D2H — instantly, securely, with zero hidden fees.'}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-medium">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${currentTheme.heroBadgeItemBg} ${currentTheme.heroBadgeItemText} ${currentTheme.heroBadgeItemBorder}`}>
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Fast Processing</span>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${currentTheme.heroBadgeItemBg} ${currentTheme.heroBadgeItemText} ${currentTheme.heroBadgeItemBorder}`}>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Secure Payments</span>
            </div>
          </div>
        </div>

        {/* Dynamic Illustrator Graphic per Operator */}
        <div className="absolute right-0 top-0 bottom-0 pointer-events-none flex items-center pr-4 md:pr-8">
          <HeroIllustrativeGraphic theme={currentTheme} />
        </div>
      </div>

      {/* Main Recharge Form Box */}
      <div className={`${currentTheme.mainContainerBg} ${currentTheme.mainContainerBorder} border rounded-3xl p-6 md:p-8 shadow-2xl space-y-8 transition-colors duration-300`}>
        
        {/* Step 1: Select Operator */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={`text-base font-bold flex items-center gap-2 ${currentTheme.headingText}`}>
              <span 
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${currentTheme.stepNumberBg} ${currentTheme.stepNumberText}`}
              >
                1
              </span>
              <span>{t.selectOperator}</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {operators.map((op) => {
              const isSelected = op.id === selectedOpId;
              const opTheme = getOperatorTheme(op.id);

              return (
                <button
                  key={op.id}
                  id={`operator-${op.id}-btn`}
                  onClick={() => {
                    onSelectOpId(op.id);
                    setValidationError(null);
                  }}
                  className={`p-3.5 sm:p-4 rounded-2xl border text-center transition-all relative overflow-hidden group flex flex-col items-center justify-center gap-2 ${
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
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white shadow-xs flex items-center gap-0.5">
                        <AlertCircle className="w-2.5 h-2.5" /> Maintenance
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
        </div>

        {/* Operator Offline Maintenance Notice Banner */}
        {currentOp && currentOp.isEnabled === false && (
          <div className="p-4 rounded-2xl border bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200 flex items-start gap-3.5 animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm">{currentOp.name} is Temporarily Unavailable</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30">
                  {currentOp.conditionLabel || 'Under Maintenance'}
                </span>
              </div>
              <p className="opacity-90 leading-relaxed">
                {currentOp.maintenanceMessage || `${currentOp.name} services are temporarily offline for maintenance. Recharges will resume shortly.`}
              </p>
              {currentOp.expectedRestoration && (
                <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                  Expected Resumption: {currentOp.expectedRestoration}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Enter Smart Card / Customer ID */}
        {currentOp && (
          <div className={`space-y-4 pt-4 border-t ${currentTheme.surfaceBorder}`}>
            <div className="flex items-center justify-between">
              <h2 className={`text-base font-bold flex items-center gap-2 ${currentTheme.headingText}`}>
                <span 
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${currentTheme.stepNumberBg} ${currentTheme.stepNumberText}`}
                >
                  2
                </span>
                <span>{t.enterCardNumber}</span>
              </h2>
              <span className={`text-xs ${currentTheme.subText}`}>
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
                  placeholder={`e.g. ${currentOp.sampleId}`}
                  aria-label={`${currentOp.name} ${currentOp.cardName}`}
                  className={`w-full ${currentTheme.inputBg} ${currentTheme.inputBorder} ${currentTheme.inputFocusBorder} ${currentTheme.inputText} ${currentTheme.inputPlaceholder} ${currentTheme.inputStyleClass} font-mono text-base focus:outline-none transition-all`}
                />
              </div>

              {/* Helper quick fill */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                <span className={`flex items-center gap-1.5 ${currentTheme.subText}`}>
                  <Info className="w-3.5 h-3.5" style={{ color: currentTheme.primaryColor }} />
                  <span>Sample:</span>
                  <button
                    type="button"
                    onClick={() => handleQuickCardFill(currentOp.sampleId)}
                    className="hover:underline font-mono font-bold"
                    style={{ color: currentTheme.primaryColor }}
                  >
                    {currentOp.sampleId}
                  </button>
                </span>
              </div>

              {validationError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{validationError}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Select Plan or Enter Amount (3-Card Balanced Grid for All Operators) */}
        <div className={`space-y-6 pt-4 border-t ${currentTheme.surfaceBorder}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className={`text-base font-bold flex items-center gap-2 ${currentTheme.headingText}`}>
              <span 
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${currentTheme.stepNumberBg} ${currentTheme.stepNumberText}`}
              >
                3
              </span>
              <span>{t.selectPlan}</span>
            </h2>

            {/* Tab switch */}
            <div className={`inline-flex p-1 rounded-xl border self-start sm:self-auto ${currentTheme.durationPillContainerBg}`}>
              <button
                type="button"
                id="recommended-packs-tab"
                onClick={() => setPlanTab('recommended')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  planTab === 'recommended'
                    ? `${currentTheme.durationPillActive} shadow-sm`
                    : `${currentTheme.durationPillInactive}`
                }`}
              >
                Recommended
              </button>
              <button
                type="button"
                id="change-plan-tab"
                onClick={() => {
                  setPlanTab('change_plan');
                  if (selectedPackType === 'CUSTOM') setSelectedPackType('HD');
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  planTab === 'change_plan'
                    ? `${currentTheme.durationPillActive} shadow-sm`
                    : `${currentTheme.durationPillInactive}`
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>All Plans ({operatorCatalog.length})</span>
              </button>
            </div>
          </div>

          {/* VIEW 1: RECOMMENDED 3-CARD BALANCED GRID */}
          {planTab === 'recommended' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. RECOMMENDED HD PACK CARD */}
                <PackCard
                  id="recommended-hd-card"
                  type="HD"
                  operatorTheme={currentTheme}
                  isSelected={selectedPackType === 'HD'}
                  onClick={() => {
                    setSelectedPackType('HD');
                    setCustomAmount('');
                  }}
                >
                  <div>
                    {/* Card Title */}
                    <div className="space-y-1 mb-3">
                      <h3 className={`text-xl sm:text-2xl font-black flex items-center gap-2 ${selectedPackType === 'HD' ? currentTheme.cardActiveText : currentTheme.cardInactiveText}`}>
                        <span>{recHDPlan ? recHDPlan.plan_name : 'Recommended HD Pack'}</span>
                      </h3>
                    </div>

                    {/* Duration Toggle */}
                    <div className="my-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                      <div 
                        className={`grid grid-cols-3 gap-1.5 p-1 rounded-xl border ${currentTheme.durationPillContainerBg}`}
                        aria-label="Select HD duration"
                      >
                        {([1, 6, 12] as const).map((dur) => (
                          <button
                            key={dur}
                            type="button"
                            onClick={() => {
                              setHdDuration(dur);
                              setSelectedPackType('HD');
                              setCustomAmount('');
                            }}
                            className={`py-1.5 px-1 text-xs font-bold rounded-lg transition-all ${
                              hdDuration === dur
                                ? `${currentTheme.durationPillActive} shadow-md`
                                : `${currentTheme.durationPillInactive}`
                            }`}
                          >
                            {dur}M
                          </button>
                        ))}
                      </div>
                      <div className={`px-2.5 py-1.5 rounded-xl border text-xs flex items-center justify-between ${currentTheme.inputBg} ${currentTheme.inputBorder}`}>
                        <span className={`font-semibold ${currentTheme.subText}`}>
                          {hdDuration * 30} Days Validity
                        </span>
                        <span className={`text-[11px] font-bold ${currentTheme.mutedText}`}>
                          {recHDPlan?.channel_list ? `${recHDPlan.channel_list.length} Channels` : 'HD Pack'}
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
                            className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight"
                            style={{ color: currentTheme.packHdBandBg }}
                          >
                            ₹{recHDPlan ? recHDPlan.amount : 1650}
                          </span>
                          <span className={`text-xs font-medium ${currentTheme.subText}`}>
                            / {hdDuration}M
                          </span>
                        </div>
                      </div>

                      {/* Pricing Savings Badge */}
                      <div className="text-right">
                        {hdSavings.savePerMonth > 0 && (
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-md border ${currentTheme.savingsBadgeBg} ${currentTheme.savingsBadgeText} ${currentTheme.savingsBadgeBorder}`}>
                            <Zap className="w-3 h-3 text-emerald-500" />
                            Save ₹{hdSavings.savePerMonth}/mo
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Select Button - matches HD header color */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPackType('HD');
                        setCustomAmount('');
                      }}
                      className="mt-3 w-full py-2.5 rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center"
                      style={{
                        backgroundColor: currentTheme.packHdBandBg,
                        color: currentTheme.packHdBandText,
                      }}
                    >
                      <span>{selectedPackType === 'HD' ? 'Selected' : 'Select HD Pack'}</span>
                    </button>
                  </div>
                </PackCard>

                {/* 2. RECOMMENDED SD PACK CARD */}
                <PackCard
                  id="recommended-sd-card"
                  type="SD"
                  operatorTheme={currentTheme}
                  isSelected={selectedPackType === 'SD'}
                  onClick={() => {
                    setSelectedPackType('SD');
                    setCustomAmount('');
                  }}
                >
                  <div>
                    {/* Card Title */}
                    <div className="space-y-1 mb-3">
                      <h3 className={`text-xl sm:text-2xl font-black flex items-center gap-2 ${selectedPackType === 'SD' ? currentTheme.cardActiveText : currentTheme.cardInactiveText}`}>
                        <span>{recSDPlan ? recSDPlan.plan_name : 'Recommended SD Pack'}</span>
                      </h3>
                    </div>

                    {/* Duration Toggle */}
                    <div className="my-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                      <div 
                        className={`grid grid-cols-3 gap-1.5 p-1 rounded-xl border ${currentTheme.durationPillContainerBg}`}
                        aria-label="Select SD duration"
                      >
                        {([1, 6, 12] as const).map((dur) => (
                          <button
                            key={dur}
                            type="button"
                            onClick={() => {
                              setSdDuration(dur);
                              setSelectedPackType('SD');
                              setCustomAmount('');
                            }}
                            className={`py-1.5 px-1 text-xs font-bold rounded-lg transition-all ${
                              sdDuration === dur
                                ? 'text-white shadow-md'
                                : `${currentTheme.durationPillInactive}`
                            }`}
                            style={{
                              backgroundColor: sdDuration === dur ? currentTheme.packSdBandBg : undefined,
                            }}
                          >
                            {dur}M
                          </button>
                        ))}
                      </div>
                      <div className={`px-2.5 py-1.5 rounded-xl border text-xs flex items-center justify-between ${currentTheme.inputBg} ${currentTheme.inputBorder}`}>
                        <span className={`font-semibold ${currentTheme.subText}`}>
                          {sdDuration * 30} Days Validity
                        </span>
                        <span className={`text-[11px] font-bold ${currentTheme.mutedText}`}>
                          {recSDPlan?.channel_list ? `${recSDPlan.channel_list.length} Channels` : 'SD Pack'}
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
                            className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight"
                            style={{ color: currentTheme.packSdBandBg }}
                          >
                            ₹{recSDPlan ? recSDPlan.amount : 1350}
                          </span>
                          <span className={`text-xs font-medium ${currentTheme.subText}`}>
                            / {sdDuration}M
                          </span>
                        </div>
                      </div>

                      {/* Pricing Savings Badge */}
                      <div className="text-right">
                        {sdSavings.savePerMonth > 0 && (
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-md border ${currentTheme.savingsBadgeBg} ${currentTheme.savingsBadgeText} ${currentTheme.savingsBadgeBorder}`}>
                            <Zap className="w-3 h-3 text-emerald-500" />
                            Save ₹{sdSavings.savePerMonth}/mo
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Select Button - matches SD header color */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPackType('SD');
                        setCustomAmount('');
                      }}
                      className="mt-3 w-full py-2.5 rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center"
                      style={{
                        backgroundColor: currentTheme.packSdBandBg,
                        color: currentTheme.packSdBandText,
                      }}
                    >
                      <span>{selectedPackType === 'SD' ? 'Selected' : 'Select SD Pack'}</span>
                    </button>
                  </div>
                </PackCard>

                {/* 3. DECISION MAKER'S CHOICE: FLEXIBLE TOP-UP CARD */}
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
                    {/* Card Title & Brief Description */}
                    <div className="space-y-1 mb-3">
                      <h3 className={`text-xl sm:text-2xl font-black flex items-center gap-2 ${selectedPackType === 'CUSTOM' ? currentTheme.cardActiveText : currentTheme.cardInactiveText}`}>
                        <span>Flexible Top-Up</span>
                      </h3>
                      <p className={`text-xs sm:text-sm ${currentTheme.subText}`}>
                        Direct wallet balance credit for any custom amount.
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
                          placeholder="Enter Amount"
                          aria-label="Recharge amount"
                          value={customAmount}
                          onChange={(e) => {
                            setCustomAmount(e.target.value);
                            setSelectedPackType('CUSTOM');
                          }}
                          onFocus={() => setSelectedPackType('CUSTOM')}
                          className={`w-full ${currentTheme.inputBg} ${currentTheme.inputText} ${currentTheme.inputPlaceholder} rounded-xl pl-9 pr-3 py-2 font-mono text-base font-black border-2 focus:outline-none transition-all shadow-inner`}
                          style={{
                            borderColor: selectedPackType === 'CUSTOM' ? currentTheme.packFlexibleBandBg : undefined,
                          }}
                        />
                      </div>

                      {/* Prominent Quick select pills */}
                      <div className="grid grid-cols-5 gap-1.5" aria-label="Quick amount choices">
                        {[100, 200, 350, 500, 1000].map((quick) => (
                          <button
                            key={quick}
                            type="button"
                            onClick={() => {
                              setCustomAmount(String(quick));
                              setSelectedPackType('CUSTOM');
                            }}
                            className={`py-1.5 px-1 rounded-lg text-xs font-mono font-bold transition-all border ${
                              customAmount === String(quick) && selectedPackType === 'CUSTOM'
                                ? 'text-white shadow-sm font-black'
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
                            className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight"
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
                        className="text-xs sm:text-sm font-bold px-2.5 py-1 rounded-md border"
                        style={{ 
                          backgroundColor: `${currentTheme.packFlexibleBandBg}18`, 
                          borderColor: `${currentTheme.packFlexibleBandBg}35`, 
                          color: currentTheme.packFlexibleBandBg 
                        }}
                      >
                        Flexible
                      </span>
                    </div>

                    {/* Card Select Button - matches Flexible header color */}
                    <button
                      type="button"
                      onClick={() => setSelectedPackType('CUSTOM')}
                      className="mt-3 w-full py-2.5 rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center"
                      style={{
                        backgroundColor: currentTheme.packFlexibleBandBg,
                        color: currentTheme.packFlexibleBandText,
                      }}
                    >
                      <span>{selectedPackType === 'CUSTOM' ? 'Selected' : 'Select Flexible Top-Up'}</span>
                    </button>
                  </div>
                </PackCard>

              </div>
            </div>
          )}

          {/* VIEW 2: "CHANGE PLAN" TAB */}
          {planTab === 'change_plan' && (
            <div className="space-y-4">
              <div className={`flex items-center justify-between text-xs px-1 ${currentTheme.subText}`}>
                <span>
                  <strong className={`font-bold ${currentTheme.headingText}`}>{operatorCatalog.length}</strong> available packs
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {operatorCatalog.map((plan) => {
                  const isSelected = activePlan?.id === plan.id && selectedPackType !== 'CUSTOM';
                  const isExpanded = !!expandedPlanChannels[plan.id];

                  return (
                    <div
                      key={plan.id}
                      onClick={() => {
                        setCustomSelectedPlan(plan);
                        setSelectedPackType(plan.pack_type);
                        setCustomAmount('');
                      }}
                      className={`relative rounded-3xl p-5 border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? `${currentTheme.cardActiveBg} ${currentTheme.cardActiveBorder} ${currentTheme.cardActiveRing}`
                          : `${currentTheme.cardInactiveBg} ${currentTheme.cardInactiveBorder} ${currentTheme.cardInactiveHoverBorder}`
                      }`}
                    >
                      <div>
                        {/* Top Badges */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                plan.pack_type === 'HD'
                                  ? `${currentTheme.badgeBg} ${currentTheme.badgeText} border ${currentTheme.badgeBorder}`
                                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {plan.pack_type}
                            </span>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${currentTheme.inputBg} ${currentTheme.inputBorder} ${currentTheme.subText}`}>
                              {plan.duration_months} {plan.duration_months > 1 ? 'Months' : 'Month'}
                            </span>
                            {plan.is_recommended && (
                              <span className="text-xs font-bold text-amber-500 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                                <Crown className="w-3 h-3" />
                                Recommended
                              </span>
                            )}
                          </div>

                          <div className="text-right">
                            <span className="text-xl font-extrabold tabular-nums tracking-tight" style={{ color: currentTheme.primaryColor }}>
                              ₹{plan.amount}
                            </span>
                          </div>
                        </div>

                        {/* Plan Name */}
                        <h4 className={`font-bold text-base ${isSelected ? currentTheme.cardActiveText : currentTheme.cardInactiveText}`}>
                          {plan.plan_name}
                        </h4>

                        {/* Expandable Channel List */}
                        <div className={`mt-3 pt-3 border-t ${currentTheme.surfaceBorder}`}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleChannelExpand(plan.id);
                            }}
                            className={`w-full py-1.5 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-colors ${currentTheme.inputBg} ${currentTheme.inputBorder} ${currentTheme.subText}`}
                          >
                            <span className="flex items-center gap-1.5">
                              <Tv className="w-3.5 h-3.5" style={{ color: currentTheme.primaryColor }} />
                              <span>{plan.channel_list.length} Channels</span>
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {isExpanded && (
                            <div className={`mt-2 p-2.5 rounded-xl border max-h-40 overflow-y-auto space-y-1.5 animate-in fade-in duration-200 ${currentTheme.inputBg} ${currentTheme.inputBorder}`}>
                              <div className="flex flex-wrap gap-1">
                                {plan.channel_list.map((ch, idx) => (
                                  <span
                                    key={idx}
                                    className={`text-xs font-medium px-2 py-0.5 rounded border ${isLight ? 'bg-white text-gray-800 border-gray-200' : 'bg-[#0e1935] text-[#c7d2e5] border-[#1e3058]'}`}
                                  >
                                    {ch}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Select Plan Button */}
                      <div className={`mt-4 pt-3 border-t ${currentTheme.surfaceBorder} flex items-center justify-between`}>
                        <span className={`text-xs font-medium ${currentTheme.subText}`}>
                          {plan.duration_months * 30} Days Validity
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomSelectedPlan(plan);
                            setSelectedPackType(plan.pack_type);
                            setCustomAmount('');
                          }}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            isSelected
                              ? `${currentTheme.cardButtonActive}`
                              : `${currentTheme.cardButtonInactive}`
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
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
                className="rounded border-gray-400 focus:ring-2"
                style={{ accentColor: currentTheme.primaryColor }}
              />
              <span className="font-medium">
                Save this Set-Top Box for faster recharges
              </span>
            </label>
          </div>
        )}

        {/* Primary Checkout CTA (Dynamic Operator Branded Button) */}
        <div className={`pt-4 border-t ${currentTheme.surfaceBorder} flex flex-col sm:flex-row items-center justify-between gap-4`}>
          <div>
            <span className={`text-xs block ${currentTheme.subText}`}>{t.totalPayable}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tabular-nums tracking-tight" style={{ color: currentTheme.primaryColor }}>
                ₹{payablePrice}
              </span>
              <span className={`text-xs font-semibold ${currentTheme.headingText}`}>
                ({selectedPackType === 'CUSTOM' ? 'Custom Top-Up' : `${activePlan?.pack_type || selectedPackType} Pack • ${activePlan?.duration_months || (selectedPackType === 'HD' ? hdDuration : sdDuration)}M`})
              </span>
            </div>
            <span className={`text-xs block mt-0.5 ${currentTheme.mutedText}`}>
              (Includes 18% GST • Zero Service Fee)
            </span>
          </div>

          <button
            id="proceed-to-pay-btn"
            onClick={handlePayClick}
            disabled={currentOp?.isEnabled === false}
            className={`w-full sm:w-auto px-10 py-3.5 font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              currentOp?.isEnabled === false
                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 cursor-not-allowed'
                : `hover:scale-[1.01] active:scale-[0.99] ${currentTheme.ctaButtonClass}`
            }`}
          >
            {currentOp?.isEnabled === false ? (
              <>
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{currentOp.name} is Offline for Maintenance</span>
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                <span>{t.proceedToPay}</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
