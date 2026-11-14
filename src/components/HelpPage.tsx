import { HelpAddressFields } from './HelpAddressFields';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { Language, UserProfile } from '../types';
import { fullAddressSchema, pinCodeSchema, savedPinCode, type Ticket } from '../lib/tickets';
import { helpProblems, helpPrefillSchema } from '../lib/help';
import { serviceBrandsSchema, type ServiceBrand } from '../lib/serviceBrands';
import { ticketApi } from '../lib/ticketApi';
import { paymentAuthHeaders } from '../lib/paymentAuth';
import { ticketAuthHeaders } from '../lib/ticketAppCheck';
import { auth } from '../lib/firebase';
import { loadCheckout } from './RazorpayCheckout';

export function HelpPage({ user, currentLang, onOpenAuth }: { user: UserProfile | null; currentLang: Language; onOpenAuth: () => void }) {
  const location = useLocation(); const parsed = helpPrefillSchema.safeParse(location.state?.ticketPrefill); const prefill = parsed.success ? parsed.data : undefined;
  const navigate = useNavigate(); const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const say = (en: string, ta: string) => currentLang === 'ta' ? ta : en;
  const initial = prefill?.issueCategory === 'box_issue' ? 'no_signal' : prefill?.issueCategory && Object.hasOwn(helpProblems, prefill.issueCategory) ? prefill.issueCategory : prefill?.description ? 'other' : '';
  const [problem, setProblem] = useState(initial); const [brandId, setBrandId] = useState(prefill?.brand || '');
  const [description, setDescription] = useState(prefill?.description || '');
  const [fullAddress, setFullAddress] = useState(prefill?.fullAddress || '');
  const [pinCode, setPinCode] = useState(prefill?.pinCode || ''); const [addressAttempted, setAddressAttempted] = useState(false);
  function validateAddress() { setAddressAttempted(true); return fullAddressSchema.safeParse(fullAddress).success && pinCodeSchema.safeParse(pinCode).success; }
  const [brands, setBrands] = useState<ServiceBrand[]>([]); const [orders, setOrders] = useState<{ orderId: string; packName: string }[]>([]);
  const [ticket, setTicket] = useState<Ticket | null>(null); const [error, setError] = useState(''); const [notice, setNotice] = useState(location.state?.cancelled ? say('Request cancelled.', 'கோரிக்கை ரத்து செய்யப்பட்டது.') : ''); const [busy, setBusy] = useState(false);
  const [subscriberId, setSubscriberId] = useState(prefill?.subscriberId || ''); const [terms, setTerms] = useState(false); const [payment, setPayment] = useState<Record<string, string> | null>(null);
  const requestKey = useRef(crypto.randomUUID()); const locked = useRef(false);
  const brand = brands.find(item => item.id === brandId); const dth = helpProblems[problem as keyof typeof helpProblems]?.route === 'dth_service';
  useEffect(() => { let active = true;
    if (user && typeof location.state?.ticketId === 'string') ticketApi(`/${encodeURIComponent(location.state.ticketId)}`).then(data => { if (active && auth?.currentUser?.uid === user.uid) { setTicket(data.ticket); setBrandId(data.ticket.brand); setSubscriberId(data.ticket.subscriberId); setFullAddress(data.ticket.fullAddress || ''); setPinCode(savedPinCode(data.ticket)); } }).catch(() => { if (active) setError('Ticket could not be loaded.'); });
    fetch('/api/service-brands', { cache: 'no-store' }).then(async response => { if (!response.ok) throw new Error(); const data = await response.json(); if (active) setBrands(serviceBrandsSchema.parse(data.brands).filter(brand => brand.enabled)); }).catch(() => { if (active) setError(say('Brands could not be loaded. Please refresh.', 'நிறுவனங்களை ஏற்ற முடியவில்லை. மீண்டும் முயலவும்.')); });
    if (user) (async () => { try { const response = await fetch('/api/my/history?limit=100', { headers: await paymentAuthHeaders(), cache: 'no-store' }); const data = await response.json(); if (active && response.ok && auth?.currentUser?.uid === user.uid) setOrders(data.orders || []); } catch { /* Linking an order is optional. */ } })();
    return () => { active = false; };
  }, [user?.uid]);
  async function verify(value: Record<string, string>) {
    setPayment(value); locked.current = true; setBusy(true);
    try { const response = await fetch('/api/service-requests/verify', { method: 'POST', headers: await ticketAuthHeaders(), body: JSON.stringify(value) }); const data = await response.json(); if (!response.ok) throw new Error();
      setNotice(data.paid ? say('Payment verified. Track updates in My tickets.', 'கட்டணம் உறுதியானது. எனது கோரிக்கைகளில் பார்க்கவும்.') : say('Payment is pending. Do not pay again.', 'கட்டணம் நிலுவையில் உள்ளது. மீண்டும் செலுத்த வேண்டாம்.')); if (data.paid) { setPayment(null); setPaymentConfirmed(true); }
    } catch { setError(say('Payment is unconfirmed. Retry verification; do not pay again.', 'கட்டணம் உறுதியாகவில்லை. சரிபார்க்கவும்; மீண்டும் செலுத்த வேண்டாம்.')); }
    finally { setBusy(false); locked.current = false; }
  }
  async function cancel() {
    if (!ticket || locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try {
      await ticketApi(`/${ticket.id}/cancel`, {});
      setTicket(null); setProblem(''); setDescription(''); setBrandId(''); setSubscriberId(''); setFullAddress(''); setPinCode(''); setTerms(false); setPayment(null); setAddressAttempted(false);
      requestKey.current = crypto.randomUUID(); setNotice(say('Request cancelled.', 'கோரிக்கை ரத்து செய்யப்பட்டது.'));
      navigate('/help', { replace: true, state: { cancelled: true } });
    } catch (error) { setError(error instanceof Error ? error.message : say('Cancellation could not be confirmed. Please retry.', 'ரத்துசெய்ததை உறுதிப்படுத்த முடியவில்லை. மீண்டும் முயலவும்.')); }
    finally { locked.current = false; setBusy(false); }
  }
  return <section aria-label={say('Get Help', '\u0b89\u0ba4\u0bb5\u0bbf')} className="mx-auto max-w-xl px-4 py-6 space-y-5">
    <header className="flex items-center justify-between gap-3"><h1 className="text-2xl font-semibold">{say('Get Help', 'உதவி பெறுங்கள்')}</h1><Link to="/my-tickets" className="text-sm underline">{say('My tickets', 'எனது கோரிக்கைகள்')}</Link></header>
    {error && <p role="alert" className="text-error">{error}</p>}{notice && <p role="status">{notice}</p>}
    {!user ? <button className="admin-primary" onClick={onOpenAuth}>{say('Sign in to continue', 'தொடர உள்நுழையவும்')}</button> : !ticket ? <form className="space-y-5" onSubmit={async event => {
      event.preventDefault(); if (locked.current || !problem) return;
      if (dth && !validateAddress()) return;
      locked.current = true; setBusy(true); setError(''); const values = new FormData(event.currentTarget); const uid = user.uid;
      try { const data = await ticketApi('/help', { requestKey: requestKey.current, phone: values.get('phone'), brand: brandId, subscriberId: dth ? subscriberId : '', fullAddress: dth ? fullAddress : '', pinCode: dth ? pinCode : '', problem, description, language: currentLang === 'ta' ? 'ta' : 'en', website: values.get('website'), ...(values.get('orderId') ? { orderId: values.get('orderId') } : {}) }); if (auth?.currentUser?.uid === uid) setTicket(data.ticket); }
      catch (e) { if (auth?.currentUser?.uid === uid) setError(e instanceof Error ? e.message : 'Please retry.'); } finally { locked.current = false; setBusy(false); }
    }}>
      <label className="block">{say('Phone', 'தொலைபேசி')}<input name="phone" autoComplete="tel-national" inputMode="tel" pattern="[6-9][0-9]{9}" maxLength={10} required defaultValue={prefill?.phone || user.phoneNumber?.replace(/^\+91/, '')} className="mt-1 block w-full border border-rule rounded-xl p-3" /></label>
      <label className="block">{say('Brand', 'நிறுவனம்')}<select value={brandId} onChange={event => setBrandId(event.target.value)} required={dth} className="mt-1 block w-full border border-rule rounded-xl p-3"><option value="">{say('Select brand', 'நிறுவனத்தைத் தேர்ந்தெடுக்கவும்')}</option>{brands.map(brand => <option key={brand.id} value={brand.id}>{brand.displayName}</option>)}</select></label>
      <fieldset><legend className="mb-2 font-medium">{say("What's the problem?", 'என்ன பிரச்சனை?')}</legend><div className="flex flex-wrap gap-2">{[...Object.keys(helpProblems), 'other'].map(key => <button key={key} type="button" aria-pressed={problem === key} onClick={() => { setProblem(key); if (key !== 'other') setDescription(''); }} className={`min-h-11 rounded-full border px-3 py-2 text-sm ${problem === key ? 'bg-brand text-white border-brand' : 'border-rule'}`}>{key === 'other' ? say('Something else', 'வேறு பிரச்சனை') : helpProblems[key as keyof typeof helpProblems][currentLang === 'ta' ? 'ta' : 'en']}</button>)}</div></fieldset>
      {problem !== 'other' && description && <div className="rounded-lg border border-rule p-3 text-sm"><p className="whitespace-pre-wrap">{description}</p><button type="button" className="underline mt-2" onClick={() => setProblem('other')}>{say('Edit details', 'விவரங்களைத் திருத்தவும்')}</button></div>}
      {dth && <label className="block">{brand?.subscriberIdLabel || say('Subscriber ID', 'வாடிக்கையாளர் எண்')}<input inputMode="numeric" pattern="[0-9]+" required minLength={brand?.minLength} maxLength={brand?.maxLength || 25} value={subscriberId} onChange={event => setSubscriberId(event.target.value)} placeholder={brand?.placeholder} className="mt-1 block w-full border border-rule rounded-xl p-3" /></label>}
      {dth && <HelpAddressFields address={fullAddress} pinCode={pinCode} onAddressChange={setFullAddress} onPinChange={setPinCode} language={currentLang} showErrors={addressAttempted} />}
      {problem === 'other' && <label className="block">{say('Tell us briefly', 'சுருக்கமாகக் கூறுங்கள்')}<textarea name="description" required minLength={5} maxLength={1000} rows={4} value={description} onChange={event => setDescription(event.target.value)} className="mt-1 block w-full border border-rule rounded-xl p-3" /><span className="text-xs text-muted">{description.length}/1000</span></label>}
      {['recharge_failed', 'payment_deducted', 'refund'].includes(problem) && <label className="block">{say('Recent order (optional)', 'சமீபத்திய ஆர்டர் (விருப்பம்)')}<select name="orderId" key={orders.length} defaultValue={prefill?.orderId} className="mt-1 block w-full border border-rule rounded-xl p-3"><option value="">{say('No linked order', 'ஆர்டர் இல்லை')}</option>{orders.map(order => <option key={order.orderId} value={order.orderId}>{order.orderId} - {order.packName}</option>)}</select></label>}
      <div hidden aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" /></div>
      <button className="admin-primary w-full min-h-12" disabled={busy || !problem}>{busy ? say('Please wait...', 'காத்திருக்கவும்...') : say('Continue', 'தொடரவும்')}</button>
      <button type="button" className="admin-quiet w-full min-h-11" disabled={busy} onClick={() => navigate('/recharge')}>{say('Cancel', 'ரத்து செய்')}</button>
    </form> : <section className="rounded-xl border border-rule p-4 space-y-4">
      <h2 className="font-semibold" role="status">{say('Ticket', 'கோரிக்கை')} {ticket.ticketNo}</h2>
      {(ticket.type === 'dth_service' || (ticket.type === 'support' && ticket.helpRoute === 'dth_service')) && !notice ? <>
        <HelpAddressFields address={fullAddress} pinCode={pinCode} onAddressChange={setFullAddress} onPinChange={setPinCode} language={currentLang} showErrors={addressAttempted} />
        {!ticket.subscriberId && <><label className="block">{say('Brand', 'நிறுவனம்')}<select value={brandId} onChange={event => setBrandId(event.target.value)} className="block w-full border border-rule rounded p-3"><option value="">{say('Select brand', 'தேர்ந்தெடுக்கவும்')}</option>{brands.map(brand => <option key={brand.id} value={brand.id}>{brand.displayName}</option>)}</select></label><label className="block">{say('Subscriber ID', 'வாடிக்கையாளர் எண்')}<input value={subscriberId} onChange={event => setSubscriberId(event.target.value)} inputMode="numeric" maxLength={25} className="block w-full border border-rule rounded p-3" /></label></>}
        <p className="text-sm font-semibold text-brand">{say('Full ₹50 refund if we do not place your complaint within 24 hours of verified payment.', 'கட்டணம் உறுதியான 24 மணிநேரத்திற்குள் புகார் பதிவு செய்யாவிட்டால் ₹50 முழுவதும் திருப்பித் தரப்படும்.')}</p>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={terms} onChange={event => setTerms(event.target.checked)} />{say('I accept the fee and refund terms.', 'கட்டணம் மற்றும் பணத்திருப்பல் விதிகளை ஏற்கிறேன்.')}</label>
        <button className="admin-primary w-full min-h-12" disabled={busy || !terms || !brand || !subscriberId || !!payment} onClick={async () => {
          if (locked.current || !validateAddress()) return; locked.current = true; setBusy(true); setError('');
          try { await loadCheckout(); const data = await ticketApi(`/${ticket.id}/upgrade`, { acceptedTerms: true, brand: brandId, subscriberId, fullAddress, pinCode });
            if (data.paid || data.pending) { if (data.paid) setPaymentConfirmed(true); setNotice(data.paid ? say('Payment already received.', 'கட்டணம் ஏற்கனவே பெறப்பட்டது.') : say('Payment is pending. Do not pay again.', 'கட்டணம் நிலுவையில் உள்ளது. மீண்டும் செலுத்த வேண்டாம்.')); locked.current = false; setBusy(false); return; }
            if (!window.Razorpay) throw new Error('Checkout unavailable.');
            const checkout = new window.Razorpay({ key: data.key_id, order_id: data.order_id, amount: 5000, currency: 'INR', name: 'DTH Tamizhan', description: ticket.ticketNo,
              handler: (value: Record<string, string>) => void verify({ ...value, ticketId: ticket.id }), modal: { ondismiss: () => { locked.current = false; setBusy(false); setNotice(say('Checkout closed. Resume from My tickets.', 'கட்டணப் பக்கம் மூடப்பட்டது. எனது கோரிக்கைகளில் தொடரவும்.')); } } }); checkout.open();
          } catch (e) { setError(e instanceof Error ? e.message : 'Checkout unavailable.'); locked.current = false; setBusy(false); }
        }}>{say('Let us do it for ₹50', 'நாங்கள் பதிவு செய்ய ₹50')}</button>
        <p className="text-xs text-muted">{say('Test checkout only for now.', 'இப்போது சோதனைக் கட்டணம் மட்டுமே.')}</p>
      </> : <p>{say('Track updates in My tickets.', 'எனது கோரிக்கைகளில் நிலையைப் பார்க்கலாம்.')}</p>}
      {payment && <button className="admin-primary" disabled={busy} onClick={() => void verify(payment)}>{say('Retry verification', 'மீண்டும் சரிபார்க்கவும்')}</button>}
      {!paymentConfirmed && !payment && !ticket.payment.paidAt && ['open', 'in_progress', 'pending_payment', 'expired'].includes(ticket.status) && <button type="button" className="admin-quiet w-full min-h-11" disabled={busy} onClick={() => void cancel()}>{say('Cancel request', 'கோரிக்கையை ரத்து செய்')}</button>}
        <p className="text-xs text-muted">{say('Disclaimer:', 'பொறுப்புத் துறப்பு:')} {say('For free help, contact your DTH provider’s customer care directly.', 'இலவச உதவிக்கு உங்கள் DTH நிறுவனத்தின் வாடிக்கையாளர் சேவையை நேரடியாகத் தொடர்புகொள்ளவும்.')}</p>
    </section>}
  </section>;
}
