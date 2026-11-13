import { formatPrice, formatStoredDuration } from '../lib/catalog';
import { localizeCustomerText, localizeCustomerError } from '../lib/customerMessages';
import { subscriberLabel } from '../lib/subscriberValidation';
import { translations } from '../lib/translations';
import React, { useEffect, useRef, useState } from 'react';
import { X, CreditCard, RefreshCw, AlertCircle } from '../lib/icons';
import type { DthOperator, DthPlan, SubscriberDetails, Language, UserProfile, RechargeOrder } from '../types';
import { subscriberError } from '../lib/subscriberValidation';
import { useAccessibleModal } from '../lib/useAccessibleModal';
import type { OperatorTheme } from '../lib/theme';
import type { CheckoutSession, SandboxOutcome } from '../../server/payments';
import { RazorpayCheckout } from './RazorpayCheckout';
import { paymentAuthHeaders } from '../lib/paymentAuth';

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

export function PaymentInstrument({ method, mode, session, expired, seconds, currentLang = 'en' }: {
  method: 'upi' | 'card' | 'netbanking'; mode: 'sandbox' | 'production' | null;
  session: CheckoutSession | null; expired: boolean; seconds: number; currentLang?: Language;
}) {
  return <>
          {method === 'upi' && <div className="text-center space-y-3">
            {mode === 'sandbox' && session && session.status === 'ready' && !expired && <><p className="text-sm font-medium">{translations[currentLang].uiMockQRIllustrationCannotBeScannedOrPaid}</p><p className="text-sm tabular-nums">{translations[currentLang].uiTestSession}: {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</p></>}
            {mode === 'production' && <p role="alert" className="text-error text-sm">{translations[currentLang].uiProviderQRIsUnavailableRetryCheckoutToRequestAProviderOrder}</p>}
          </div>}
          {method === 'card' && <div className="p-4 rounded-lg border border-rule text-sm space-y-2"><CreditCard className="w-5 h-5" /><p>{mode === 'sandbox' ? translations[currentLang].uiMockCardPaymentNoCardNumberExpiryOrCVVIsRequiredUseTheTestControlsBelo : translations[currentLang].uiCardPaymentsRequireTheProviderHostedCheckoutProviderUnavailableNoCardD}</p></div>}
          {method === 'netbanking' && <p className="text-sm">{mode === 'sandbox' ? translations[currentLang].uiMockNetBankingNoBankLoginIsRequired : translations[currentLang].uiNetBankingRequiresTheProviderHostedCheckoutProviderUnavailable}</p>}
  </>;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, plan, operator, smartCard, currentLang, user }) => {
  const [mode, setMode] = useState<'sandbox' | 'production' | null>(null);
  const { modalRef } = useAccessibleModal({ isOpen: isOpen && mode !== 'production', onClose });
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
        headers: body ? await paymentAuthHeaders() : undefined,
        body: body ? JSON.stringify(body) : undefined });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || translations[currentLang].uiCheckoutIsUnavailablePleaseRetry);
      return data;
    } catch (error) {
      if (abort.signal.aborted) throw new Error(translations[currentLang].uiRequestTimedOutRetryToCheckTheSameTestSessionDoNotStartAnotherPayment);
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
      if (confirmedMode === 'production') return;
      if (fresh) setSession(null);
      if (fresh || !requestKey.current) requestKey.current = crypto.randomUUID();
      const data = await request('/api/payments/session', { idempotencyKey: requestKey.current,
        packId, operator: operator.id, smartCardNumber: smartCard,
        ...(packId === 'custom' ? { customAmount: plan.price } : {}) });
      if (version !== generation.current) return;
      // Production never consumes a simulator session, even if an unexpected response arrives.
      if (confirmedMode !== 'sandbox' || data.session?.mode !== 'sandbox') throw new Error(translations[currentLang].uiProviderOrderOrQRIsUnavailableNoPaymentHasBeenTaken);
      setSession(data.session); setNow(Date.now());
    } catch (error) {
      if (version === generation.current) setError(error instanceof Error ? error.message : translations[currentLang].uiCheckoutUnavailablePleaseRetry);
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
      if (version === generation.current) setError(error instanceof Error ? error.message : translations[currentLang].uiCouldNotCheckTheTestPayment);
    } finally {
      if (version === generation.current) { locked.current = false; setBusy(false); }
    }
  }

  if (!isOpen) return null;
  if (mode === 'production') return <RazorpayCheckout key={`${packId}-${plan.price}-${operator.id}-${smartCard}`} onClose={onClose} plan={plan} operator={operator} smartCard={smartCard} currentLang={currentLang} user={user} />;
  const seconds = session ? Math.max(0, Math.ceil((session.expiresAt - now) / 1000)) : 0;
  const expired = !!session && seconds === 0 && session.status === 'ready';
  const formatAmount = (paise: number) => formatPrice(paise / 100, currentLang);
  return (
    <div className="dialog-backdrop fixed inset-0 z-50 flex items-center justify-center p-4" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="payment-modal-title" className="hm-dialog payment-checkout rounded-xl border border-rule bg-paper text-ink w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-lg text-left">
        <div className="px-6 py-4 border-b border-rule bg-paper-2 flex items-center justify-between">
          <div><h2 id="payment-modal-title" className="text-base font-bold">{translations[currentLang].uiCompleteDTHRecharge}</h2><p className="text-sm text-muted">{operator.name} / {subscriberLabel(operator.id, false, currentLang)}: {smartCard}</p></div>
          <button type="button" onClick={onClose} aria-label={translations[currentLang].uiCloseCheckout} className="p-2 rounded-xl"><X className="w-5 h-5" /></button>
        </div>
        {mode === 'sandbox' && <div role="status" className="px-6 py-3 bg-warning-soft text-ink border-b border-rule font-bold">{translations[currentLang].uiTestModeNoRealPaymentWillBeTaken}</div>}
        <div className="dialog-summary px-6 py-4 border-b border-rule flex items-center justify-between gap-4">
          <div><p className="font-medium">{localizeCustomerText(session?.packName || plan.name, currentLang)}</p><p className="text-sm text-muted">{session ? localizeCustomerText(formatStoredDuration(session.validity, currentLang), currentLang) : translations[currentLang].uiAwaitingServerQuote}</p></div>
          <div className="text-right"><span className="text-sm text-muted block">{translations[currentLang].uiTotalPayable}</span><strong className="text-2xl tabular-nums">{session ? formatAmount(session.amountPaise) : translations[currentLang].uiUnavailable}</strong></div>
        </div>
        <div className="p-6 space-y-5">
          <dl className="payment-reference text-sm space-y-2">
            <div><dt className="text-muted">{translations[currentLang].uiPaymentProvider}</dt><dd>{session ? localizeCustomerText(session.provider, currentLang) : translations[currentLang].uiCheckingConfiguration}</dd></div>
            <div><dt className="text-muted">{translations[currentLang].uiOrderReference}</dt><dd className="break-all tabular-nums">{session?.id || translations[currentLang].uiNoProviderOrder}</dd></div>
          </dl>
          <p className="text-sm text-muted">{mode === 'sandbox' ? translations[currentLang].uiSandboxExplanation : translations[currentLang].uiPaymentExplanation}</p>
          {error && <div role="alert" className="p-3 rounded-xl border border-rule bg-error-soft text-error text-sm"><AlertCircle className="w-4 h-4 inline mr-2" />{localizeCustomerError(error, currentLang)}</div>}
          {busy && <p role="status" className="text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" />{translations[currentLang].uiCheckingCheckout}</p>}
          {!session && !busy && <button type="button" onClick={() => void prepare()} className="dialog-primary w-full py-3 rounded-lg">{translations[currentLang].uiRetryCheckout}</button>}
          <div className="grid grid-cols-3 gap-2 p-1.5 rounded-lg border border-rule bg-paper-2" role="group" aria-label={translations[currentLang].uiPaymentMethod}>
            {(['upi', 'card', 'netbanking'] as const).map(value => <button key={value} type="button" onClick={() => setMethod(value)} aria-pressed={method === value} className={`py-2 px-2 rounded-xl text-sm font-bold ${method === value ? 'bg-accent text-accent-ink' : 'text-muted'}`}>{value === 'upi' ? 'UPI' : value === 'card' ? translations[currentLang].uiDebitCreditCard : translations[currentLang].uiNetBanking}</button>)}
          </div>
          <PaymentInstrument method={method} mode={mode} session={session} expired={expired} seconds={seconds} currentLang={currentLang} />
          {expired && <div role="status" className="space-y-3"><p>{translations[currentLang].uiSessionExpiredGenerateANewQR}</p><button type="button" disabled={busy} onClick={() => void prepare(true)} className="dialog-primary w-full py-3 rounded-lg">{mode === 'sandbox' ? translations[currentLang].uiGenerateANewMockQR : translations[currentLang].uiGenerateANewQR}</button></div>}
          <p className="text-sm">{translations[currentLang].instantActivation}</p>
          <p className="text-sm">{translations[currentLang].secureEncryption}</p>
          {mode === 'sandbox' && session?.status === 'ready' && !expired && <div className="space-y-3">
            <label className="text-sm block" htmlFor="sandbox-result">{translations[currentLang].uiTestResult}</label>
            <select id="sandbox-result" value={outcome} disabled={busy} onChange={event => setOutcome(event.target.value as SandboxOutcome)} className="w-full p-2 border border-rule bg-paper rounded-lg"><option value="success">{translations[currentLang].uiSuccess}</option><option value="failed">{translations[currentLang].uiFailure}</option><option value="pending">{translations[currentLang].uiPending}</option></select>
            <button type="button" onClick={() => void simulate()} disabled={busy} aria-busy={busy} className="dialog-primary w-full py-3 rounded-lg disabled:opacity-50">{translations[currentLang].uiSimulateTestPayment} ({formatAmount(session.amountPaise)})</button>
          </div>}
          {session && session.status !== 'ready' && <div role="status" className="p-4 rounded-lg border border-rule space-y-3">
            <p>{session.status === 'success' ? translations[currentLang].uiTestPaymentSucceededNoRealPaymentOrRechargeWasMade : session.status === 'failed' ? translations[currentLang].uiTestPaymentFailedNoMoneyWasTaken : translations[currentLang].uiTestPaymentPendingThisIsNotASuccessConfirmationNoRechargeHasStarted}</p>
            <button type="button" onClick={() => void prepare(true)} disabled={busy} className="dialog-primary w-full py-3 rounded-lg">{translations[currentLang].uiStartANewTestSession}</button>
          </div>}
        </div>
      </div>
    </div>
  );
};

