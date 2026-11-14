import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { UserProfile } from '../types';
import type { Ticket } from '../lib/tickets';
import { supportCategories } from '../lib/tickets';
import { ticketApi } from '../lib/ticketApi';
import { paymentAuthHeaders } from '../lib/paymentAuth';
import { auth } from '../lib/firebase';
import { BUSINESS_DETAILS } from '../lib/trustContent';
import { downloadTicketFile } from '../lib/ticketReceipt';

export function ticketWhatsApp(ticket: Pick<Ticket, 'ticketNo' | 'issueCategory' | 'description'>) {
  return `https://wa.me/${BUSINESS_DETAILS.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`${ticket.ticketNo}\n${ticket.issueCategory.replace(/_/g, ' ')}\n${ticket.description}`)}`;
}
export function SupportTicketsPage({ user, onOpenAuth, list = false }: { user: UserProfile | null; onOpenAuth: () => void; list?: boolean }) {
  const [tickets, setTickets] = useState<Ticket[]>([]); const [created, setCreated] = useState<Ticket | null>(null);
  const [orders, setOrders] = useState<{ orderId: string; packName: string }[]>([]);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [refresh, setRefresh] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  useEffect(() => {
    let active = true; setTickets([]); setCreated(null); setOrders([]); setError(''); setCursor(null);
    if (user) (async () => { try {
      if (list) { const data = await ticketApi('?limit=25'); if (active && auth?.currentUser?.uid === user.uid) { setTickets(data.tickets); setCursor(data.nextCursor); } }
      else { const response = await fetch('/api/my/history?limit=100', { headers: await paymentAuthHeaders(), cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw new Error('Orders could not be loaded. You can submit without linking an order.'); if (active && auth?.currentUser?.uid === user.uid) setOrders(data.orders || []); }
    } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Please retry.'); } })();
    return () => { active = false; };
  }, [user?.uid, list, refresh]);
  return <section className="mx-auto max-w-2xl p-4 space-y-4">
    <h1 className="text-2xl font-semibold">{list ? 'My tickets' : 'Free support ticket'}</h1>
    <nav className="flex gap-4"><Link to="/support">New support ticket</Link><Link to="/my-tickets">My tickets</Link></nav>
    {!user ? <button className="admin-primary" onClick={onOpenAuth}>Sign in to continue</button> : <>
      {error && <p role="alert" className="text-error">{error}</p>}
      {created ? <div role="status" className="rounded-lg border border-rule p-4 space-y-3"><h2>Ticket {created.ticketNo} created</h2><a href={ticketWhatsApp(created)} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a><p><Link to="/my-tickets">View your tickets</Link></p></div> : !list && <form className="space-y-4" onSubmit={async event => {
        event.preventDefault(); if (busy) return; const form = event.currentTarget; const values = new FormData(form); const uid = user.uid; setBusy(true); setError('');
        try { const data = await ticketApi('/support', { name: values.get('name'), phone: values.get('phone'), issueCategory: values.get('issueCategory'), description: values.get('description'), ...(values.get('orderId') ? { orderId: values.get('orderId') } : {}) }); if (auth?.currentUser?.uid === uid) setCreated(data.ticket); }
        catch (e) { if (auth?.currentUser?.uid === uid) setError(e instanceof Error ? e.message : 'Please retry.'); } finally { setBusy(false); }
      }}>
        <p>For website, recharge, payment, refund or account issues. This service is free.</p>
        <label className="block">Name<input name="name" required maxLength={100} defaultValue={user.displayName} className="block w-full rounded-lg border border-rule p-3" /></label>
        <label className="block">Phone<input name="phone" required inputMode="tel" pattern="[6-9][0-9]{9}" maxLength={10} defaultValue={user.phoneNumber} className="block w-full rounded-lg border border-rule p-3" /></label>
        <label className="block">Category<select name="issueCategory" className="block w-full rounded-lg border border-rule p-3">{supportCategories.map(category => <option key={category} value={category}>{category.replace(/_/g, ' ')}</option>)}</select></label>
        <label className="block">Linked order (optional)<select name="orderId" className="block w-full rounded-lg border border-rule p-3"><option value="">No linked order</option>{orders.map(order => <option key={order.orderId} value={order.orderId}>{order.orderId} - {order.packName}</option>)}</select></label>
        <label className="block">Description<textarea name="description" required minLength={5} maxLength={1000} rows={4} className="block w-full rounded-lg border border-rule p-3" /></label>
        <button className="admin-primary" disabled={busy}>{busy ? 'Creating...' : 'Create free ticket'}</button>
      </form>}
      {list && <><button className="admin-quiet" onClick={() => setRefresh(value => value + 1)}>Refresh</button>{!tickets.length && <p>No tickets yet.</p>}{tickets.map(ticket => <TicketThread key={ticket.id} ticket={ticket} />)}
      {cursor && <button className="admin-primary" disabled={busy} onClick={async () => { setBusy(true); try { const data = await ticketApi(`?limit=25&cursor=${encodeURIComponent(cursor)}`); if (auth?.currentUser?.uid === user.uid) { setTickets(old => [...old, ...data.tickets]); setCursor(data.nextCursor); } } catch { setError('More tickets could not be loaded.'); } finally { setBusy(false); } }}>Load more</button>}</>}
    </>}
  </section>;
}
function TicketThread({ ticket }: { ticket: Ticket }) {
  const [messages, setMessages] = useState<{ id: string; author: string; message: string }[]>([]);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function load() { try { const data = await ticketApi(`/${ticket.id}/messages`); if (auth?.currentUser?.uid === ticket.uid) setMessages(data.messages); } catch { setError('Replies could not be loaded.'); } }
  return <details className="rounded-lg border border-rule p-4" onToggle={event => { if (event.currentTarget.open) void load(); }}>
    <summary className="cursor-pointer">{ticket.ticketNo} - {ticket.status.replace(/_/g, ' ')}</summary>
    <p className="whitespace-pre-wrap my-3">{ticket.description}</p>
    {ticket.payment.paidAt && <div className="my-3"><p>{ticket.payment.status === 'refunded' ? 'Refunded' : 'Payment received'} - Rs. 50</p><button className="admin-quiet" onClick={() => void downloadTicketFile(`/api/tickets/${ticket.id}/receipt`, `${ticket.ticketNo}.pdf`).catch(() => setError('Your receipt is not ready. Please retry shortly.'))}>Download bill</button></div>}
    {messages.map(message => <p key={message.id} className="whitespace-pre-wrap my-2"><strong>{message.author === 'admin' ? 'Support' : 'You'}:</strong> {message.message}</p>)}
    {error && <p role="alert">{error}</p>}
    {!['closed', 'resolved'].includes(ticket.status) && <form className="mt-3 space-y-2" onSubmit={async event => { event.preventDefault(); if (busy) return; const form = event.currentTarget; const message = new FormData(form).get('message'); setBusy(true); setError(''); try { await ticketApi(`/${ticket.id}/messages`, { message }); form.reset(); await load(); } catch { setError('Your reply could not be added. Please retry.'); } finally { setBusy(false); } }}>
      <label className="block">Reply<textarea name="message" required maxLength={1000} className="block w-full rounded-lg border border-rule p-3" /></label><button className="admin-primary" disabled={busy}>Send reply</button>
    </form>}
  </details>;
}
