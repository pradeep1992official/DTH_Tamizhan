import type { AdminHistory } from '../../lib/adminAnalytics';
import { AdminRechargeTotals } from './AdminRechargeTotals';
import React, { useEffect, useRef, useState } from 'react';
import type { Language } from '../../types';
import type { AdminQueryResult, TicketAnalysis, TicketView } from '../../lib/adminAi';
import { assistantReplyText } from '../../lib/assistantReplyText';

type Draft = { subject: string; body: string; reviewed: boolean };
export function AdminAiPanel({ getAuthHeaders, currentLang }: {
  getAuthHeaders: () => Promise<Record<string, string>>; currentLang: Language;
}) {
  const text = (en: string, ta: string) => currentLang === 'ta' ? ta : en;
  const [tickets, setTickets] = useState<TicketView[]>([]);
  const [analysis, setAnalysis] = useState<TicketAnalysis[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<AdminHistory>([]);
  const [result, setResult] = useState<AdminQueryResult | null>(null);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [working, setWorking] = useState('Loading...');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [limited, setLimited] = useState(false);
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
      setBlocked(true); setTickets([]); setAnalysis([]); setDrafts({}); setResult(null); setAnswer(''); setHistory([]);
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
  useEffect(() => {
    void run(async () => { const data = await api('/tickets'); setTickets(data.tickets); setLimited(data.limited); }, 'Loading tickets...', false);
    return () => { request.current?.abort(); request.current = null; locked.current = false; };
  }, []);
  const rank = { high: 0, normal: 1, low: 2 };
  const sorted = [...tickets].sort((a, b) => {
    const left = analysis.find(item => item.ticketId === a.id); const right = analysis.find(item => item.ticketId === b.id);
    return (left ? rank[left.priority] : 1) - (right ? rank[right.priority] : 1) || a.createdAt.localeCompare(b.createdAt);
  });
  function edit(id: string, fields: Partial<Draft>) {
    setDrafts(old => ({ ...old, [id]: { ...old[id], ...fields, reviewed: false } }));
  }
  return <section className="space-y-3" aria-label="Admin AI" aria-busy={busy}>
    {blocked && <p role="alert">Administrator access is no longer available. Sign in again.</p>}
    {busy && <p role="status" aria-live="polite">{working}</p>}
    {error && <p role="alert" className="text-error">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <div className="rounded-lg border border-rule p-3 space-y-3">
    <form className="flex items-end gap-2" onSubmit={event => { event.preventDefault(); if (!message.trim()) return;
      void run(async () => { setResult(null); setAnswer(''); const data = await api('/query', { message, history }); setAnswer(data.text);
        setHistory(old => [...old, { role: 'user' as const, content: message }, { role: 'assistant' as const, content: String(data.text).slice(0, 2000) }].slice(-12)); setResult(data.result || null);
        if (data.result?.type === 'tickets') { setTickets(data.result.tickets); setAnalysis([]); setLimited(data.result.limited); }
      }, 'Searching recharges and tickets...', false);
    }}>
      <label className="block min-w-0 flex-1"><span className="sr-only">{text('Ask about recharges or tickets', 'ரீசார்ஜ் அல்லது கோரிக்கைகள் பற்றி கேளுங்கள்')}</span>
        <input className="w-full rounded-lg border border-rule p-3" maxLength={500} value={message} disabled={busy || blocked}
          placeholder="Ask about recharges or tickets..." onChange={event => { setMessage(event.target.value); setResult(null); setAnswer(''); setError(''); setNotice(''); }} />
      </label>
      <button type="submit" className="admin-primary" disabled={busy || blocked || !message.trim()}>{text('Ask', 'AI-யிடம் கேள்')}</button>
    </form>
    {answer && (!result || result.type === 'analytics') && <p className="whitespace-pre-line" role="status">{assistantReplyText(answer)}</p>}
    {result?.type === 'analytics' && <details className="text-sm"><summary className="cursor-pointer">Data</summary><pre className="overflow-x-auto whitespace-pre-wrap break-words p-2">{JSON.stringify(result.data, null, 2)}</pre></details>}
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
    <details className="rounded-lg border border-rule p-3 space-y-3">
      <summary className="cursor-pointer font-semibold">Support tickets ({tickets.length})</summary>
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className="admin-quiet" disabled={busy || blocked} onClick={() => void run(async () => {
        const data = await api('/tickets'); setTickets(data.tickets); setLimited(data.limited); setAnalysis([]);
      })}>Refresh</button>
      <button type="button" className="admin-primary" disabled={busy || blocked || !tickets.length} onClick={() => void run(async () => {
        const data = await api('/summarize', { limit: 20 }); setTickets(data.tickets); setAnalysis(data.analysis); setLimited(data.limited);
      }, 'Summarizing and prioritizing tickets...')}>{text('Summarize & prioritize', 'சுருக்கி முன்னுரிமைப்படுத்து')}</button>
    </div>
    {!busy && !tickets.length && <p>No open tickets.</p>}
    {sorted.map(ticket => {
      const suggestion = analysis.find(item => item.ticketId === ticket.id); const draft = drafts[ticket.id];
      return <article key={ticket.id} className="border border-rule rounded-xl p-4 space-y-3">
        <h4 className="font-semibold">{ticket.subject}</h4>
        <p className="text-sm text-muted">{ticket.id} · {ticket.kind} · {ticket.category} · {new Date(ticket.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
        <p className="whitespace-pre-line">{ticket.message}</p>
        {suggestion && <div className="rounded-lg bg-paper-2 p-3"><p>Suggested priority: {suggestion.priority}</p><p>{suggestion.summary}</p><p className="text-sm">{suggestion.reason}</p></div>}
        <button type="button" className="admin-quiet" disabled={busy || blocked} onClick={() => void run(async () => {
          const data = await api(`/tickets/${encodeURIComponent(ticket.id)}/draft`, { instruction: '' });
          setDrafts(old => ({ ...old, [ticket.id]: { ...data.draft, reviewed: false } }));
        }, 'Drafting a reply for review...')}>Draft reply</button>
        {draft && <div className="space-y-3">
          <p className="font-semibold">DRAFT · Nothing has been sent</p>
          <label className="block">Subject<input className="w-full rounded-lg border border-rule p-2" maxLength={120} disabled={busy || blocked} value={draft.subject} onChange={event => edit(ticket.id, { subject: event.target.value })} /></label>
          <label className="block">Reply<textarea className="w-full rounded-lg border border-rule p-2" rows={5} maxLength={3000} disabled={busy || blocked} value={draft.body} onChange={event => edit(ticket.id, { body: event.target.value })} /></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={draft.reviewed} disabled={busy || blocked} onChange={event => setDrafts(old => ({ ...old, [ticket.id]: { ...old[ticket.id], reviewed: event.target.checked } }))} />I reviewed and approve this reply.</label>
          <button type="button" className="admin-primary" disabled={busy || blocked || !draft.reviewed || !draft.subject.trim() || !draft.body.trim()} onClick={() => void run(async () => {
            const data = await api(`/tickets/${encodeURIComponent(ticket.id)}/approve`, { subject: draft.subject, body: draft.body, approved: true });
            if (typeof data.emailUrl !== 'string' || !data.emailUrl.startsWith('mailto:')) throw new Error('Invalid email handoff.');
            window.location.assign(data.emailUrl);
            setNotice(`Email draft opened for ${data.recipient}. Press Send in your email app. Delivery is not confirmed here.`);
            setDrafts(old => ({ ...old, [ticket.id]: { ...old[ticket.id], reviewed: false } }));
          })}>Approve &amp; open email</button>
        </div>}
      </article>;
    })}
    </details>
  </section>;
}
