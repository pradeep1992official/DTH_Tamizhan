import type { AdminHistory } from '../../lib/adminAnalytics';
import { AdminRechargeTotals } from './AdminRechargeTotals';
import { AdminAnalyticsResult } from './AdminAnalyticsResult';
import React, { useEffect, useRef, useState } from 'react';
import type { Language } from '../../types';
import type { AdminQueryResult } from '../../lib/adminAi';
import { assistantReplyText } from '../../lib/assistantReplyText';

export function AdminAiPanel({ getAuthHeaders, currentLang }: {
  getAuthHeaders: () => Promise<Record<string, string>>; currentLang: Language;
}) {
  const text = (en: string, ta: string) => currentLang === 'ta' ? ta : en;
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<AdminHistory>([]);
  const [result, setResult] = useState<AdminQueryResult | null>(null);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [working, setWorking] = useState('Loading...');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [blocked, setBlocked] = useState(false);
  const request = useRef<AbortController | null>(null);
  const locked = useRef(false);
  async function api(path: string, body?: unknown) {
    const signal = request.current?.signal;
    const headers = await getAuthHeaders();
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    const response = await fetch(`/api/admin/ai${path}`, { method: body === undefined ? 'GET' : 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
      signal, cache: 'no-store' });
    const data = await response.json();
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    if (response.status === 401 || response.status === 403) {
      setBlocked(true); setResult(null); setAnswer(''); setHistory([]);
    }
    if (!response.ok || !data.success) throw new Error(data.error || 'The admin AI request failed.');
    return data;
  }
  async function run(task: () => Promise<void>, label = 'Loading...', announceCompletion = false) {
    if (locked.current || blocked) return;
    const controller = new AbortController();
    locked.current = true; request.current = controller; setBusy(true); setWorking(label); setError(''); setNotice('');
    const timeout = setTimeout(() => {
      controller.abort();
      if (request.current === controller) { locked.current = false; setBusy(false); setError('This is taking too long. Please retry. No records were changed.'); }
    }, 90_000);
    try { await task(); if (!controller.signal.aborted && announceCompletion) setNotice(old => old || 'Finished. No records were changed.'); }
    catch (error) { if (!controller.signal.aborted) setError(error instanceof Error && error.name !== 'ZodError' && !(error instanceof SyntaxError) && !(error instanceof TypeError) ? error.message : 'The assistant reply could not be loaded. Please try again.'); }
    finally { clearTimeout(timeout); if (request.current === controller) { locked.current = false; if (!controller.signal.aborted) setBusy(false); } }
  }
  useEffect(() => () => { request.current?.abort(); request.current = null; locked.current = false; }, []);
  return <section className="space-y-3" aria-label="Admin AI" aria-busy={busy}>
    {blocked && <p role="alert">Administrator access is no longer available. Sign in again.</p>}
    {busy && <p role="status" aria-live="polite">{working}</p>}
    {error && <p role="alert" className="text-error">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <div className="rounded-lg border border-rule p-3 space-y-3">
    <form className="flex items-end gap-2" onSubmit={event => { event.preventDefault(); if (!message.trim()) return;
      void run(async () => { setResult(null); setAnswer(''); const data = await api('/query', { message, history }); setAnswer(data.text);
        setHistory(old => [...old, { role: 'user' as const, content: message }, { role: 'assistant' as const, content: String(data.text).slice(0, 2000) }].slice(-12)); setResult(data.result || null);
      }, 'Searching recharges and tickets...', false);
    }}>
      <label className="block min-w-0 flex-1"><span className="sr-only">{text('Ask about recharges or tickets', 'ரீசார்ஜ் அல்லது கோரிக்கைகள் பற்றி கேளுங்கள்')}</span>
        <input className="w-full rounded-lg border border-rule p-3" maxLength={500} value={message} disabled={busy || blocked}
          placeholder="Ask about recharges or tickets..." onChange={event => { setMessage(event.target.value); setResult(null); setAnswer(''); setError(''); setNotice(''); }} />
      </label>
      <button type="submit" className="admin-primary" disabled={busy || blocked || !message.trim()}>{text('Ask', 'AI-யிடம் கேள்')}</button>
    </form>
    {answer && (!result || result.type === 'analytics') && <p className="whitespace-pre-line" role="status">{assistantReplyText(answer)}</p>}
    {result?.type === 'analytics' && <AdminAnalyticsResult result={result} />}
    {result?.type === 'revenue_totals'  && <section className="space-y-2" aria-label="Revenue">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 role="status" className="font-semibold">Revenue</h3><span className="text-xs text-muted">Through {result.through_date} (IST)</span></div>
      <dl className="flex flex-wrap gap-6">{([['Live collections', result.live], ['Test payments', result.test]] as const).map(([label, amount]) => <div key={label}>
        <dt className="text-sm text-muted">{label}</dt><dd className="text-xl font-semibold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)}</dd>
      </div>)}</dl>
      <p className="text-xs text-muted">Captured payments only. Test payments are not real revenue.</p>
    </section>}
    {result?.type === 'recharge_totals'  && <AdminRechargeTotals result={result} />}
    {(result?.type === 'recharges' || result?.type === 'pending_recharges') && <div className="overflow-x-auto">
      {result.type === 'pending_recharges' ? <p role="status" className="text-sm">{result.rows.length} awaiting recharge - through {result.through_date} (IST){result.nextCursor ? ' - more available' : ''}</p> : <p role="status" className="text-sm">{result.parameters.status}: {result.parameters.start_date} to {result.parameters.end_date} (IST){result.limited ? ' - more available' : ''}</p>}
      {!result.rows.length ? <p>{result.type === 'pending_recharges' && result.nextCursor ? 'No pending orders on this page. Load more to check older payments.' : 'No matching recharges.'}</p> : <table className="w-full text-left text-sm"><caption className="sr-only">Matching recharges</caption>
        <thead><tr>{['Order', 'Mode', 'Operator', 'Amount', 'Status', 'Created'].map(label => <th key={label} scope="col" className="p-2">{label}</th>)}</tr></thead>
        <tbody>{result.rows.map(row => <tr key={`${row.testMode}:${row.orderId}`}><td className="p-2">{row.orderId}</td><td className="p-2">{row.testMode ? 'TEST - No real recharge' : 'Live'}</td><td className="p-2">{row.operator}</td><td className="p-2">Rs. {row.amount}</td><td className="p-2">{row.status}</td><td className="p-2">{new Date(row.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td></tr>)}</tbody>
      </table>}
      {result.type === 'pending_recharges' && result.nextCursor && <button type="button" className="admin-primary" disabled={busy || blocked} onClick={() => void run(async () => {
        const data = await api('/pending', { limit: 100, cursor: result.nextCursor });
        setResult({ ...data.result, rows: [...result.rows, ...data.result.rows.filter((row: { orderId: string }) => !result.rows.some(old => old.orderId === row.orderId && old.testMode === (row as { testMode?: boolean }).testMode))] });
      }, 'Loading older pending recharges...')}>Load more pending recharges</button>}
    </div>}
    </div>
    {result?.type === 'tickets' && <section className="space-y-3" aria-label="Ticket search results">
      <h3 className="font-semibold">Matching tickets ({result.tickets.length})</h3>
      {!result.tickets.length && <p>No matching tickets.</p>}
      {result.limited && <p className="text-sm text-muted">More matches are available. Narrow your search.</p>}
      {result.tickets.map(ticket => <article key={ticket.id} className="border border-rule rounded-lg p-3 space-y-2">
        <h4 className="font-semibold">{ticket.subject}</h4>
        <p className="text-sm text-muted">{ticket.id} / {ticket.category}</p>
        <p className="whitespace-pre-line">{ticket.message}</p>
      </article>)}
    </section>}
  </section>;
}
