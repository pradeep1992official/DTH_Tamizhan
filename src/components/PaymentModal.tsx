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
} from '../lib/icons';
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
import { db, sanitizePayload } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useAccessibleModal } from '../lib/useAccessibleModal';
import { OperatorTheme } from '../lib/theme';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  currentTheme: OperatorTheme;
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
  currentTheme,
  user,
  plan,
  subscriber,
  operator,
  smartCard,
  saveBox,
  onPaymentSuccess,
}) => {
  const t = translations[currentLang];
  const isLight = currentTheme.isLightMode;
  const modalSurface = 'bg-paper border-rule text-ink';
  const headerSurface = isLight ? 'bg-paper-2 border-rule' : 'bg-paper-2 border-rule';
  const panelSurface = isLight ? 'bg-paper-2 border-rule' : 'bg-paper-2 border-rule';
  const inputSurface = isLight
    ? 'bg-paper border-rule text-ink placeholder-muted'
    : 'bg-paper-2 border-rule text-ink placeholder-muted';
  const mutedText = isLight ? 'text-muted' : 'text-muted';
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
            colors: ['--operator-sun-direct', '--operator-tata-play', '--operator-airtel-dth'].map((token) => getComputedStyle(document.documentElement).getPropertyValue(token).trim()),
            disableForReducedMotion: true,
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
      className="dialog-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
        className={`hm-dialog rounded-xl border w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-lg relative text-left ${modalSurface}`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${headerSurface}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-soft text-accent flex items-center justify-center border border-rule">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="payment-modal-title" className={`text-base font-bold leading-tight ${isLight ? 'text-ink' : 'text-ink'}`}>
                {t.paymentTitle}
              </h2>
              <p className={`text-sm ${mutedText}`}>
                {operator.name} • {smartCard}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className={`p-1.5 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-focus ${isLight ? 'text-muted hover:text-ink hover:bg-paper-2' : 'text-muted hover:text-ink hover:bg-paper'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Amount Summary Ribbon */}
        <div className={`dialog-summary sticky top-0 z-10 px-6 py-3.5 border-b flex items-center justify-between shadow-sm ${isLight ? 'bg-accent-soft border-rule' : 'bg-paper-2 border-rule'}`}>
          <div>
            <p className={`text-sm font-medium ${isLight ? 'text-ink' : 'text-muted'}`}>{plan.name}</p>
            <p className="text-sm text-accent font-medium">
              {t.validity}: {plan.validityDays} {t.days}
            </p>
          </div>
          <div className="text-right">
            <span className={`text-sm block ${mutedText}`}>{t.totalPayable}</span>
            <span className="text-2xl tabular-nums font-bold text-accent">
              ₹{plan.price}
            </span>
          </div>
        </div>

        {/* Body & Payment Methods */}
        <div className="p-6 space-y-5">
          {errorMessage && (
            <div role="alert" className={`p-3.5 rounded-xl bg-error/10 border border-rule text-sm flex items-center justify-between gap-2 ${isLight ? 'text-error' : 'text-error'}`}>
              <div className="flex items-center gap-2">
                <AlertCircle className={`w-4 h-4 shrink-0 ${isLight ? 'text-error' : 'text-error'}`} />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={handlePaySubmit}
                className="px-3 py-1 rounded-lg bg-error/10 text-ink font-bold text-sm shrink-0"
              >
                {t.retryFetch}
              </button>
            </div>
          )}

          {/* Customer Contact & SMS / WhatsApp Receipt Notification */}
          <div className={`dialog-section p-4 border rounded-lg space-y-3 ${panelSurface}`}>
            <div className="flex items-center justify-between text-sm">
              <span className={`font-bold flex items-center gap-1.5 ${isLight ? 'text-ink' : 'text-ink'}`}>
                <Smartphone className="w-4 h-4 text-accent" />
                <span>{currentLang === 'ta' ? 'ரசீது பெறும் விவரங்கள்' : 'Receipt & SMS Confirmation'}</span>
              </span>
              <span className="text-sm text-accent font-medium">
                {currentLang === 'ta' ? 'உடனடி உறுதிப்படுத்தல்' : 'Instant Activation'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="paymentmodal-field-1" className={`text-sm font-medium block mb-1 ${mutedText}`}>
                  {t.subscriberName}
                </label>
                <input id="paymentmodal-field-1"
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${inputSurface}`}
                />
              </div>
              <div>
                <label htmlFor="paymentmodal-field-2" className={`text-sm font-medium block mb-1 ${mutedText}`}>
                  {currentLang === 'ta' ? 'மொபைல் எண் (SMS ரசீது) *' : 'Mobile Number (SMS Receipt) *'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-muted tabular-nums">+91</span>
                  <input id="paymentmodal-field-2"
                    type="tel"
                    maxLength={10}
                    required
                    placeholder="10-digit mobile"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, ''))}
                    className={`w-full border rounded-xl pl-10 pr-3 py-2 text-sm tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${inputSurface}`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Tabs */}
          <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 rounded-lg border ${panelSurface}`}>
            <button
              type="button"
              onClick={() => setPaymentMethod('upi')}
              className={`py-2 px-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-1.5 ${
                paymentMethod === 'upi'
                  ? 'bg-accent text-accent-ink shadow-sm'
                  : (isLight ? 'text-muted hover:text-ink' : 'text-muted hover:text-ink')
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>{t.payViaUpi}</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`py-2 px-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-1.5 ${
                paymentMethod === 'card'
                  ? 'bg-accent text-accent-ink shadow-sm'
                  : (isLight ? 'text-muted hover:text-ink' : 'text-muted hover:text-ink')
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>{t.payViaCard}</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('netbanking')}
              className={`py-2 px-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-1.5 ${
                paymentMethod === 'netbanking'
                  ? 'bg-accent text-accent-ink shadow-sm'
                  : (isLight ? 'text-muted hover:text-ink' : 'text-muted hover:text-ink')
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>{t.payViaNetbanking}</span>
            </button>
          </div>

          {/* Tab Content 1: UPI / QR Code */}
          {paymentMethod === 'upi' && (
            <div className="space-y-4 text-center">
              <div className="p-4 bg-paper-2 rounded-lg max-w-[200px] mx-auto">
                <div className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center p-3 relative ${isLight ? 'bg-paper-2 text-ink' : 'bg-paper-2 text-ink'}`}>
                  <QrCode className="w-28 h-28 text-accent mb-1" />
                  <span className="text-sm tabular-nums font-bold text-accent">₹{plan.price}</span>
                </div>
              </div>
              <p className={`text-sm ${mutedText}`}>
                {t.scanToPay}
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent-soft border border-rule rounded-full text-sm tabular-nums text-accent font-medium">
                <span>QR Session: {formatTimer(upiTimer)}</span>
              </div>
            </div>
          )}

          {/* Tab Content 2: Cards */}
          {paymentMethod === 'card' && (
            <div className="space-y-3">
              <div>
                <label htmlFor="paymentmodal-field-3" className={`text-sm font-medium block mb-1 ${mutedText}`}>
                  Card Number
                </label>
                <input id="paymentmodal-field-3"
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-sm tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${inputSurface}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="paymentmodal-field-4" className={`text-sm font-medium block mb-1 ${mutedText}`}>
                    Expiry (MM/YY)
                  </label>
                  <input id="paymentmodal-field-4"
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-sm tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${inputSurface}`}
                  />
                </div>
                <div>
                  <label htmlFor="paymentmodal-field-5" className={`text-sm font-medium block mb-1 ${mutedText}`}>
                    CVV
                  </label>
                  <input id="paymentmodal-field-5"
                    type="password"
                    maxLength={4}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-sm tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${inputSurface}`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 3: Netbanking */}
          {paymentMethod === 'netbanking' && (
            <div className="space-y-3">
              <label className={`text-sm font-medium block ${mutedText}`}>
                Select Your Bank
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['SBI', 'HDFC', 'ICICI', 'Axis', 'Canara', 'IOB', 'KVB', 'TMB'].map((bank) => (
                  <button
                    key={bank}
                    type="button"
                    onClick={() => setSelectedBank(bank)}
                    className={`p-2 rounded-xl text-sm font-bold border transition-colors ${
                      selectedBank === bank
                        ? 'bg-accent text-ink border-rule shadow-sm'
                        : isLight ? 'bg-paper border-rule text-ink hover:border-rule' : 'bg-paper-2 border-rule text-muted hover:border-rule'
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
            aria-busy={isProcessing}
            className="dialog-primary w-full py-3.5 px-4 rounded-lg bg-accent hover:bg-accent-soft text-ink font-bold text-sm transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
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

          <p className="text-sm text-center text-muted flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-success" />
            <span>{t.secureEncryption}</span>
          </p>
        </div>
      </div>
    </div>
  );
};
