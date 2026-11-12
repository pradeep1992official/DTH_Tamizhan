import { formatPrice, formatDuration } from '../../lib/catalog';
import React from 'react';
import { X, Scale, ArrowRight, Trash2, CheckCircle2 } from '../../lib/icons';
import { BrowsePlan, Language } from '../../types';
import { OperatorTheme } from '../../lib/theme';
import { translations } from '../../lib/translations';

interface CompareDrawerProps {
  selectedPlans: BrowsePlan[];
  onRemovePlan: (planId: string) => void;
  onClearAll: () => void;
  onOpenCompareModal: () => void;
  currentTheme: OperatorTheme;
  currentLang: Language;
}

const OPERATOR_SHORT: Record<string, string> = {
  sun_direct: 'Sun Direct',
  tata_play: 'Tata Play',
  airtel_dth: 'Airtel TV',
  dish_tv: 'Dish TV & D2H',
  d2h: 'Dish TV & D2H',
};

export const CompareDrawer: React.FC<CompareDrawerProps> = ({
  selectedPlans,
  onRemovePlan,
  onClearAll,
  onOpenCompareModal,
  currentTheme,
  currentLang,
}) => {
  const t = translations[currentLang];
  if (selectedPlans.length === 0) return null;

  const isLight = currentTheme.isLightMode;

  return (
    <div className="compare-tray fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-4xl px-4 duration-300">
      <div
        className={`rounded-lg border p-3 sm:p-4 shadow-lg  flex flex-wrap items-center justify-between gap-3 ${
          isLight
            ? 'bg-paper border-rule text-ink'
            : 'bg-paper-2 border-rule text-ink'
        }`}
      >
        {/* Left info & chips */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 pr-2 border-r border-rule">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-ink"
              style={{ backgroundColor: currentTheme.primaryColor }}
            >
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold block">
                {t.comparePacks} ({selectedPlans.length}/3)
              </span>
              <span className="text-sm text-muted">
                {selectedPlans.length < 2 ? t.selectAtLeastTwo : t.readyToCompare}
              </span>
            </div>
          </div>

          {/* Selected plan chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {selectedPlans.map((plan) => (
              <div
                key={plan.id}
                className={`px-2.5 py-1.5 rounded-xl border text-sm flex items-center gap-2 transition-colors ${
                  isLight
                    ? 'bg-paper-2 border-rule text-ink'
                    : 'bg-paper border-rule text-muted'
                }`}
              >
                <div className="text-left">
                  <span className="font-bold truncate max-w-[120px] block leading-tight">
                    {plan.name}
                  </span>
                  <span className="text-sm text-muted tabular-nums">
                    {formatPrice(plan.price, currentLang)} • {plan.type}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemovePlan(plan.id)}
                  className="p-1 rounded-full hover:bg-paper-2 text-muted hover:text-error transition-colors"
                  title="Remove from comparison"
                  aria-label={`Remove ${plan.name} from comparison`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={onClearAll}
            className={`text-sm px-3 py-2 rounded-xl transition-colors font-medium flex items-center gap-1 ${
              isLight ? 'text-muted hover:text-ink' : 'text-muted hover:text-ink'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t.clearAll}</span>
          </button>

          <button
            type="button"
            disabled={selectedPlans.length < 2}
            onClick={onOpenCompareModal}
            className={`dialog-primary px-4 py-2 rounded-xl text-sm font-bold text-ink shadow-lg flex items-center gap-1.5 transition-colors ${
              selectedPlans.length < 2
                ? 'opacity-50 cursor-not-allowed'
                : ' '
            }`}
            style={{
              backgroundColor: selectedPlans.length >= 2 ? currentTheme.primaryColor : 'var(--color-muted)',
            }}
          >
            <span>{t.comparePacks} ({selectedPlans.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
