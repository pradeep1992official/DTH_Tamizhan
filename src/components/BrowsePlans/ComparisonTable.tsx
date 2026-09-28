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
  Clock, 
  Sparkles,
  Layers,
  CheckCircle2,
  Lock,
  AlertCircle
} from 'lucide-react';
import { BrowsePlan, DthConnection, Language, UserProfile } from '../../types';
import { OperatorTheme } from '../../lib/theme';

interface ComparisonTableProps {
  isOpen: boolean;
  onClose: () => void;
  plans: BrowsePlan[];
  onSelectPlan: (plan: BrowsePlan) => void;
  currentTheme: OperatorTheme;
  currentLang: Language;
  user: UserProfile | null;
  connections: DthConnection[];
  onOpenAuth: () => void;
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
  onSelectPlan,
  currentTheme,
  currentLang,
  user,
  connections,
  onOpenAuth,
}) => {
  if (!isOpen || plans.length === 0) return null;

  const isLight = currentTheme.isLightMode;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`rounded-3xl border w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl ${
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
              <h3 className="text-lg font-bold">
                {currentLang === 'ta' ? 'திட்டங்களின் ஒப்பீடு' : 'Compare Plans'}
              </h3>
              <p className="text-xs opacity-60">
                Comparing {plans.length} plans
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl border border-transparent hover:border-gray-500/20 hover:bg-gray-500/10 transition-colors"
          >
            <X className="w-5 h-5 opacity-70" />
          </button>
        </div>

        {/* Comparison Content Table (Scrollable) */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="min-w-[640px]">
            {/* Grid structure: 1st column for feature labels, then 1 column per plan */}
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-3 text-xs font-bold uppercase tracking-wider opacity-60 w-1/4 border-b border-gray-500/20">
                    Feature
                  </th>
                  {plans.map((p) => {
                    const op = OPERATOR_DATA[p.operator] || { name: p.operator, color: currentTheme.primaryColor };
                    return (
                      <th key={p.id} className="p-3 w-1/4 border-b border-gray-500/20 align-top">
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5">
                            <span 
                              className="w-2.5 h-2.5 rounded-full" 
                              style={{ backgroundColor: op.color }}
                            />
                            <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                              {op.name}
                            </span>
                          </div>

                          <h4 className="font-bold text-sm sm:text-base line-clamp-2">
                            {p.name}
                          </h4>

                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight" style={{ color: currentTheme.primaryColor }}>
                              ₹{p.price}
                            </span>
                            <span className="text-xs font-medium opacity-80">
                              / {p.duration_months} mos
                            </span>
                          </div>

                          {/* CTA per column */}
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onSelectPlan(p);
                            }}
                            className="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-1.5 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                            style={{ backgroundColor: currentTheme.primaryColor }}
                          >
                            <span>Select Plan</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-gray-500/10">
                {/* Row 1: Badges */}
                <tr>
                  <td className="p-3 font-semibold opacity-70">Highlights</td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {p.is_best_value && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                            <Zap className="w-3 h-3 fill-amber-500" />
                            Best Value
                          </span>
                        )}
                        {p.is_best_savings && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <Percent className="w-3 h-3" />
                            Best Savings
                          </span>
                        )}
                        {p.is_recommended && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center gap-1">
                            <Crown className="w-3 h-3 fill-purple-500" />
                            Recommended
                          </span>
                        )}
                        {!p.is_best_value && !p.is_best_savings && !p.is_recommended && (
                          <span className="opacity-50">—</span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Row 2: Quality & Type */}
                <tr>
                  <td className="p-3 font-semibold opacity-70">Quality</td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-3 font-bold">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                        p.type === 'HD' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                      }`}>
                        {p.type}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Row 3: Validity */}
                <tr>
                  <td className="p-3 font-semibold opacity-70">Validity</td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-3 font-medium">
                      {p.duration_months * 30} Days
                    </td>
                  ))}
                </tr>

                {/* Row 4: Total Channel Count */}
                <tr>
                  <td className="p-3 font-semibold opacity-70">Channels</td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-3 font-bold text-sm">
                      {p.channel_count} {p.hd_channel_count ? `(${p.hd_channel_count} HD)` : ''}
                    </td>
                  ))}
                </tr>

                {/* Row 5: Price Per Channel */}
                <tr>
                  <td className="p-3 font-semibold opacity-70">Per Channel</td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-3 font-mono font-bold">
                      <span className={p.is_best_value ? 'text-amber-500 font-black' : ''}>
                        ₹{p.price_per_channel || (Math.round((p.price / Math.max(1, p.channel_count)) * 100) / 100)} / ch
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Row 6: Effective Monthly Cost */}
                <tr>
                  <td className="p-3 font-semibold opacity-70">Monthly Rate</td>
                  {plans.map((p) => {
                    const eff = p.monthly_equivalent_rate || Math.round(p.price / p.duration_months);
                    return (
                      <td key={p.id} className="p-3 font-mono">
                        ₹{eff} / mo
                      </td>
                    );
                  })}
                </tr>

                {/* Row 7: Savings % */}
                <tr>
                  <td className="p-3 font-semibold opacity-70">Savings</td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-3">
                      {(p.savings_pct || 0) > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                          {p.savings_pct}%
                        </span>
                      ) : (
                        <span className="opacity-50">—</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Row 8: Key Channels */}
                <tr>
                  <td className="p-3 font-semibold opacity-70">Channels</td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-3">
                      <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto pr-1">
                        {p.channels.map((c, i) => (
                          <span
                            key={i}
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              isLight ? 'bg-gray-100 text-gray-800' : 'bg-white/5 text-gray-300'
                            }`}
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Row 9: Set-Top Box Compatibility */}
                <tr>
                  <td className="p-3 font-semibold opacity-70">
                    <span>STB Match</span>
                  </td>
                  {plans.map((p) => {
                    const op = OPERATOR_DATA[p.operator] || { name: p.operator, color: currentTheme.primaryColor };
                    
                    if (!user) {
                      return (
                        <td key={p.id} className="p-3">
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-semibold opacity-80 block">
                              {op.name} STB
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenAuth();
                              }}
                              className="text-[11px] px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1.5 transition-colors hover:bg-gray-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                            >
                              <Lock className="w-3 h-3" />
                              <span>Log in</span>
                            </button>
                          </div>
                        </td>
                      );
                    }

                    const matchingBoxes = (connections || []).filter((c) => c.operator === p.operator);
                    const hasMatch = matchingBoxes.length > 0;

                    return (
                      <td key={p.id} className="p-3">
                        {hasMatch ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>{matchingBoxes.length} Compatible {matchingBoxes.length === 1 ? 'Box' : 'Boxes'}</span>
                            </div>
                            <span className="text-[10px] font-mono opacity-80 block truncate max-w-[180px]">
                              {matchingBoxes[0].nickname} • {matchingBoxes[0].smartCardNumber}
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>No Saved {op.name} Box</span>
                            </div>
                            <span className="text-[10px] opacity-70 block">
                              Can enter STB at checkout
                            </span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-500/20 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2 rounded-xl text-xs font-bold border transition-colors ${
              isLight ? 'bg-gray-100 hover:bg-gray-200 border-gray-300' : 'bg-white/10 hover:bg-white/15 border-white/20'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
