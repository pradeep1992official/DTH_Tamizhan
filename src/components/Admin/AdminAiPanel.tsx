import React, { useEffect, useRef, useState } from 'react';
import type { Language } from '../../types';
import { createPortal } from 'react-dom';
import { buildAdminChatHistory, type AdminChatTurn } from '../../lib/adminChat';
import { assistantReplyText } from '../../lib/assistantReplyText';
import { ArrowUpRight, Plus } from '../../lib/icons';
import { AdminChatResult } from './AdminChatResult';

export function AdminAiPanel({ getAuthHeaders, toolbarTarget }: {
  getAuthHeaders: () => Promise<Record<string, string>>; currentLang: Language; toolbarTarget?: HTMLElement | null;
}) {
  const [message, setMessage] = useState('');
  const [turns, setTurns] = useState<AdminChatTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  const locked = useRef(false);
  const accessRevoked = useRef(false);
  const suggestions = turns.length ? [
    ['Last week', 'What about last week?'],
    ['By operator', 'Break that down by operator.'],
    ['Failed recharges', 'Show failed recharges for the same period.'],
  ] : [
    ["Today's orders", 'How many orders were created today?'],
    ['Revenue this month', 'Show successful live recharge revenue this month.'],
    ['Pending refunds', 'Show pending refunds.'],
    ['Top plans', 'Which plans have the most successful live recharges?'],
  ];
  useEffect(() => () => { request.current?.abort(); request.current = null; locked.current = false; }, []);
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' }); }, [turns, busy, error]);
  async function api(path: string, body: unknown, signal: AbortSignal) {
    const headers = await getAuthHeaders();
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    const response = await fetch('/api/admin/ai' + path, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal, cache: 'no-store' });
    const data = await response.json();
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    if (response.status === 401 || response.status === 403) { accessRevoked.current = true; setBlocked(true); setTurns([]); setMessage(''); }
    if (!response.ok || !data.success) throw new Error(data.error || 'The assistant could not reply. Please try again.');
    return data;
  }
  async function run(task: (signal: AbortSignal) => Promise<void>) {
    if (locked.current || blocked) return;
    const controller = new AbortController(); request.current = controller;
    locked.current = true; setBusy(true); setError('');
    const timeout = setTimeout(() => controller.abort(), 90_000);
    try { await task(controller.signal); }
    catch (err) {
      if (request.current === controller) setError(controller.signal.aborted ? 'This is taking too long. Please try again.' : err instanceof Error && !(err instanceof TypeError) && !(err instanceof SyntaxError) ? err.message : 'The assistant could not reply. Please try again.');
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) { request.current = null; locked.current = false; setBusy(false); }
    }
  }
  function send() {
    const content = message.trim();
    if (!content || locked.current || blocked) return;
    const id = crypto.randomUUID();
    const history = buildAdminChatHistory(turns);
    setTurns(old => [...old, { id, role: 'user', content }]); setMessage('');
    void run(async signal => {
      try {
        const data = await api('/query', { message: content, history }, signal);
        setTurns(old => [...old, { id: crypto.randomUUID(), role: 'assistant', content: String(data.text || 'Here are the results.'), result: data.result || null }]);
      } catch (err) {
        if (request.current?.signal === signal && !accessRevoked.current) { setTurns(old => old.filter(turn => turn.id !== id)); setMessage(draft => draft || content); }
        throw err;
      }
    });
  }
  function loadMore(turn: AdminChatTurn) {
    const result = turn.result;
    if (result?.type !== 'pending_recharges' || !result.nextCursor) return;
    void run(async signal => {
      const data = await api('/pending', { limit: 100, cursor: result.nextCursor }, signal);
      setTurns(old => old.map(item => item.id === turn.id ? { ...item, result: { ...data.result, rows: [...result.rows, ...data.result.rows.filter((row: { orderId: string; testMode?: boolean }) => !result.rows.some(existing => existing.orderId === row.orderId && existing.testMode === row.testMode))] } } : item));
    });
  }
  return <section className="admin-chat" aria-label="Admin AI" aria-busy={busy}>
    {toolbarTarget && createPortal(<button type="button" disabled={busy || blocked || !turns.length} onClick={() => { setTurns([]); setMessage(''); setError(''); input.current?.focus(); }}><Plus className="w-4 h-4" />New chat</button>, toolbarTarget)}
    <div ref={log} className={`admin-chat-log ${!turns.length ? 'is-empty' : ''}`} role="log" aria-label="Conversation" aria-live="polite">
      {!turns.length && <div className="admin-chat-welcome"><strong className="admin-chat-hi">Hi,</strong><h3>How can I help?</h3><p>Ask about orders, revenue, plans or refunds. You can ask follow-up questions in this chat.</p></div>}
      {turns.map(turn => <article key={turn.id} className={'admin-chat-turn is-' + turn.role}><p className="admin-chat-author">{turn.role === 'user' ? 'You' : 'AI assistant'}</p><p className="whitespace-pre-line">{assistantReplyText(turn.content)}</p>{turn.role === 'assistant' && <AdminChatResult result={turn.result || null} busy={busy} blocked={blocked} onLoadMore={() => loadMore(turn)} />}</article>)}
      {busy && <p role="status" className="admin-chat-thinking">Thinking...</p>}
      {blocked && <p role="alert">Administrator access is no longer available. Sign in again.</p>}
      {error && <p role="alert" className="text-error">{error}</p>}
    </div>
    <div className="admin-chat-composer">
      <div className="admin-chat-suggestions" aria-label="Suggested questions">{suggestions.map(([label, value]) => <button type="button" key={label} disabled={busy || blocked} onClick={() => { setMessage(value); input.current?.focus(); }}>{label}</button>)}</div>
      <form onSubmit={event => { event.preventDefault(); send(); }}>
        <label className="sr-only" htmlFor="admin-chat-message">Ask about recharges or tickets</label>
        <textarea ref={input} id="admin-chat-message" rows={2} maxLength={500} value={message} disabled={blocked} placeholder={turns.length ? 'Ask a follow-up...' : 'Ask about orders, revenue or refunds...'} onChange={event => setMessage(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(); } }} />
        <button type="submit" className="admin-primary" disabled={busy || blocked || !message.trim()} aria-label="Send message" title="Send message"><ArrowUpRight className="w-5 h-5" /></button>
      </form>
      <p className="admin-chat-hint">Enter to send / Shift + Enter for a new line</p>
    </div>
  </section>;
}

