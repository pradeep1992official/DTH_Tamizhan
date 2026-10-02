import React from 'react';
import { 
  RotateCcw, 
  Check, 
  Clock, 
  SlidersHorizontal
} from 'lucide-react';
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
}

const ALL_OPERATORS: { id: DthOperatorId; name: string; tamilName: string; color: string }[] = [
  { id: 'sun_direct', name: 'Sun Direct', tamilName: 'சன் டைரக்ட்', color: '#F97316' },
  { id: 'tata_play', name: 'Tata Play', tamilName: 'டாடா பிளே', color: '#EC4899' },
  { id: 'airtel_dth', name: 'Airtel Digital TV', tamilName: 'ஏர்டெல் டிவி', color: '#EF4444' },
  { id: 'dish_tv', name: 'Dish TV', tamilName: 'டிஷ் டிவி', color: '#EB5B26' },
  { id: 'd2h', name: 'D2H Videocon', tamilName: 'டி2எச்', color: '#8B5CF6' },
];

export const PlanFilterSidebar: React.FC<PlanFilterSidebarProps> = ({
  filters,
  onChange,
  onReset,
  currentTheme,
  currentLang,
  totalResults,
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
    (filters.priceRange[1] < 5000 || filters.priceRange[0] > 100 ? 1 : 0) +
    (filters.channelRange[0] > 0 || filters.channelRange[1] < 500 ? 1 : 0);

  return (
    <div 
      className={`rounded-3xl border p-5 sm:p-6 space-y-6 shadow-sm transition-all ${
        isLight 
          ? 'bg-white border-gray-200 text-gray-900' 
          : `${currentTheme.mainContainerBg} ${currentTheme.mainContainerBorder} text-white`
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4 border-gray-500/20">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5" style={{ color: currentTheme.primaryColor }} />
          <h3 className="font-bold text-base">
            {currentLang === 'ta' ? 'வடிகட்டிகள்' : 'Filters'}
          </h3>
          {activeFiltersCount > 0 && (
            <span 
              className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
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
            className="text-xs font-bold flex items-center gap-1 transition-colors text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.resetFilters}</span>
          </button>
        )}
      </div>

      {/* 1. DTH Operators Filter */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold uppercase tracking-wider opacity-90 block">
          {t.filterByOperator}
        </label>
        <div className="space-y-1.5">
          {ALL_OPERATORS.map((op) => {
            const isSelected = filters.operators.includes(op.id);
            return (
              <button
                key={op.id}
                type="button"
                onClick={() => handleOperatorToggle(op.id)}
                className={`w-full px-3 py-2 rounded-xl text-left border text-xs font-semibold flex items-center justify-between transition-all ${
                  isSelected
                    ? isLight
                      ? 'bg-gray-100 border-gray-400 shadow-xs text-gray-900'
                      : 'bg-white/15 border-white/40 shadow-sm text-white'
                    : isLight
                    ? 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-800'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span 
                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: op.color }}
                  />
                  <span>{currentLang === 'ta' && op.tamilName ? op.tamilName : op.name}</span>
                </div>
                <div 
                  className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                    isSelected 
                      ? 'text-white border-transparent' 
                      : 'border-gray-400 bg-transparent'
                  }`}
                  style={{
                    backgroundColor: isSelected ? op.color : undefined,
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
        <label className="text-xs font-bold uppercase tracking-wider opacity-90">
          {t.filterByQuality}
        </label>
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-gray-500/10 border border-gray-500/20">
          {(['all', 'HD', 'SD'] as const).map((typeVal) => {
            const isSelected = filters.type === typeVal;
            return (
              <button
                key={typeVal}
                type="button"
                onClick={() => onChange({ ...filters, type: typeVal })}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                  isSelected
                    ? 'text-white shadow-md'
                    : isLight
                    ? 'text-gray-700 hover:text-black'
                    : 'text-gray-300 hover:text-white'
                }`}
                style={{
                  backgroundColor: isSelected ? currentTheme.primaryColor : undefined,
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
        <label className="text-xs font-bold uppercase tracking-wider opacity-90 flex items-center justify-between">
          <span>{t.filterByDuration}</span>
          <Clock className="w-3.5 h-3.5 opacity-80" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          {DURATIONS.map((dur) => {
            const isSelected = filters.durations.includes(dur.value);
            return (
              <button
                key={dur.value}
                type="button"
                onClick={() => handleDurationToggle(dur.value)}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold text-center transition-all flex items-center justify-center gap-1.5 ${
                  isSelected
                    ? 'text-white border-transparent shadow-sm'
                    : isLight
                    ? 'bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100'
                    : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'
                }`}
                style={{
                  backgroundColor: isSelected ? currentTheme.primaryColor : undefined,
                }}
              >
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                <span>{dur.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Price Range Slider */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold">
          <label className="uppercase tracking-wider opacity-90">
            {t.filterByPrice}
          </label>
          <span className="font-mono" style={{ color: currentTheme.primaryColor }}>
            ₹{filters.priceRange[0]} - ₹{filters.priceRange[1]}
          </span>
        </div>
        <input
          type="range"
          min="100"
          max="5000"
          step="50"
          value={filters.priceRange[1]}
          onChange={(e) =>
            onChange({
              ...filters,
              priceRange: [filters.priceRange[0], parseInt(e.target.value, 10)],
            })
          }
          className="w-full accent-amber-500 cursor-pointer"
        />
      </div>

      {/* 5. Channel Count Range Slider */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold">
          <label className="uppercase tracking-wider opacity-90">
            {t.filterByChannels}
          </label>
          <span className="font-mono text-emerald-600 dark:text-emerald-400">
            {filters.channelRange[0]}+ {t.channels}
          </span>
        </div>
        <input
          type="range"
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
  );
};
