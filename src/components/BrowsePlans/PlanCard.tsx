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
  BadgePercent,
  Layers
} from 'lucide-react';
import { BrowsePlan, Language } from '../../types';
import { OperatorTheme, OPERATOR_THEMES } from '../../lib/theme';

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
  sun_direct: { name: 'Sun Direct', tamil: 'சன் டைரக்ட்', color: '#F97316' },
  tata_play: { name: 'Tata Play', tamil: 'டாடா பிளே', color: '#EC4899' },
  airtel_dth: { name: 'Airtel Digital TV', tamil: 'ஏர்டெல் டிவி', color: '#EF4444' },
  dish_tv: { name: 'Dish TV', tamil: 'டிஷ் டிவி', color: '#EB5B26' },
  d2h: { name: 'D2H Videocon', tamil: 'டி2எச்', color: '#8B5CF6' },
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
  const isLight = currentTheme.isLightMode;
  const opInfo = OPERATOR_NAMES[plan.operator] || {
    name: plan.operator,
    tamil: '',
    color: currentTheme.primaryColor,
  };

  const monthlyRate = plan.monthly_equivalent_rate || Math.round(plan.price / plan.duration_months);

  return (
    <div 
      className={`rounded-3xl border transition-all duration-300 flex flex-col justify-between relative overflow-hidden group hover:shadow-xl ${
        isLight 
          ? 'bg-white border-gray-200 hover:border-gray-300' 
          : `${currentTheme.mainContainerBg} ${currentTheme.mainContainerBorder} hover:border-white/30`
      } ${
        isSelectedForCompare ? 'ring-2' : ''
      }`}
      style={{
        borderColor: isSelectedForCompare ? currentTheme.primaryColor : undefined,
        boxShadow: isSelectedForCompare ? `0 0 0 2px ${currentTheme.primaryColor}` : undefined,
      }}
    >
      {/* Top Banner & Badges Row */}
      <div>
        <div className="p-5 pb-3 space-y-3">
          {/* Operator Badge & Badges Row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span 
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: opInfo.color }}
              />
              <span className="font-bold text-xs uppercase tracking-wider opacity-80">
                {opInfo.name}
              </span>
              <span 
                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                  plan.type === 'HD' 
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30' 
                    : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
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
              className={`text-xs font-semibold px-2 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                isSelectedForCompare
                  ? 'text-white border-transparent shadow-xs'
                  : !canAddToCompare
                  ? 'opacity-40 cursor-not-allowed border-gray-500/20'
                  : isLight
                  ? 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
              }`}
              style={{
                backgroundColor: isSelectedForCompare ? currentTheme.primaryColor : undefined,
              }}
              title={!canAddToCompare && !isSelectedForCompare ? 'Maximum 3 plans can be compared' : 'Add to compare'}
            >
              {isSelectedForCompare ? (
                <CheckSquare className="w-3.5 h-3.5" />
              ) : (
                <Square className="w-3.5 h-3.5 opacity-70" />
              )}
              <span className="text-[11px] font-medium">Compare</span>
            </button>
          </div>

          {/* Computed Ranking Badges */}
          <div className="flex flex-wrap items-center gap-1.5 min-h-[24px]">
            {/* 1. Best Value: Lowest price_per_channel */}
            {plan.is_best_value && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 flex items-center gap-1 shadow-xs">
                <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />
                <span>Best Value</span>
              </span>
            )}

            {/* 2. Best Savings: Highest savings_pct */}
            {plan.is_best_savings && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow-xs">
                <Percent className="w-3 h-3 text-emerald-500" />
                <span>Best Savings</span>
              </span>
            )}

            {/* 3. Recommended: Curated flag */}
            {plan.is_recommended && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/40 flex items-center gap-1 shadow-xs">
                <Crown className="w-3 h-3 fill-purple-500 text-purple-500" />
                <span>Recommended</span>
              </span>
            )}

            {/* Duration Pill */}
            <span className="ml-auto text-xs font-mono font-bold opacity-80">
              {plan.duration_months === 1 ? '1 Month' : `${plan.duration_months} Months`}
            </span>
          </div>

          {/* Plan Name & Tamil Subtitle */}
          <div>
            <h4 className={`text-base sm:text-lg font-bold ${currentTheme.headingText} line-clamp-1`}>
              {plan.name}
            </h4>
            {plan.tamilName && (
              <p className="text-xs opacity-80 mt-0.5 font-medium">
                {plan.tamilName}
              </p>
            )}
          </div>

          {/* Pricing Row */}
          <div className="pt-2 flex items-baseline justify-between border-t border-gray-500/10">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight" style={{ color: currentTheme.primaryColor }}>
                  ₹{plan.price}
                </span>
                <span className="text-xs font-medium opacity-80">
                  / {plan.duration_months === 1 ? 'month' : `${plan.duration_months} mos`}
                </span>
              </div>
              {plan.duration_months > 1 && (
                <p className="text-xs opacity-80 mt-0.5">
                  <strong className={isLight ? 'text-gray-900 font-bold' : 'text-white font-bold'}>₹{monthlyRate}</strong>/mo
                </p>
              )}
            </div>

            {/* Savings Percentage Badge if > 0 */}
            {(plan.savings_pct || 0) > 0 && (
              <div className="text-right">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                  <BadgePercent className="w-3.5 h-3.5" />
                  <span>{plan.savings_pct}% Off</span>
                </span>
              </div>
            )}
          </div>

          {/* Key Metrics Row (Price / Channel + Total Channels) */}
          <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
            <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
              <span className="text-[11px] uppercase font-bold opacity-75 block">Per Channel</span>
              <span className="font-mono font-bold text-xs mt-0.5 block" style={{ color: currentTheme.primaryColor }}>
                ₹{plan.price_per_channel || (Math.round((plan.price / Math.max(1, plan.channel_count)) * 100) / 100)} / ch
              </span>
            </div>

            <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
              <span className="text-[11px] uppercase font-bold opacity-75 block">Channels</span>
              <span className="font-mono font-bold text-xs mt-0.5 block">
                {plan.channel_count} {plan.hd_channel_count ? `(${plan.hd_channel_count} HD)` : ''}
              </span>
            </div>
          </div>

          {/* Key Channels Preview */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] uppercase font-bold tracking-wide opacity-75 block">
              Channels Included
            </span>
            <div className="flex flex-wrap gap-1">
              {plan.channels.slice(0, 5).map((ch, idx) => (
                <span
                  key={idx}
                  className={`text-[11px] px-2 py-0.5 rounded-md border font-medium truncate max-w-[120px] ${
                    isLight 
                      ? 'bg-gray-100 text-gray-800 border-gray-200' 
                      : 'bg-white/5 text-gray-300 border-white/10'
                  }`}
                >
                  {ch}
                </span>
              ))}
              {plan.channels.length > 5 && (
                <span className="text-[11px] px-1.5 py-0.5 rounded-md opacity-75 font-mono font-medium">
                  +{plan.channels.length - 5} more
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card Action Footer */}
      <div className={`p-4 border-t ${isLight ? 'bg-gray-50/80 border-gray-200' : 'bg-black/20 border-white/10'}`}>
        <button
          type="button"
          onClick={() => onSelectPlan(plan)}
          className="w-full py-2.5 px-4 rounded-xl text-sm font-bold text-white shadow-md transition-all flex items-center justify-center gap-2 group-hover:scale-[1.01] active:scale-[0.99]"
          style={{
            backgroundColor: currentTheme.primaryColor,
          }}
        >
          <span>{currentLang === 'ta' ? 'திட்டத்தை தேர்வு செய்க' : 'Select Plan'}</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
};
