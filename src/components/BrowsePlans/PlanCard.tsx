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
} from 'lucide-react';
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
      className={`rounded-3xl border transition-all duration-300 flex flex-col justify-between relative overflow-hidden group hover:shadow-xl ${
        isLight 
          ? 'bg-white border-gray-200 hover:border-gray-400 text-gray-900' 
          : `${currentTheme.mainContainerBg} ${currentTheme.mainContainerBorder} hover:border-white/30 text-white`
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
              <span 
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: opInfo.color }}
              />
              <span className="font-bold text-xs uppercase tracking-wider opacity-90">
                {currentLang === 'ta' && opInfo.tamil ? opInfo.tamil : opInfo.name}
              </span>
              <span 
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  plan.type === 'HD' 
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40' 
                    : 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/40'
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
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                isSelectedForCompare
                  ? 'text-white border-transparent shadow-xs'
                  : !canAddToCompare
                  ? 'opacity-40 cursor-not-allowed border-gray-400'
                  : isLight
                  ? 'bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200'
                  : 'bg-white/10 border-white/20 text-gray-200 hover:bg-white/20'
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
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />
                <span>{t.saveBadge}</span>
              </span>
            )}

            {plan.is_best_savings && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <Percent className="w-3 h-3 text-emerald-500" />
                <span>{t.bestSavings}</span>
              </span>
            )}

            {plan.is_recommended && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/40 flex items-center gap-1">
                <Crown className="w-3 h-3 text-purple-500" />
                <span>{t.popularBadge}</span>
              </span>
            )}

            {(plan.savings_pct || 0) > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40">
                {plan.savings_pct}% Off
              </span>
            )}
          </div>

          {/* Plan Name */}
          <h3 className="font-bold text-base line-clamp-1 leading-snug">
            {currentLang === 'ta' && plan.tamilName ? plan.tamilName : plan.name}
          </h3>

          {/* Channels & Duration Breakdown */}
          <div className={`grid grid-cols-2 gap-2 p-3 rounded-2xl border text-xs ${
            isLight ? 'bg-gray-50 border-gray-200' : 'bg-black/25 border-white/10'
          }`}>
            <div className="space-y-0.5">
              <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">
                {t.channels}
              </span>
              <span className="font-bold text-sm">
                {plan.channel_count}{' '}
                {plan.hd_channel_count ? (
                  <span className="text-amber-500 text-xs">({plan.hd_channel_count} HD)</span>
                ) : null}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">
                {t.validity}
              </span>
              <span className="font-bold text-sm">
                {plan.duration_months === 1 ? `1 ${t.month}` : `${plan.duration_months} ${t.months}`}
              </span>
            </div>
          </div>
        </div>

        {/* Pricing Area */}
        <div className="px-5 py-3 border-t border-gray-200 dark:border-white/10 flex items-baseline justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold tracking-tight" style={{ color: currentTheme.primaryColor }}>
                ₹{plan.price}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                / {plan.duration_months === 1 ? `1 ${t.month}` : `${plan.duration_months} ${t.months}`}
              </span>
            </div>
            {plan.duration_months > 1 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                ₹{monthlyRate} {t.perMonth}
              </p>
            )}
          </div>

          <div className="text-right">
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400 block">
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
          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
          style={{ backgroundColor: currentTheme.primaryColor }}
        >
          <span>{t.selectThisPack}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
