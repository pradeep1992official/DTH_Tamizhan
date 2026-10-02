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
  dish_tv: { name: 'Dish TV', color: '#EB5B26' },
  d2h: { name: 'D2H Videocon', color: '#8B5CF6' },
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
              <p className="text-xs text-gray-500 dark:text-gray-300">
                {plans.length} {plans.length === 1 ? 'pack' : 'packs'} selected
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
          <div className="min-w-[640px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 w-1/4 border-b border-gray-500/20">
                    Feature
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
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <h4 className="font-bold text-sm line-clamp-1">{p.name}</h4>
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
                  <td className="p-3 font-semibold text-gray-500 dark:text-gray-400">Quality</td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-3 font-bold">
                      <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                        p.type === 'HD' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300' : 'bg-blue-500/20 text-blue-600 dark:text-blue-300'
                      }`}>
                        {p.type} Clarity
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-gray-500 dark:text-gray-400">{t.channels}</td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-3 font-bold">
                      {p.channel_count} total {p.hd_channel_count ? `(${p.hd_channel_count} HD)` : ''}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-gray-500 dark:text-gray-400">{t.validity}</td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-3 font-bold">
                      {p.duration_months === 1 ? `1 ${t.month}` : `${p.duration_months} ${t.months}`}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-gray-500 dark:text-gray-400">{t.monthlyEquivalent}</td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-3 font-mono font-bold text-amber-500">
                      ₹{p.monthly_equivalent_rate || Math.round(p.price / p.duration_months)} {t.perMonth}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-gray-500 dark:text-gray-400">Savings %</td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-3 font-bold text-emerald-500">
                      {(p.savings_pct || 0) > 0 ? `${p.savings_pct}% Saved` : 'Standard Rate'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-gray-500 dark:text-gray-400">Action</td>
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
