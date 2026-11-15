import React, { useEffect, useRef, useState } from 'react';
import type { Language, UserProfile } from '../types';
import { lookupOperatorId, type CustomerDthLookupResponse } from '../lib/dthLookup';
import { ticketAuthHeaders } from '../lib/ticketAppCheck';
import { auth } from '../lib/firebase';
import { Link } from 'react-router-dom';

const labels: Record<string, [string, string]> = {
  name: ['Customer name', 'வாடிக்கையாளர் பெயர்'], balance: ['Balance (INR)', 'இருப்பு (ரூபாய்)'], plan: ['Current pack', 'தற்போதைய பேக்'],
  monthly_amount: ['Monthly amount (INR)', 'மாதக் கட்டணம் (ரூபாய்)'], next_recharge_date: ['Next recharge date', 'அடுத்த ரீசார்ஜ் தேதி'],
  last_recharge_date: ['Last recharge date', 'கடைசி ரீசார்ஜ் தேதி'], last_recharge_amount: ['Last recharge amount (INR)', 'கடைசி ரீசார்ஜ் தொகை'],
  switch_off_date: ['Switch-off date', 'சேவை முடியும் தேதி'], status: ['Account status (provider value)', 'கணக்கு நிலை'],
};
export function CustomerDthLookup({ operator, subscriberId, user, currentLang, onOpenAuth, onUseName }: {
  operator: string; subscriberId: string; user: UserProfile | null; currentLang: Language;
  onOpenAuth?: () => void; onUseName?: (name: string) => void;
}) {
  const say = (en: string, ta: string) => currentLang === 'ta' ? ta : en;
  const [enabled, setEnabled] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CustomerDthLookupResponse | null>(null);
  const request = useRef<AbortController | null>(null);
  const locked = useRef(false);
  const provider = lookupOperatorId(operator, subscriberId);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/dth-lookup/config', { signal: controller.signal, cache: 'no-store' }).then(async response => {
      const data = await response.json(); if (!controller.signal.aborted) setEnabled(response.ok && data.enabled === true);
    }).catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    request.current?.abort(); request.current = null; locked.current = false;
    setBusy(false); setConsent(false); setResult(null); setError('');
    return () => { request.current?.abort(); request.current = null; };
  }, [operator, subscriberId, user?.uid]);
  if (!enabled || !provider) return null;
  const valid = /^\d{9,13}$/.test(subscriberId);
  return <section className="customer-dth-lookup" aria-label={say('Check DTH details', 'DTH விவரங்களைச் சரிபார்க்கவும்')}>
    {!user ? <p className="text-sm">{onOpenAuth ? <button type="button" className="account-text-link" onClick={onOpenAuth}>{say('Sign in to check account details', 'கணக்கு விவரங்களைச் சரிபார்க்க உள்நுழையவும்')}</button> : <Link to="/account" className="underline">{say('Sign in to check account details', 'கணக்கு விவரங்களைச் சரிபார்க்க உள்நுழையவும்')}</Link>}</p> : <>
      <label className="customer-lookup-consent"><input type="checkbox" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)} />{say('I have permission to check this DTH account.', 'இந்த DTH கணக்கைச் சரிபார்க்க எனக்கு அனுமதி உள்ளது.')}</label>
      <button type="button" className="customer-lookup-button" disabled={!valid || !consent || busy} onClick={async () => {
        if (locked.current || !provider) return;
        const uid = user.uid; const controller = new AbortController(); request.current = controller; locked.current = true;
        setBusy(true); setError(''); setResult(null);
        try {
          const response = await fetch('/api/dth-lookup', { method: 'POST', signal: controller.signal, cache: 'no-store', headers: await ticketAuthHeaders(),
            body: JSON.stringify({ operator: provider, subscriberId, consent: true }) });
          const data = await response.json();
          if (controller.signal.aborted || auth?.currentUser?.uid !== uid) return;
          if (!response.ok || !data.success) throw new Error(data.error || 'Details check is unavailable. You can continue manually.');
          setResult(data);
        } catch (err) {
          if (!controller.signal.aborted && auth?.currentUser?.uid === uid) setError(currentLang === 'ta' ? 'விவரங்களைச் சரிபார்க்க முடியவில்லை. கைமுறையாகத் தொடரலாம்.' : err instanceof Error && !(err instanceof TypeError) ? err.message : 'Details check is unavailable. You can continue manually.');
        } finally {
          if (request.current === controller && !controller.signal.aborted) { locked.current = false; setBusy(false); }
        }
      }}>{busy ? say('Checking…', 'சரிபார்க்கிறது…') : say('Check account details', 'விவரங்களைச் சரிபார்க்கவும்')}</button>
    </>}
    {error && <p role="alert" className="text-sm text-error">{error}</p>}
    {result?.details && <div className="customer-lookup-result"><p role="status" className="font-semibold">{say('Account details', 'கணக்கு விவரங்கள்')}{result.cached && <span className="text-xs text-muted"> · {say('Recently checked', 'சமீபத்தில் சரிபார்க்கப்பட்டது')}</span>}</p>
      <dl>{Object.entries(result.details).map(([key, value]) => <div key={key}><dt>{labels[key]?.[currentLang === 'ta' ? 1 : 0] || key}</dt><dd>{value}</dd></div>)}</dl>
      <p className="text-xs text-muted">{say('Details are supplied by the provider.', 'விவரங்கள் சேவை வழங்குநரால் வழங்கப்பட்டவை.')}</p>
      {onUseName && result.details.name && <button type="button" className="account-text-link" onClick={() => onUseName(result.details!.name)}>{say('Use this customer name', 'இந்த வாடிக்கையாளர் பெயரைப் பயன்படுத்தவும்')}</button>}
    </div>}
  </section>;
}
