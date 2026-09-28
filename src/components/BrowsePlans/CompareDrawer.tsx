import React from 'react';
import { X, Scale, ArrowRight, Trash2, CheckCircle2 } from 'lucide-react';
import { BrowsePlan, Language } from '../../types';
import { OperatorTheme } from '../../lib/theme';

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
  dish_tv: 'Dish TV',
  d2h: 'D2H Videocon',
};

export const CompareDrawer: React.FC<CompareDrawerProps> = ({
  selectedPlans,
  onRemovePlan,
  onClearAll,
  onOpenCompareModal,
  currentTheme,
  currentLang,
}) => {
  if (selectedPlans.length === 0) return null;

  const isLight = currentTheme.isLightMode;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-4xl px-4 animate-in slide-in-from-bottom duration-300">
      <div 
        className={`rounded-2xl border p-3 sm:p-4 shadow-2xl backdrop-blur-xl flex flex-wrap items-center justify-between gap-3 ${
          isLight 
            ? 'bg-white/95 border-gray-300 text-gray-900' 
            : 'bg-[#0b1428]/95 border-white/20 text-white'
        }`}
      >
        {/* Left info & chips */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 pr-2 border-r border-gray-500/20">
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: currentTheme.primaryColor }}
            >
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold block">
                Compare ({selectedPlans.length}/3)
              </span>
              <span className="text-[10px] opacity-60">
                {selectedPlans.length < 2 ? 'Select at least 2' : 'Ready to compare'}
              </span>
            </div>
          </div>

          {/* Selected plan chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {selectedPlans.map((plan) => (
              <div
                key={plan.id}
                className={`px-2.5 py-1.5 rounded-xl border text-xs flex items-center gap-2 transition-all ${
                  isLight 
                    ? 'bg-gray-100 border-gray-200 text-gray-800' 
                    : 'bg-white/10 border-white/15 text-gray-200'
                }`}
              >
                <div className="text-left">
                  <span className="font-bold truncate max-w-[120px] block leading-tight">
                    {plan.name}
                  </span>
                  <span className="text-[10px] opacity-70 font-mono">
                    ₹{plan.price} • {plan.type}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemovePlan(plan.id)}
                  className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove from comparison"
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
            className={`text-xs px-3 py-2 rounded-xl transition-colors font-medium flex items-center gap-1 ${
              isLight ? 'text-gray-500 hover:text-gray-900' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>

          <button
            type="button"
            disabled={selectedPlans.length < 2}
            onClick={onOpenCompareModal}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg flex items-center gap-1.5 transition-all ${
              selectedPlans.length < 2
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:scale-105 active:scale-95'
            }`}
            style={{
              backgroundColor: selectedPlans.length >= 2 ? currentTheme.primaryColor : '#64748b',
            }}
          >
            <span>Compare ({selectedPlans.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
