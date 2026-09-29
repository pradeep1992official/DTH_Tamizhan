import React, { useState } from 'react';
import { 
  X, 
  Tv, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  ArrowRight, 
  Phone, 
  Sparkles, 
  Lock, 
  HelpCircle,
  CreditCard,
  Ban
} from 'lucide-react';
import { BrowsePlan, DthConnection, DthOperatorId, Language, UserProfile } from '../../types';
import { OperatorTheme } from '../../lib/theme';

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

  // Hard constraint 2: Filter user's saved boxes strictly by operator
  const matchingBoxes = (connections || []).filter((c) => c.operator === plan.operator);
  const incompatibleCount = (connections || []).length - matchingBoxes.length;

  const [selectedBoxId, setSelectedBoxId] = useState<string>(
    matchingBoxes.length > 0 ? matchingBoxes[0].id : ''
  );
  const [isAddingNew, setIsAddingNew] = useState<boolean>(matchingBoxes.length === 0);

  // New connection form states
  const [smartCardInput, setSmartCardInput] = useState('');
  const [nicknameInput, setNicknameInput] = useState('Home Hall');
  const [customerNameInput, setCustomerNameInput] = useState(user?.displayName || '');
  const [formError, setFormError] = useState<string | null>(null);

  const handleApplyToExisting = () => {
    const box = matchingBoxes.find((b) => b.id === selectedBoxId);
    if (!box) {
      setFormError('Please select a compatible Set-Top Box.');
      return;
    }
    // Hard constraint verification: Box operator must match plan operator
    if (box.operator !== plan.operator) {
      setFormError(`Cross-operator recharge is blocked. Cannot apply ${opMeta.name} plan to a ${box.operatorName} box.`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`rounded-3xl border w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] ${
          isLight ? 'bg-white border-gray-200 text-gray-900' : 'bg-[#0d172e] border-white/15 text-white'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-500/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: opMeta.color }}
            >
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {currentLang === 'ta' ? 'திட்டத்தைப் பயன்படுத்தவும்' : 'Apply Plan'}
              </h3>
              <p className="text-xs opacity-60">
                {opMeta.name} • {plan.type}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border border-transparent hover:border-gray-500/20 hover:bg-gray-500/10 transition-colors"
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
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: opMeta.color }}
                />
                <span className="text-[11px] uppercase font-bold tracking-wider opacity-80">
                  {opMeta.name} • {plan.type}
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-500">
                  {plan.duration_months === 1 ? '1 Month' : `${plan.duration_months} Months`}
                </span>
              </div>
              <h4 className="font-bold text-sm sm:text-base mt-0.5">{plan.name}</h4>
              <p className="text-xs opacity-80 font-medium">
                {plan.channel_count} channels {plan.hd_channel_count ? `(${plan.hd_channel_count} HD)` : ''}
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

          {/* Verification Alert: Cross-Operator Rule */}
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-300 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              This plan only works with <strong>{opMeta.name}</strong> boxes.
            </div>
          </div>

          {/* Case 1: User is NOT logged in */}
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
                  {currentLang === 'ta' ? 'உள்நுழையவும்' : 'Sign In to Continue'}
                </h4>
                <p className="text-xs opacity-70 max-w-sm mx-auto">
                  {currentLang === 'ta' ? 'சேமிக்கப்பட்ட இணைப்புகளைத் தேர்ந்தெடுக்க கூகிள் மூலம் உள்நுழையவும்' : 'Sign in with Google to select your saved box or link a new one.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  onOpenAuth();
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold text-white shadow-lg flex items-center justify-center gap-2 mx-auto transition-transform hover:scale-105 active:scale-95"
                style={{ backgroundColor: currentTheme.primaryColor }}
              >
                <span>{currentLang === 'ta' ? 'கூகிள் மூலம் உள்நுழைக' : 'Sign In with Google'}</span>
              </button>
            </div>
          ) : (
            /* Case 2: User IS logged in */
            <div className="space-y-4">
              {/* If user has matching boxes and not adding new */}
              {matchingBoxes.length > 0 && !isAddingNew ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider opacity-70">
                      Select Box:
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddingNew(true)}
                      className="text-xs font-semibold flex items-center gap-1 hover:underline"
                      style={{ color: currentTheme.primaryColor }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Box</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {matchingBoxes.map((box) => {
                      const isSelected = selectedBoxId === box.id;
                      return (
                        <div
                          key={box.id}
                          onClick={() => setSelectedBoxId(box.id)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? isLight 
                                ? 'bg-amber-500/10 border-amber-500/40 shadow-sm' 
                                : 'bg-white/10 border-white/30 shadow-md'
                              : isLight
                              ? 'bg-gray-50/70 border-gray-200 hover:bg-gray-100'
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSelected ? 'text-white border-transparent' : 'border-gray-400'
                              }`}
                              style={{
                                backgroundColor: isSelected ? currentTheme.primaryColor : undefined,
                              }}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs">{box.nickname}</span>
                              </div>
                              <span className="font-mono text-xs font-semibold block tracking-wider mt-0.5">
                                {box.smartCardNumber}
                              </span>
                              {box.customerName && (
                                <span className="text-[10px] opacity-60 block">
                                  {box.customerName}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] opacity-60 block">
                              Balance: ₹{box.balance || 0}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {incompatibleCount > 0 && (
                    <p className="text-[11px] opacity-60 flex items-center gap-1">
                      <Ban className="w-3.5 h-3.5 text-gray-400" />
                      <span>{incompatibleCount} non-{opMeta.name} box(es) hidden.</span>
                    </p>
                  )}

                  {formError && (
                    <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-500 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleApplyToExisting}
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-transform hover:scale-[1.01] active:scale-[0.99]"
                    style={{ backgroundColor: currentTheme.primaryColor }}
                  >
                    <span>Continue to Recharge</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* Add a new connection form pre-filled with operator */
                <form onSubmit={handleCreateAndApply} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold">
                        Add {opMeta.name} Box
                      </h4>
                    </div>

                    {matchingBoxes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsAddingNew(false)}
                        className="text-xs opacity-70 hover:opacity-100 underline"
                      >
                        Use Saved Box
                      </button>
                    )}
                  </div>

                  {/* Smart card input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold opacity-80 flex items-center justify-between">
                      <span>{opMeta.cardName}</span>
                      <span className="text-[10px] font-mono opacity-60">{opMeta.hint}</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={smartCardInput}
                      onChange={(e) => setSmartCardInput(e.target.value)}
                      placeholder={opMeta.hint}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold transition-colors ${
                        isLight 
                          ? 'bg-white border-gray-300 text-gray-900 focus:border-black' 
                          : 'bg-black/30 border-white/20 text-white focus:border-white'
                      }`}
                    />
                  </div>

                  {/* Nickname & Customer Name row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold opacity-80">
                        Nickname
                      </label>
                      <input
                        type="text"
                        value={nicknameInput}
                        onChange={(e) => setNicknameInput(e.target.value)}
                        placeholder="e.g. Living Room, Bedroom"
                        className={`w-full px-3.5 py-2 rounded-xl border text-xs transition-colors ${
                          isLight ? 'bg-white border-gray-300 text-gray-900' : 'bg-black/30 border-white/20 text-white'
                        }`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold opacity-80">
                        Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={customerNameInput}
                        onChange={(e) => setCustomerNameInput(e.target.value)}
                        placeholder="e.g. Murugan K"
                        className={`w-full px-3.5 py-2 rounded-xl border text-xs transition-colors ${
                          isLight ? 'bg-white border-gray-300 text-gray-900' : 'bg-black/30 border-white/20 text-white'
                        }`}
                      />
                    </div>
                  </div>

                  {formError && (
                    <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-500 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-transform hover:scale-[1.01] active:scale-[0.99]"
                    style={{ backgroundColor: currentTheme.primaryColor }}
                  >
                    <span>Save Box & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-500/20 flex items-center justify-end text-xs">
          <button
            type="button"
            onClick={onClose}
            className="hover:underline font-semibold opacity-70 hover:opacity-100"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
