import { formatPrice, formatMonthlyEquivalent, formatDuration, formatChannelCounts, validateCatalogPack } from '../../lib/catalog';
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
} from '../../lib/icons';
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
  sun_direct: { name: 'Sun Direct', color: 'var(--operator-sun-direct)' },
  tata_play: { name: 'Tata Play', color: 'var(--operator-tata-play)' },
  airtel_dth: { name: 'Airtel Digital TV', color: 'var(--operator-airtel-dth)' },
  dish_tv: { name: 'Dish TV & D2H', color: 'var(--operator-dish-tv)' },
  d2h: { name: 'Dish TV & D2H', color: 'var(--operator-dish-tv)' },
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
      className="dialog-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-paper-2 duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="comparison-modal-title"
        className={`hm-dialog rounded-xl border w-full max-w-5xl max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden shadow-lg text-left ${
          isLight ? 'bg-paper border-rule text-ink' : 'bg-paper-2 border-rule text-ink'
        }`}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-rule flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-input flex items-center justify-center text-accent-ink"
              style={{ backgroundColor: currentTheme.primaryColor }}
            >
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 id="comparison-modal-title" className="text-lg font-bold">
                {t.comparePacks}
              </h3>
              <p className={`text-sm ${isLight ? 'text-muted' : 'text-muted'}`}>
                {plans.length} {plans.length === 1 ? t.pack : t.packs} {t.selected}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="p-2 rounded-xl text-muted hover:text-ink hover:bg-paper-2 transition-colors focus-visible:ring-2 focus-visible:ring-focus"
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
                  className={`rounded-lg border p-4 ${isLight ? 'border-rule bg-paper-2' : 'border-rule bg-paper'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="inline-flex rounded px-2 py-0.5 text-sm font-bold text-ink" style={{ backgroundColor: 'var(--color-paper-2)', color: 'var(--color-ink)' }}>
                        {op.name}
                      </span>
                      <h4 className="mt-2 break-words font-bold">{plan.name}</h4>
                    </div>
                    {onRemovePlan && (
                      <button
                        type="button"
                        onClick={() => onRemovePlan(plan.id)}
                        aria-label={`Remove ${plan.name} from comparison`}
                        className="shrink-0 rounded-lg p-2 text-muted hover:bg-error/10 hover:text-error focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <p className="mt-3 text-2xl font-bold" style={{ color: currentTheme.primaryColor }}>{formatPrice(plan.price, currentLang)}</p>
                  <dl className={`mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t pt-3 text-sm ${isLight ? 'border-rule' : 'border-rule'}`}>
                    <dt className={isLight ? 'text-muted' : 'text-muted'}>{t.qualityLabel}</dt>
                    <dd className="text-right font-medium">{plan.type} {t.clarity}</dd>
                    <dt className={isLight ? 'text-muted' : 'text-muted'}>{t.channels}</dt>
                    <dd className="text-right font-medium">{formatChannelCounts(plan, currentLang)}</dd>
                    <dt className={isLight ? 'text-muted' : 'text-muted'}>{t.validity}</dt>
                    <dd className="text-right font-medium">{formatDuration(plan.duration_months, currentLang)}</dd>
                    <dt className={isLight ? 'text-muted' : 'text-muted'}>{t.monthlyEquivalent}</dt>
                    <dd className="text-right font-medium">{formatMonthlyEquivalent(plan.price, plan.duration_months, currentLang)}</dd>
                    <dt className={isLight ? 'text-muted' : 'text-muted'}>{t.savingsPercent}</dt>
                    <dd className="text-right font-medium">{(plan.savings_pct || 0) > 0 ? `${plan.savings_pct}% ${t.saved}` : t.standardRate}</dd>
                  </dl>
                  <button
                    type="button"
                    onClick={() => onSelectPlan(plan)}
                    className="dialog-primary mt-4 w-full rounded-input px-4 py-2.5 text-sm font-bold text-accent-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
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
                  <th className="p-3 text-sm font-bold text-muted w-1/4 border-b border-rule">
                    {t.feature}
                  </th>
                  {plans.map((p) => {
                    const op = OPERATOR_DATA[p.operator] || { name: p.operator, color: currentTheme.primaryColor };
                    return (
                      <th key={p.id} className="p-3 border-b border-rule align-top">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span
                              className="text-sm font-bold px-2 py-0.5 rounded text-ink"
                              style={{ backgroundColor: 'var(--color-paper-2)', color: 'var(--color-ink)' }}
                            >
                              {op.name}
                            </span>
                            {onRemovePlan && (
                              <button
                                type="button"
                                onClick={() => onRemovePlan(p.id)}
                                className="text-muted hover:text-error p-1"
                                title="Remove from compare"
                                aria-label={`Remove ${p.name} from comparison`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <h4 className="font-bold text-sm break-words">{p.name}</h4>
                          <span className="text-xl font-bold block" style={{ color: currentTheme.primaryColor }}>
                            {formatPrice(p.price, currentLang)}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-rule text-sm">
                <tr>
                  <td className={`p-3 font-medium ${isLight ? 'text-muted' : 'text-muted'}`}>{t.qualityLabel}</td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-3 font-bold">
                      <span className={`px-2 py-0.5 rounded text-sm tabular-nums font-bold ${
                        p.type === 'HD'
                          ? `bg-accent-soft ${isLight ? 'text-accent' : 'text-accent'}`
                          : `bg-accent-soft ${isLight ? 'text-accent' : 'text-accent'}`
                      }`}>
                        {p.type} {t.clarity}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className={`p-3 font-medium ${isLight ? 'text-muted' : 'text-muted'}`}>{t.channels}</td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-3 font-bold">
                      {formatChannelCounts(p, currentLang)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className={`p-3 font-medium ${isLight ? 'text-muted' : 'text-muted'}`}>{t.validity}</td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-3 font-bold">
                      {formatDuration(p.duration_months, currentLang)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className={`p-3 font-medium ${isLight ? 'text-muted' : 'text-muted'}`}>{t.monthlyEquivalent}</td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-3 tabular-nums font-bold text-accent">
                      {formatMonthlyEquivalent(p.price, p.duration_months, currentLang)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className={`p-3 font-medium ${isLight ? 'text-muted' : 'text-muted'}`}>{t.savingsPercent}</td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-3 font-bold text-success">
                      {(p.savings_pct || 0) > 0 ? `${p.savings_pct}% ${t.saved}` : t.standardRate}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className={`p-3 font-medium ${isLight ? 'text-muted' : 'text-muted'}`}>{t.action}</td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-3">
                      <button
                        type="button"
                        onClick={() => onSelectPlan(p)}
                        className="dialog-primary w-full py-2 px-3 rounded-input font-bold text-sm text-accent-ink shadow-sm flex items-center justify-center gap-1.5 transition-transform"
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
