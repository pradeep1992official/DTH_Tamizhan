import React from 'react';
import {
  Tv,
  Sparkles,
  Crown,
  Percent,
  Zap,
  Check,
  ArrowRight,
  CheckSquare,
  Square,
  Layers
} from '../../lib/icons';
import { BrowsePlan, Language } from '../../types';
import { OperatorTheme } from '../../lib/theme';
import { translations } from '../../lib/translations';

interface PlanCardProps {
  plan: BrowsePlan;
  currentTheme: OperatorTheme;
  currentLang: Language;
  isSelectedForCompare: boolean;
  onToggleCompare: (plan: BrowsePlan) => void;
  canAddToCompare: boolean;
  onSelectPlan: (plan: BrowsePlan) => void;
}

const OPERATOR_NAMES: Record<string, { name: string; tamil: string; color: string }> = {
  sun_direct: { name: 'Sun Direct', tamil: 'சன் டைரக்ட்', color: 'var(--operator-sun-direct)' },
  tata_play: { name: 'Tata Play', tamil: 'டாடா பிளே', color: 'var(--operator-tata-play)' },
  airtel_dth: { name: 'Airtel Digital TV', tamil: 'ஏர்டெல் டிவி', color: 'var(--operator-airtel-dth)' },
  dish_tv: { name: 'Dish TV & D2H', tamil: 'டிஷ் டிவி & டி2எச்', color: 'var(--operator-dish-tv)' },
  d2h: { name: 'Dish TV & D2H', tamil: 'டிஷ் டிவி & டி2எச்', color: 'var(--operator-dish-tv)' },
};

export const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  currentTheme,
  currentLang,
  isSelectedForCompare,
  onToggleCompare,
  canAddToCompare,
  onSelectPlan,
}) => {
  const t = translations[currentLang];
  const isLight = currentTheme.isLightMode;
  const opInfo = OPERATOR_NAMES[plan.operator] || {
    name: plan.operator,
    tamil: '',
    color: currentTheme.primaryColor,
  };

  const monthlyRate = plan.monthly_equivalent_rate || Math.round(plan.price / plan.duration_months);

  return (
    <div
      className={`catalog-plan border transition-colors duration-150 flex flex-col justify-between relative ${
        isLight
          ? 'bg-paper border-rule hover:border-rule-strong text-ink'
          : `${currentTheme.mainContainerBg} ${currentTheme.mainContainerBorder} hover:border-rule-strong text-accent-ink`
      } ${
        isSelectedForCompare ? 'ring-2' : ''
      }`}
      style={{
        borderColor: isSelectedForCompare ? currentTheme.primaryColor : undefined,
        boxShadow: isSelectedForCompare ? `0 0 0 2px ${currentTheme.primaryColor}` : undefined,
      }}
    >
      {/* Top Banner & Metadata Row */}
      <div>
        <div className="p-5 pb-3 space-y-3">
          {/* Operator & Type */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs">
                {currentLang === 'ta' && opInfo.tamil ? opInfo.tamil : opInfo.name}
              </span>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  plan.type === 'HD'
                    ? `bg-warning-soft ${isLight ? 'text-warning' : 'text-warning'} border border-rule`
                      : `bg-accent-soft ${isLight ? 'text-accent' : 'text-accent'} border border-rule`
                }`}
              >
                {plan.type}
              </span>
            </div>

            {/* Compare Checkbox */}
            <button
              type="button"
              onClick={() => onToggleCompare(plan)}
              disabled={!isSelectedForCompare && !canAddToCompare}
              className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1.5 ${
                isSelectedForCompare
                  ? 'text-accent-ink border-transparent shadow-xs'
                  : !canAddToCompare
                  ? 'opacity-40 cursor-not-allowed border-rule-strong'
                  : isLight
                  ? 'bg-paper-2 border-rule text-ink hover:bg-paper-2'
                  : 'bg-paper border-rule-strong text-muted hover:bg-paper'
              }`}
              style={{
                backgroundColor: isSelectedForCompare ? currentTheme.primaryColor : undefined,
              }}
              title={!canAddToCompare && !isSelectedForCompare ? 'Max 3 plans can be compared' : t.addToCompare}
            >
              {isSelectedForCompare ? (
                <CheckSquare className="w-3.5 h-3.5" />
              ) : (
                <Square className="w-3.5 h-3.5 opacity-80" />
              )}
              <span className="text-xs font-medium">{t.addToCompare}</span>
            </button>
          </div>

          {/* Ranking & Highlight Tags */}
          <div className="flex flex-wrap items-center gap-1.5 min-h-[24px]">
            {plan.is_best_value && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold bg-warning-soft ${isLight ? 'text-warning' : 'text-warning'} border border-rule flex items-center gap-1`}>
                <Zap className="w-3 h-3 fill-warning text-warning" />
                <span>{t.saveBadge}</span>
              </span>
            )}

            {plan.is_best_savings && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold bg-success-soft ${isLight ? 'text-success' : 'text-success'} border border-rule flex items-center gap-1`}>
                <Percent className="w-3 h-3 text-success" />
                <span>{t.bestSavings}</span>
              </span>
            )}

            {plan.is_recommended && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold bg-accent-soft ${isLight ? 'text-accent' : 'text-accent'} border border-rule flex items-center gap-1`}>
                <Crown className="w-3 h-3 text-accent" />
                <span>{t.popularBadge}</span>
              </span>
            )}

            {(plan.savings_pct || 0) > 0 && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold bg-success-soft ${isLight ? 'text-success' : 'text-success'} border border-rule`}>
                {plan.savings_pct}% Off
              </span>
            )}
          </div>

          {/* Plan Name */}
          <h3 className="font-bold text-base leading-snug break-words">
            {currentLang === 'ta' && plan.tamilName ? plan.tamilName : plan.name}
          </h3>

          {/* Channels & Duration Breakdown */}
          <div className={`plan-facts grid grid-cols-2 gap-3 text-sm ${
            isLight ? 'bg-paper-2 border-rule' : 'bg-scrim/25 border-rule-strong'
          }`}>
            <div className="space-y-0.5">
              <span className={`text-xs block font-medium ${isLight ? 'text-ink-2' : 'text-muted'}`}>
                {t.channels}
              </span>
              <span className="font-bold text-sm">
                {plan.channel_count}{' '}
                {plan.hd_channel_count ? (
                  <span className="text-warning text-xs">({plan.hd_channel_count} HD)</span>
                ) : null}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className={`text-xs block font-medium ${isLight ? 'text-ink-2' : 'text-muted'}`}>
                {t.validity}
              </span>
              <span className="font-bold text-sm">
                {plan.duration_months === 1 ? `1 ${t.month}` : `${plan.duration_months} ${t.months}`}
              </span>
            </div>
          </div>
        </div>

        {/* Pricing Area */}
        <div className="px-5 py-3 border-t border-rule  flex items-baseline justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold tabular-nums tracking-tight" style={{ color: currentTheme.primaryColor }}>
                ₹{plan.price}
              </span>
              <span className="text-xs text-muted ">
                / {plan.duration_months === 1 ? `1 ${t.month}` : `${plan.duration_months} ${t.months}`}
              </span>
            </div>
            {plan.duration_months > 1 && (
              <p className="text-xs text-muted  font-medium">
                ₹{monthlyRate} {t.perMonth}
              </p>
            )}
          </div>

          <div className="text-right">
            <span className="text-xs font-mono text-muted  block">
              ₹{(plan.price / Math.max(1, plan.channel_count)).toFixed(1)} / ch
            </span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="p-4 pt-2">
        <button
          type="button"
          onClick={() => onSelectPlan(plan)}
          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-accent-ink transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
          style={{ backgroundColor: currentTheme.primaryColor }}
        >
          <span>{t.selectThisPack}</span>

        </button>
      </div>
    </div>
  );
};
