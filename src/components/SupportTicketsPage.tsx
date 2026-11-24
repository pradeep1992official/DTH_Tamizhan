import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { UserProfile } from '../types';
import type { Ticket } from '../lib/tickets';
import { ticketApi } from '../lib/ticketApi';
import { auth } from '../lib/firebase';
import { downloadTicketFile } from '../lib/ticketReceipt';
import { ServiceTicketPaymentButton } from './ServiceTicketPaymentButton';
import { Download, RefreshCw } from '../lib/icons';
export function SupportTicketsPage({ user, onOpenAuth }: { user: UserProfile | null; onOpenAuth: () => void; list?: boolean }) {
  const selectedTicket = new URLSearchParams(useLocation().search).get('ticket');
  const [tickets, setTickets] = useState<Ticket[]>([]); const [cursor, setCursor] = useState<string | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [refresh, setRefresh] = useState(0);
  useEffect(() => { let active = true; setTickets([]); setCursor(null); if (user) ticketApi(selectedTicket ? '/' + encodeURIComponent(selectedTicket) : '?limit=25').then(data => { if (active && auth?.currentUser?.uid === user.uid) { setTickets(selectedTicket ? [data.ticket] : data.tickets); setCursor(selectedTicket ? null : data.nextCursor); } }).catch(() => { if (active) setError('Your tickets could not be loaded.'); }); return () => { active = false; }; }, [user?.uid, refresh, selectedTicket]);
  return <section className="mx-auto max-w-2xl p-4 space-y-4"><header className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><h1 className="text-2xl font-semibold">My tickets</h1>{user && <button type="button" className="admin-quiet inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg border border-rule" aria-label="Refresh tickets" title="Refresh tickets" onClick={() => setRefresh(value => value + 1)}><RefreshCw className="w-4 h-4" aria-hidden="true" /></button>}</div><Link to="/help">Get Help</Link></header>
    {selectedTicket && <Link to="/my-tickets">View all tickets</Link>}
    {!user ? <button className="admin-primary" onClick={onOpenAuth}>Sign in to continue</button> : <>{error && <p role="alert">{error}</p>}{!tickets.length && <p>No tickets yet.</p>}{tickets.map(ticket => <TicketThread key={ticket.id} ticket={ticket} initiallyOpen={ticket.id === selectedTicket} />)}
    {cursor && <button className="admin-primary" disabled={busy} onClick={async () => { setBusy(true); try { const data = await ticketApi(`?limit=25&cursor=${encodeURIComponent(cursor)}`); if (auth?.currentUser?.uid === user.uid) { setTickets(old => [...old, ...data.tickets]); setCursor(data.nextCursor); } } catch { setError('More tickets could not be loaded.'); } finally { setBusy(false); } }}>Load more</button>}</>}
  </section>;
}
function TicketThread({ ticket, initiallyOpen = false }: { ticket: Ticket; initiallyOpen?: boolean }) {
  const [messages, setMessages] = useState<{ id: string; author: string; message: string }[]>([]);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const statusLabels: Record<Ticket['status'], string> = { open: 'Open', in_progress: 'In progress', pending_payment: 'Awaiting payment', paid: 'Payment received', placed_with_company: 'Complaint registered', resolved: 'Resolved', closed: 'Closed', auto_refunded: 'Refunded', expired: 'Expired' };
  async function load() { try { const data = await ticketApi(`/${ticket.id}/messages`); if (auth?.currentUser?.uid === ticket.uid) setMessages(data.messages); } catch { setError('Replies could not be loaded.'); } }
  return <details open={initiallyOpen || undefined} className="customer-ticket" onToggle={event => { if (event.currentTarget.open) void load(); }}>
    <summary className="customer-ticket-summary"><strong>{ticket.ticketNo}</strong><span className="customer-ticket-status">{statusLabels[ticket.status]}</span></summary>
    <div className="customer-ticket-body">
    <section><h3 className="customer-ticket-label">Your issue</h3><p className="whitespace-pre-wrap">{ticket.description}</p></section>
    {(ticket.fullAddress || ticket.pinCode) && <section className="customer-ticket-address"><h3 className="customer-ticket-label">Service address</h3>{ticket.fullAddress && <p className="whitespace-pre-wrap">{ticket.fullAddress}</p>}{ticket.pinCode && <p className="text-sm text-muted mt-1">PIN code: {ticket.pinCode}</p>}</section>}
    {ticket.helpRoute === 'dth_service' && ticket.type !== 'service_request' && ['open', 'in_progress'].includes(ticket.status) && <Link to="/help" state={{ ticketId: ticket.id }}>Get Help</Link>}
    {ticket.type === 'service_request' && ['pending_payment', 'expired'].includes(ticket.status) && <ServiceTicketPaymentButton ticketId={ticket.id} brand={ticket.brand} subscriberId={ticket.subscriberId} unified={!!ticket.helpRoute} />}
    {ticket.payment.paidAt && <section className="customer-ticket-payment"><div><h3 className="customer-ticket-label">{ticket.payment.status === 'refunded' ? 'Refunded' : ticket.payment.status === 'refunding' ? 'Refund processing' : 'Payment received'}</h3><strong>Rs. {ticket.payment.amount.toLocaleString('en-IN')}</strong></div><button type="button" className="customer-ticket-download" disabled={downloading} onClick={async () => { setDownloading(true); setError(''); try { await downloadTicketFile(`/api/tickets/${ticket.id}/receipt`, `${ticket.ticketNo}.pdf`); } catch (e) { setError(e instanceof Error ? e.message : 'Could not download the bill. Please try again.'); } finally { setDownloading(false); } }}><Download className="w-4 h-4" />{downloading ? 'Preparing bill…' : 'Download bill (PDF)'}</button></section>}
    {ticket.type === 'service_request' && ticket.status === 'paid' && <div className="customer-ticket-refund"><p className="font-semibold">Full Rs. 50 refund if we do not register your complaint within 24 hours of verified payment.</p><p className="text-sm text-muted mt-2">Refunds are automatic. Bank credit usually takes 5–7 working days after processing.</p><p className="text-sm text-muted mt-1">Test payment: no real money was collected.</p></div>}
    {ticket.payment.status === 'refunding' && <p role="status">Refund processing is pending. Please do not request another refund.</p>}
    {ticket.payment.refundId && <p className="text-sm">Refund reference: {ticket.payment.refundId}</p>}
    {messages.length > 0 && <section className="space-y-3"><h3 className="customer-ticket-label">Conversation</h3>{messages.map(message => <p key={message.id} className="customer-ticket-message whitespace-pre-wrap"><strong>{message.author === 'admin' ? 'Support' : 'You'}:</strong> {message.message}</p>)}</section>}
    {error && <p role="alert" className="text-sm text-error">{error}</p>}
    {!['closed', 'resolved'].includes(ticket.status) && <form className="mt-3 space-y-2" onSubmit={async event => { event.preventDefault(); if (busy) return; const form = event.currentTarget; const message = new FormData(form).get('message'); setBusy(true); setError(''); try { await ticketApi(`/${ticket.id}/messages`, { message }); form.reset(); await load(); } catch { setError('Your reply could not be added. Please retry.'); } finally { setBusy(false); } }}>
      <label className="block font-medium">Message support<textarea name="message" placeholder="Add an update or ask a question…" rows={3} required maxLength={1000} className="block w-full rounded-lg border border-rule p-3 mt-2 font-normal" /></label><button className="admin-primary" disabled={busy}>{busy ? 'Sending…' : 'Send message'}</button>
    </form>}
    </div>
  </details>;
}
