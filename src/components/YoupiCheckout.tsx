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
      if (data.status === 'paid') setStatus('Payment reconciled. Your recharge is waiting to be processed.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Checkout unavailable.'); }
    finally { lock.current = false; setBusy(false); }
  }
  async function check() {
    if (!checkout || lock.current) return; lock.current = true; setBusy(true); setError('');
    try {
      const data = await request('/status', { id: checkout.id });
      setStatus(data.status === 'paid' ? 'Payment reconciled. Your recharge is waiting to be processed.' : `Payment is awaiting bank reconciliation (${data.providerStatus}). Please do not pay again.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Status unavailable.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <div className="dialog-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"><div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="youpi-title" className="hm-dialog rounded-xl border border-rule bg-paper text-ink w-full max-w-lg p-6 space-y-4">
    <div className="flex justify-between items-center"><h2 id="youpi-title" className="font-bold text-xl">Pay with UPI · YouPI</h2><button onClick={onClose} aria-label="Close checkout">Close</button></div>
    <p>{operator.name} / {smartCard}</p>
    <p>Temporary UPI checkout. Recharge processing starts after payment is checked against bank records.</p>
    {error && <p role="alert" className="text-error">{error}</p>}
    {status && <p role="status">{status}</p>}
    {!checkout ? <button disabled={busy} onClick={() => void prepare()} className="bg-accent text-accent-ink rounded-xl px-4 py-3">{busy ? 'Preparing…' : 'Continue to UPI'}</button> : <>
      <p className="font-bold">Amount: ?{(checkout.amountPaise / 100).toFixed(2)}</p>
      <p className="text-sm break-all">Reference: {checkout.id}</p>
      <a className="block bg-accent text-accent-ink rounded-xl px-4 py-3" href={checkout.checkoutUrl} target="_blank" rel="noopener noreferrer">Open UPI checkout</a>
      <button disabled={busy} onClick={() => void check()} className="border border-rule rounded-xl px-4 py-3">{busy ? 'Checking…' : 'Check payment status'}</button>
      <p className="text-sm">Return here after paying. A QR scan or payment alert alone does not confirm payment. Never share your UPI PIN.</p>
    </>}
  </div></div>;
}
