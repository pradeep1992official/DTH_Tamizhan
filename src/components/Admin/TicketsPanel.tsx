import React, { useEffect, useState } from 'react';
import { Search } from '../../lib/icons';
import { fullAddressSchema, type Ticket, type TicketStatus } from '../../lib/tickets';
import type { ServiceBrand } from '../../lib/serviceBrands';
const transitions: Partial<Record<TicketStatus, TicketStatus[]>> = { open: ['in_progress', 'resolved', 'closed'], in_progress: ['resolved', 'closed'], paid: ['placed_with_company'], placed_with_company: ['resolved', 'closed'], resolved: ['closed'] };
export function placementHoursLeft(ticket: Ticket, now: number) { return ticket.status === 'paid' && ticket.payment.paidAt ? Math.max(0, (Date.parse(ticket.payment.paidAt) + 24 * 3_600_000 - now) / 3_600_000) : null; }
export function customerUpdateLink(ticket: Ticket) { return `https://wa.me/91${ticket.phone}?text=${encodeURIComponent(`${ticket.ticketNo}: ${ticket.status.replace(/_/g, ' ')}${ticket.companyRefNo ? `\nCompany complaint number: ${ticket.companyRefNo}` : ''}`)}`; }
export function TicketsPanel({ getAuthHeaders }: { getAuthHeaders: () => Promise<Record<string, string>> }) {
  const [type, setType] = useState('support'); const [tickets, setTickets] = useState<Ticket[]>([]); const [brands, setBrands] = useState<ServiceBrand[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null); const [messages, setMessages] = useState<{ id: string; message: string; author: string }[]>([]);
  const [attention, setAttention] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [now, setNow] = useState(Date.now()); const [query, setQuery] = useState(''); const [cursor, setCursor] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState(''); const [searchOpen, setSearchOpen] = useState(false);
  const [blocks, setBlocks] = useState<{ id: string; uid: string | null; reason: string; createdAt: string }[]>([]);
  async function api(path = '', body?: unknown) { const response = await fetch(`/api/admin/tickets${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { ...await getAuthHeaders(), 'Content-Type': 'application/json' }, cache: 'no-store', body: body === undefined ? undefined : JSON.stringify(body) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Administrator access or ticket data is unavailable.'); return data; }
  async function load(parameters = '', more = false) { setBusy(true); setError(''); try { const data = await api(`?type=${type}&${parameters}`); setTickets(old => more ? [...old, ...data.tickets] : data.tickets); setCursor(data.nextCursor); } catch (e) { setError(e instanceof Error ? e.message : 'Please retry.'); } finally { setBusy(false); } }
  async function open(id: string) { setBusy(true); setError(''); setSelected(null); try { const data = await api(`/${id}`); setSelected(data.ticket); setMessages(data.messages); setAttention(data.refundNeedsAttention); } catch { setError('Ticket could not be opened.'); } finally { setBusy(false); } }
  useEffect(() => { setSelected(null); setTickets([]); setQuery(''); setStatusFilter(''); setSearchOpen(false); void load(); }, [type]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60_000); fetch('/api/service-brands', { cache: 'no-store' }).then(response => response.json()).then(data => setBrands(data.brands || [])).catch(() => {}); return () => clearInterval(timer); }, []);
  async function save(status?: TicketStatus) { if (!selected || busy) return; setBusy(true); setError(''); try { await api(`/${selected.id}`, { status: status || selected.status, companyRefNo: selected.companyRefNo, adminNotes: selected.adminNotes }); setSelected(null); await load(query); } catch (e) { setError(e instanceof Error ? e.message : 'Change failed.'); } finally { setBusy(false); } }
  const detailEntries = selected ? Object.entries({
    Customer: selected.name,
    Phone: selected.phone,
    Category: selected.issueCategory.replace(/_/g, ' '),
    ...(selected.fullAddress ? { 'Full address': selected.fullAddress } : {}),
    Created: new Date(selected.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    ...(selected.orderId ? { 'Linked order': selected.orderId } : {}),
    ...(selected.type === 'service_request' ? {
      State: selected.state,
      Brand: brands.find(brand => brand.id === selected.brand)?.displayName || selected.brand,
      'Subscriber ID': selected.subscriberId,
      Payment: `${selected.payment.status} / Rs. ${selected.payment.amount}`,
      'Payment ID': selected.payment.paymentId || '-',
    } : {}),
  }) : [];
  return <section className="admin-tab space-y-3" aria-busy={busy}>
    <div className="flex gap-3">{['support', 'service_request'].map(value => <button key={value} className={type === value ? 'admin-primary' : 'admin-quiet'} disabled={busy} onClick={() => setType(value)}>{value === 'support' ? 'Support' : 'Service requests'}</button>)}</div>
    {error && <p role="alert" className="text-error">{error}</p>}
    <form className="space-y-2" onSubmit={event => { event.preventDefault(); const values = new FormData(event.currentTarget); const parameters = new URLSearchParams(); for (const [key, value] of values) if (value) parameters.set(key, String(value)); setQuery(parameters.toString()); setSelected(null); setSearchOpen(false); void load(parameters.toString()); }}>
      <div className="flex items-end justify-end gap-2">
        <label className="w-32 max-w-[70%] text-sm">Status<select name="status" value={statusFilter} disabled={busy} onChange={event => { const value = event.target.value; setStatusFilter(value); const parameters = new URLSearchParams(query); if (value) parameters.set('status', value); else parameters.delete('status'); setQuery(parameters.toString()); setSelected(null); void load(parameters.toString()); }} className="block w-full rounded border border-rule p-1.5"><option value="">All</option>{(type === 'support' ? ['open', 'in_progress', 'resolved', 'closed'] : ['pending_payment', 'paid', 'placed_with_company', 'resolved', 'closed', 'auto_refunded', 'expired']).map(status => <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>)}</select></label>
        <button type="button" className="admin-quiet w-10 h-10 !min-h-0 !p-1 bg-paper-2 hover:bg-paper-3 border border-rule" aria-label={searchOpen ? 'Hide search filters' : 'Show search filters'} aria-expanded={searchOpen} onClick={() => setSearchOpen(value => !value)}><Search className="w-6 h-6" aria-hidden="true" /></button>
      </div>
      <div className={searchOpen ? 'grid grid-cols-2 sm:grid-cols-[14rem_12rem_10rem_10rem_auto] items-end justify-end gap-2' : 'hidden'}>
        <label className="text-sm">Search<input name="search" maxLength={128} className="block w-full rounded border border-rule p-1.5" /></label>
        <label className="text-sm">Search by<select name="searchBy" className="block w-full rounded border border-rule p-1.5"><option value="ticketNo">Ticket number</option><option value="phone">Phone</option><option value="subscriberId">Subscriber ID</option></select></label>
        <label className="text-sm">From<input name="from" type="date" className="block w-full rounded border border-rule p-1.5" /></label>
        <label className="text-sm">To<input name="to" type="date" className="block w-full rounded border border-rule p-1.5" /></label>
        {type === 'service_request' && <label className="text-sm">Brand<select name="brand" className="block w-full rounded border border-rule p-1.5"><option value="">All</option>{brands.map(brand => <option key={brand.id} value={brand.id}>{brand.displayName}</option>)}</select></label>}
        <button type="submit" className="admin-primary w-fit">Apply</button>
      </div>
    </form>
    <div className="border border-rule rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="admin-responsive-table w-full text-left text-sm">
          <thead className="border-b bg-paper-2 text-muted border-rule"><tr>
            <th scope="col" className="p-3.5 font-medium">Ticket</th><th scope="col" className="p-3.5 font-medium">Customer</th>
            <th scope="col" className="p-3.5 font-medium">Category</th><th scope="col" className="p-3.5 font-medium">Status</th>
            <th scope="col" className="p-3.5 font-medium">Created</th><th scope="col" className="p-3.5 font-medium">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-rule">
            {!tickets.length && <tr><td colSpan={6} className="p-6 text-center text-muted">No matching tickets.</td></tr>}
            {tickets.map(ticket => { const hours = placementHoursLeft(ticket, now); return <tr key={ticket.id} className="hover:bg-paper-2 transition-colors">
              <td data-label="Ticket" className="p-3.5 font-medium">{ticket.ticketNo}</td>
              <td data-label="Customer" className="p-3.5">{ticket.name}<small className="block text-muted">{ticket.phone}</small></td>
              <td data-label="Category" className="p-3.5">{ticket.issueCategory.replace(/_/g, ' ')}{ticket.type === 'service_request' && <small className="block text-muted">{brands.find(brand => brand.id === ticket.brand)?.displayName || ticket.brand}</small>}</td>
              <td data-label="Status" className={`p-3.5 ${hours !== null && hours < 6 ? 'text-error' : ''}`}>{ticket.status.replace(/_/g, ' ')}{hours !== null && <small className="block">Refund due in {hours.toFixed(1)} hours</small>}</td>
              <td data-label="Created" className="p-3.5">{new Date(ticket.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
              <td data-label="Actions" className="p-3.5"><button type="button" className="history-view-action inline-flex items-center gap-2 rounded-lg px-3 py-2 border border-rule" disabled={busy} onClick={() => void open(ticket.id)}>View</button></td>
            </tr>; })}
          </tbody>
        </table>
      </div>
    </div>
    {cursor && <button className="admin-quiet" disabled={busy} onClick={() => void load(`${query}&cursor=${encodeURIComponent(cursor)}`, true)}>Load more</button>}
    {selected && <article className="rounded-lg border border-rule p-3 space-y-3">
      <header className="flex items-center justify-between gap-2"><div><p className="text-xs text-muted">{selected.type === 'service_request' ? 'Service request' : 'Support ticket'}</p><h3 className="font-semibold">{selected.ticketNo} - {selected.status.replace(/_/g, ' ')}</h3></div><button type="button" className="admin-quiet" onClick={() => setSelected(null)}>Close</button></header>
      {attention && <p role="alert" className="text-error">Refund needs attention</p>}
      {!selected.payment.required && ['open', 'in_progress'].includes(selected.status) && <form className="space-y-2 rounded border border-rule p-3" onSubmit={async event => {
        event.preventDefault(); const values = new FormData(event.currentTarget); setBusy(true); setError('');
        try { await api(`/${selected.id}/reclassify`, { route: values.get('route'), reason: values.get('reason') }); await open(selected.id); await load(query); }
        catch (e) { setError(e instanceof Error ? e.message : 'Reclassification failed.'); } finally { setBusy(false); }
      }}><h4 className="text-sm font-semibold">Classification</h4><label className="block text-sm">Route<select name="route" defaultValue={selected.helpRoute || 'free'} className="block w-full rounded border border-rule p-2"><option value="free">Free help</option><option value="dth_service">DTH service problem</option></select></label><label className="block text-sm">Reason<input name="reason" required minLength={5} maxLength={200} className="block w-full rounded border border-rule p-2" /></label><button className="admin-quiet" disabled={busy}>Reclassify</button>
        <label className="block text-sm">Brand<select value={selected.brand} onChange={event => setSelected({ ...selected, brand: event.target.value })} className="block w-full rounded border border-rule p-2"><option value="">Select brand</option>{brands.filter(brand => brand.enabled).map(brand => <option key={brand.id} value={brand.id}>{brand.displayName}</option>)}</select></label>
        <label className="block text-sm">Subscriber ID<input value={selected.subscriberId} onChange={event => setSelected({ ...selected, subscriberId: event.target.value })} inputMode="numeric" maxLength={25} className="block w-full rounded border border-rule p-2" /></label>
        <label className="block text-sm">Full address<textarea value={selected.fullAddress || ''} onChange={event => setSelected({ ...selected, fullAddress: event.target.value })} minLength={15} maxLength={500} rows={3} className="block w-full rounded border border-rule p-2" /></label>
        <button type="button" className="admin-primary" disabled={busy || !selected.brand || !selected.subscriberId || !fullAddressSchema.safeParse(selected.fullAddress || '').success} onClick={async () => { if (!window.confirm('Upgrade this same ticket? Payment will still require customer confirmation.')) return; setBusy(true); try { await api(`/${selected.id}/upgrade`, { brand: selected.brand, subscriberId: selected.subscriberId, fullAddress: selected.fullAddress }); setSelected(null); await load(query); } catch { setError('Upgrade failed. Check subscriber details, full address and daily limits.'); } finally { setBusy(false); } }}>Mark upgraded — awaiting payment</button>
      </form>}
      <section className="space-y-2"><h4 className="text-sm font-semibold">Ticket details</h4>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">{detailEntries.map(([key, value]) => <div key={key} className="min-w-0 rounded border border-rule bg-paper-2 p-2"><dt className="text-xs text-muted">{key}</dt><dd className="break-words">{value || '-'}{key === 'Phone' && value && <button className="admin-quiet ml-1" onClick={() => void navigator.clipboard.writeText(value).catch(() => setError('Copy is unavailable in this browser. Select the value to copy it.'))}>Copy</button>}</dd></div>)}</dl>
      </section>
      <section className="space-y-1"><h4 className="text-sm font-semibold">Issue description</h4><p className="whitespace-pre-wrap rounded border border-rule p-2 text-sm">{selected.description}</p></section>
      {(selected.type === 'service_request' || (transitions[selected.status] || []).length > 0) && <section className="space-y-2 rounded border border-rule p-3">
        {selected.type === 'service_request' && <>
          {selected.status === 'paid' && <form className="space-y-2 border border-rule rounded p-2" onSubmit={async event => { event.preventDefault(); if (busy || !window.confirm('Confirm a full Rs. 50 test refund? This cannot be undone.')) return; const reason = new FormData(event.currentTarget).get('reason'); setBusy(true); try { await api(`/${selected.id}/refund`, { reason, confirmed: true }); await open(selected.id); } catch (e) { setError(e instanceof Error ? e.message : 'Refund could not be confirmed.'); } finally { setBusy(false); } }}><label className="block text-sm">Refund reason<input name="reason" required minLength={5} maxLength={200} className="block w-full border border-rule rounded p-1.5" /></label><button className="admin-primary" disabled={busy}>Review & refund Rs. 50 (test)</button></form>}
          <label className="block text-sm">Company complaint number<input className="block w-full border border-rule rounded p-1.5" maxLength={120} disabled={selected.status !== 'paid'} value={selected.companyRefNo} onChange={event => setSelected({ ...selected, companyRefNo: event.target.value })} /></label>
        </>}
        <div className="flex flex-wrap gap-2">{selected.type === 'service_request' && <button className="admin-quiet" disabled={busy} onClick={() => void save()}>Save changes</button>}{(transitions[selected.status] || []).map(status => <button key={status} className="admin-primary" disabled={busy || (status === 'placed_with_company' && (!selected.companyRefNo.trim() || placementHoursLeft(selected, now) === 0))} onClick={() => void save(status)}>{status.replace(/_/g, ' ')}</button>)}</div>
      </section>}
      <section className="space-y-2"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold">Customer conversation</h4><a className="rounded border border-rule px-3 py-2 text-sm" href={customerUpdateLink(selected)} target="_blank" rel="noopener noreferrer">Send update on WhatsApp</a></div>
        {!messages.length && <p className="text-sm text-muted">No replies yet.</p>}
        <div className="space-y-2">{messages.map(message => <div key={message.id} className="rounded border border-rule p-2 text-sm"><strong>{message.author === 'admin' ? 'Support' : 'Customer'}</strong><p className="mt-1 whitespace-pre-wrap">{message.message}</p></div>)}</div>
        <form className="space-y-1" onSubmit={async event => { event.preventDefault(); const form = event.currentTarget; const message = new FormData(form).get('message'); setBusy(true); try { await api(`/${selected.id}/reply`, { message }); form.reset(); await open(selected.id); } catch { setError('Reply could not be posted.'); } finally { setBusy(false); } }}><label className="block text-sm">Reply<textarea rows={2} name="message" className="block w-full border border-rule rounded p-1.5" required maxLength={1000} /></label><button className="admin-primary" disabled={busy}>Post reply</button></form>
      </section>
      <details className="rounded border border-rule p-2"><summary className="cursor-pointer text-sm">Status history</summary>{selected.statusHistory.map((entry, index) => <p key={index} className="mt-1 text-sm">{entry.status.replace(/_/g, ' ')} - {new Date(entry.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>)}</details>
    </article>}
    <details className="border border-rule rounded p-2 text-sm"><summary className="cursor-pointer">Blocked attempts</summary><button className="admin-quiet" onClick={() => void api('/blocked').then(data => setBlocks(data.attempts)).catch(() => setError('Blocked attempts could not be loaded.'))}>Load latest 100</button>{blocks.map(block => <p key={block.id}>{new Date(block.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} - {block.uid || 'Guest'} - {block.reason}</p>)}</details>
  </section>;
}
