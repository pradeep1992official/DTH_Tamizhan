import { localizeCustomerError } from '../../lib/customerMessages';
import { formatPrice, formatDuration, formatChannelCounts } from '../../lib/catalog';
import { subscriberError, subscriberHelp, subscriberRule, subscriberLabel, subscriberPlaceholder, normalizeSubscriberId } from '../../lib/subscriberValidation';
import React, { useState } from 'react';
import {
  X,
  Tv,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Plus,
  ArrowRight,
  Lock,
  CreditCard,
  Ban
} from '../../lib/icons';
import { BrowsePlan, DthConnection, DthOperatorId, isSameDthOperatorGroup, Language, UserProfile } from '../../types';
import { OperatorTheme } from '../../lib/theme';
import { translations } from '../../lib/translations';
import { useAccessibleModal } from '../../lib/useAccessibleModal';

interface ApplyPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: BrowsePlan | null;
  user: UserProfile | null;
  connections: DthConnection[];
  onOpenAuth: () => void;
  onApplyPlanToBox: (plan: BrowsePlan, connection: DthConnection) => void;
  onAddNewConnectionAndApply: (
    plan: BrowsePlan,
    newConnData: { smartCardNumber: string; nickname: string; customerName?: string }
  ) => void;
  currentTheme: OperatorTheme;
  currentLang: Language;
}

const OPERATOR_META: Record<string, {
  name: string;
  tamil: string;
  color: string;
}> = {
  sun_direct: {
    name: 'Sun Direct',
    tamil: 'சன் டைரக்ட்',
    color: 'var(--operator-sun-direct)',
  },
  tata_play: {
    name: 'Tata Play',
    tamil: 'டாடா பிளே',
    color: 'var(--operator-tata-play)',
  },
  airtel_dth: {
    name: 'Airtel Digital TV',
    tamil: 'ஏர்டெல் டிவி',
    color: 'var(--operator-airtel-dth)',
  },
  dish_tv: {
    name: 'Dish TV & D2H',
    tamil: 'டிஷ் டிவி & டி2எச்',
    color: 'var(--operator-dish-tv)',
  },
  d2h: {
    name: 'Dish TV & D2H',
    tamil: 'டிஷ் டிவி & டி2எச்',
    color: 'var(--operator-dish-tv)',
  },
};

export const ApplyPlanModal: React.FC<ApplyPlanModalProps> = ({
  isOpen,
  onClose,
  plan,
  user,
  connections,
  onOpenAuth,
  onApplyPlanToBox,
  onAddNewConnectionAndApply,
  currentTheme,
  currentLang,
}) => {
  const t = translations[currentLang];
  const { modalRef } = useAccessibleModal({ isOpen, onClose });

  const [selectedBoxId, setSelectedBoxId] = useState<string>('');
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [smartCardInput, setSmartCardInput] = useState('');
  const [nicknameInput, setNicknameInput] = useState('Home Hall');
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen || !plan) return null;

  const isLight = currentTheme.isLightMode;
  const opMeta = { ...(OPERATOR_META[plan.operator] || {
    name: plan.operator,
    tamil: '',
    color: currentTheme.primaryColor,
  }), cardName: subscriberLabel(plan.operator, true, currentLang), hint: subscriberHelp(plan.operator, true, currentLang) };

  const matchingBoxes = (connections || []).filter((c) => isSameDthOperatorGroup(c.operator, plan.operator));
  const incompatibleCount = (connections || []).length - matchingBoxes.length;

  const handleApplyToExisting = () => {
    const boxId = selectedBoxId || (matchingBoxes[0]?.id ?? '');
    const box = matchingBoxes.find((b) => b.id === boxId);
    if (!box) {
      setFormError(translations[currentLang].uiPleaseSelectACompatibleSetTopBox);
      return;
    }
    if (!isSameDthOperatorGroup(box.operator, plan.operator)) {
      setFormError(`Cross-operator recharge blocked. Cannot apply ${opMeta.name} pack to a ${box.operatorName} box.`);
      return;
    }
    const error = subscriberError(box.operator, box.smartCardNumber, false, currentLang);
    if (error) { setFormError(error); return; }
    onApplyPlanToBox(plan, box);
  };

  const handleCreateAndApply = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCard = normalizeSubscriberId(smartCardInput);

    const error = subscriberError(plan.operator, cleanCard, true, currentLang);
    if (error) {
      setFormError(error);
      document.getElementById('applyplanmodal-field-1')?.focus();
      return;
    }
    setFormError(null);
    onAddNewConnectionAndApply(plan, {
      smartCardNumber: cleanCard,
      nickname: nicknameInput.trim() || `${opMeta.name} ${t.uiSetTopBox}`,
      customerName: customerNameInput.trim() || user?.displayName || t.customer,
    });
  };

  return (
    <div
      className="dialog-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-paper-2 duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="apply-plan-modal-title"
        className={`hm-dialog rounded-xl border w-full max-w-lg overflow-hidden shadow-lg flex flex-col max-h-[calc(100dvh-2rem)] text-left ${
          isLight ? 'bg-paper border-rule text-ink' : 'bg-paper-2 border-rule text-ink'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-rule flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-ink font-bold"
              style={{ backgroundColor: opMeta.color }}
            >
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h3 id="apply-plan-modal-title" className="font-bold text-base">
                {t.applyToBox}
              </h3>
              <p className="text-sm text-muted">
                {opMeta.name} • {plan.type}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="p-1.5 rounded-xl border border-transparent hover:border-rule hover:bg-paper-2 transition-colors focus-visible:ring-2 focus-visible:ring-focus"
          >
            <X className="w-5 h-5 opacity-70" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Selected Plan Summary Banner */}
          <div
            className={`dialog-summary py-4 flex items-start justify-between gap-3 ${
              isLight ? 'bg-paper-2 border-rule' : 'bg-paper border-rule'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold opacity-90">
                  {opMeta.name} • {plan.type}
                </span>
                <span className="text-sm tabular-nums font-bold px-2 py-0.5 rounded bg-accent-soft text-accent">
                  {formatDuration(plan.duration_months, currentLang)}
                </span>
              </div>
              <h4 className="font-bold text-sm sm:text-base mt-0.5">{plan.name}</h4>
              <p className="text-sm opacity-90 font-medium">
                {formatChannelCounts(plan, currentLang)}
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-2xl font-bold tabular-nums tracking-tight block" style={{ color: currentTheme.primaryColor }}>
                {formatPrice(plan.price, currentLang)}
              </span>
              {(plan.savings_pct || 0) > 0 && (
                <span className="text-sm font-bold text-success block">
                  {plan.savings_pct}% Saved
                </span>
              )}
            </div>
          </div>

          {formError && (
            <div role="alert" className="p-3.5 rounded-xl bg-error/10 border border-rule text-error text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-error shrink-0" />
              <span>{localizeCustomerError(formError, currentLang)}</span>
            </div>
          )}

          {/* User is NOT logged in */}
          {!user ? (
            <div className="text-center py-6 px-4 space-y-4 rounded-lg border border-dashed border-rule">
              <div
                className="w-12 h-12 rounded-lg mx-auto flex items-center justify-center text-ink shadow-lg"
                style={{ backgroundColor: currentTheme.primaryColor }}
              >
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold">
                  {t.loginTitle}
                </h4>
                <p className="text-sm opacity-80 max-w-sm mx-auto">
                  {t.loginSubtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={onOpenAuth}
                className="dialog-primary w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold text-ink shadow-lg flex items-center justify-center gap-2 mx-auto transition-transform"
                style={{ backgroundColor: currentTheme.primaryColor }}
              >
                <span>{t.googleOption}</span>
              </button>
            </div>
          ) : (
            /* User IS logged in */
            <div className="space-y-4">
              {matchingBoxes.length > 0 && !isAddingNew ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold opacity-80">
                      {translations[currentLang].uiSelectSavedBox}
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddingNew(true)}
                      className="text-sm font-bold flex items-center gap-1 hover:underline"
                      style={{ color: currentTheme.primaryColor }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.addConnection}</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {matchingBoxes.map((box) => {
                      const isSelected = (selectedBoxId || matchingBoxes[0]?.id) === box.id;
                      return (
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          key={box.id}
                          onClick={() => setSelectedBoxId(box.id)}
                          className={`dialog-choice p-3.5 rounded-lg border cursor-pointer transition-colors flex items-center justify-between ${
                            isSelected
                              ? 'border-rule bg-accent-soft'
                              : isLight ? 'bg-paper-2 border-rule' : 'bg-paper border-rule'
                          }`}
                        >
                          <div>
                            <p className="font-bold text-sm">{box.nickname || box.customerName}</p>
                            <p className="tabular-nums text-sm text-accent">{box.smartCardNumber}</p>
                            {subscriberError(box.operator, box.smartCardNumber, false, currentLang) && <p className="text-error text-xs">{subscriberError(box.operator, box.smartCardNumber, false, currentLang)}</p>}
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-accent" />}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyToExisting}
                    className="dialog-primary w-full py-3 px-4 rounded-lg font-bold text-sm text-ink shadow-sm transition-colors flex items-center justify-center gap-2"
                    style={{ backgroundColor: currentTheme.primaryColor }}
                  >
                    <span>{t.applyToBox}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* Add New Box Form */
                <form onSubmit={handleCreateAndApply} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold opacity-80">
                      {t.addConnection}
                    </label>
                    {matchingBoxes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsAddingNew(false)}
                        className="text-sm font-bold hover:underline text-muted"
                      >
                        {t.cancel}
                      </button>
                    )}
                  </div>

                  <div>
                    <label htmlFor="applyplanmodal-field-1" className="text-sm font-medium block mb-1">
                      {opMeta.cardName} *
                    </label>
                    <input id="applyplanmodal-field-1"
                      type="text"
                      aria-invalid={!!formError}
                      aria-describedby="apply-id-help"
                      placeholder={subscriberPlaceholder(plan.operator, true, currentLang)}
                      value={smartCardInput}
                      onChange={(e) => setSmartCardInput(e.target.value.replace(/\D/g, ''))}
                      className="w-full p-2.5 rounded-xl border text-sm tabular-nums bg-transparent focus:outline-none focus:border-rule"
                    />
                    <p id="apply-id-help" role={formError ? "alert" : undefined} className={formError ? "text-error" : ""}>{formError ? localizeCustomerError(formError, currentLang) : opMeta.hint}</p>
                  </div>

                  <div>
                    <label htmlFor="applyplanmodal-field-2" className="text-sm font-medium block mb-1">
                      {t.boxNickname}
                    </label>
                    <input id="applyplanmodal-field-2"
                      type="text"
                      placeholder={translations[currentLang].uiEnterABoxNickname}
                      value={nicknameInput}
                      onChange={(e) => setNicknameInput(e.target.value)}
                      className="w-full p-2.5 rounded-xl border text-sm bg-transparent focus:outline-none focus:border-rule"
                    />
                  </div>

                  <button
                    type="submit"
                    className="dialog-primary w-full py-3 px-4 rounded-lg font-bold text-sm text-ink shadow-sm transition-colors flex items-center justify-center gap-2"
                    style={{ backgroundColor: currentTheme.primaryColor }}
                  >
                    <span>{t.applyToBox}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
