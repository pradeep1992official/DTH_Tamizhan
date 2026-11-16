import './RazorpayCheckout.css';
import './YoupiCheckout.css';
import { ArrowRight, CheckCircle2, RefreshCw, ShieldCheck, X } from '../lib/icons';
import { useRef, useState } from 'react';
import type { DthPlan, DthOperator, UserProfile } from '../types';
import { paymentAuthHeaders } from '../lib/paymentAuth';
import { useAccessibleModal } from '../lib/useAccessibleModal';

export function YoupiCheckout({ onClose, plan, operator, smartCard, user }: { onClose: () => void; plan: DthPlan | { name: string; price: number }; operator: DthOperator; smartCard: string; user: UserProfile | null }) {
  const key = useRef('');
  const storageKey = `youpi-checkout:${user?.uid}:${operator.id}:${smartCard}:${(plan as DthPlan).id || plan.price}`;
  const [checkout, setCheckout] = useState<{ id: string; checkoutUrl: string; amountPaise: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [paid, setPaid] = useState(false);
  const { modalRef } = useAccessibleModal({ isOpen: true, onClose });
  async function request(path: string, body: unknown) {
    const response = await fetch(`/api/payments/youpi${path}`, { method: 'POST', headers: await paymentAuthHeaders(), body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || 'YouPI unavailable.'); return data;
  }
  async function prepare() {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try {
      key.current ||= sessionStorage.getItem(storageKey) || crypto.randomUUID();
      sessionStorage.setItem(storageKey, key.current);
      const packId = (plan as DthPlan).id || 'custom';
      const data = await request('', { idempotencyKey: key.current, packId, operator: operator.id, smartCardNumber: smartCard, ...(packId === 'custom' ? { customAmount: plan.price } : {}), ...(user?.displayName ? { customerName: user.displayName } : {}) });
      setCheckout(data);
      setPaid(data.status === 'paid');
      if (data.status === 'paid') setStatus('Payment confirmed. Your recharge is waiting to be processed.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Checkout unavailable.'); }
    finally { lock.current = false; setBusy(false); }
  }
  async function check() {
    if (!checkout || lock.current) return; lock.current = true; setBusy(true); setError('');
    try {
      const data = await request('/status', { id: checkout.id });
      setPaid(data.status === 'paid');
      setStatus(data.status === 'paid' ? 'Payment confirmed. Your recharge is waiting to be processed.' : 'Payment is awaiting confirmation. Please do not pay again.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Status unavailable.'); }
    finally { lock.current = false; setBusy(false); }
  }
  const amount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(checkout ? checkout.amountPaise / 100 : plan.price);
  return <div className="rzp-backdrop">
    <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="youpi-title" aria-describedby="youpi-description" className="rzp-dialog youpi-dialog">
      <header className="rzp-header">
        <div className="rzp-eyebrow"><ShieldCheck size={15} /> UPI CHECKOUT</div>
        <button type="button" onClick={onClose} className="rzp-close" aria-label="Close checkout"><X size={20} /></button>
        <h2 id="youpi-title">Complete your payment</h2>
        <p id="youpi-description">Pay with your preferred UPI app through YouPI.</p>
      </header>
      <div className="rzp-body">
        <section className="rzp-summary" aria-label="Recharge summary">
          <dl className="youpi-details">
            <div><dt>Operator</dt><dd>{operator.name}</dd></div>
            <div><dt>Subscriber ID</dt><dd>{smartCard}</dd></div>
          </dl>
          <div className="rzp-total"><span>Total to pay</span><strong>{amount}</strong></div>
        </section>
        <div className="youpi-notice"><span className="youpi-status-dot" />{paid ? 'Payment verified' : 'UPI payment confirmation'}</div>
        <p className="youpi-explanation">{paid ? 'Your payment is verified. Your recharge is waiting to be processed.' : 'Your recharge will be queued once YouPI detects your payment.'}</p>
        {error && <div role="alert" className="rzp-feedback rzp-error">{error}</div>}
        {status && <div role="status" className={`rzp-feedback ${paid ? 'rzp-success' : ''}`}>{paid && <CheckCircle2 size={18} />}<span>{status}</span></div>}
        {!checkout ? <button type="button" disabled={busy} onClick={() => void prepare()} className="rzp-pay"><span>{busy ? 'Preparing checkout...' : 'Continue to UPI'}</span><ArrowRight size={18} /></button> : <>
          {!paid && <>
            <ol className="youpi-steps"><li>Open checkout and pay the exact amount.</li><li>Return here to check your payment status.</li></ol>
            <a className="rzp-pay youpi-open" href={checkout.checkoutUrl} target="_blank" rel="noopener noreferrer"><span>Open UPI checkout</span><ArrowRight size={18} /></a>
            <button type="button" disabled={busy} onClick={() => void check()} className="youpi-check"><RefreshCw size={16} className={busy ? 'rzp-spinner' : ''} />{busy ? 'Checking payment...' : 'Check payment status'}</button>
          </>}
          <details className="youpi-reference"><summary>Payment reference</summary><code>{checkout.id}</code><p>Keep this reference if you need payment support.</p></details>
        </>}
        <footer className="youpi-footer"><ShieldCheck size={16} /><p>Enter your UPI PIN only in your UPI app. If money is debited, check the existing payment before paying again.</p></footer>
      </div>
    </div>
  </div>;
}
