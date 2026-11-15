import React, { useState } from 'react';
import { ticketAuthHeaders } from '../lib/ticketAppCheck';
import { loadCheckout } from './RazorpayCheckout';
import { ticketApi } from '../lib/ticketApi';
export function ServiceTicketPaymentButton({ ticketId, brand = '', subscriberId = '', unified = false }: { ticketId: string; brand?: string; subscriberId?: string; unified?: boolean }) {
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState('');
  const [accepted, setAccepted] = useState(false);
  async function post(path: string, body: unknown) { const response = await fetch(`/api/service-requests${path}`, { method: 'POST', headers: await ticketAuthHeaders(), body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Payment is unconfirmed. Do not pay again.'); return data; }
  return <div className="my-3 space-y-2">{unified && <label className="flex gap-2 text-sm"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} />I accept the ₹50 fee and full refund if not placed within 24 hours of verified payment.</label>}<button className="admin-primary" disabled={busy || (unified && !accepted)} onClick={async () => {
    if (busy) return; setBusy(true); setNotice('');
    try {
      let data;
      if (unified) {
        try { data = await post(`/${ticketId}/checkout`, {}); }
        catch { data = await ticketApi(`/${ticketId}/upgrade`, { acceptedTerms: true, brand, subscriberId }); }
      } else data = await post(`/${ticketId}/checkout`, {});
      if (data.paid) { setNotice('Payment already received. Refresh your tickets for the latest status.'); setBusy(false); return; }
      if (data.pending) { setNotice('Your payment is awaiting confirmation. Please wait and refresh your tickets; do not pay again.'); setBusy(false); return; }
      await loadCheckout(); if (!window.Razorpay) throw new Error('Checkout unavailable.');
      const checkout = new window.Razorpay({ key: data.key_id, order_id: data.order_id, amount: 5000, currency: 'INR', name: 'DTH Tamizhan', description: `${data.ticketNo} complaint assistance (test)`,
        handler: async (payment: Record<string, string>) => { try { const result = await post('/verify', { ...payment, ticketId }); setNotice(result.paid ? 'Payment received. Refresh your tickets for updates.' : 'Your payment is awaiting confirmation. Please do not pay again.'); } catch { setNotice('Payment is unconfirmed. Refresh your tickets; do not pay again.'); } finally { setBusy(false); } },
        modal: { ondismiss: () => { setBusy(false); setNotice('Checkout closed. Refresh payment status before trying again.'); } },
      });
      checkout.on('payment.failed', () => { setBusy(false); setNotice('Payment did not complete. Check its status before trying again.'); }); checkout.open();
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Checkout unavailable.'); setBusy(false); }
  }}>Check status / resume test payment</button>{notice && <p role="status" className="text-sm">{notice}</p>}</div>;
}
