import { monthlyComparison, packDisplayName, packageCardLabel, validityLabel } from '../../lib/newConnectionDisplay';
import { PackageImage } from './PackageImage';
import { PackageInclusions } from './PackageInclusions';
import { Check } from '../../lib/icons';
import { PackChips } from './PackChips';
import { packBoxType, packPackageType } from '../../lib/newConnectionCatalog';
import { connectionStatusLabel } from '../../lib/newConnectionTrackingCopy';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { Language, UserProfile } from '../../types';
import { translations } from '../../lib/translations';
import { auth } from '../../lib/firebase';
import { paymentAuthHeaders } from '../../lib/paymentAuth';
import { compatibleEquipment, pricing, type VisiblePack } from '../../lib/newConnectionBrowse';
import type { CatalogData, NewConnectionSettings } from '../../lib/newConnectionCatalog';
import { advanceQuote, bookingServiceable, calculateNewConnectionPrice, customerDetailsSchema, installationDateBounds, TN_DISTRICTS, withConnectionLedger, gatewayPaymentRecorded, type BookingInput, type BookingQuote, type NewConnectionOrder, type NewConnectionProvider } from '../../lib/newConnectionOrders';
import { districtTamil } from '../../lib/newConnectionBookingCopy';
import { BUSINESS_DETAILS } from '../../lib/trustContent';
import { whatsappRecipient } from '../../lib/whatsappNotifications';
import { loadCheckout } from '../RazorpayCheckout';
import { CatalogLogo, currency, SampleNote } from './Shared';

const blankCustomer = { name: '', phone: '', altPhone: '', email: '', address: '', landmark: '', pincode: '', district: '', preferredDate: '', preferredSlot: 'Any', notes: '' };
interface Draft { lockedPack: boolean; brandId: string; packId: string; offerId: string; validity: number; count: number; customer: typeof blankCustomer; key: string; startedAt: number }
interface Checkout { provider: NewConnectionProvider; providerOrderId: string; keyId?: string; amount?: number; checkoutUrl?: string; currency: string; testMode: boolean }
interface Config { enabledProviders: ('razorpay' | 'youpi')[]; settings: NewConnectionSettings }
export function BookingPage({ data, items, lang, user, onOpenAuth }: { data: CatalogData; items: VisiblePack[]; lang: Language; user: UserProfile | null; onOpenAuth: () => void }) {
  const t = translations[lang]; const location = useLocation(); const navigate = useNavigate(); const params = new URLSearchParams(location.search); const orderId = params.get('order'); const owner = user?.uid ?? 'guest'; const storageKey = `dth:nc:booking:v1:${owner}`;
  const [draft, setDraft] = useState<Draft>(() => {
    const brandId = (params.get('pack') ? items.find(i => i.pack.id === params.get('pack'))?.brand.id : undefined) || params.get('brand') || items[0]?.brand.id || ''; const item = items.find(i => i.brand.id === brandId && (!params.get('pack') || i.pack.id === params.get('pack')));
    const initial: Draft = { lockedPack: Boolean(params.get('pack')), brandId, packId: params.get('pack') || item?.pack.id || '', offerId: params.get('offer') || (item ? compatibleEquipment(item, data.equipment)[0]?.id : '') || '', validity: Number(params.get('validity')) || (item ? pricing(item.pack).validityDays : 30), count: 1, customer: { ...blankCustomer, name: user?.displayName || '', phone: user?.phoneNumber?.replace(/^\+91/, '') || '' }, key: crypto.randomUUID(), startedAt: Date.now() };
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || (user ? sessionStorage.getItem('dth:nc:booking:v1:guest') : '') || 'null');
      if (saved?.startedAt > Date.now() - 24 * 3600000 && saved.startedAt <= Date.now() && typeof saved.key === 'string' && Number.isInteger(saved.count) && saved.count >= 1 && saved.count <= 3 && saved.customer && Object.keys(blankCustomer).every(key => typeof saved.customer[key] === 'string') && (!params.get('pack') || (saved.packId === params.get('pack') && saved.brandId === brandId && saved.validity === Number(params.get('validity') || saved.validity)))) {
        const restored = items.find(i => i.pack.id === saved.packId);
        return { ...initial, ...saved, lockedPack: true, brandId: restored?.brand.id ?? saved.brandId, count: 1, key: saved.count === 1 ? saved.key : crypto.randomUUID(), customer: { ...blankCustomer, ...saved.customer } };
      }
    } catch { /* Session storage is optional. */ }
    return initial;
  });
  const [step, setStep] = useState(1); const [planContinuing, setPlanContinuing] = useState(false); const [config, setConfig] = useState<Config | null>(null); const [configError, setConfigError] = useState(false); const [configAttempt, setConfigAttempt] = useState(0);
  const [provider, setProvider] = useState<NewConnectionProvider>('none'); const [terms, setTerms] = useState(false); const [contact, setContact] = useState(false); const [honeypot, setHoneypot] = useState('');
  const [serverQuote, setServerQuote] = useState<BookingQuote | null>(null); const [order, setOrder] = useState<NewConnectionOrder | null>(null); const [busy, setBusy] = useState(false); const locked = useRef(false); const [notice, setNotice] = useState(''); const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (Object.keys(errors).length) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); }, [errors]);
  const settings = config?.settings ?? data.settings; const item = items.find(i => i.pack.id === draft.packId && i.brand.id === draft.brandId); const offers = item ? compatibleEquipment(item, data.equipment) : []; const offer = item && packPackageType(item.pack) ? offers[0] : offers.find(o => o.id === draft.offerId); const option = item?.pack.pricingOptions.find(o => o.validityDays === draft.validity); const bounds = installationDateBounds();
  const quote = serverQuote ?? (offer && option ? advanceQuote(calculateNewConnectionPrice(option.price, offer, draft.count), settings) : null);
  const validSelection = Boolean(item && offer && option && Number.isInteger(draft.count) && draft.count === 1);
  const rentalTerms = lang === 'en' ? 'The set-top box is provided on a rental basis.' : '\u0baa\u0bc6\u0b9f\u0bcd\u0b9f\u0bbf \u0bb5\u0bbe\u0b9f\u0b95\u0bc8 \u0b85\u0b9f\u0bbf\u0baa\u0bcd\u0baa\u0b9f\u0bc8\u0baf\u0bbf\u0bb2\u0bcd \u0bb5\u0bb4\u0b99\u0bcd\u0b95\u0baa\u0bcd\u0baa\u0b9f\u0bc1\u0b95\u0bbf\u0bb1\u0ba4\u0bc1.';
  const message = (code?: string) => ({ RATE_LIMITED: t.nbRateLimited, PRICE_CHANGED: t.nbPriceUpdated, NOT_SERVICEABLE: t.nbNotServiceable, INVALID_DATE: t.nbDateHint, BOOKING_LIMIT: t.nbLimit, DUPLICATE_BOOKING: t.nbDuplicate, FORM_TOO_FAST: t.nbFast, SELECTION_UNAVAILABLE: t.nbUnavailableSelection, PROVIDER_DISABLED: t.nbUnavailable, CHECKOUT_EXPIRED: t.nbExpired, SIGN_IN_REQUIRED: t.nbGoogleOnly, GOOGLE_SIGN_IN_REQUIRED: t.nbGoogleOnly, INVALID_DETAILS: t.nbRequired }[code || ''] ?? t.nbGenericError);
  useEffect(() => { try { sessionStorage.setItem(storageKey, JSON.stringify(draft)); if (user) sessionStorage.removeItem('dth:nc:booking:v1:guest'); } catch {} }, [draft, storageKey]);
  useEffect(() => { let cancelled = false; setConfigError(false); fetch('/api/new-connection/config', { cache: 'no-store' }).then(async response => { if (!response.ok) throw new Error(); return response.json(); }).then(value => { if (!cancelled) { setConfig(value); setProvider(value.settings.advanceMode === 'none' ? 'none' : value.enabledProviders.includes(value.settings.defaultProvider) ? value.settings.defaultProvider : value.enabledProviders[0] || 'none'); } }).catch(() => { if (!cancelled) setConfigError(true); }); return () => { cancelled = true; }; }, [configAttempt]);
  async function request(path: string, body?: unknown) {
    const response = await fetch(`/api/new-connection/orders${path}`, { method: body ? 'POST' : 'GET', headers: await paymentAuthHeaders(), cache: 'no-store', ...(body ? { body: JSON.stringify(body) } : {}) }); const value = await response.json();
    if (!response.ok) { if (value.code === 'PRICE_CHANGED' && value.quote) { setServerQuote(value.quote); setTerms(false); setContact(false); setStep(3); } throw new Error(message(value.code || (response.status === 429 ? 'RATE_LIMITED' : undefined))); } return value;
  }
  async function checkStatus(id: string) { const result = await request(`/${id}`); setOrder(result.order); if (result.verificationPending) setNotice(t.nbStatusUnavailable); return result; }
  useEffect(() => { let cancelled = false; if (orderId && user) request(`/${orderId}`).then(r => { if (!cancelled) setOrder(r.order); }).catch(() => { if (!cancelled) setNotice(t.nbGenericError); }); return () => { cancelled = true; }; }, [orderId, user?.uid]);
  useEffect(() => {
    if (!order || order.uid !== user?.uid || !order.amountDueNow || !['pending', 'awaiting_admin_confirmation'].includes(order.paymentStatus)) return;
    let cancelled = false, count = 0; let timer: ReturnType<typeof setTimeout>;
    const poll = async () => { if (cancelled || count++ >= 5) return; try { const result = await request(`/${order.id}`); if (cancelled) return; setOrder(result.order); if (result.order.paymentStatus === 'paid') return; } catch { /* Keep the honest pending state; manual checking remains available. */ } if (!cancelled) timer = setTimeout(poll, 4000); };
    timer = setTimeout(poll, 4000); return () => { cancelled = true; clearTimeout(timer); };
  }, [order?.id, order?.paymentStatus, user?.uid]);
  function planChange(patch: Partial<Draft>) { setDraft(d => ({ ...d, ...patch, count: 1, key: crypto.randomUUID() })); setServerQuote(null); setTerms(false); setContact(false); setErrors({}); }
  function choosePack(packId: string, brandId = draft.brandId) {
    const selected = items.find(i => i.pack.id === packId && i.brand.id === brandId); planChange({ brandId, packId, offerId: selected ? compatibleEquipment(selected, data.equipment)[0]?.id || '' : '', validity: selected ? pricing(selected.pack).validityDays : 30 });
  }
  function validateDetails() {
    const parsed = customerDetailsSchema.safeParse(draft.customer); const invalid: Record<string, string> = {};
    if (!parsed.success) parsed.error.issues.forEach(issue => { invalid[String(issue.path[0])] = t.nbRequired; });
    if (draft.customer.preferredDate < bounds.min || draft.customer.preferredDate > bounds.max) invalid.preferredDate = t.nbDateHint;
    if (parsed.success && !bookingServiceable(parsed.data, settings)) invalid.pincode = t.nbNotServiceable;
    setErrors(invalid); return Object.keys(invalid).length === 0;
  }
  async function openPayment(checkout: Checkout | null, current: NewConnectionOrder) {
    if (!checkout || !current.amountDueNow || current.paymentStatus === 'paid') return;
    if (checkout.provider === 'youpi' && checkout.checkoutUrl) { window.location.assign(checkout.checkoutUrl); return; }
    if (checkout.provider !== 'razorpay' || !checkout.keyId?.startsWith('rzp_test_')) { setNotice(t.nbUnavailable); return; }
    await loadCheckout();
    await new Promise<void>(resolve => {
      const instance = new window.Razorpay!({ key: checkout.keyId, order_id: checkout.providerOrderId, amount: checkout.amount, currency: 'INR', name: 'DTH Tamizhan', description: current.bookingId, prefill: { name: current.customer.name, contact: current.customer.phone, email: current.customer.email || undefined }, handler: async (confirmation: Record<string, unknown>) => { try { const result = await request(`/${current.id}/verify`, confirmation); setOrder(result.order); } catch { setNotice(t.nbPendingHint); } finally { resolve(); } }, modal: { ondismiss: () => { setNotice(t.nbPendingHint); resolve(); } } });
      instance.on('payment.failed', () => setNotice(t.nbPaymentFailed)); instance.open();
    });
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (locked.current) return;
    if (step === 1) {
      if (!quote || !validSelection || !config) { setNotice(t.nbUnavailableSelection); return; }
      locked.current = true; setPlanContinuing(true); setNotice('');
      try { await new Promise(resolve => setTimeout(resolve, 0)); setStep(2); }
      finally { setPlanContinuing(false); locked.current = false; }
      return;
    }
    if (step === 2) { if (validateDetails()) setStep(3); return; }
    if (!validateDetails() || !quote || !config) { setStep(2); return; }
    if (!terms || !contact) { setNotice(t.nbConsentNeeded); return; }
    const currentUser = auth?.currentUser;
    if (!currentUser) { onOpenAuth(); setNotice(t.nbGoogleOnly); return; }
    locked.current = true; setBusy(true); setNotice('');
    try {
      const token = await currentUser.getIdTokenResult();
      if ((token.claims.firebase as { sign_in_provider?: string })?.sign_in_provider !== 'google.com') { onOpenAuth(); setNotice(t.nbGoogleOnly); return; }
      const payload: BookingInput = { brandId: draft.brandId, packId: draft.packId, offerId: offer!.id, boxType: packBoxType(item!.pack), selectedValidityDays: draft.validity, ...(option?.validityMonths ? { selectedValidityMonths: option.validityMonths } : {}), connectionCount: draft.count, customer: customerDetailsSchema.parse(draft.customer), provider: quote.amountDueNow ? provider : 'none', consent: { terms: true, contact: true }, displayedQuote: quote, idempotencyKey: draft.key, honeypot, formStartedAt: draft.startedAt };
      const result = await request('', payload); setOrder(result.order); navigate(`/new-connection/book?order=${encodeURIComponent(result.order.id)}`, { replace: true });
      if (result.needsReview) setNotice(t.nbExisting); else { if (result.pending) setNotice(t.nbPendingHint); await openPayment(result.checkout, result.order); }
    } catch (e) { setNotice(e instanceof Error ? e.message : t.nbGenericError); } finally { locked.current = false; setBusy(false); }
  }
  async function retry() { if (!order || locked.current) return; locked.current = true; setBusy(true); try { const result = await request(`/${order.id}/checkout`, {}); setOrder(result.order); if (result.pending) setNotice(t.nbPendingHint); await openPayment(result.checkout, result.order); } catch (e) { setNotice(e instanceof Error ? e.message : t.nbGenericError); } finally { locked.current = false; setBusy(false); } }
  const slotText = (slot: string) => ({ Morning: t.nbMorning, Afternoon: t.nbAfternoon, Evening: t.nbEvening, Any: t.nbAny }[slot] || slot);
  function breakdown(current: BookingQuote) {
    const count = order?.connectionCount ?? draft.count;
    const term = order ? validityLabel(order.selectedValidityDays, lang, order.selectedValidityMonths) : option ? validityLabel(option.validityDays, lang, option.validityMonths) : '';
    const packaged = order ? Boolean(packPackageType({ name: order.snapshot.pack })) : Boolean(item && packPackageType(item.pack));
    const rows: [string, number][] = [];
    if (!packaged || current.priceBreakdown.hardware || current.priceBreakdown.installation) rows.push([t.ncHardware, current.priceBreakdown.hardware], [t.ncInstallation, current.priceBreakdown.installation]);
    rows.push([`${lang === 'en' ? 'Pack price' : t.ncChosenPrice} (${term})${count > 1 ? ` / ${lang === 'en' ? 'connection' : t.nbPerConnection}` : ''}`, current.priceBreakdown.pack]);
    if (count > 1) rows.push([t.nbPerConnection, current.priceBreakdown.perConnectionTotal]);
    rows.push([count > 1 ? t.nbTotal : lang === 'en' ? 'Total' : t.nbTotal, current.priceBreakdown.total], [t.nbDue, current.amountDueNow], [t.nbBalance, current.balanceAtInstallation]);
    return <dl className="connection-booking-breakdown" aria-live="polite">{rows.map(([label, amount]) => <div key={label}><dt>{label}</dt><dd>{currency(amount, lang)}</dd></div>)}</dl>;
  }

  if (orderId && !user) return <section className="connection-state"><p>{t.nbGoogleOnly}</p><button onClick={onOpenAuth}>{t.nbGoogle}</button></section>;
  if (order && order.uid === user?.uid) {
    const expired = Date.now() - Date.parse(order.createdAt) >= 24 * 3600000; const paid = gatewayPaymentRecorded(withConnectionLedger(order)) || order.paymentStatus === 'paid'; const noPayment = order.amountDueNow === 0; const recipient = whatsappRecipient(BUSINESS_DETAILS.phone);
    const whatsapp = recipient ? `https://wa.me/${recipient}?text=${encodeURIComponent([`${t.nbBookingId}: ${order.bookingId}`, `${t.nbName}: ${order.customer.name}`, `${t.ncBrand}: ${order.snapshot.brand}`, `${t.ncPack}: ${order.snapshot.pack}`, `${t.nbPincode}: ${order.customer.pincode}`, `${t.nbDate}: ${order.customer.preferredDate} · ${slotText(order.customer.preferredSlot)}`].join('\n'))}` : '';
    return <section className="connection-booking-receipt"><header className="connection-heading"><h1>{order.status !== 'received' ? connectionStatusLabel(order.status, lang) : order.amountRefunded > 0 ? connectionStatusLabel(order.paymentStatus, lang) : noPayment ? t.nbReceived : paid ? t.nbPaid : order.paymentStatus === 'awaiting_admin_confirmation' ? t.nbAwaiting : t.nbPending}</h1><strong>{t.nbBookingId}: {order.bookingId}</strong>{order.testMode && <p className="connection-feedback">{t.nbTest}</p>}<p>{noPayment ? t.nbNoneHint : !paid ? t.nbPendingHint : ''}</p></header><p>{connectionStatusLabel(order.status, lang)} ? {order.amountPaid > 0 && order.balance > 0 && !order.amountRefunded ? t.ctPartial : connectionStatusLabel(order.paymentStatus, lang)}</p><PackageImage brand={order.snapshot.brand} pack={order.snapshot.pack} offer={order.snapshot.offer} boxType={order.snapshot.boxType} /><SampleNote name={order.snapshot.pack} lang={lang} /><p>{order.snapshot.brand} · {order.snapshot.pack} · {order.snapshot.offer}</p><p>{order.snapshot.boxType && `${order.snapshot.boxType} box / `}{order.connectionCount} × {validityLabel(order.selectedValidityDays, lang, order.selectedValidityMonths)}</p><p>{order.customer.name} · {order.customer.pincode} · {order.customer.preferredDate} · {slotText(order.customer.preferredSlot)}</p>{breakdown({ ...order, balanceAtInstallation: withConnectionLedger(order).balance })}<p><strong>{t.nbPaidAmount}: {currency(withConnectionLedger(order).amountPaid, lang)}</strong></p><p>{t.ctBalance}: {currency(withConnectionLedger(order).balance, lang)} / {t.ctRefunded}: {currency(withConnectionLedger(order).amountRefunded, lang)}</p><Link className="connection-no-print" to="/account/bookings">{t.ctTitle}</Link>{notice && <p role="status">{notice}</p>}<div className="connection-controls connection-no-print"><button disabled={busy} onClick={() => { setBusy(true); checkStatus(order.id).catch(() => setNotice(t.nbStatusUnavailable)).finally(() => setBusy(false)); }}>{t.nbCheck}</button>{!paid && !noPayment && !expired && !(order.provider === 'youpi' && ['EXPIRED', 'FAILED', 'CANCELLED'].includes(String(order.providerRaw.status))) && order.paymentStatus === 'pending' && <button disabled={busy} onClick={retry}>{t.nbRetry}</button>}<button onClick={() => window.print()}>{t.nbPrint}</button>{whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer">{t.nbWhatsApp}</a>}{expired && !paid && !noPayment && <><p>{t.nbExpired}</p><button onClick={() => { try { sessionStorage.removeItem(storageKey); } catch {} navigate('/new-connection'); }}>{t.nbClear}</button></>}<Link to="/new-connection">{t.ncBack}</Link></div></section>;
  }
  if (orderId) return <section className="connection-state" role="status"><p>{notice || t.nbWorking}</p><Link to="/new-connection">{t.ncBack}</Link></section>;
  if (!item || !offer || !option) return <section className="connection-state"><h1>{t.ncUnavailable}</h1><p>{t.nbUnavailableSelection}</p><Link to="/new-connection">{t.ncBack}</Link></section>;
  const fields: (keyof typeof blankCustomer)[] = ['name', 'phone', 'altPhone', 'email', 'address', 'landmark', 'pincode', 'district', 'preferredDate', 'preferredSlot', 'notes'];
  const labels: Record<keyof typeof blankCustomer, string> = { name: t.nbName, phone: t.nbPhone, altPhone: t.nbAltPhone, email: t.nbEmail, address: t.nbAddress, landmark: t.nbLandmark, pincode: t.nbPincode, district: t.nbDistrict, preferredDate: t.nbDate, preferredSlot: t.nbSlot, notes: t.nbNotes };
  if (step === 1) return <>
    <Link to="/new-connection" className="connection-back"><span className="link-arrow" aria-hidden="true">&larr;</span> <span className="link-label">{t.ncBack}</span></Link>
    <header className="connection-heading"><h1>{t.nbTitle}</h1></header>
    <ol className="connection-booking-steps connection-plan-steps" aria-label={t.nbTitle}>{[t.nbPlan, t.nbDetails, t.nbReview].map((label, i) => <li key={label} data-state={i === 0 ? 'current' : 'upcoming'} aria-current={i === 0 ? 'step' : undefined}><span className="connection-step-number" aria-hidden="true">{i + 1}</span><span>{label}</span></li>)}</ol>
    {notice && <p role="alert" className="connection-feedback">{notice}</p>}{!config && !configError && <p role="status">{t.nbWorking}</p>}{configError && <p role="alert">{t.nbConfigError} <button onClick={() => setConfigAttempt(n => n + 1)}>{t.nbTryAgain}</button></p>}
    <form ref={formRef} onSubmit={submit} noValidate className="connection-plan-card"><fieldset disabled={busy || planContinuing} className="connection-plan-card-body">
      <div className="connection-honeypot" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={honeypot} onChange={e => setHoneypot(e.target.value)} /></label></div>
      {!draft.lockedPack && <div className="connection-plan-selectors"><label>{t.ncBrand}<select value={draft.brandId} onChange={e => choosePack(items.find(i => i.brand.id === e.target.value)?.pack.id || '', e.target.value)}>{data.brands.filter(b => items.some(i => i.brand.id === b.id)).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label>{t.ncPack}<select value={draft.packId} onChange={e => choosePack(e.target.value)}>{items.filter(i => i.brand.id === draft.brandId).map(i => <option key={i.pack.id} value={i.pack.id}>{packDisplayName(i.pack.name)}{packPackageType(i.pack) ? ` - ${packageCardLabel(packPackageType(i.pack)!, lang)}` : ''}{` - ${packBoxType(i.pack)}`}</option>)}</select></label></div>}
      <div className="connection-plan-header"><div className="connection-plan-identity">
        <div className="connection-plan-heading">
        <div className="connection-booking-summary-brand"><CatalogLogo url={item.brand.logoUrl || (item.brand.name.toLowerCase().includes('airtel') ? '/airtel_logo.png' : item.brand.name.toLowerCase().replace(/[^a-z]/g, '').includes('tataplay') ? '/tata_logo.png' : '')} name={item.brand.name} size={48} /><span>{item.brand.name}</span></div>
        <div className="connection-plan-muted"><h2>{packDisplayName(item.pack.name)}</h2><p className="connection-booking-channel-count">{item.counts.channelCount} {t.ncChannels} &middot; <strong>{item.counts.hdChannelCount} HD</strong></p></div>
        </div>
        <div className="connection-plan-chips-and-validity"><PackChips showValidity={false} compactTooltip pack={item.pack} hdCount={item.counts.hdChannelCount} option={option} lang={lang} />{item.pack.pricingOptions.length === 1 ? <strong className="connection-plan-validity-text">{validityLabel(option.validityDays, lang, option.validityMonths)}</strong> : <select className="connection-plan-validity-text" aria-label={`${t.ncValidity}: ${packDisplayName(item.pack.name)}`} value={draft.validity} onChange={e => planChange({ validity: Number(e.target.value) })}>{item.pack.pricingOptions.map(value => <option key={value.validityDays} value={value.validityDays}>{validityLabel(value.validityDays, lang, value.validityMonths)}</option>)}</select>}</div>


      </div><div className="connection-plan-product"><PackageImage brand={item.brand.name} pack={item.pack.name} packageType={packPackageType(item.pack)} boxType={packBoxType(item.pack)} /></div></div>
        {quote && <dl className="connection-booking-breakdown connection-plan-price" aria-live="polite"><div className="connection-plan-due"><dt>{lang === 'en' ? 'Total price' : '\u0bae\u0bca\u0ba4\u0bcd\u0ba4 \u0bb5\u0bbf\u0bb2\u0bc8'}</dt><dd><p className="connection-plan-coverage">{lang === 'en' ? `Pack ${validityLabel(option.validityDays, lang, option.validityMonths)} + ${packBoxType(item.pack)} set-top box + installation${packPackageType(item.pack) === 'full_set' ? ' + dish' : ''}` : `${t.ncPack} (${validityLabel(option.validityDays, lang, option.validityMonths)}) + ${packBoxType(item.pack)} ${t.nbOffer} + ${t.ncInstallation}`}</p><div className="connection-plan-price-amount"><strong>{currency(quote.priceBreakdown.total, lang)}</strong><small>{monthlyComparison(option.price, option.validityDays, lang, option.validityMonths)}</small></div></dd></div></dl>}
      {packPackageType(item.pack) ? <PackageInclusions packageType={packPackageType(item.pack)!} boxType={packBoxType(item.pack)} lang={lang} existingDishNote={lang === 'en' ? 'Dish not included. Your existing dish is required.' : undefined} /> : <label>{t.nbOffer}<select value={draft.offerId} onChange={e => planChange({ offerId: e.target.value })}>{offers.map(o => <option key={o.id} value={o.id}>{o.name} ({o.boxType})</option>)}</select></label>}
      {packPackageType(item.pack) === 'only_box' && <p className="connection-plan-support">{lang === 'en' ? 'Not sure your dish is compatible?' : t.nbOffer} <a href={`tel:${BUSINESS_DETAILS.phone.replace(/[^+0-9]/g, '')}`}>{lang === 'en' ? 'Call support' : '\u0b89\u0ba4\u0bb5\u0bbf'}</a></p>}
      <SampleNote name={item.pack.name} lang={lang} />



      {settings.priceDisclaimer && <p className="connection-disclaimer">{settings.priceDisclaimer}</p>}
      <div className="connection-booking-actions"><Link to="/new-connection"><span aria-hidden="true">&larr;</span> {lang === 'en' ? 'Change pack' : t.ncBack}</Link><button className="connection-primary" type="submit" aria-busy={planContinuing} disabled={busy || planContinuing || !config || !quote || !validSelection}>{busy || planContinuing ? t.nbWorking : t.nbNext}</button></div>
    </fieldset></form>
  </>;
  return <><Link to="/new-connection" className="connection-back"><span className="link-arrow" aria-hidden="true">&larr;</span> <span className="link-label">{t.ncBack}</span></Link><header className="connection-heading"><h1>{t.nbTitle}</h1></header><ol className="connection-booking-steps" aria-label={t.nbTitle}>{[t.nbPlan, t.nbDetails, t.nbReview].map((label, i) => <li key={label} data-state={step > i + 1 ? 'complete' : step === i + 1 ? 'current' : 'upcoming'} aria-current={step === i + 1 ? 'step' : undefined}><span className="connection-step-number" aria-hidden="true">{step > i + 1 ? <Check size={18} /> : i + 1}</span>{step > i + 1 && <span className="sr-only">{lang === 'en' ? 'Completed: ' : ''}</span>}<span>{label}</span></li>)}</ol>
    {notice && <p role="alert" className="connection-feedback">{notice}</p>}{!config && !configError && <p role="status">{t.nbWorking}</p>}{configError && <p role="alert">{t.nbConfigError} <button onClick={() => setConfigAttempt(n => n + 1)}>{t.nbTryAgain}</button></p>}
    <form ref={formRef} onSubmit={submit} noValidate><fieldset disabled={busy} className="connection-booking-form">
      <div className="connection-booking-layout"><div className="connection-booking-main"><div className="connection-honeypot" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={honeypot} onChange={e => setHoneypot(e.target.value)} /></label></div>

      {step === 2 && <><div className="connection-booking-fields">{fields.map(key => <label key={key}>{labels[key]}{key === 'district' ? <select required aria-invalid={Boolean(errors[key])} value={draft.customer[key]} onChange={e => setDraft(d => ({ ...d, customer: { ...d.customer, [key]: e.target.value } }))}><option value="">{t.nbChoose}</option>{TN_DISTRICTS.map(district => <option key={district} value={district}>{lang === 'ta' ? districtTamil[district] : district}</option>)}</select> : key === 'preferredSlot' ? <select value={draft.customer[key]} onChange={e => setDraft(d => ({ ...d, customer: { ...d.customer, [key]: e.target.value } }))}>{['Morning', 'Afternoon', 'Evening', 'Any'].map(s => <option key={s} value={s}>{slotText(s)}</option>)}</select> : ['address', 'notes'].includes(key) ? <textarea required={key === 'address'} maxLength={key === 'address' ? 500 : 1000} aria-invalid={Boolean(errors[key])} value={draft.customer[key]} onChange={e => setDraft(d => ({ ...d, customer: { ...d.customer, [key]: e.target.value } }))} /> : <input required={!['altPhone', 'email', 'landmark', 'notes'].includes(key)} type={key === 'preferredDate' ? 'date' : key === 'email' ? 'email' : ['phone', 'altPhone'].includes(key) ? 'tel' : 'text'} inputMode={['phone', 'altPhone', 'pincode'].includes(key) ? 'numeric' : undefined} min={key === 'preferredDate' ? bounds.min : undefined} max={key === 'preferredDate' ? bounds.max : undefined} maxLength={['phone', 'altPhone'].includes(key) ? 10 : key === 'pincode' ? 6 : key === 'email' ? 254 : 150} autoComplete={key === 'name' ? 'name' : key === 'phone' ? 'tel-national' : key === 'email' ? 'email' : key === 'pincode' ? 'postal-code' : undefined} aria-invalid={Boolean(errors[key])} value={draft.customer[key]} onChange={e => setDraft(d => ({ ...d, customer: { ...d.customer, [key]: e.target.value } }))} />}{errors[key] && <small className="connection-field-error">{errors[key]}</small>}</label>)}</div><p className="connection-muted">{t.nbDateHint}</p></>}
      {step === 3 && <><h2>{packDisplayName(item.pack.name)}</h2><p className="connection-box-type">Box: {packBoxType(item.pack)}</p><SampleNote name={item.pack.name} lang={lang} /><p>{item.brand.name} &middot; {packPackageType(item.pack) ? packageCardLabel(packPackageType(item.pack)!, lang) : offer.name} &middot; {validityLabel(draft.validity, lang, option?.validityMonths)} × {draft.count}</p><p>{draft.customer.name} · {draft.customer.phone} · {draft.customer.address} · {draft.customer.pincode}</p><p>{draft.customer.preferredDate} · {slotText(draft.customer.preferredSlot)}</p>{quote && quote.amountDueNow > 0 && <label>{t.nbProvider}<select value={provider} onChange={e => setProvider(e.target.value as NewConnectionProvider)}>{config?.enabledProviders.map(p => <option key={p} value={p}>{p === 'razorpay' ? 'Razorpay (TEST)' : 'YouPI'}</option>)}</select></label>}{provider === 'razorpay' && <p className="connection-feedback">{t.nbTest}</p>}{provider === 'youpi' && <p className="connection-muted">{t.nbBankManual}</p>}<details open><summary>{t.nbTerms}</summary><p className="connection-policy">{settings.terms || t.nbNoTerms}</p><p className="connection-policy">{rentalTerms}</p></details><details><summary>{t.nbRefund}</summary><p className="connection-policy">{settings.refundPolicy || (quote?.amountDueNow === 0 ? t.nbNoRefund : t.nbPendingHint)}</p></details><label className="connection-check"><input required type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} />{t.nbAcceptTerms}</label><label className="connection-check"><input required type="checkbox" checked={contact} onChange={e => setContact(e.target.checked)} />{t.nbAcceptContact}</label></>}
      </div><aside className="connection-booking-summary" aria-label={lang === 'en' ? 'Your connection summary' : t.nbReview}>
        <div className="connection-booking-summary-brand"><CatalogLogo url={item.brand.logoUrl || (item.brand.name.toLowerCase().includes('airtel') ? '/airtel_logo.png' : item.brand.name.toLowerCase().replace(/[^a-z]/g, '').includes('tataplay') ? '/tata_logo.png' : '')} name={item.brand.name} size={48} /><span>{item.brand.name}</span></div>
        <h2>{packDisplayName(item.pack.name)}</h2>{packPackageType(item.pack) && <p className="connection-package-type">{packageCardLabel(packPackageType(item.pack)!, lang)}</p>}
        <p className="connection-booking-channel-count">{item.counts.channelCount} {t.ncChannels} &middot; <strong>{item.counts.hdChannelCount} HD</strong></p>
        <PackageImage brand={item.brand.name} pack={item.pack.name} packageType={packPackageType(item.pack)} boxType={packBoxType(item.pack)} />
        {packPackageType(item.pack) ? <PackageInclusions packageType={packPackageType(item.pack)!} boxType={packBoxType(item.pack)} lang={lang} /> : <p>{offer.name} &middot; {packBoxType(item.pack)}</p>}
        <SampleNote name={item.pack.name} lang={lang} />
        <p className="connection-booking-monthly">{monthlyComparison(option.price, option.validityDays, lang, option.validityMonths)}{draft.count > 1 && <> &middot; {t.nbPerConnection}</>}</p>
        {quote && breakdown(quote)}
        {quote?.balanceAtInstallation === 0 && <p className="connection-booking-payment-note">{lang === 'en' ? 'No balance is due at installation for the items listed above.' : t.nbBalance + ': ' + currency(0, lang)}</p>}
        {!packPackageType(item.pack) && <p className="connection-muted">{t.ncEquipmentNote}</p>}{settings.priceDisclaimer && <p className="connection-disclaimer">{settings.priceDisclaimer}</p>}
                {!validSelection && <p role="alert">{t.nbUnavailableSelection}</p>}
        <div className="connection-booking-actions">{step > 1 ? <button type="button" onClick={() => setStep(s => s - 1)}>{t.nbBack}</button> : <Link to="/new-connection">{lang === 'en' ? 'Change pack' : t.ncBack}</Link>}<button className="connection-primary" type="submit" disabled={busy || !config || !quote || !validSelection || (step === 3 && (!terms || !contact || Boolean(quote?.amountDueNow && !config.enabledProviders.length)))}>{busy ? t.nbWorking : step < 3 ? t.nbNext : !user ? t.nbGoogle : quote?.amountDueNow ? `${t.nbPay} ${currency(quote.amountDueNow, lang)}` : t.nbBook}</button></div>{step === 3 && Boolean(quote?.amountDueNow && !config?.enabledProviders.length) && <p role="alert">{t.nbUnavailable}</p>}
      </aside></div>
    </fieldset></form></>;
}
