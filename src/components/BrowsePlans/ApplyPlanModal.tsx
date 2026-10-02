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
} from 'lucide-react';
import { BrowsePlan, DthConnection, DthOperatorId, Language, UserProfile } from '../../types';
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
  cardName: string; 
  pattern: RegExp; 
  hint: string;
  color: string;
}> = {
  sun_direct: {
    name: 'Sun Direct',
    tamil: 'சன் டைரக்ட்',
    cardName: 'Smart Card / CDSN (11-12 digits)',
    pattern: /^[0-9]{11,12}$/,
    hint: '11 or 12 digits starting with 4 or 7 (e.g. 41289456123)',
    color: '#F97316',
  },
  tata_play: {
    name: 'Tata Play',
    tamil: 'டாடா பிளே',
    cardName: 'Subscriber ID (10 digits)',
    pattern: /^[0-9]{10}$/,
    hint: '10 digits starting with 1 (e.g. 1029384756)',
    color: '#EC4899',
  },
  airtel_dth: {
    name: 'Airtel Digital TV',
    tamil: 'ஏர்டெல் டிவி',
    cardName: 'Customer ID (10 digits)',
    pattern: /^[0-9]{10}$/,
    hint: '10 digits starting with 3 (e.g. 3009482715)',
    color: '#EF4444',
  },
  dish_tv: {
    name: 'Dish TV',
    tamil: 'டிஷ் டிவி',
    cardName: 'VC Number (8-11 digits)',
    pattern: /^[0-9]{8,11}$/,
    hint: '8 to 11 digits (e.g. 02589412356)',
    color: '#EB5B26',
  },
  d2h: {
    name: 'D2H Videocon',
    tamil: 'டி2எச்',
    cardName: 'Customer ID / VC Number (8-11 digits)',
    pattern: /^[0-9]{8,11}$/,
    hint: '8 to 11 digits (e.g. 02589412356)',
    color: '#8B5CF6',
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
  const opMeta = OPERATOR_META[plan.operator] || {
    name: plan.operator,
    tamil: '',
    cardName: 'Smart Card Number',
    pattern: /^[0-9]{8,12}$/,
    hint: '8 to 12 digits',
    color: currentTheme.primaryColor,
  };

  const matchingBoxes = (connections || []).filter((c) => c.operator === plan.operator);
  const incompatibleCount = (connections || []).length - matchingBoxes.length;

  const handleApplyToExisting = () => {
    const boxId = selectedBoxId || (matchingBoxes[0]?.id ?? '');
    const box = matchingBoxes.find((b) => b.id === boxId);
    if (!box) {
      setFormError(currentLang === 'ta' ? 'பொருத்தமான செட்-டாப் பாக்ஸைத் தேர்ந்தெடுக்கவும்' : 'Please select a compatible Set-Top Box.');
      return;
    }
    if (box.operator !== plan.operator) {
      setFormError(`Cross-operator recharge blocked. Cannot apply ${opMeta.name} pack to a ${box.operatorName} box.`);
      return;
    }
    onApplyPlanToBox(plan, box);
  };

  const handleCreateAndApply = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCard = smartCardInput.trim().replace(/\s+/g, '');

    if (!cleanCard) {
      setFormError(`Please enter your ${opMeta.name} ${opMeta.cardName}`);
      return;
    }

    if (!opMeta.pattern.test(cleanCard)) {
      setFormError(`Invalid format for ${opMeta.name}. Expected: ${opMeta.hint}`);
      return;
    }

    setFormError(null);
    onAddNewConnectionAndApply(plan, {
      smartCardNumber: cleanCard,
      nickname: nicknameInput.trim() || `${opMeta.name} Box`,
      customerName: customerNameInput.trim() || user?.displayName || 'Subscriber',
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="apply-plan-modal-title"
        className={`rounded-3xl border w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-left ${
          isLight ? 'bg-white border-gray-200 text-gray-900' : 'bg-[#0d172e] border-white/15 text-white'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-500/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: opMeta.color }}
            >
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h3 id="apply-plan-modal-title" className="font-bold text-base">
                {t.applyToBox}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-300">
                {opMeta.name} • {plan.type}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="p-1.5 rounded-xl border border-transparent hover:border-gray-500/20 hover:bg-gray-500/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <X className="w-5 h-5 opacity-70" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Selected Plan Summary Banner */}
          <div 
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
              isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span 
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: opMeta.color }}
                />
                <span className="text-xs uppercase font-bold tracking-wider opacity-90">
                  {opMeta.name} • {plan.type}
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-500">
                  {plan.duration_months === 1 ? `1 ${t.month}` : `${plan.duration_months} ${t.months}`}
                </span>
              </div>
              <h4 className="font-bold text-sm sm:text-base mt-0.5">{plan.name}</h4>
              <p className="text-xs opacity-90 font-medium">
                {plan.channel_count} {t.channels} {plan.hd_channel_count ? `(${plan.hd_channel_count} HD)` : ''}
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-2xl font-extrabold tabular-nums tracking-tight block" style={{ color: currentTheme.primaryColor }}>
                ₹{plan.price}
              </span>
              {(plan.savings_pct || 0) > 0 && (
                <span className="text-xs font-bold text-emerald-500 block">
                  {plan.savings_pct}% Saved
                </span>
              )}
            </div>
          </div>

          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* User is NOT logged in */}
          {!user ? (
            <div className="text-center py-6 px-4 space-y-4 rounded-2xl border border-dashed border-gray-500/30">
              <div 
                className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg"
                style={{ backgroundColor: currentTheme.primaryColor }}
              >
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold">
                  {t.loginTitle}
                </h4>
                <p className="text-xs opacity-80 max-w-sm mx-auto">
                  {t.loginSubtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={onOpenAuth}
                className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold text-white shadow-lg flex items-center justify-center gap-2 mx-auto transition-transform hover:scale-105 active:scale-95"
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
                    <label className="text-xs font-bold uppercase tracking-wider opacity-80">
                      {currentLang === 'ta' ? 'சேமிக்கப்பட்ட பாக்ஸைத் தேர்ந்தெடுக்கவும்:' : 'Select Saved Box:'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddingNew(true)}
                      className="text-xs font-bold flex items-center gap-1 hover:underline"
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
                        <div
                          key={box.id}
                          onClick={() => setSelectedBoxId(box.id)}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? 'border-amber-400 bg-amber-500/10'
                              : isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'
                          }`}
                        >
                          <div>
                            <p className="font-bold text-xs">{box.nickname || box.customerName}</p>
                            <p className="font-mono text-xs text-amber-400">{box.smartCardNumber}</p>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyToExisting}
                    className="w-full py-3 px-4 rounded-2xl font-bold text-xs text-white shadow-md transition-all flex items-center justify-center gap-2"
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
                    <label className="text-xs font-bold uppercase tracking-wider opacity-80">
                      {t.addConnection}
                    </label>
                    {matchingBoxes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsAddingNew(false)}
                        className="text-xs font-bold hover:underline text-gray-400"
                      >
                        {t.cancel}
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium block mb-1">
                      {opMeta.cardName} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={opMeta.hint}
                      value={smartCardInput}
                      onChange={(e) => setSmartCardInput(e.target.value.replace(/\D/g, ''))}
                      className="w-full p-2.5 rounded-xl border text-xs font-mono bg-transparent focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium block mb-1">
                      {t.boxNickname}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Living Room TV"
                      value={nicknameInput}
                      onChange={(e) => setNicknameInput(e.target.value)}
                      className="w-full p-2.5 rounded-xl border text-xs bg-transparent focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-2xl font-bold text-xs text-white shadow-md transition-all flex items-center justify-center gap-2"
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
