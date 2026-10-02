import React, { useState } from 'react';
import { 
  Radio, 
  Power, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle2, 
  X, 
  ShieldAlert,
  Sliders,
  Tv
} from 'lucide-react';
import { DthOperator, DthOperatorId, Language } from '../../../types';
import { OperatorTheme } from '../../../lib/theme';

interface OperatorsTabProps {
  operators: DthOperator[];
  operatorsLoading: boolean;
  onRefresh: () => void;
  getAuthHeaders: () => Promise<Record<string, string>>;
  currentTheme: OperatorTheme;
  currentLang: Language;
  showToast: (msg: string) => void;
}

export const OperatorsTab: React.FC<OperatorsTabProps> = ({
  operators,
  operatorsLoading,
  onRefresh,
  getAuthHeaders,
  currentTheme,
  currentLang,
  showToast,
}) => {
  const isLight = currentTheme.isLightMode;
  const [operatorToToggle, setOperatorToToggle] = useState<DthOperator | null>(null);
  const [disableReason, setDisableReason] = useState('Gateway Maintenance');
  const [isToggling, setIsToggling] = useState(false);

  const handleConfirmToggle = async () => {
    if (!operatorToToggle) return;
    setIsToggling(true);
    try {
      const headers = await getAuthHeaders();
      const willBeActive = !operatorToToggle.isActive;
      const res = await fetch('/api/admin/operators/toggle', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          operatorId: operatorToToggle.id,
          isActive: willBeActive,
          disableReason: willBeActive ? undefined : disableReason,
        }),
      });

      if (res.ok) {
        showToast(`${operatorToToggle.name} ${willBeActive ? 'Enabled' : 'Disabled'}`);
        setOperatorToToggle(null);
        onRefresh();
      } else {
        showToast('Failed to update operator status');
      }
    } catch (err) {
      showToast('Network error updating operator');
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div 
        className={`p-5 rounded-2xl border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          isLight 
            ? 'bg-white border-gray-200 text-gray-900' 
            : 'bg-black/30 border-white/10 text-white'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner"
            style={{
              backgroundColor: `${currentTheme.primaryColor}15`,
              borderColor: `${currentTheme.primaryColor}30`,
              color: currentTheme.primaryColor,
            }}
          >
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold">
                Operator Service Controls & Gateway Status
              </h3>
              <span 
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border"
                style={{
                  backgroundColor: `${currentTheme.primaryColor}15`,
                  color: currentTheme.primaryColor,
                  borderColor: `${currentTheme.primaryColor}30`,
                }}
              >
                Killswitch
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${currentTheme.subText}`}>
              Manage active API gateway integrations, toggle operator maintenance mode, or suspend failing transponders.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={operatorsLoading}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all shadow-xs ${
            isLight 
              ? 'bg-gray-50 hover:bg-gray-100 text-gray-800 border-gray-300' 
              : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${operatorsLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Operators Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {operators.map((op) => {
          const isActive = op.isActive !== false;
          return (
            <div
              key={op.id}
              className={`p-5 rounded-2xl border transition-all ${
                isLight ? 'bg-white border-gray-200 shadow-xs' : 'bg-black/20 border-white/10'
              } ${!isActive ? 'opacity-75 border-amber-500/40' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center font-bold text-sm">
                    <Tv className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">{op.name}</h4>
                    <p className="text-[11px] font-mono text-gray-500">{op.id}</p>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  {isActive ? 'Operational' : 'Disabled'}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-[11px]">
                  <span>Viewing Card Format:</span>
                  <span className="font-mono font-medium text-gray-800 dark:text-gray-200">
                    {op.smartCardLength} Digits
                  </span>
                </div>
                {op.disableReason && !isActive && (
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{op.disableReason}</span>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setOperatorToToggle(op)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    isActive
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800/40'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800/40'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{isActive ? 'Emergency Suspend / Disable' : 'Re-enable Operator'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {operatorToToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`max-w-md w-full p-6 rounded-2xl border shadow-xl ${isLight ? 'bg-white border-gray-200 text-gray-900' : 'bg-[#0f172a] border-white/10 text-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                <span>Confirm Operator Status Change</span>
              </div>
              <button
                type="button"
                onClick={() => setOperatorToToggle(null)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Are you sure you want to {operatorToToggle.isActive !== false ? 'suspend' : 're-enable'}{' '}
              <strong className="text-gray-800 dark:text-gray-200">{operatorToToggle.name}</strong>?
            </p>

            {operatorToToggle.isActive !== false && (
              <div className="space-y-1.5 mb-4">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Suspension Reason
                </label>
                <input
                  type="text"
                  value={disableReason}
                  onChange={(e) => setDisableReason(e.target.value)}
                  placeholder="e.g. Gateway Maintenance / Transponder issue"
                  className={`w-full px-3 py-2 rounded-xl text-xs border ${
                    isLight ? 'bg-white border-gray-300 text-gray-900' : 'bg-black/30 border-white/10 text-white'
                  }`}
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOperatorToToggle(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggle}
                disabled={isToggling}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-all"
              >
                {isToggling ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
