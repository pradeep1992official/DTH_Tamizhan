import { ProviderBookingDetails } from './ProviderBookingDetails';
import { ArrowLeft, RefreshCw, MapPin, Calendar, Printer } from '../../lib/icons';
import { packDisplayName } from '../../lib/newConnectionDisplay';
import { PackageImage } from './PackageImage';
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Language, UserProfile } from '../../types';
import { translations } from '../../lib/translations';
import { paymentAuthHeaders } from '../../lib/paymentAuth';
import type { NewConnectionOrder } from '../../lib/newConnectionOrders';
import { connectionStatusLabel } from '../../lib/newConnectionTrackingCopy';
import { districtTamil } from '../../lib/newConnectionBookingCopy';
import { currency } from './Shared';
import './new-connection.css';

export function MyBookings({ user, lang, onOpenAuth }: { user: UserProfile | null; lang: Language; onOpenAuth: () => void }) {
  const t = translations[lang]; const [orders, setOrders] = useState<NewConnectionOrder[]>([]); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [cursor, setCursor] = useState(''); const [previous, setPrevious] = useState<string[]>([]); const [next, setNext] = useState<string | null>(null); const [cancel, setCancel] = useState<string | null>(null); const [reason, setReason] = useState(''); const generation = useRef(0);
  async function load() { const run = ++generation.current; setBusy(true); setError(''); try { const res = await fetch('/api/new-connection/orders' + (cursor ? '?cursor=' + encodeURIComponent(cursor) : ''), { headers: await paymentAuthHeaders() }); if (!res.ok) throw new Error(); const data = await res.json(); if (run === generation.current) { setOrders(data.orders); setNext(data.nextCursor); } } catch { if (run === generation.current) { setOrders([]); setError(t.ctError); } } finally { if (run === generation.current) setBusy(false); } }
  useEffect(() => { setOrders([]); setCursor(''); setPrevious([]); setNext(null); setCancel(null); setReason(''); return () => { generation.current++; }; }, [user?.uid]);
  useEffect(() => { if (user) void load(); return () => { generation.current++; }; }, [user?.uid, cursor, lang]);
  const statusLabel = (status: string) => { const label = connectionStatusLabel(status, lang); return lang === 'en' ? label.charAt(0).toUpperCase() + label.slice(1) : label; };
  const slot = (s: string) => lang === 'ta' ? ({ Morning: 'காலை', Afternoon: 'மதியம்', Evening: 'மாலை', Any: 'எந்த நேரமும்' }[s] || s) : s;
  if (!user) return <section className="new-connection-page" aria-labelledby="my-bookings-title"><h1 id="my-bookings-title">{t.ctTitle}</h1><button onClick={onOpenAuth}>{t.ctSignIn}</button></section>;
  return <section className="new-connection-page connection-my-bookings" aria-labelledby="my-bookings-title">
    <Link className="connection-bookings-back" to="/account"><ArrowLeft size={16} aria-hidden="true" />{t.ctBack}</Link>
    <header className="connection-bookings-heading"><div><h1 id="my-bookings-title">{t.ctTitle}</h1><p>{t.ctIntro}</p></div><button className="connection-bookings-refresh" disabled={busy} onClick={load}><RefreshCw size={16} aria-hidden="true" />{t.ctRetry}</button></header>
    {busy && <p role="status">{t.ctLoad}</p>}{error && <p role="alert">{error}</p>}{!busy && !error && !orders.length && <p>{t.ctEmpty}</p>}
    {orders.map(o => <article className="connection-my-booking" key={o.id}>
      <header className="connection-booking-card-heading"><div><h2>{o.bookingId}</h2><time dateTime={o.createdAt}>{new Date(o.createdAt).toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</time></div><div className="connection-booking-badges"><span className="connection-booking-badge">{lang === 'en' && o.status === 'received' ? 'Booking received' : statusLabel(o.status)}</span><span className="connection-booking-badge" data-paid={o.paymentStatus === 'paid'}>{o.amountPaid > 0 && o.balance > 0 && !o.amountRefunded ? t.ctPartial : lang === 'en' && o.paymentStatus === 'paid' ? 'Paid' : statusLabel(o.paymentStatus)}</span></div></header>
      <div className="connection-booking-product"><PackageImage brand={o.snapshot.brand} pack={o.snapshot.pack} offer={o.snapshot.offer} boxType={o.snapshot.boxType} /><div><p className="connection-booking-brand">{o.snapshot.brand}{o.snapshot.boxType && ` \u00b7 ${o.snapshot.boxType} box`}</p><h3>{packDisplayName(o.snapshot.pack)}</h3><p className="connection-booking-location"><MapPin size={14} aria-hidden="true" />{lang === 'ta' ? districtTamil[o.customer.district] : o.customer.district} &middot; {o.customer.pincode}</p></div></div>
      <ProviderBookingDetails order={o} lang={lang} />
      <dl className="connection-booking-money">{[[t.ctTotal, o.priceBreakdown.total], [lang === 'en' ? 'Paid' : t.ctPaid, o.amountPaid], [t.ctBalance, o.balance], ...(o.amountRefunded > 0 ? [[t.ctRefunded, o.amountRefunded]] : [])].map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{currency(Number(value), lang)}</dd></div>)}</dl>{o.status === 'installed' && o.balance > 0 && <p>{t.ctDue}</p>}
      {o.amountDueNow > 0 && !o.providerPaymentId && ['pending', 'awaiting_admin_confirmation'].includes(o.paymentStatus) && <p role="status">{t.ctVerifying}</p>}<p className="connection-booking-schedule"><Calendar size={16} aria-hidden="true" /><span>{o.schedule ? `${t.ctSchedule}: ${o.schedule.date}, ${slot(o.schedule.slot)}` : t.ctNotScheduled}</span></p><Link className="connection-booking-receipt-link" to={'/new-connection/book?order=' + encodeURIComponent(o.id)}><Printer size={16} aria-hidden="true" />{t.ctReceipt}</Link>
      <details><summary>{t.ctHistory}</summary><ol>{o.statusHistory.map((h, i) => <li key={i}><strong>{statusLabel(h.status)}</strong> · <time dateTime={h.at}>{new Date(h.at).toLocaleString(lang === 'ta' ? 'ta-IN' : 'en-IN')}</time>{h.note && <p>{h.note}</p>}</li>)}</ol></details>
      {o.cancellationRequest && <p role="status">{o.cancellationRequest.status === 'open' ? t.ctCancelOpen : o.cancellationRequest.status === 'accepted' ? t.ctCancelAccepted : t.ctCancelDeclined}</p>}
      {['received', 'contacted'].includes(o.status) && o.cancellationRequest?.status !== 'open' && cancel !== o.id && <button className="connection-booking-cancel" disabled={busy} onClick={() => { setCancel(o.id); setReason(''); }}>{t.ctCancel}</button>}
      {cancel === o.id && <form className="connection-cancellation-form" onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try { const res = await fetch('/api/new-connection/orders/' + o.id + '/cancellation', { method: 'POST', headers: await paymentAuthHeaders(), body: JSON.stringify({ customerReason: reason }) }); if (!res.ok) throw new Error(); setCancel(null); await load(); } catch { setError(t.ctCancelError); } finally { setBusy(false); } }}><h3>{t.ctCancel}</h3><p className="connection-cancellation-hint">{t.ctCancellationHint}</p><label>{t.ctReason}<textarea rows={2} required autoFocus minLength={3} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label><div className="connection-controls"><button className="connection-primary" disabled={busy}>{busy ? t.nbWorking : t.ctSend}</button><button type="button" disabled={busy} onClick={() => setCancel(null)}>{t.ctClose}</button></div></form>}
    </article>)}<nav className="connection-controls" aria-label={t.ctTitle}><button disabled={busy || !previous.length} onClick={() => { setCursor(previous.at(-1)!); setPrevious(p => p.slice(0, -1)); }}>{t.ctPrevious}</button><button disabled={busy || !next} onClick={() => { setPrevious(p => [...p, cursor]); setCursor(next!); }}>{t.ctNext}</button></nav>
  </section>;
}
