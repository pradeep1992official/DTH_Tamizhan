import React from 'react';
import {
  RotateCcw,
  Check,
  Clock,
  SlidersHorizontal
} from '../../lib/icons';
import { DthOperatorId, Language, PlanFilters } from '../../types';
import { OperatorTheme } from '../../lib/theme';
import { translations } from '../../lib/translations';

interface PlanFilterSidebarProps {
  filters: PlanFilters;
  onChange: (updated: PlanFilters) => void;
  onReset: () => void;
  currentTheme: OperatorTheme;
  currentLang: Language;
  totalResults: number;
  priceMaximum?: number;
}

const ALL_OPERATORS: { id: DthOperatorId; name: string; tamilName: string; color: string }[] = [
  { id: 'sun_direct', name: 'Sun Direct', tamilName: 'சன் டைரக்ட்', color: 'var(--operator-sun-direct)' },
  { id: 'tata_play', name: 'Tata Play', tamilName: 'டாடா பிளே', color: 'var(--operator-tata-play)' },
  { id: 'airtel_dth', name: 'Airtel Digital TV', tamilName: 'ஏர்டெல் டிவி', color: 'var(--operator-airtel-dth)' },
  { id: 'dish_tv', name: 'Dish TV & D2H', tamilName: 'டிஷ் டிவி & டி2எச்', color: 'var(--operator-dish-tv)' },
];

export const PlanFilterSidebar: React.FC<PlanFilterSidebarProps> = ({
  filters,
  onChange,
  onReset,
  currentTheme,
  currentLang,
  totalResults,
  priceMaximum = 5000,
}) => {
  const t = translations[currentLang];
  const isLight = currentTheme.isLightMode;

  const DURATIONS: { value: 1 | 3 | 6 | 12; label: string }[] = [
    { value: 1, label: `1 ${t.month}` },
    { value: 3, label: `3 ${t.months}` },
    { value: 6, label: `6 ${t.months}` },
    { value: 12, label: `12 ${t.months}` },
  ];

  const handleOperatorToggle = (opId: DthOperatorId) => {
    const exists = filters.operators.includes(opId);
    const updated = exists
      ? filters.operators.filter((id) => id !== opId)
      : [...filters.operators, opId];
    onChange({ ...filters, operators: updated });
  };

  const handleDurationToggle = (dur: 1 | 3 | 6 | 12) => {
    const exists = filters.durations.includes(dur);
    const updated = exists
      ? filters.durations.filter((d) => d !== dur)
      : [...filters.durations, dur];
    onChange({ ...filters, durations: updated });
  };

  const activeFiltersCount =
    filters.operators.length +
    (filters.type !== 'all' ? 1 : 0) +
    filters.durations.length +
    filters.genreTags.length +
    (filters.priceRange[1] < priceMaximum || filters.priceRange[0] > 100 ? 1 : 0) +
    (filters.channelRange[0] > 0 || filters.channelRange[1] < 500 ? 1 : 0);

  return (
    <div
      className={`filter-panel space-y-4 ${
        isLight
          ? 'bg-paper border-rule text-ink'
          : `${currentTheme.mainContainerBg} ${currentTheme.mainContainerBorder} text-accent-ink`
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4 border-rule-strong">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5" style={{ color: currentTheme.primaryColor }} />
          <h3 className="font-bold text-base">
            {t.filters}
          </h3>
          {activeFiltersCount > 0 && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full text-accent-ink"
              style={{ backgroundColor: currentTheme.primaryColor }}
            >
              {activeFiltersCount}
            </span>
          )}
        </div>

        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs font-bold flex items-center gap-1 transition-colors text-ink-2 hover:text-ink  "
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.resetFilters}</span>
          </button>
        )}
      </div>

      {/* 1. DTH Operators Filter */}
      <div className="space-y-2.5">
        <label className="text-sm font-bold block">
          {t.filterByOperator}
        </label>
        <div className="space-y-1.5">
          {ALL_OPERATORS.map((op) => {
            const isSelected = filters.operators.includes(op.id);
            return (
              <button
                key={op.id}
                data-operator={op.id}
                type="button"
                onClick={() => handleOperatorToggle(op.id)}
                aria-pressed={isSelected}
                className={`w-full px-3 py-2 rounded-xl text-left border text-xs font-medium flex items-center justify-between transition-colors ${
                  isSelected
                    ? isLight
                      ? 'bg-paper-2 border-rule-strong shadow-xs text-ink'
                      : 'bg-paper border-rule-strong shadow-sm text-accent-ink'
                    : isLight
                    ? 'bg-paper-2 border-rule hover:bg-paper-2 text-ink'
                    : 'bg-paper border-rule-strong hover:bg-paper text-muted'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span>{currentLang === 'ta' && op.tamilName ? op.tamilName : op.name}</span>
                </div>
                <div
                  className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'text-accent-ink border-transparent'
                      : 'border-rule-strong bg-transparent'
                  }`}
                  style={{
                    backgroundColor: isSelected ? 'rgba(0, 0, 0, 0.25)' : undefined,
                  }}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. HD / SD Quality Toggle */}
      <div className="space-y-2.5">
        <label className="text-sm font-bold">
          {t.filterByQuality}
        </label>
        <div className="filter-quality grid grid-cols-3 gap-1.5 p-1 rounded-input bg-paper-3">
          {(['all', 'HD', 'SD'] as const).map((typeVal) => {
            const isSelected = filters.type === typeVal;
            return (
              <button
                key={typeVal}
                data-quality={typeVal}
                type="button"
                onClick={() => onChange({ ...filters, type: typeVal })}
                aria-pressed={isSelected}
                className={`py-1.5 rounded-lg text-xs font-bold transition-colors capitalize ${
                  isSelected
                    ? 'text-accent-ink shadow-md'
                    : isLight
                    ? 'text-ink-2 hover:text-ink'
                    : 'text-muted hover:text-accent-ink'
                }`}
                style={{
                  backgroundColor: typeVal === 'all' && isSelected ? currentTheme.primaryColor : undefined,
                }}
              >
                {typeVal === 'all' ? t.allQuality : typeVal}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Duration Selector */}
      <div className="space-y-2.5">
        <label className="text-sm font-bold flex items-center justify-between">
          <span>{t.filterByDuration}</span>
          <Clock className="w-3.5 h-3.5 opacity-80" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          {DURATIONS.map((dur) => {
            const isSelected = filters.durations.includes(dur.value);
            return (
              <button
                key={dur.value}
                data-duration={dur.value}
                type="button"
                onClick={() => handleDurationToggle(dur.value)}
                aria-pressed={isSelected}
                className={`py-2 px-2.5 rounded-xl border text-xs font-medium text-center transition-colors flex items-center justify-center gap-1.5 ${
                  isSelected
                    ? 'text-accent-ink border-transparent shadow-sm'
                    : isLight
                    ? 'bg-paper-2 border-rule text-ink hover:bg-paper-2'
                    : 'bg-paper border-rule-strong text-muted hover:bg-paper'
                }`}

              >
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                <span>{dur.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <details className="catalog-more-filters">
        <summary className="cursor-pointer text-sm font-medium">{t.filterByPrice} &amp; {t.channels}</summary>
        <div className="space-y-4 pt-4">
      {/* 4. Price Range Slider */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold">
          <label>
            {t.filterByPrice}
          </label>
          <span className="font-mono" style={{ color: currentTheme.primaryColor }}>
            Rs. {filters.priceRange[0]} - Rs. {Math.min(filters.priceRange[1], priceMaximum)}
          </span>
        </div>
        <input
          type="range"
          aria-label={t.filterByPrice}
          min="100"
          max={priceMaximum}
          step="50"
          value={Math.min(filters.priceRange[1], priceMaximum)}
          onChange={(e) =>
            onChange({
              ...filters,
              priceRange: [filters.priceRange[0], Number(e.target.value) === priceMaximum ? Infinity : Number(e.target.value)],
            })
          }
          className="w-full accent-amber-500 cursor-pointer"
        />
      </div>

      {/* 5. Channel Count Range Slider */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold">
          <label>
            {t.filterByChannels}
          </label>
          <span className="font-mono text-success ">
            {filters.channelRange[0]}+ {t.channels}
          </span>
        </div>
        <input
          type="range"
          aria-label={t.filterByChannels}
          min="0"
          max="300"
          step="10"
          value={filters.channelRange[0]}
          onChange={(e) =>
            onChange({
              ...filters,
              channelRange: [parseInt(e.target.value, 10), 500],
            })
          }
          className="w-full accent-emerald-500 cursor-pointer"
        />
      </div>
        </div>
      </details>
    </div>
  );
};
