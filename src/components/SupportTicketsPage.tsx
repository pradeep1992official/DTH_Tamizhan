import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { UserProfile } from '../types';
import type { Ticket } from '../lib/tickets';
import { ticketApi } from '../lib/ticketApi';
import { auth } from '../lib/firebase';
import { downloadTicketFile } from '../lib/ticketReceipt';
import { ServiceTicketPaymentButton } from './ServiceTicketPaymentButton';
export function SupportTicketsPage({ user, onOpenAuth }: { user: UserProfile | null; onOpenAuth: () => void; list?: boolean }) {
  const [tickets, setTickets] = useState<Ticket[]>([]); const [cursor, setCursor] = useState<string | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [refresh, setRefresh] = useState(0);
  useEffect(() => { let active = true; setTickets([]); setCursor(null); if (user) ticketApi('?limit=25').then(data => { if (active && auth?.currentUser?.uid === user.uid) { setTickets(data.tickets); setCursor(data.nextCursor); } }).catch(() => { if (active) setError('Your tickets could not be loaded.'); }); return () => { active = false; }; }, [user?.uid, refresh]);
  return <section className="mx-auto max-w-2xl p-4 space-y-4"><header className="flex items-center justify-between gap-3"><h1 className="text-2xl font-semibold">My tickets</h1><Link to="/help">Get Help</Link></header>
    {!user ? <button className="admin-primary" onClick={onOpenAuth}>Sign in to continue</button> : <><button className="admin-quiet" onClick={() => setRefresh(value => value + 1)}>Refresh</button>{error && <p role="alert">{error}</p>}{!tickets.length && <p>No tickets yet.</p>}{tickets.map(ticket => <TicketThread key={ticket.id} ticket={ticket} />)}
    {cursor && <button className="admin-primary" disabled={busy} onClick={async () => { setBusy(true); try { const data = await ticketApi(`?limit=25&cursor=${encodeURIComponent(cursor)}`); if (auth?.currentUser?.uid === user.uid) { setTickets(old => [...old, ...data.tickets]); setCursor(data.nextCursor); } } catch { setError('More tickets could not be loaded.'); } finally { setBusy(false); } }}>Load more</button>}</>}
  </section>;
}
function TicketThread({ ticket }: { ticket: Ticket }) {
  const [messages, setMessages] = useState<{ id: string; author: string; message: string }[]>([]);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function load() { try { const data = await ticketApi(`/${ticket.id}/messages`); if (auth?.currentUser?.uid === ticket.uid) setMessages(data.messages); } catch { setError('Replies could not be loaded.'); } }
  return <details className="rounded-lg border border-rule p-4" onToggle={event => { if (event.currentTarget.open) void load(); }}>
    <summary className="cursor-pointer">{ticket.ticketNo} - {ticket.status.replace(/_/g, ' ')}</summary>
    <p className="whitespace-pre-wrap my-3">{ticket.description}</p>
    {ticket.fullAddress && <p className="whitespace-pre-wrap my-3">Full address: {ticket.fullAddress}</p>}
    {ticket.helpRoute === 'dth_service' && ticket.type !== 'service_request' && ['open', 'in_progress'].includes(ticket.status) && <Link to="/help" state={{ ticketId: ticket.id }}>Get Help</Link>}
    {ticket.type === 'service_request' && ['pending_payment', 'expired'].includes(ticket.status) && <ServiceTicketPaymentButton ticketId={ticket.id} brand={ticket.brand} subscriberId={ticket.subscriberId} unified={!!ticket.helpRoute} />}
    {ticket.payment.paidAt && <div className="my-3"><p>{ticket.payment.status === 'refunded' ? 'Refunded' : 'Payment received'} - Rs. 50</p><button className="admin-quiet" onClick={() => void downloadTicketFile(`/api/tickets/${ticket.id}/receipt`, `${ticket.ticketNo}.pdf`).catch(() => setError('Your receipt is not ready. Please retry shortly.'))}>Download bill</button></div>}
    {ticket.type === 'service_request' && ticket.status === 'paid' && <p className="text-sm">If the complaint is not placed within 24 hours of verified payment, your fee is refunded automatically. Normal bank credit usually takes 5-7 working days after a refund is processed. Test requests do not move real money.</p>}
    {ticket.payment.status === 'refunding' && <p role="status">Refund processing is pending. Please do not request another refund.</p>}
    {ticket.payment.refundId && <p className="text-sm">Refund reference: {ticket.payment.refundId}</p>}
    {messages.map(message => <p key={message.id} className="whitespace-pre-wrap my-2"><strong>{message.author === 'admin' ? 'Support' : 'You'}:</strong> {message.message}</p>)}
    {error && <p role="alert">{error}</p>}
    {!['closed', 'resolved'].includes(ticket.status) && <form className="mt-3 space-y-2" onSubmit={async event => { event.preventDefault(); if (busy) return; const form = event.currentTarget; const message = new FormData(form).get('message'); setBusy(true); setError(''); try { await ticketApi(`/${ticket.id}/messages`, { message }); form.reset(); await load(); } catch { setError('Your reply could not be added. Please retry.'); } finally { setBusy(false); } }}>
      <label className="block">Reply<textarea name="message" required maxLength={1000} className="block w-full rounded-lg border border-rule p-3" /></label><button className="admin-primary" disabled={busy}>Send reply</button>
    </form>}
  </details>;
}
