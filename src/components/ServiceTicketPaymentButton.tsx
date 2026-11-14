import React, { useState } from 'react';
import { ticketAuthHeaders } from '../lib/ticketAppCheck';
import { loadCheckout } from './RazorpayCheckout';
export function ServiceTicketPaymentButton({ ticketId }: { ticketId: string }) {
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState('');
  async function post(path: string, body: unknown) { const response = await fetch(`/api/service-requests${path}`, { method: 'POST', headers: await ticketAuthHeaders(), body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Payment is unconfirmed. Do not pay again.'); return data; }
  return <div className="my-3 space-y-2"><button className="admin-primary" disabled={busy} onClick={async () => {
    if (busy) return; setBusy(true); setNotice('');
    try {
      const data = await post(`/${ticketId}/checkout`, {});
      if (data.paid) { setNotice('Payment already received. Refresh your tickets for the latest status.'); setBusy(false); return; }
      if (data.pending) { setNotice('Payment capture is pending. Please wait and refresh your tickets; do not pay again.'); setBusy(false); return; }
      await loadCheckout(); if (!window.Razorpay) throw new Error('Checkout unavailable.');
      const checkout = new window.Razorpay({ key: data.key_id, order_id: data.order_id, amount: 5000, currency: 'INR', name: 'DTH Tamizhan', description: `${data.ticketNo} complaint assistance (test)`,
        handler: async (payment: Record<string, string>) => { try { const result = await post('/verify', { ...payment, ticketId }); setNotice(result.paid ? 'Payment verified. Refresh your tickets for updates.' : 'Capture is pending. Do not pay again.'); } catch { setNotice('Payment is unconfirmed. Refresh your tickets; do not pay again.'); } finally { setBusy(false); } },
        modal: { ondismiss: () => { setBusy(false); setNotice('Checkout closed. Refresh payment status before trying again.'); } },
      });
      checkout.on('payment.failed', () => { setBusy(false); setNotice('Payment did not complete. Check its status before trying again.'); }); checkout.open();
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Checkout unavailable.'); setBusy(false); }
  }}>Check status / resume test payment</button>{notice && <p role="status" className="text-sm">{notice}</p>}</div>;
}
