import React, { useState, useEffect } from 'react';
import { 
  X, 
  Radio, 
  Tv, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Clock, 
  PhoneCall, 
  MessageSquare,
  ShieldCheck
} from 'lucide-react';
import { DthOperatorId, Language } from '../types';
import { translations } from '../lib/translations';
import { useAccessibleModal } from '../lib/useAccessibleModal';

interface SignalRefreshModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  initialOperator?: DthOperatorId;
  initialCard?: string;
}

export const SignalRefreshModal: React.FC<SignalRefreshModalProps> = ({
  isOpen,
  onClose,
  currentLang,
  initialOperator = 'sun_direct',
  initialCard = '',
}) => {
  const t = translations[currentLang];
  const { modalRef } = useAccessibleModal({ isOpen, onClose });

  const [operator, setOperator] = useState<DthOperatorId>(initialOperator);
  const [smartCard, setSmartCard] = useState(initialCard);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [timer, setTimer] = useState(300); // 5 minutes countdown
  const [countdownActive, setCountdownActive] = useState(false);
  const [instructions, setInstructions] = useState<string[]>([]);

  useEffect(() => {
    if (initialOperator) setOperator(initialOperator);
    if (initialCard) setSmartCard(initialCard);
  }, [initialOperator, initialCard]);

  useEffect(() => {
    let interval: any;
    if (countdownActive && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [countdownActive, timer]);

  if (!isOpen) return null;

  const handleSendSignal = async () => {
    if (!smartCard) return;

    setIsTransmitting(true);
    setResultMessage(null);

    try {
      const response = await fetch('/api/recharge/signal-refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operator, smartCardNumber: smartCard.trim() }),
      });
      const data = await response.json();

      if (data.success) {
        setResultMessage(data.message);
        setBatchId(data.batchId);
        setInstructions(data.instructions || []);
        setCountdownActive(true);
        setTimer(300);
      } else {
        setResultMessage(data.error || 'Signal transmission limit reached or service unavailable.');
      }
    } catch (err: any) {
      setResultMessage('Signal transmission failed. Please dial operator toll-free directly.');
    } finally {
      setIsTransmitting(false);
    }
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="signal-refresh-title"
        className="bg-[#0e1935] border border-[#1e3058] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative text-left"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#172545] flex items-center justify-between bg-[#070e1e]/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-inner">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 id="signal-refresh-title" className="text-base font-bold text-white leading-tight">
                {t.signalRefreshTitle}
              </h2>
              <p className="text-xs text-gray-300">
                {currentLang === 'ta' ? 'சேனல் சிக்னல் அனுமதி புதுப்பிப்பு' : 'Re-activate viewing & sync transponder authorization'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="p-1.5 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {!countdownActive ? (
            <>
              <p className="text-xs text-gray-200 leading-relaxed">
                {t.signalRefreshDesc}
              </p>

              {/* Operator Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                  {t.selectOperator}
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-xs font-semibold">
                  {[
                    { id: 'sun_direct', label: 'Sun Direct' },
                    { id: 'tata_play', label: 'Tata Play' },
                    { id: 'airtel_dth', label: 'Airtel' },
                    { id: 'dish_tv', label: 'Dish TV' },
                    { id: 'd2h', label: 'D2H' },
                  ].map((op) => (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => setOperator(op.id as DthOperatorId)}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        operator === op.id
                          ? 'bg-amber-400 text-gray-950 font-bold border-amber-300 shadow-sm'
                          : 'bg-[#070e1e] border-[#172545] text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Smart Card input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                  {t.enterCardNumber}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.smartCardPlaceholder}
                  value={smartCard}
                  onChange={(e) => setSmartCard(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-[#070e1e] border border-[#172545] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-gray-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {resultMessage && (
                <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{resultMessage}</span>
                </div>
              )}

              {/* Instruction banner */}
              <div className="p-3.5 bg-[#070e1e] border border-[#172545] rounded-2xl flex items-start gap-2.5 text-xs text-amber-300">
                <Tv className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>{t.turnOnChannel100}</span>
              </div>

              {/* Action */}
              <button
                type="button"
                onClick={handleSendSignal}
                disabled={isTransmitting || !smartCard.trim()}
                className="w-full py-3 px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-gray-950 font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
              >
                {isTransmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t.refreshing}</span>
                  </>
                ) : (
                  <>
                    <Radio className="w-4 h-4" />
                    <span>{t.triggerRefresh}</span>
                  </>
                )}
              </button>
            </>
          ) : (
            /* Countdown Active State */
            <div className="space-y-5 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  {t.refreshSuccessTitle}
                </h3>
                <p className="text-xs text-gray-300">
                  {resultMessage || t.refreshSuccessDesc}
                </p>
              </div>

              {/* Timer Progress */}
              <div className="p-4 bg-[#070e1e] border border-[#172545] rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-300">
                  <span>Transponder Sync Timer</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    {formatTimer(timer)}
                  </span>
                </div>
                <div className="w-full bg-[#0b1429] h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-amber-400 h-full transition-all duration-1000"
                    style={{ width: `${(timer / 300) * 100}%` }}
                  />
                </div>
              </div>

              {instructions.length > 0 && (
                <div className="text-left bg-[#070e1e] p-3.5 rounded-2xl border border-[#172545] space-y-1.5 text-xs text-gray-300">
                  <p className="font-bold text-white mb-1">Steps to follow:</p>
                  {instructions.map((inst, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">{idx + 1}.</span>
                      <span>{inst}</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors"
              >
                {t.close}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
