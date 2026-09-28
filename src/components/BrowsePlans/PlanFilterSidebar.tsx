import React from 'react';
import { 
  Filter, 
  RotateCcw, 
  Check, 
  Sparkles, 
  Tv, 
  Tag, 
  Clock, 
  Layers, 
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { DthOperatorId, Language, PlanFilters } from '../../types';
import { OPERATOR_THEMES, OperatorTheme } from '../../lib/theme';

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

const GENRE_TAGS = [
  { id: 'tamil', label: 'Tamil' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'movies', label: 'Movies' },
  { id: 'sports', label: 'Sports' },
  { id: 'news', label: 'News' },
  { id: 'kids', label: 'Kids' },
  { id: 'music', label: 'Music' },
];

const DURATIONS: { value: 1 | 3 | 6 | 12; label: string }[] = [
  { value: 1, label: '1 Month' },
  { value: 3, label: '3 Months' },
  { value: 6, label: '6 Months' },
  { value: 12, label: '12 Months' },
];

export const PlanFilterSidebar: React.FC<PlanFilterSidebarProps> = ({
  filters,
  onChange,
  onReset,
  currentTheme,
  currentLang,
  totalResults,
}) => {
  const isLight = currentTheme.isLightMode;

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

  const handleGenreToggle = (tagId: string) => {
    const exists = filters.genreTags.includes(tagId);
    const updated = exists
      ? filters.genreTags.filter((t) => t !== tagId)
      : [...filters.genreTags, tagId];
    onChange({ ...filters, genreTags: updated });
  };

  // Active filters count
  const activeFiltersCount = 
    filters.operators.length +
    (filters.type !== 'all' ? 1 : 0) +
    filters.durations.length +
    filters.genreTags.length +
    (filters.priceRange[1] < 4000 || filters.priceRange[0] > 150 ? 1 : 0) +
    (filters.channelRange[0] > 50 || filters.channelRange[1] < 300 ? 1 : 0);

  return (
    <div 
      className={`rounded-3xl border p-5 sm:p-6 space-y-6 shadow-lg transition-all ${
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
              className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: currentTheme.primaryColor }}
            >
              {activeFiltersCount}
            </span>
          )}
          {totalResults === 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40">
              0 results
            </span>
          )}
        </div>

        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className={`text-xs font-semibold flex items-center gap-1 transition-colors ${
              isLight ? 'text-gray-500 hover:text-gray-900' : 'text-gray-400 hover:text-white'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* 1. DTH Operators Filter (Multi-Select) */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold uppercase tracking-wider opacity-70 block">
          Operator
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
                      ? 'bg-gray-100 border-gray-400 shadow-xs'
                      : 'bg-white/15 border-white/40 shadow-sm'
                    : isLight
                    ? 'bg-gray-50/70 border-gray-200 hover:bg-gray-100 text-gray-700'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span 
                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: op.color }}
                  />
                  <span>{op.name}</span>
                </div>
                <div 
                  className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                    isSelected 
                      ? 'text-white border-transparent' 
                      : 'border-gray-400/40 bg-transparent'
                  }`}
                  style={{
                    backgroundColor: isSelected ? op.color : undefined,
                  }}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. HD / SD Quality Toggle */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold uppercase tracking-wider opacity-70">
          Quality
        </label>
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-gray-500/10 border border-gray-500/15">
          {(['all', 'HD', 'SD'] as const).map((t) => {
            const isSelected = filters.type === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => onChange({ ...filters, type: t })}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                  isSelected
                    ? 'text-white shadow-md'
                    : isLight
                    ? 'text-gray-600 hover:text-black'
                    : 'text-gray-300 hover:text-white'
                }`}
                style={{
                  backgroundColor: isSelected ? currentTheme.primaryColor : undefined,
                }}
              >
                {t === 'all' ? 'All' : t}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Duration Selector (1 / 3 / 6 / 12 Months) */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold uppercase tracking-wider opacity-70 flex items-center justify-between">
          <span>Validity</span>
          <Clock className="w-3.5 h-3.5 opacity-60" />
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
                    ? 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
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
        <div className="flex items-center justify-between text-xs">
          <label className="font-bold uppercase tracking-wider opacity-70">
            Price Range
          </label>
          <span className="font-mono font-bold" style={{ color: currentTheme.primaryColor }}>
            ₹{filters.priceRange[0]} — ₹{filters.priceRange[1]}
          </span>
        </div>
        <div className="space-y-1">
          <input
            type="range"
            min={150}
            max={4000}
            step={50}
            value={filters.priceRange[1]}
            onChange={(e) => {
              const maxVal = parseInt(e.target.value, 10);
              onChange({
                ...filters,
                priceRange: [filters.priceRange[0], maxVal],
              });
            }}
            className="w-full accent-current h-2 bg-gray-500/20 rounded-lg cursor-pointer"
            style={{ color: currentTheme.primaryColor }}
          />
          <div className="flex justify-between text-[10px] opacity-60 font-mono">
            <span>₹150</span>
            <span>₹2,000</span>
            <span>₹4,000</span>
          </div>
        </div>
      </div>

      {/* 5. Channel Count Range Slider */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <label className="font-bold uppercase tracking-wider opacity-70">
            Channels
          </label>
          <span className="font-mono font-bold" style={{ color: currentTheme.primaryColor }}>
            {filters.channelRange[0]}+ Channels
          </span>
        </div>
        <div className="space-y-1">
          <input
            type="range"
            min={50}
            max={250}
            step={10}
            value={filters.channelRange[0]}
            onChange={(e) => {
              const minVal = parseInt(e.target.value, 10);
              onChange({
                ...filters,
                channelRange: [minVal, filters.channelRange[1]],
              });
            }}
            className="w-full accent-current h-2 bg-gray-500/20 rounded-lg cursor-pointer"
            style={{ color: currentTheme.primaryColor }}
          />
          <div className="flex justify-between text-[10px] opacity-60 font-mono">
            <span>50</span>
            <span>150</span>
            <span>250+</span>
          </div>
        </div>
      </div>

      {/* 6. Genre Tags */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold uppercase tracking-wider opacity-70 flex items-center justify-between">
          <span>Genres</span>
          <Tag className="w-3.5 h-3.5 opacity-60" />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {GENRE_TAGS.map((g) => {
            const isSelected = filters.genreTags.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => handleGenreToggle(g.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all flex items-center gap-1 ${
                  isSelected
                    ? 'text-white border-transparent shadow-xs'
                    : isLight
                    ? 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300'
                }`}
                style={{
                  backgroundColor: isSelected ? currentTheme.primaryColor : undefined,
                }}
              >
                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                <span>{g.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
