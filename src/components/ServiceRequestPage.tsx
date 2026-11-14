import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { UserProfile } from '../types';
import { serviceBrandsSchema, validateServiceSubscriber, type ServiceBrand } from '../lib/serviceBrands';
import { serviceCategories } from '../lib/tickets';
import { paymentAuthHeaders } from '../lib/paymentAuth';
import { loadCheckout } from './RazorpayCheckout';
export const serviceNotice = "Calling your DTH company's customer care is free. This Rs. 50 service saves you the waiting time: we register the complaint with the company for you and share the complaint number. If we don't place it within 24 hours, your Rs. 50 is refunded automatically.";
export function ServiceRequestPage({ user, onOpenAuth }: { user: UserProfile | null; onOpenAuth: () => void }) {
  const [brands, setBrands] = useState<ServiceBrand[]>([]); const [brandId, setBrandId] = useState(''); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false);
  const requestKey = useRef(crypto.randomUUID()); const locked = useRef(false);
  const [pending, setPending] = useState<Record<string, string> | null>(null);
  useEffect(() => { let active = true; fetch('/api/service-brands', { cache: 'no-store' }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(); if (active) { const brands = serviceBrandsSchema.parse(data.brands).filter(brand => brand.enabled); setBrands(brands); setBrandId(brands[0]?.id || ''); } }).catch(() => { if (active) setError('Brands could not be loaded. Please retry.'); }); return () => { active = false; }; }, []);
  const brand = brands.find(brand => brand.id === brandId);
  async function post(path: string, body: unknown) { const response = await fetch(`/api/service-requests${path}`, { method: 'POST', headers: { ...await paymentAuthHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Please retry.'); return data; }
  async function verify(value: Record<string, string>) {
    setPending(value); setBusy(true); locked.current = true;
    try { const data = await post('/verify', value); setNotice(data.paid ? 'Payment verified. We will register your complaint. See My tickets for updates.' : 'Payment capture is pending. Do not pay again.'); if (data.paid) setPending(null); }
    catch { setError('Payment is unconfirmed. Retry verification or check My tickets. Do not pay again.'); }
    finally { setBusy(false); locked.current = false; }
  }
  return <section className="mx-auto max-w-2xl p-4 space-y-4"><h1 className="text-2xl font-semibold">DTH service request</h1><p>{serviceNotice}</p><p className="text-sm">Test checkout only. No real service payment is collected.</p><Link to="/my-tickets">My tickets</Link>
    {error && <p role="alert" className="text-error">{error}</p>}{notice && <p role="status">{notice}</p>}
    {!user ? <button className="admin-primary" onClick={onOpenAuth}>Sign in to continue</button> : <form className="space-y-4" onSubmit={async event => { event.preventDefault(); if (locked.current || !brand) return; const values = new FormData(event.currentTarget); if (!validateServiceSubscriber(brand, String(values.get('subscriberId')))) { setError('Check your subscriber ID.'); return; } locked.current = true; setBusy(true); setError('');
      try { await loadCheckout(); const data = await post('', { requestKey: requestKey.current, acceptedTerms: values.get('acceptedTerms') === 'on', name: values.get('name'), phone: values.get('phone'), state: values.get('state'), brand: brandId, subscriberId: values.get('subscriberId'), issueCategory: values.get('issueCategory'), description: values.get('description') });
        if (!window.Razorpay) throw new Error('Checkout unavailable.');
        const checkout = new window.Razorpay({ key: data.key_id, order_id: data.order_id, amount: 5000, currency: 'INR', name: 'DTH Tamizhan', description: `Complaint assistance ${data.ticketNo}`, handler: (payment: Record<string, string>) => void verify({ ...payment, ticketId: data.ticketId }), modal: { ondismiss: () => { setBusy(false); locked.current = false; setNotice('Checkout closed. Your pending request is in My tickets.'); } } }); checkout.open();
      } catch (e) { setError(e instanceof Error ? e.message : 'Checkout unavailable.'); setBusy(false); locked.current = false; }
    }}>
      <label className="block">Brand<select className="block w-full border border-rule rounded-lg p-3" value={brandId} onChange={event => setBrandId(event.target.value)}>{brands.map(brand => <option key={brand.id} value={brand.id}>{brand.displayName}</option>)}</select></label>
      <label className="block">{brand?.subscriberIdLabel || 'Subscriber ID'}<input name="subscriberId" required inputMode="numeric" pattern="[0-9]+" minLength={brand?.minLength} maxLength={brand?.maxLength} placeholder={brand?.placeholder} className="block w-full border border-rule rounded-lg p-3" /><small>{brand?.helpText}</small></label>
      <label className="block">Issue<select name="issueCategory" className="block w-full border border-rule rounded-lg p-3">{serviceCategories.map(category => <option key={category} value={category}>{category.replace(/_/g, ' ')}</option>)}</select></label>
      <label className="block">Description<textarea name="description" required minLength={5} maxLength={1000} rows={4} className="block w-full border border-rule rounded-lg p-3" /></label>
      <label className="block">Name<input name="name" defaultValue={user.displayName} required maxLength={100} className="block w-full border border-rule rounded-lg p-3" /></label>
      <label className="block">Contact phone<input name="phone" defaultValue={user.phoneNumber} required inputMode="tel" pattern="[6-9][0-9]{9}" maxLength={10} className="block w-full border border-rule rounded-lg p-3" /></label>
      <label className="block">State<input name="state" defaultValue="Tamil Nadu" required maxLength={60} className="block w-full border border-rule rounded-lg p-3" /></label>
      <label className="flex gap-2 items-start"><input name="acceptedTerms" type="checkbox" required />I accept the Rs. 50 fee and automatic refund terms above.</label>
      <button className="admin-primary" disabled={busy || !brand || !!notice || !!pending}>Pay Rs. 50 (test)</button>
    </form>}
    {pending && <button className="admin-primary" disabled={busy} onClick={() => void verify(pending)}>Retry verification</button>}
  </section>;
}
