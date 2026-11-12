import { CheckoutPolicies } from './TrustContent';
import React, { useEffect, useRef, useState } from 'react';
import { X, CreditCard, QrCode, RefreshCw, AlertCircle } from '../lib/icons';
import type { DthOperator, DthPlan, SubscriberDetails, Language, UserProfile, RechargeOrder } from '../types';
import { subscriberError } from '../lib/subscriberValidation';
import { useAccessibleModal } from '../lib/useAccessibleModal';
import type { OperatorTheme } from '../lib/theme';
import type { CheckoutSession, SandboxOutcome } from '../../server/payments';

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

export function PaymentInstrument({ method, mode, session, expired, seconds }: {
  method: 'upi' | 'card' | 'netbanking'; mode: 'sandbox' | 'production' | null;
  session: CheckoutSession | null; expired: boolean; seconds: number;
}) {
  return <>
          {method === 'upi' && <div className="text-center space-y-3">
            {mode === 'sandbox' && session && session.status === 'ready' && !expired && <><QrCode aria-hidden="true" className="w-20 h-20 mx-auto text-muted" /><p className="text-sm font-medium">Mock QR illustration - cannot be scanned or paid</p><p className="text-sm tabular-nums">Test session: {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</p></>}
            {mode === 'production' && <p role="alert" className="text-error text-sm">Provider QR is unavailable. Retry checkout to request a provider order.</p>}
          </div>}
          {method === 'card' && <div className="p-4 rounded-lg border border-rule text-sm space-y-2"><CreditCard className="w-5 h-5" /><p>{mode === 'sandbox' ? 'Mock card payment. No card number, expiry or CVV is required. Use the test controls below.' : 'Card payments require the provider hosted checkout. Provider unavailable; no card details are collected.'}</p></div>}
          {method === 'netbanking' && <p className="text-sm">{mode === 'sandbox' ? 'Mock net banking. No bank login is required.' : 'Net banking requires the provider hosted checkout. Provider unavailable.'}</p>}
  </>;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, plan, operator, smartCard, currentLang }) => {
  const { modalRef } = useAccessibleModal({ isOpen, onClose });
  const [mode, setMode] = useState<'sandbox' | 'production' | null>(null);
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [method, setMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [outcome, setOutcome] = useState<SandboxOutcome>('success');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const requestKey = useRef('');
  const locked = useRef(false);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const packId = (plan as DthPlan).id || 'custom';

  async function request(url: string, body?: unknown) {
    const abort = new AbortController();
    controller.current = abort;
    const timeout = setTimeout(() => abort.abort(), 15_000);
    try {
      const response = await fetch(url, { method: body ? 'POST' : 'GET', signal: abort.signal,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Checkout is unavailable. Please retry.');
      return data;
    } catch (error) {
      if (abort.signal.aborted) throw new Error('Request timed out. Retry to check the same test session; do not start another payment.');
      throw error;
    } finally { clearTimeout(timeout); }
  }

  async function prepare(fresh = false) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true); setError(null);
    const version = generation.current;
    try {
      const idError = subscriberError(operator.id, smartCard, false, currentLang);
      if (idError) throw new Error(idError);
      const config = await request('/api/payments/config');
      if (version !== generation.current) return;
      const confirmedMode = config.mode === 'sandbox' ? 'sandbox' : 'production';
      setMode(confirmedMode);
      if (confirmedMode === 'production' || fresh) setSession(null);
      if (fresh || !requestKey.current) requestKey.current = crypto.randomUUID();
      const data = await request('/api/payments/session', { idempotencyKey: requestKey.current,
        packId, operator: operator.id, smartCardNumber: smartCard,
        ...(packId === 'custom' ? { customAmount: plan.price } : {}) });
      if (version !== generation.current) return;
      // Production never consumes a simulator session, even if an unexpected response arrives.
      if (confirmedMode !== 'sandbox' || data.session?.mode !== 'sandbox') throw new Error('Provider order or QR is unavailable. No payment has been taken.');
      setSession(data.session); setNow(Date.now());
    } catch (error) {
      if (version === generation.current) setError(error instanceof Error ? error.message : 'Checkout unavailable. Please retry.');
    } finally {
      if (version === generation.current) { locked.current = false; setBusy(false); }
    }
  }

  useEffect(() => {
    generation.current++;
    setSession(null); setMode(null); setError(null); setMethod('upi');
    requestKey.current = ''; locked.current = false;
    if (isOpen) void prepare();
    return () => { generation.current++; controller.current?.abort(); locked.current = false; };
  }, [isOpen, packId, plan.price, operator.id, smartCard]);

  useEffect(() => {
    if (!isOpen || !session || session.status !== 'ready') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isOpen, session]);

  async function simulate() {
    if (locked.current || !session || mode !== 'sandbox' || session.status !== 'ready') return;
    if (Date.now() >= session.expiresAt) { setNow(Date.now()); return; }
    locked.current = true; setBusy(true); setError(null);
    const version = generation.current;
    try {
      const data = await request('/api/recharge/create', { sessionId: session.id, outcome });
      if (version === generation.current) setSession(data.session);
    } catch (error) {
      if (version === generation.current) setError(error instanceof Error ? error.message : 'Could not check the test payment.');
    } finally {
      if (version === generation.current) { locked.current = false; setBusy(false); }
    }
  }

  if (!isOpen) return null;
  const seconds = session ? Math.max(0, Math.ceil((session.expiresAt - now) / 1000)) : 0;
  const expired = !!session && seconds === 0 && session.status === 'ready';
  const formatAmount = (paise: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);
  return (
    <div className="dialog-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="payment-modal-title" className="hm-dialog rounded-xl border border-rule bg-paper text-ink w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-lg text-left">
        <div className="px-6 py-4 border-b border-rule bg-paper-2 flex items-center justify-between">
          <div><h2 id="payment-modal-title" className="text-base font-bold">Complete DTH Recharge</h2><p className="text-sm text-muted">{operator.name} / {smartCard}</p></div>
          <button type="button" onClick={onClose} aria-label="Close checkout" className="p-2 rounded-xl"><X className="w-5 h-5" /></button>
        </div>
        {mode === 'sandbox' && <div role="status" className="px-6 py-3 bg-warning-soft text-ink border-b border-rule font-bold">Test mode - no real payment will be taken</div>}
        <div className="dialog-summary px-6 py-4 border-b border-rule flex items-center justify-between gap-4">
          <div><p className="font-medium">{session?.packName || plan.name}</p><p className="text-sm text-muted">{session?.validity || 'Awaiting server quote'}</p></div>
          <div className="text-right"><span className="text-sm text-muted block">Total payable</span><strong className="text-2xl tabular-nums">{session ? formatAmount(session.amountPaise) : 'Unavailable'}</strong></div>
        </div>
        <div className="p-6 space-y-5">
          <dl className="text-sm space-y-2">
            <div><dt className="text-muted">Payment provider</dt><dd>{session?.provider || (mode === 'production' ? 'Not configured' : 'Checking configuration...')}</dd></div>
            <div><dt className="text-muted">Order reference</dt><dd className="break-all tabular-nums">{session?.id || 'No provider order created'}</dd></div>
          </dl>
          <p className="text-sm text-muted">{mode === 'sandbox' ? 'Test results stay in this dialog. No recharge, receipt, saved-box update or real order is created.' : 'Payment must be confirmed by the provider before recharge processing begins. Closing this dialog does not prove payment success.'}</p>
          {error && <div role="alert" className="p-3 rounded-xl border border-rule bg-error-soft text-error text-sm"><AlertCircle className="w-4 h-4 inline mr-2" />{error}</div>}
          {busy && <p role="status" className="text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" />Checking checkout...</p>}
          {!session && !busy && <button type="button" onClick={() => void prepare()} className="dialog-primary w-full py-3 rounded-lg">Retry checkout</button>}
          <div className="grid grid-cols-3 gap-2 p-1.5 rounded-lg border border-rule bg-paper-2" role="group" aria-label="Payment method">
            {(['upi', 'card', 'netbanking'] as const).map(value => <button key={value} type="button" onClick={() => setMethod(value)} aria-pressed={method === value} className={`py-2 px-2 rounded-xl text-sm font-bold ${method === value ? 'bg-accent text-accent-ink' : 'text-muted'}`}>{value === 'upi' ? 'UPI' : value === 'card' ? 'Debit / Credit Card' : 'Net banking'}</button>)}
          </div>
          <PaymentInstrument method={method} mode={mode} session={session} expired={expired} seconds={seconds} />
          {expired && <div role="status" className="space-y-3"><p>Session expired, generate a new QR.</p><button type="button" disabled={busy} onClick={() => void prepare(true)} className="dialog-primary w-full py-3 rounded-lg">Generate a new {mode === 'sandbox' ? 'mock ' : ''}QR</button></div>}
          <CheckoutPolicies currentLang={currentLang} onNavigate={onClose} />
          {mode === 'sandbox' && session?.status === 'ready' && !expired && <div className="space-y-3">
            <label className="text-sm block" htmlFor="sandbox-result">Test result</label>
            <select id="sandbox-result" value={outcome} disabled={busy} onChange={event => setOutcome(event.target.value as SandboxOutcome)} className="w-full p-2 border border-rule bg-paper rounded-lg"><option value="success">Success</option><option value="failed">Failure</option><option value="pending">Pending</option></select>
            <button type="button" onClick={() => void simulate()} disabled={busy} aria-busy={busy} className="dialog-primary w-full py-3 rounded-lg disabled:opacity-50">Simulate test payment ({formatAmount(session.amountPaise)})</button>
          </div>}
          {session && session.status !== 'ready' && <div role="status" className="p-4 rounded-lg border border-rule space-y-3">
            <p>{session.status === 'success' ? 'Test payment succeeded. No real payment or recharge was made.' : session.status === 'failed' ? 'Test payment failed. No money was taken.' : 'Test payment pending. This is not a success confirmation; no recharge has started.'}</p>
            <button type="button" onClick={() => void prepare(true)} disabled={busy} className="dialog-primary w-full py-3 rounded-lg">Start a new test session</button>
          </div>}
        </div>
      </div>
    </div>
  );
};
