import { useRef, useState } from 'react';
import type { DthOperator, DthPlan, Language, UserProfile } from '../types';
import { formatDuration, formatPrice } from '../lib/catalog';
import { useAccessibleModal } from '../lib/useAccessibleModal';
import { ArrowRight, Calendar, CheckCircle2, Lock, RefreshCw, ShieldCheck, Tv, X } from '../lib/icons';
import { OperatorCardLogo } from './BrandAssets';
import './RazorpayCheckout.css';
import { downloadPaymentReceipt, type VerifiedPayment } from '../lib/paymentReceipt';
import { paymentAuthHeaders } from '../lib/paymentAuth';

interface PaymentResult { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }
interface CheckoutInstance {
  open(): void;
  on(event: 'payment.failed', handler: (event: { error?: { description?: string } }) => void): void;
}
declare global {
  interface Window { Razorpay?: new (options: Record<string, unknown>) => CheckoutInstance }
}

let scriptPromise: Promise<void> | undefined;
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  return scriptPromise ||= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => { if (window.Razorpay) resolve(); else { scriptPromise = undefined; script.remove(); reject(new Error('Razorpay checkout unavailable.')); } };
    script.onerror = () => { scriptPromise = undefined; script.remove(); reject(new Error('Could not load Razorpay. Check your connection and retry.')); };
    document.head.appendChild(script);
  });
}

async function post(url: string, body: unknown) {
  const response = await fetch(url, { method: 'POST', headers: await paymentAuthHeaders(),
    body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Payment request failed.');
  return data;
}

export function RazorpayCheckout({ onClose, plan, operator, smartCard, currentLang, user }: {
  onClose: () => void; plan: (DthPlan | { name: string; price: number }) & { pack_type?: string; duration_months?: number }; operator: DthOperator;
  smartCard: string; currentLang: Language;
  user?: UserProfile | null;
}) {
  const [busy, setBusy] = useState(false);
  const [customerName, setCustomerName] = useState(user?.displayName || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phoneNumber || '');
  const locked = useRef(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [verified, setVerified] = useState(false);
  const [verifiedPayment, setVerifiedPayment] = useState<VerifiedPayment | null>(null);
  const [downloading, setDownloading] = useState(false);
  const { modalRef } = useAccessibleModal({ isOpen: !busy, onClose: () => { if (!result || verified) onClose(); } });
  const order = useRef<{ order_id: string; amount: number; currency: string; key_id: string } | null>(null);
  const label = (en: string, ta: string) => currentLang === 'ta' ? ta : en;
  function release() { locked.current = false; setBusy(false); }
  async function verify(payment: PaymentResult) {
    setResult(payment); setBusy(true); locked.current = true;
    try {
      const data = await post('/api/verify-payment', payment);
      setVerified(true); setError('');
      setVerifiedPayment(data);
      setMessage(data.paid ? label('Payment verified and captured. Recharge processing has not started.', 'கட்டணம் உறுதிசெய்யப்பட்டது. ரீசார்ஜ் செயலாக்கம் இன்னும் தொடங்கவில்லை.') : label('Payment signature verified. Capture is pending; do not pay again.', 'கட்டணச் சான்று சரிபார்க்கப்பட்டது. மீண்டும் பணம் செலுத்த வேண்டாம்.'));
    } catch (e) { setError(`${e instanceof Error ? e.message : 'Verification failed.'} Payment status is unconfirmed. Retry verification; do not pay again.`); }
    finally { release(); }
  }
  async function pay() {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(''); setMessage('');
    try {
      if (!customerName.trim() || customerName.trim().length > 100) throw new Error(label('Enter your name to continue.', 'தொடர உங்கள் பெயரை உள்ளிடவும்.'));
      const phone = customerPhone.replace(/[\s()-]/g, '');
      if (!/^(?:\+91)?[6-9]\d{9}$/.test(phone)) throw new Error(label('Enter a valid 10-digit Indian mobile number.', 'சரியான 10 இலக்க இந்திய மொபைல் எண்ணை உள்ளிடவும்.'));
      await paymentAuthHeaders();
      await loadCheckout();
      const packId = (plan as DthPlan).id || 'custom';
      order.current ||= await post('/api/create-order', { packId, operator: operator.id, smartCardNumber: smartCard,
        customerName: customerName.trim(), customerPhone: phone,
        ...(packId === 'custom' ? { customAmount: plan.price } : {}) });
      const quote = order.current!;
      let completed = false;
      const checkout = new window.Razorpay!({ key: quote.key_id, order_id: quote.order_id,
        amount: quote.amount, currency: quote.currency, name: 'DTH Tamizhan', description: plan.name,
        theme: { color: '#68162f' },
        prefill: { name: customerName.trim(), contact: phone, email: user?.email || '' },
        handler: (payment: PaymentResult) => { completed = true; void verify(payment); },
        modal: { backdropclose: false, ondismiss: () => { if (!completed) { setMessage(label('Payment cancelled. No payment confirmed.', 'கட்டணம் ரத்து செய்யப்பட்டது.')); release(); } } },
      });
      checkout.on('payment.failed', event => { setError(event.error?.description || 'Payment failed. Please retry.'); });
      checkout.open();
    } catch (e) { setError(e instanceof Error ? e.message : 'Checkout failed.'); release(); }
  }
  const cannotClose = busy || (!!result && !verified);
  const isCatalogPlan = Boolean((plan as DthPlan).id);
  const quality = isCatalogPlan ? (plan.pack_type === 'HD' || plan.pack_type === 'SD' ? plan.pack_type : /\bHD\b/i.test(plan.name) ? 'HD' : /\bSD\b/i.test(plan.name) ? 'SD' : null) : null;
  const duration = isCatalogPlan ? plan.duration_months : undefined;
  const durationLabel = duration ? formatDuration(duration, currentLang) : null;
  // The duration has its own badge; avoid repeating the generated suffix in the title.
  const planTitle = durationLabel && plan.name.endsWith(` (${durationLabel})`) ? plan.name.slice(0, -(` (${durationLabel})`.length)) : plan.name;
  return <div className="rzp-backdrop">
    <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="razorpay-title" aria-describedby="razorpay-description" className="rzp-dialog">
      <header className="rzp-header">
        <span className="rzp-eyebrow"><ShieldCheck size={16} />{label('DTH TAMIZHAN · CHECKOUT', 'DTH TAMIZHAN · கட்டணம்')}</span>
        <button type="button" className="rzp-close" disabled={cannotClose} onClick={onClose} aria-label={label('Close checkout', 'கட்டணப் பக்கத்தை மூடவும்')}><X size={20} /></button>
        <h2 id="razorpay-title">{verified ? label('Payment update', 'கட்டண நிலை') : label('Review your recharge', 'ரீசார்ஜ் விவரங்களைச் சரிபார்க்கவும்')}</h2>
        <p id="razorpay-description">{verified ? label('Keep your payment reference and download your receipt below.', 'கட்டண எண்ணைச் சேமித்து ரசீதைப் பதிவிறக்கவும்.') : label('Check your connection and plan before you pay.', 'பணம் செலுத்தும் முன் இணைப்பு மற்றும் திட்ட விவரங்களைச் சரிபார்க்கவும்.')}</p>
      </header>
      <div className="rzp-body">
        <section className="rzp-summary" aria-label={label('Recharge summary', 'ரீசார்ஜ் விவரம்')}>
          <div className="rzp-connection"><div className="rzp-operator-logo" aria-hidden="true">{operator.id === 'd2h' ? <span className="rzp-d2h-name">d2h</span> : <OperatorCardLogo key={operator.id} operatorId={operator.id} className="rzp-operator-image" />}</div><div><strong>{operator.name}</strong><span>{label('Subscriber ID', 'சந்தாதாரர் எண்')} <b>{smartCard}</b></span></div></div>
          <div className="rzp-plan"><span className="rzp-label">{label('Selected plan', 'தேர்ந்தெடுத்த திட்டம்')}</span><p>{planTitle}</p>
            {(quality || durationLabel) && <div className="rzp-plan-badges">
              {quality && <span className="rzp-quality-badge" data-quality={quality} aria-label={quality === 'HD' ? label('High definition', 'உயர் தெளிவு') : label('Standard definition', 'சாதாரண தெளிவு')}><Tv size={15} /><span>{quality}</span></span>}
              {durationLabel && <span className="rzp-duration-pill"><Calendar size={14} />{durationLabel}</span>}
            </div>}
          </div>
          <div className="rzp-total"><span>{label('Total payable', 'செலுத்த வேண்டிய தொகை')}</span><strong>{formatPrice(order.current ? order.current.amount / 100 : plan.price, currentLang)}</strong></div>
        </section>
        {error && <div role="alert" className="rzp-feedback rzp-error">{error}</div>}
        {message && <div role="status" className={`rzp-feedback ${verified ? 'rzp-success' : ''}`}>{verified && <CheckCircle2 size={22} />}<span>{message}</span></div>}
        {!verified && !result && <fieldset className="rzp-contact" disabled={busy || !!order.current}>
          <legend>{label('Customer details', 'வாடிக்கையாளர் விவரங்கள்')}</legend>
          <label htmlFor="checkout-customer-name">{label('Full name', 'முழுப் பெயர்')}<input id="checkout-customer-name" name="name" autoComplete="name" maxLength={100} value={customerName} onChange={event => setCustomerName(event.target.value)} required /></label>
          <label htmlFor="checkout-customer-phone">{label('Mobile number', 'மொபைல் எண்')}<input id="checkout-customer-phone" name="tel" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} placeholder="9876543210" value={customerPhone} onChange={event => setCustomerPhone(event.target.value)} required /></label>
        </fieldset>}
        {verifiedPayment && <div className="rzp-receipt">
          {verifiedPayment.test_mode && <p className="rzp-test-note">{label('Test payment · No real money collected', 'சோதனைக் கட்டணம் · உண்மையான பணம் பெறப்படவில்லை')}</p>}
          <span className="rzp-label">{label('Payment reference', 'கட்டண எண்')}</span><p className="rzp-payment-reference">{verifiedPayment.payment_id}</p>
          {verifiedPayment.paid ? <><button type="button" className="rzp-pay" disabled={downloading} onClick={async () => {
            setDownloading(true);
            try { await downloadPaymentReceipt(verifiedPayment, { operator: operator.name, subscriber: smartCard, plan: plan.name,
              logo: ({ airtel_dth: '/assets/airtel_logo.png', sun_direct: '/assets/sun_logo.png', tata_play: '/assets/tata_logo.png', dish_tv: '/assets/dishtv_logo.png', d2h: undefined })[operator.id] }); }
            catch { setError(label('Could not download receipt. Please try again.', 'ரசீதைப் பதிவிறக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.')); }
            finally { setDownloading(false); }
          }}>{downloading ? label('Preparing receipt…', 'ரசீது தயாராகிறது…') : label('Download payment receipt', 'கட்டண ரசீதைப் பதிவிறக்கவும்')}</button></> : <p className="rzp-receipt-hint">{label('Your receipt will be available once payment is captured.', 'கட்டணம் உறுதியானதும் ரசீது கிடைக்கும்.')}</p>}
        </div>}
        {!verified && <>
          <button type="button" className="rzp-pay" disabled={busy} aria-busy={busy} onClick={() => result ? void verify(result) : void pay()}>
            {busy ? <RefreshCw size={19} className="rzp-spinner" /> : <Lock size={18} />}
            <span>{busy ? result ? label('Confirming your payment…', 'கட்டணம் சரிபார்க்கப்படுகிறது…') : label('Opening secure checkout…', 'பாதுகாப்பான கட்டணப் பக்கம் திறக்கப்படுகிறது…') : result ? label('Check payment status', 'கட்டண நிலையைச் சரிபார்க்கவும்') : `${label('Pay', 'செலுத்தவும்')} ${formatPrice(order.current ? order.current.amount / 100 : plan.price, currentLang)}`}</span>
            {!busy && <ArrowRight size={19} />}
          </button>
        </>}
        <div className="rzp-provider"><span><ShieldCheck size={15} />{label('Secure payments by', 'பாதுகாப்பான கட்டணம்')}</span><img src="/assets/razorpay-logo.png" width="100" height="22" alt="Razorpay" /></div>
        <button type="button" className="rzp-back" disabled={cannotClose} onClick={onClose}>{verified ? label('Done', 'முடிந்தது') : label('Go back and edit', 'திரும்பிச் சென்று திருத்தவும்')}</button>
      </div>
    </div>
  </div>;
}
