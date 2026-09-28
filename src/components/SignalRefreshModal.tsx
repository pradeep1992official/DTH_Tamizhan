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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050811]/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0e1935] border border-[#1e3058] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative text-left">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#172545] flex items-center justify-between bg-[#070e1e]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#c5a059]/15 text-[#dfb86c] flex items-center justify-center">
              <Radio className="w-5 h-5 text-[#dfb86c]" />
            </div>
            <div>
              <h2 className="text-base font-serif-royal font-bold text-[#f5f2eb] leading-tight">
                {t.signalRefreshTitle}
              </h2>
              <p className="text-xs text-[#8e9cb4]">
                Re-activate viewing & sync account authorization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8e9cb4] hover:text-[#f5f2eb] hover:bg-[#142345] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {!countdownActive ? (
            <>
              <p className="text-xs text-[#c7d2e5] leading-relaxed">
                {t.signalRefreshDesc}
              </p>

              {/* Operator Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#8e9cb4] uppercase tracking-wider block">
                  Select DTH Operator
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
                      className={`py-2 px-2 rounded-lg border text-center transition-all ${
                        operator === op.id
                          ? 'bg-[#c5a059] text-[#080d1a] font-bold border-[#c5a059]'
                          : 'bg-[#070e1e] text-[#c7d2e5] border-[#182747] hover:bg-[#142345]'
                      }`}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Smart Card Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#8e9cb4] uppercase tracking-wider block">
                  Smart Card / Subscriber ID
                </label>
                <input
                  type="text"
                  value={smartCard}
                  onChange={(e) => setSmartCard(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Enter 10 to 12 digit Smart Card number"
                  className="w-full bg-[#070e1e] border border-[#182747] focus:border-[#c5a059] rounded-xl px-4 py-3 text-[#f5f2eb] placeholder-[#5a6a88] font-mono text-base font-bold focus:outline-none"
                />
              </div>

              {/* Notice */}
              <div className="p-3 rounded-xl bg-[#c5a059]/10 border border-[#c5a059]/25 text-xs text-[#dfb86c] flex items-start gap-2.5">
                <Tv className="w-4 h-4 text-[#dfb86c] shrink-0 mt-0.5" />
                <p>
                  <strong>Pre-requisite:</strong> Please ensure your Set-Top Box is turned <strong>ON</strong> and tuned to <strong>Channel 100</strong> before requesting a signal refresh.
                </p>
              </div>

              {/* Action Button */}
              <button
                id="send-signal-pulse-btn"
                onClick={handleSendSignal}
                disabled={isTransmitting || !smartCard}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#c5a059] to-[#ba9b52] hover:brightness-105 disabled:opacity-50 text-[#080d1a] font-bold text-sm shadow-xl shadow-black/40 transition-all flex items-center justify-center gap-2"
              >
                {isTransmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#080d1a]" />
                    <span>{t.refreshing}</span>
                  </>
                ) : (
                  <>
                    <Radio className="w-4 h-4 text-[#080d1a]" />
                    <span>{t.triggerRefresh}</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="space-y-5 animate-in zoom-in-95 text-center">
              {/* Pulse Active Animation */}
              <div className="w-16 h-16 rounded-2xl bg-[#c5a059]/15 text-[#dfb86c] border border-[#c5a059]/30 flex items-center justify-center mx-auto relative">
                <Radio className="w-8 h-8 animate-pulse text-[#dfb86c]" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
              </div>

              <div>
                <h3 className="text-base font-serif-royal font-bold text-[#f5f2eb]">
                  Signal Refresh Request Sent!
                </h3>
                <p className="text-xs text-[#8e9cb4] mt-1">
                  Request Reference ID: <span className="font-mono text-[#dfb86c] font-bold">{batchId}</span>
                </p>
              </div>

              {/* Countdown Timer */}
              <div className="p-4 rounded-xl bg-[#070e1e] border border-[#172545] space-y-1">
                <span className="text-[10px] text-[#8e9cb4] uppercase tracking-widest font-bold block">
                  Keep Box ON Channel 100
                </span>
                <span className="font-mono font-bold text-3xl text-emerald-400">
                  {formatTimer(timer)}
                </span>
                <p className="text-[11px] text-[#8e9cb4]">
                  Channels will automatically activate as subscription details sync.
                </p>
              </div>

              {/* Step instructions */}
              <div className="text-left bg-[#070e1e]/60 p-4 rounded-xl border border-[#172545] space-y-2 text-xs">
                <span className="text-[11px] font-bold text-[#f5f2eb] block">
                  Recommended Steps:
                </span>
                {instructions.map((inst, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[#c7d2e5]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{inst}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-[#142345] hover:bg-[#1c305e] text-[#f5f2eb] font-bold text-xs transition-colors border border-[#1e3058]"
              >
                Close & Return
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
