import React from 'react';
import { 
  X, 
  Scale, 
  Check, 
  Zap, 
  Percent, 
  Crown, 
  ArrowRight, 
  Tv, 
  Trash2
} from 'lucide-react';
import { BrowsePlan, Language } from '../../types';
import { OperatorTheme } from '../../lib/theme';
import { translations } from '../../lib/translations';
import { useAccessibleModal } from '../../lib/useAccessibleModal';

interface ComparisonTableProps {
  isOpen: boolean;
  onClose: () => void;
  plans: BrowsePlan[];
  onRemovePlan?: (id: string) => void;
  onSelectPlan: (plan: BrowsePlan) => void;
  currentTheme: OperatorTheme;
  currentLang: Language;
}

const OPERATOR_DATA: Record<string, { name: string; color: string }> = {
  sun_direct: { name: 'Sun Direct', color: '#F97316' },
  tata_play: { name: 'Tata Play', color: '#EC4899' },
  airtel_dth: { name: 'Airtel Digital TV', color: '#EF4444' },
  dish_tv: { name: 'Dish TV & D2H', color: '#EB5B26' },
  d2h: { name: 'Dish TV & D2H', color: '#EB5B26' },
};

export const ComparisonTable: React.FC<ComparisonTableProps> = ({
  isOpen,
  onClose,
  plans,
  onRemovePlan,
  onSelectPlan,
  currentTheme,
  currentLang,
}) => {
  const t = translations[currentLang];
  const { modalRef } = useAccessibleModal({ isOpen, onClose });

  if (!isOpen || plans.length === 0) return null;

  const isLight = currentTheme.isLightMode;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="comparison-modal-title"
        className={`rounded-3xl border w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl text-left ${
          isLight ? 'bg-white border-gray-200 text-gray-900' : 'bg-[#0d172e] border-white/15 text-white'
        }`}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-500/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white"
              style={{ backgroundColor: currentTheme.primaryColor }}
            >
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 id="comparison-modal-title" className="text-lg font-bold">
                {t.comparePacks}
              </h3>
              <p className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                {plans.length} {plans.length === 1 ? t.pack : t.packs} {t.selected}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Content Table (Scrollable) */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="sm:hidden space-y-3">
            {plans.map((plan) => {
              const op = OPERATOR_DATA[plan.operator] || { name: plan.operator, color: currentTheme.primaryColor };
              return (
                <article
                  key={plan.id}
                  className={`rounded-2xl border p-4 ${isLight ? 'border-gray-200 bg-gray-50' : 'border-white/10 bg-white/5'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="inline-flex rounded px-2 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: op.color }}>
                        {op.name}
                      </span>
                      <h4 className="mt-2 break-words font-bold">{plan.name}</h4>
                    </div>
                    {onRemovePlan && (
                      <button
                        type="button"
                        onClick={() => onRemovePlan(plan.id)}
                        aria-label={`Remove ${plan.name} from comparison`}
                        className="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-rose-500/10 hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <p className="mt-3 text-2xl font-extrabold" style={{ color: currentTheme.primaryColor }}>₹{plan.price}</p>
                  <dl className={`mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-3 text-xs ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
                    <dt className={isLight ? 'text-gray-600' : 'text-gray-300'}>{t.qualityLabel}</dt>
                    <dd className="text-right font-semibold">{plan.type} {t.clarity}</dd>
                    <dt className={isLight ? 'text-gray-600' : 'text-gray-300'}>{t.channels}</dt>
                    <dd className="text-right font-semibold">{plan.channel_count} {t.total}</dd>
                    <dt className={isLight ? 'text-gray-600' : 'text-gray-300'}>{t.validity}</dt>
                    <dd className="text-right font-semibold">{plan.duration_months === 1 ? `1 ${t.month}` : `${plan.duration_months} ${t.months}`}</dd>
                    <dt className={isLight ? 'text-gray-600' : 'text-gray-300'}>{t.monthlyEquivalent}</dt>
                    <dd className="text-right font-semibold">₹{plan.monthly_equivalent_rate || Math.round(plan.price / plan.duration_months)} {t.perMonth}</dd>
                    <dt className={isLight ? 'text-gray-600' : 'text-gray-300'}>{t.savingsPercent}</dt>
                    <dd className="text-right font-semibold">{(plan.savings_pct || 0) > 0 ? `${plan.savings_pct}% ${t.saved}` : t.standardRate}</dd>
                  </dl>
                  <button
                    type="button"
                    onClick={() => onSelectPlan(plan)}
                    className="mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                    style={{ backgroundColor: currentTheme.primaryColor }}
                  >
                    {t.selectThisPack}
                  </button>
                </article>
              );
            })}
          </div>

          <div className="hidden sm:block min-w-[640px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 w-1/4 border-b border-gray-500/20">
                    {t.feature}
                  </th>
                  {plans.map((p) => {
                    const op = OPERATOR_DATA[p.operator] || { name: p.operator, color: currentTheme.primaryColor };
                    return (
                      <th key={p.id} className="p-3 border-b border-gray-500/20 align-top">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span 
                              className="text-xs font-bold px-2 py-0.5 rounded text-white"
                              style={{ backgroundColor: op.color }}
                            >
                              {op.name}
                            </span>
                            {onRemovePlan && (
                              <button
                                type="button"
                                onClick={() => onRemovePlan(p.id)}
                                className="text-gray-400 hover:text-rose-500 p-1"
                                title="Remove from compare"
                                aria-label={`Remove ${p.name} from comparison`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <h4 className="font-bold text-sm break-words">{p.name}</h4>
                          <span className="text-xl font-extrabold block" style={{ color: currentTheme.primaryColor }}>
                            ₹{p.price}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-500/20 text-xs">
                <tr>
                  <td className={`p-3 font-semibold ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>{t.qualityLabel}</td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-3 font-bold">
                      <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                        p.type === 'HD'
                          ? `bg-amber-500/20 ${isLight ? 'text-amber-900' : 'text-amber-200'}`
                          : `bg-blue-500/20 ${isLight ? 'text-blue-900' : 'text-blue-200'}`
                      }`}>
                        {p.type} {t.clarity}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className={`p-3 font-semibold ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>{t.channels}</td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-3 font-bold">
                      {p.channel_count} {t.total} {p.hd_channel_count ? `(${p.hd_channel_count} HD)` : ''}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className={`p-3 font-semibold ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>{t.validity}</td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-3 font-bold">
                      {p.duration_months === 1 ? `1 ${t.month}` : `${p.duration_months} ${t.months}`}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className={`p-3 font-semibold ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>{t.monthlyEquivalent}</td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-3 font-mono font-bold text-amber-500">
                      ₹{p.monthly_equivalent_rate || Math.round(p.price / p.duration_months)} {t.perMonth}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className={`p-3 font-semibold ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>{t.savingsPercent}</td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-3 font-bold text-emerald-500">
                      {(p.savings_pct || 0) > 0 ? `${p.savings_pct}% ${t.saved}` : t.standardRate}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className={`p-3 font-semibold ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>{t.action}</td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-3">
                      <button
                        type="button"
                        onClick={() => onSelectPlan(p)}
                        className="w-full py-2 px-3 rounded-xl font-bold text-xs text-white shadow-sm flex items-center justify-center gap-1.5 transition-transform hover:scale-105 active:scale-95"
                        style={{ backgroundColor: currentTheme.primaryColor }}
                      >
                        <span>{t.selectThisPack}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
