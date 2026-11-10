import React, { useState } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  X,
  ShieldAlert
} from '../../../lib/icons';
import { DthOperator, DthOperatorId, Language, OperatorDisableCondition } from '../../../types';
import { OperatorTheme } from '../../../lib/theme';
import { translations } from '../../../lib/translations';
import { useAccessibleModal } from '../../../lib/useAccessibleModal';

interface OperatorsTabProps {
  operators: DthOperator[];
  operatorsLoading: boolean;
  operatorsError: string | null;
  onRefresh: () => void;
  getAuthHeaders: () => Promise<Record<string, string>>;
  currentTheme: OperatorTheme;
  currentLang: Language;
  showToast: (msg: string) => void;
}

export const OperatorsTab: React.FC<OperatorsTabProps> = ({
  operators,
  operatorsLoading,
  operatorsError,
  onRefresh,
  getAuthHeaders,
  currentTheme,
  currentLang,
  showToast,
}) => {
  const t = translations[currentLang];
  const isLight = currentTheme.isLightMode;
  const [operatorToToggle, setOperatorToToggle] = useState<DthOperator | null>(null);
  const [disableReason, setDisableReason] = useState('Gateway Maintenance');
  const [condition, setCondition] = useState<OperatorDisableCondition>('scheduled_maintenance');
  const [maintenanceMessage, setMaintenanceMessage] = useState('Service temporarily unavailable during maintenance.');
  const [expectedRestoration, setExpectedRestoration] = useState('');
  const [isToggling, setIsToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  // Accessible Modal Hook
  const { modalRef } = useAccessibleModal({
    isOpen: Boolean(operatorToToggle),
    onClose: () => setOperatorToToggle(null),
  });

  const handleConfirmToggle = async () => {
    if (!operatorToToggle) return;
    setIsToggling(true);
    try {
      const headers = await getAuthHeaders();
      const wasActive = operatorToToggle.isEnabled ?? operatorToToggle.isActive ?? true;
      const willBeActive = !wasActive;
      if (!willBeActive && !disableReason.trim()) {
        setToggleError('Enter a reason before suspending this operator.');
        return;
      }
      const res = await fetch('/api/admin/operators/toggle', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          operatorId: operatorToToggle.id,
          isEnabled: willBeActive,
          condition: willBeActive ? undefined : condition,
          conditionLabel: willBeActive ? undefined : disableReason.trim(),
          maintenanceMessage: willBeActive ? undefined : maintenanceMessage.trim(),
          expectedRestoration: willBeActive ? undefined : expectedRestoration.trim() || undefined,
        }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        showToast(`${operatorToToggle.name} ${willBeActive ? 'Enabled' : 'Disabled'}`);
        setOperatorToToggle(null);
        onRefresh();
      } else {
        setToggleError(result.error || 'Failed to update operator status.');
      }
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : 'Network error updating operator.');
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="admin-tab space-y-6   duration-200">
      <div
        className="admin-section-heading flex items-center justify-between gap-3"
      >
        <div>
          <h3 className="text-base font-bold">{t.operatorAvailability}</h3>
          <p className={`text-sm mt-0.5 ${currentTheme.subText}`}>
            {t.operatorAvailabilityHint}
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={operatorsLoading}
          aria-label={t.refreshStatus}
          className={`px-3 py-2 rounded-xl text-sm font-semibold border flex items-center gap-1.5 transition-colors shadow-none ${
            isLight
              ? 'bg-paper-2 hover:bg-paper-2 text-ink border-rule'
              : 'bg-paper-2 hover:bg-paper-2 text-accent-ink border-rule'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${operatorsLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{t.refreshStatus}</span>
        </button>
      </div>

      {operatorsError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rule bg-error/10 p-4 text-sm text-error">
          <span>{operatorsError}</span>
          <button type="button" onClick={onRefresh} disabled={operatorsLoading} className="rounded-lg border border-rule px-3 py-1.5 font-semibold">
            {t.retryFetch}
          </button>
        </div>
      )}

      {operatorsLoading && operators.length === 0 && (
        <p role="status" className="py-6 text-center text-sm text-muted">
          {currentLang === 'ta' ? 'ஆபரேட்டர்கள் ஏற்றப்படுகின்றன…' : 'Loading operator settings…'}
        </p>
      )}

      {!operatorsLoading && !operatorsError && operators.length === 0 && (
        <p className="py-6 text-center text-sm text-muted">No operator records are available.</p>
      )}

      <div className="admin-operator-list">
        {operators.map((op) => {
          const isActive = op.isEnabled ?? op.isActive ?? true;
          return (
            <div
              key={op.id}
              className="admin-operator-row"
            >
              <div className="admin-operator-info">
                <h4 className="text-sm font-semibold">{op.name}</h4>
                <span
                  className={`admin-operator-status ${
                    isActive
                      ? 'is-active'
                      : 'is-paused'
                  }`}
                >
                  {isActive ? t.operational : t.disabled}
                </span>
              </div>

              {!isActive && (op.maintenanceMessage || op.disableReason || op.expectedRestoration) && (
                <div className="admin-operator-details">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{op.maintenanceMessage || op.disableReason}</span>
                  {op.expectedRestoration && <span> · {op.expectedRestoration}</span>}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setToggleError(null);
                  setDisableReason(op.conditionLabel || op.disableReason || 'Gateway Maintenance');
                  setCondition(op.condition || 'scheduled_maintenance');
                  setMaintenanceMessage(op.maintenanceMessage || 'Service temporarily unavailable during maintenance.');
                  setExpectedRestoration(op.expectedRestoration || '');
                  setOperatorToToggle(op);
                }}
                className={`admin-operator-action ${isActive ? 'is-pause' : 'is-resume'}`}
              >
                {isActive ? t.suspendOperator : t.reEnableOperator}
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {operatorToToggle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60   "
          onClick={(e) => {
            if (e.target === e.currentTarget) setOperatorToToggle(null);
          }}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="operator-toggle-title"
            className={`max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 rounded-lg border shadow-none text-left ${isLight ? 'bg-paper border-rule text-ink' : 'bg-paper border-rule text-accent-ink'}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShieldAlert className="w-5 h-5 text-accent" />
                <span id="operator-toggle-title">{t.confirmStatusChange}</span>
              </div>
              <button
                type="button"
                onClick={() => setOperatorToToggle(null)}
                aria-label={t.close}
                className="p-1 rounded-lg hover:bg-paper-2 "
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-muted  mb-4 leading-relaxed">
              {currentLang === 'ta'
                ? `நீங்கள் நிச்சயமாக ${operatorToToggle.name} ஆபரேட்டரை ${(operatorToToggle.isEnabled ?? operatorToToggle.isActive ?? true) ? 'நிறுத்தி வைக்க' : 'மீண்டும் செயல்படுத்த'} விரும்புகிறீர்களா?`
                : `Are you sure you want to ${(operatorToToggle.isEnabled ?? operatorToToggle.isActive ?? true) ? 'suspend' : 're-enable'} ${operatorToToggle.name}?`}
            </p>

            {(operatorToToggle.isEnabled ?? operatorToToggle.isActive ?? true) && (
              <div className="mb-4 space-y-3">
                <label className="block space-y-1.5 text-sm font-medium">
                  <span>{t.suspensionReason}</span>
                  <select value={condition} onChange={(event) => setCondition(event.target.value as OperatorDisableCondition)} className="w-full rounded-xl border border-rule bg-paper px-3 py-2 text-ink">
                    <option value="scheduled_maintenance">Scheduled maintenance</option>
                    <option value="gateway_down">Gateway unavailable</option>
                    <option value="transponder_outage">Transponder outage</option>
                    <option value="high_failure_rate">High failure rate</option>
                    <option value="commercial_hold">Commercial hold</option>
                    <option value="custom">Other</option>
                  </select>
                </label>
                <label className="block space-y-1.5 text-sm font-medium">
                  <span>Reason label</span>
                  <input required maxLength={100} type="text" value={disableReason} onChange={(event) => setDisableReason(event.target.value)} className="w-full rounded-xl border border-rule bg-paper px-3 py-2 text-ink" />
                </label>
                <label className="block space-y-1.5 text-sm font-medium">
                  <span>Customer-facing message</span>
                  <textarea maxLength={300} rows={3} value={maintenanceMessage} onChange={(event) => setMaintenanceMessage(event.target.value)} className="w-full rounded-xl border border-rule bg-paper px-3 py-2 text-ink" />
                </label>
                <label className="block space-y-1.5 text-sm font-medium">
                  <span>Expected restoration (optional)</span>
                  <input maxLength={50} type="text" value={expectedRestoration} onChange={(event) => setExpectedRestoration(event.target.value)} placeholder="e.g. 6:00 PM IST" className="w-full rounded-xl border border-rule bg-paper px-3 py-2 text-ink" />
                </label>
              </div>
            )}

            {toggleError && <p role="alert" className="mb-4 text-sm text-error">{toggleError}</p>}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOperatorToToggle(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-muted  hover:bg-paper-2 "
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmToggle}
                disabled={isToggling}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-accent hover:bg-accent text-accent-ink transition-colors shadow-none"
              >
                {isToggling ? '...' : t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
