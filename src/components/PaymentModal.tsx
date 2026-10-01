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
  ArrowRight,
  Sparkles
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

  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [upiId, setUpiId] = useState('user@okaxis');
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8910');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('890');
  const [selectedBank, setSelectedBank] = useState('SBI');

  // Customer Contact for SMS / WhatsApp Receipt & Dealership directory
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
      setErrorMessage('Please enter a valid 10-digit mobile number for the recharge receipt');
      return;
    }

    try {
      if (cleanMobile.length === 10) {
        localStorage.setItem('dth_tamizhan_last_mobile', cleanMobile);
      }
    } catch {}

    setIsProcessing(true);

    try {
      // Prepare sanitized payload strictly (Directive 6: zero undefined values)
      const rawPayload = {
        operator: operator.id,
        smartCardNumber: smartCard,
        amount: plan.price,
        packId: (plan as any).id || 'custom',
        packName: plan.name,
        packValidity: `${plan.validityDays} Days`,
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
        // Sync order to Cloud Firestore (recharge_orders & pending_recharges)
        if (db && data.order.orderId) {
          try {
            const cleanOrder = sanitizePayload(data.order);
            setDoc(doc(db, 'recharge_orders', data.order.orderId), cleanOrder, { merge: true }).catch(() => {});
            setDoc(doc(db, 'pending_recharges', data.order.orderId), cleanOrder, { merge: true }).catch(() => {});
          } catch (fbErr) {
            console.warn('[Firestore] Order sync note:', fbErr);
          }
        }

        // Confetti celebration
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
        throw new Error(data.error || 'Transaction verification failed at payment gateway');
      }
    } catch (err: any) {
      console.error('Payment failure:', err);
      setIsProcessing(false);
      setErrorMessage(err.message || 'Payment communication error. Your card was not charged.');
    }
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050811]/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0e1935] border border-[#1e3058] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#172545] flex items-center justify-between bg-[#070e1e]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#c5a059]/15 text-[#dfb86c] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-serif-royal font-bold text-[#f5f2eb] leading-tight">
                {t.paymentTitle}
              </h2>
              <p className="text-xs text-[#8e9cb4]">
                {operator.name} • {smartCard}
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

        {/* Amount Summary Ribbon */}
        <div className="bg-[#122044] px-6 py-3 border-b border-[#172545] flex items-center justify-between">
          <div>
            <p className="text-xs text-[#8e9cb4]">{plan.name}</p>
            <p className="text-xs text-[#dfb86c] font-medium">
              Validity: {plan.validityDays} Days • Instant Activation
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-[#8e9cb4] block">{t.totalPayable}</span>
            <span className="text-2xl font-mono font-bold text-[#dfb86c]">
              ₹{plan.price}
            </span>
          </div>
        </div>

        {/* Body & Payment Methods */}
        <div className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={handlePaySubmit}
                className="px-2.5 py-1 rounded bg-rose-500 text-white font-bold text-[11px] shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {/* Customer Contact & SMS / WhatsApp Receipt Notification */}
          <div className="p-3.5 bg-[#070e1e] border border-[#172545] rounded-xl space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#f5f2eb] flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-[#dfb86c]" />
                <span>Recharge Receipt &amp; SMS Update</span>
              </span>
              <span className="text-[10px] text-[#8e9cb4]">Instant delivery</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-medium text-[#8e9cb4] block mb-1">
                  Customer / Payer Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-[#0b1429] border border-[#1c2d52] rounded-lg px-3 py-2 text-xs text-[#f5f2eb] focus:outline-none focus:border-[#c5a059]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#8e9cb4] block mb-1">
                  Mobile Number (SMS Receipt) *
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-[#8e9cb4] font-mono">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    required
                    placeholder="10-digit mobile"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#0b1429] border border-[#1c2d52] rounded-lg pl-10 pr-3 py-2 text-xs text-[#f5f2eb] font-mono focus:outline-none focus:border-[#c5a059]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Tabs */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-[#070e1e] rounded-xl border border-[#172545]">
            <button
              onClick={() => setPaymentMethod('upi')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                paymentMethod === 'upi'
                  ? 'bg-[#c5a059] text-[#080d1a] shadow'
                  : 'text-[#8e9cb4] hover:text-[#f5f2eb]'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>UPI / QR</span>
            </button>
            <button
              onClick={() => setPaymentMethod('card')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                paymentMethod === 'card'
                  ? 'bg-[#c5a059] text-[#080d1a] shadow'
                  : 'text-[#8e9cb4] hover:text-[#f5f2eb]'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setPaymentMethod('netbanking')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                paymentMethod === 'netbanking'
                  ? 'bg-[#c5a059] text-[#080d1a] shadow'
                  : 'text-[#8e9cb4] hover:text-[#f5f2eb]'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>NetBanking</span>
            </button>
          </div>

          {/* UPI Method */}
          {paymentMethod === 'upi' && (
            <div className="bg-[#070e1e] border border-[#172545] rounded-xl p-4 text-center space-y-4">
              <div className="flex flex-col items-center justify-center">
                {/* Simulated QR Code with TV/UPI Icon */}
                <div className="w-40 h-40 bg-[#f5f2eb] p-3 rounded-xl shadow-md relative flex items-center justify-center">
                  <div className="w-full h-full border-4 border-[#080d1a] border-dashed rounded-lg flex flex-col items-center justify-center p-2 text-center">
                    <QrCode className="w-20 h-20 text-[#080d1a]" />
                    <span className="text-[9px] font-mono font-black text-[#080d1a] mt-1">
                      BHIM UPI • ₹{plan.price}
                    </span>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="px-1.5 py-0.5 rounded bg-[#c5a059] text-[#080d1a] text-[10px] font-black shadow">
                      DTH
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2 text-xs text-[#8e9cb4]">
                  <span>QR Expires in:</span>
                  <span className="font-mono font-bold text-[#dfb86c]">
                    {formatTimer(upiTimer)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs text-[#8e9cb4] block font-medium">
                  {t.scanToPay}
                </span>
                <div className="flex justify-center gap-2 text-xs font-semibold">
                  <span className="px-2.5 py-1 rounded-md bg-[#0e1935] border border-[#1e3058] text-[#c7d2e5]">
                    GPay
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-[#0e1935] border border-[#1e3058] text-[#c7d2e5]">
                    PhonePe
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-[#0e1935] border border-[#1e3058] text-[#c7d2e5]">
                    Paytm
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-[#0e1935] border border-[#1e3058] text-[#c7d2e5]">
                    BHIM
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Card Method */}
          {paymentMethod === 'card' && (
            <div className="bg-[#070e1e] border border-[#172545] rounded-xl p-4 space-y-3">
              <div>
                <label className="text-[11px] font-medium text-[#8e9cb4] block mb-1">
                  Card Number
                </label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4532 0000 0000 0000"
                  className="w-full bg-[#0b1429] border border-[#1c2d52] rounded-lg px-3 py-2 text-sm text-[#f5f2eb] font-mono focus:outline-none focus:border-[#c5a059]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-[#8e9cb4] block mb-1">
                    Valid Thru (MM/YY)
                  </label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    placeholder="12/28"
                    className="w-full bg-[#0b1429] border border-[#1c2d52] rounded-lg px-3 py-2 text-sm text-[#f5f2eb] font-mono focus:outline-none focus:border-[#c5a059]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-[#8e9cb4] block mb-1">
                    CVV
                  </label>
                  <input
                    type="password"
                    maxLength={3}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    placeholder="•••"
                    className="w-full bg-[#0b1429] border border-[#1c2d52] rounded-lg px-3 py-2 text-sm text-[#f5f2eb] font-mono focus:outline-none focus:border-[#c5a059]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* NetBanking Method */}
          {paymentMethod === 'netbanking' && (
            <div className="bg-[#070e1e] border border-[#172545] rounded-xl p-4 space-y-3">
              <label className="text-[11px] font-medium text-[#8e9cb4] block">
                Select Your Bank
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {['SBI', 'HDFC Bank', 'ICICI Bank', 'Indian Bank', 'Canara Bank', 'Axis Bank'].map((bank) => (
                  <button
                    key={bank}
                    type="button"
                    onClick={() => setSelectedBank(bank)}
                    className={`p-2.5 rounded-lg border text-left font-semibold transition-all ${
                      selectedBank === bank
                        ? 'bg-[#c5a059]/20 text-[#dfb86c] border-[#c5a059]'
                        : 'bg-[#0e1935] text-[#c7d2e5] border-[#1e3058] hover:bg-[#142345]'
                    }`}
                  >
                    {bank}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            id="confirm-pay-now-btn"
            onClick={handlePaySubmit}
            disabled={isProcessing}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#c5a059] to-[#ba9b52] hover:brightness-105 text-[#080d1a] font-bold text-sm shadow-xl shadow-black/40 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#080d1a]" />
                <span>{t.processingPayment}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-[#080d1a]" />
                <span>
                  {t.payNow} (₹{plan.price})
                </span>
              </>
            )}
          </button>

          <p className="text-[10px] text-center text-[#8e9cb4] flex items-center justify-center gap-1">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>256-Bit SSL Encrypted • Secure Payments</span>
          </p>
        </div>
      </div>
    </div>
  );
};
