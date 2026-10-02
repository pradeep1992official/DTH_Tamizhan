import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  CreditCard, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Lock, 
  Smartphone, 
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  DthOperator, 
  DthPlan, 
  SubscriberDetails, 
  Language, 
  UserProfile, 
  RechargeOrder 
} from '../types';
import { translations } from '../lib/translations';
import { db, isFirebaseLive, sanitizePayload } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useAccessibleModal } from '../lib/useAccessibleModal';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  user: UserProfile | null;
  plan: DthPlan | { name: string; price: number; validityDays: number };
  subscriber: SubscriberDetails | null;
  operator: DthOperator;
  smartCard: string;
  saveBox: boolean;
  onPaymentSuccess: (order: RechargeOrder) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  currentLang,
  user,
  plan,
  subscriber,
  operator,
  smartCard,
  saveBox,
  onPaymentSuccess,
}) => {
  const t = translations[currentLang];
  const { modalRef } = useAccessibleModal({ isOpen, onClose });

  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [upiId, setUpiId] = useState('user@okaxis');
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8910');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('890');
  const [selectedBank, setSelectedBank] = useState('SBI');

  // Customer Contact for SMS / WhatsApp Receipt
  const [customerName, setCustomerName] = useState(() => {
    return user?.displayName || subscriber?.customerName || '';
  });
  const [customerMobile, setCustomerMobile] = useState(() => {
    try {
      const saved = localStorage.getItem('dth_tamizhan_last_mobile');
      if (saved) return saved;
    } catch {}
    return user?.phoneNumber || subscriber?.registeredMobile || '';
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [upiTimer, setUpiTimer] = useState(180);

  useEffect(() => {
    let interval: any;
    if (isOpen && upiTimer > 0) {
      interval = setInterval(() => setUpiTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen, upiTimer]);

  if (!isOpen) return null;

  const handlePaySubmit = async () => {
    setErrorMessage(null);

    const cleanMobile = customerMobile.trim().replace(/\D/g, '');
    if (cleanMobile.length > 0 && cleanMobile.length !== 10) {
      setErrorMessage(currentLang === 'ta' ? 'ரசீது பெற சரியான 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்' : 'Please enter a valid 10-digit mobile number for the recharge receipt');
      return;
    }

    try {
      if (cleanMobile.length === 10) {
        localStorage.setItem('dth_tamizhan_last_mobile', cleanMobile);
      }
    } catch {}

    setIsProcessing(true);

    try {
      // Prepare sanitized payload strictly
      const rawPayload = {
        operator: operator.id,
        smartCardNumber: smartCard,
        amount: plan.price,
        packId: (plan as any).id || 'custom',
        packName: plan.name,
        packValidity: `${plan.validityDays} ${t.days}`,
        paymentMethod: paymentMethod === 'upi' ? 'upi' : paymentMethod === 'card' ? 'card' : 'netbanking',
        customerName: customerName.trim() || user?.displayName || 'Valued Subscriber',
        registeredMobile: cleanMobile || subscriber?.registeredMobile || user?.phoneNumber || '9840123456',
        userId: user?.uid || 'guest_user',
      };

      const cleanPayload = sanitizePayload(rawPayload);

      // Call server backend recharge endpoint
      const response = await fetch('/api/recharge/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanPayload),
      });

      const data = await response.json();

      if (data.success && data.order) {
        if (db && data.order.orderId) {
          try {
            const cleanOrder = sanitizePayload(data.order);
            setDoc(doc(db, 'recharge_orders', data.order.orderId), cleanOrder, { merge: true }).catch(() => {});
            setDoc(doc(db, 'pending_recharges', data.order.orderId), cleanOrder, { merge: true }).catch(() => {});
          } catch (fbErr) {
            console.warn('[Firestore] Order sync note:', fbErr);
          }
        }

        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#F59E0B', '#10B981', '#3B82F6', '#EC4899'],
          });
        } catch (e) {
          // ignore confetti error
        }

        setIsProcessing(false);
        onPaymentSuccess(data.order);
      } else {
        throw new Error(data.error || t.paymentFailed);
      }
    } catch (err: any) {
      console.error('Payment failure:', err);
      setIsProcessing(false);
      setErrorMessage(err.message || t.paymentFailed);
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
        aria-labelledby="payment-modal-title"
        className="bg-[#0e1935] border border-[#1e3058] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative text-left"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#172545] flex items-center justify-between bg-[#070e1e]/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="payment-modal-title" className="text-base font-bold text-white leading-tight">
                {t.paymentTitle}
              </h2>
              <p className="text-xs text-gray-300">
                {operator.name} • {smartCard}
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

        {/* Amount Summary Ribbon */}
        <div className="bg-[#122044] px-6 py-3.5 border-b border-[#172545] flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-200 font-semibold">{plan.name}</p>
            <p className="text-xs text-amber-300 font-medium">
              {t.validity}: {plan.validityDays} {t.days}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-300 block">{t.totalPayable}</span>
            <span className="text-2xl font-mono font-bold text-amber-400">
              ₹{plan.price}
            </span>
          </div>
        </div>

        {/* Body & Payment Methods */}
        <div className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={handlePaySubmit}
                className="px-3 py-1 rounded-lg bg-rose-500 text-white font-bold text-xs shrink-0"
              >
                {t.retryFetch}
              </button>
            </div>
          )}

          {/* Customer Contact & SMS / WhatsApp Receipt Notification */}
          <div className="p-4 bg-[#070e1e] border border-[#172545] rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-amber-400" />
                <span>{currentLang === 'ta' ? 'ரசீது பெறும் விவரங்கள்' : 'Receipt & SMS Confirmation'}</span>
              </span>
              <span className="text-xs text-amber-400 font-medium">
                {currentLang === 'ta' ? 'உடனடி உறுதிப்படுத்தல்' : 'Instant Activation'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  {t.subscriberName}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-[#0b1429] border border-[#1c2d52] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  {currentLang === 'ta' ? 'மொபைல் எண் (SMS ரசீது) *' : 'Mobile Number (SMS Receipt) *'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-gray-400 font-mono">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    required
                    placeholder="10-digit mobile"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#0b1429] border border-[#1c2d52] rounded-xl pl-10 pr-3 py-2 text-xs text-white font-mono placeholder-gray-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Tabs */}
          <div className="grid grid-cols-3 gap-2 p-1.5 bg-[#070e1e] rounded-2xl border border-[#172545]">
            <button
              type="button"
              onClick={() => setPaymentMethod('upi')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                paymentMethod === 'upi'
                  ? 'bg-amber-400 text-gray-900 shadow-md'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>{t.payViaUpi}</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                paymentMethod === 'card'
                  ? 'bg-amber-400 text-gray-900 shadow-md'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>{t.payViaCard}</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('netbanking')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                paymentMethod === 'netbanking'
                  ? 'bg-amber-400 text-gray-900 shadow-md'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>{t.payViaNetbanking}</span>
            </button>
          </div>

          {/* Tab Content 1: UPI / QR Code */}
          {paymentMethod === 'upi' && (
            <div className="space-y-4 text-center">
              <div className="p-4 bg-white rounded-2xl max-w-[200px] mx-auto shadow-inner">
                <div className="w-full aspect-square bg-[#0c1527] rounded-xl flex flex-col items-center justify-center p-3 text-white relative">
                  <QrCode className="w-28 h-28 text-amber-400 mb-1" />
                  <span className="text-xs font-mono font-bold text-amber-300">₹{plan.price}</span>
                </div>
              </div>
              <p className="text-xs text-gray-300">
                {t.scanToPay}
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs font-mono text-amber-300 font-semibold">
                <span>QR Session: {formatTimer(upiTimer)}</span>
              </div>
            </div>
          )}

          {/* Tab Content 2: Cards */}
          {paymentMethod === 'card' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  Card Number
                </label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full bg-[#070e1e] border border-[#172545] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">
                    Expiry (MM/YY)
                  </label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="w-full bg-[#070e1e] border border-[#172545] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">
                    CVV
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    className="w-full bg-[#070e1e] border border-[#172545] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 3: Netbanking */}
          {paymentMethod === 'netbanking' && (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-gray-300 block">
                Select Your Bank
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['SBI', 'HDFC', 'ICICI', 'Axis', 'Canara', 'IOB', 'KVB', 'TMB'].map((bank) => (
                  <button
                    key={bank}
                    type="button"
                    onClick={() => setSelectedBank(bank)}
                    className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                      selectedBank === bank
                        ? 'bg-amber-400 text-gray-900 border-amber-300 shadow-sm'
                        : 'bg-[#070e1e] border-[#172545] text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {bank}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            type="button"
            onClick={handlePaySubmit}
            disabled={isProcessing}
            className="w-full py-3.5 px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-gray-950 font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{t.processingPayment}</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>{t.payNow} (₹{plan.price})</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-xs text-center text-gray-400 flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t.secureEncryption}</span>
          </p>
        </div>
      </div>
    </div>
  );
};
