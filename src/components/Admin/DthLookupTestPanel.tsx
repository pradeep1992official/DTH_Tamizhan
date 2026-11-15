import React, { useEffect, useRef, useState } from 'react';
import { lookupOperators, lookupProviderNames, type DthLookupInput, type DthLookupResponse, type DthLookupProvider, type LookupProviderStatus } from '../../lib/dthLookup';

const labels: Record<string, string> = {
  customer_id: 'Customer ID', name: 'Customer name', registered_mobile: 'Registered mobile', balance: 'Account balance (INR)',
  monthly_amount: 'Monthly amount (INR)', status: 'Account status (provider value)', plan: 'Current plan', next_recharge_date: 'Next recharge date',
  last_recharge_date: 'Last recharge date', last_recharge_amount: 'Last recharge amount (INR)', switch_off_date: 'Switch-off date',
  address: 'Address', city: 'City', district: 'District', state: 'State', pin_code: 'PIN code',
};
export function DthLookupTestPanel({ getAuthHeaders }: { getAuthHeaders: () => Promise<Record<string, string>> }) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [providers, setProviders] = useState<LookupProviderStatus[]>([]);
  const [provider, setProvider] = useState<'auto' | DthLookupProvider>('auto');
  const [operator, setOperator] = useState<DthLookupInput['operator']>('airtel_dth');
  const [subscriberId, setSubscriberId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DthLookupResponse | null>(null);
  const [refresh, setRefresh] = useState(0);
  const request = useRef<AbortController | null>(null);
  const locked = useRef(false);
  useEffect(() => {
    const controller = new AbortController(); setConfigured(null); setError('');
    void (async () => {
      try {
        const response = await fetch('/api/admin/dth-lookup/config', { headers: await getAuthHeaders(), signal: controller.signal, cache: 'no-store' });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Could not check lookup configuration.');
        if (!controller.signal.aborted) { setConfigured(data.configured); setProviders(data.providers || []); }
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Could not check lookup configuration.'); }
    })();
    return () => controller.abort();
  }, [getAuthHeaders, refresh]);
  useEffect(() => () => request.current?.abort(), []);
  const reset = () => { setResult(null); setError(''); };
  const ready = configured && (provider === 'auto' || providers.some(item => item.id === provider && item.ready));
  const activeProvider = providers.find(item => item.ready && (provider === 'auto' || provider === item.id));
  const unavailable = providers.filter(item => !item.ready).length;
  return <section className="admin-tab dth-lookup-test space-y-5">
    <p className="lookup-provider-status" role="status">{configured === null ? 'Checking providers…' : activeProvider ? <><strong>{lookupProviderNames[activeProvider.id]} ready</strong>{unavailable > 0 && <span> · {unavailable} {activeProvider.id === 'way2api' ? 'fallbacks' : 'providers'} unavailable</span>}</> : 'No live provider is ready'}</p>
    <form className="space-y-4" onSubmit={async event => {
      event.preventDefault(); if (locked.current) return;
      locked.current = true; setBusy(true); setError(''); setResult(null);
      const controller = new AbortController(); request.current = controller;
      try {
        const response = await fetch('/api/admin/dth-lookup/test', { method: 'POST', cache: 'no-store', signal: controller.signal,
          headers: { ...await getAuthHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'live', operator, subscriberId, consent: true, provider }) });
        const data = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok) throw new Error(data.error || 'The lookup could not be completed.');
        setResult(data);
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error && !(e instanceof TypeError) && !(e instanceof SyntaxError) ? e.message : 'No response received. Check Way2API request history before retrying.'); }
      finally { if (!controller.signal.aborted) { locked.current = false; setBusy(false); } }
    }}>
      <fieldset disabled={busy} className="space-y-4">
        <legend className="sr-only">DTH account details</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">DTH operator<select value={operator} onChange={event => { setOperator(event.target.value as DthLookupInput['operator']); reset(); }} className="block w-full mt-2 border border-rule p-3">{Object.entries(lookupOperators).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <label className="block text-sm font-medium">Subscriber / VC number<input value={subscriberId} onChange={event => { setSubscriberId(event.target.value.replace(/\D/g, '')); reset(); }} inputMode="numeric" pattern="[0-9]{9,13}" minLength={9} maxLength={13} required placeholder="Enter 9–13 digits" className="block w-full mt-2 border border-rule p-3" /></label>
        </div>
        <button type="submit" className="admin-primary" disabled={busy || !ready}>{busy ? 'Checking details…' : 'Check DTH details'}</button>
      </fieldset>
    </form>
    {error && <p role="alert" className="text-sm text-error">{error}</p>}
    {result && <section className="rounded-lg border border-rule p-4 space-y-4" aria-label="Lookup result">
      <div role="status"><h3 className="font-semibold">{result.outcome === 'found' ? 'Live lookup result' : result.outcome === 'pending' ? 'Lookup pending' : 'Lookup unsuccessful'}</h3><p className="text-sm text-muted">{result.charged === null ? 'Billing status unknown — check the provider dashboard.' : result.charged ? 'Provider reports this lookup was charged.' : 'No charge reported.'}</p></div>
      {result.error && <p className="text-sm text-error">{result.error}</p>}
      {result.reference && <p className="text-sm">Reference: <span className="font-mono break-all">{result.reference}</span></p>}
      {result.provider && <p className="text-sm">Result provider: {lookupProviderNames[result.provider]}</p>}
      {result.attempts && <ul className="text-sm space-y-1" aria-label="Provider attempts">{result.attempts.map((attempt, index) => <li key={attempt.provider}>{index + 1}. {lookupProviderNames[attempt.provider]} — {attempt.outcome} · {attempt.charged === null ? 'Billing not confirmed' : attempt.charged ? 'Charged' : 'Not charged'}</li>)}</ul>}
      {result.details && <dl className="grid gap-4 sm:grid-cols-2">{Object.entries(result.details).map(([field, value]) => <div key={field}><dt className="text-sm text-muted">{labels[field] || field}</dt><dd className="font-medium break-words whitespace-pre-wrap">{value}</dd></div>)}</dl>}
      <p className="text-xs text-muted">Missing fields are unavailable from the provider. Dates and status values are shown as supplied. Results are not saved to customer accounts.</p>
    </section>}
    <details className="dth-provider-settings rounded-lg border border-rule">
      <summary className="cursor-pointer font-medium p-4">Provider settings</summary>
      <div className="px-4 pb-4 space-y-3 text-sm">
      <div className="flex justify-end"><button type="button" className="admin-quiet" disabled={busy} onClick={() => setRefresh(value => value + 1)}>Check configuration</button></div>
      <ul className="space-y-2">{providers.map(item => <li key={item.id}><strong>{lookupProviderNames[item.id]}: {item.ready ? 'Ready' : item.configured ? 'Setup incomplete' : 'Not configured'}</strong><p className="text-muted">{item.note}</p></li>)}</ul>
      <p>Configure server credentials and restart to enable providers.</p>
      <div className="flex flex-wrap gap-4"><a href="https://app.way2api.com/documentation/dth-info" target="_blank" rel="noopener noreferrer" className="underline">Way2API docs</a><a href="https://planapi.in/ApiDocument.aspx" target="_blank" rel="noopener noreferrer" className="underline">PlanAPI docs</a><a href="https://datayuge.com/products/dth-customer-info-api/" target="_blank" rel="noopener noreferrer" className="underline">DataYuge docs</a></div>
      <label className="block text-sm font-medium">Lookup provider<select disabled={busy} className="block w-full mt-2 border border-rule p-3" value={provider} onChange={event => { setProvider(event.target.value as 'auto' | DthLookupProvider); reset(); }}><option value="auto">Automatic: Way2API → PlanAPI → DataYuge</option>{providers.map(item => <option key={item.id} value={item.id} disabled={!item.ready}>{lookupProviderNames[item.id]}{!item.ready ? ' (not ready)' : ''}</option>)}</select></label>
      </div>
    </details>
  </section>;
}
