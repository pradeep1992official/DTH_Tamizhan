import React, { useState } from 'react';
import { gatewayPaymentRecorded, type NewConnectionOrder } from '../../lib/newConnectionOrders';

export function LegacyBankPaymentConfirmation({ order, getAuthHeaders, onConfirmed }: {
  order: NewConnectionOrder;
  getAuthHeaders: () => Promise<Record<string, string>>;
  onConfirmed: () => void;
}) {
  const [utr, setUtr] = useState(String(order.providerRaw.utr || ''));
  const [amount, setAmount] = useState(String(order.amountDueNow));
  const [note, setNote] = useState('');
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (order.provider !== 'youpi' || order.amountDueNow <= 0 || gatewayPaymentRecorded(order)) return null;

  return <form onSubmit={async event => {
    event.preventDefault();
    if (busy || !window.confirm('Confirm this exact amount and reference were received in the bank?')) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/admin/new-connection/payments/${order.id}/confirm`, {
        method: 'POST', headers: { ...await getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ utr, amount: Number(amount), note, bankChecked: checked }),
      });
      if (!response.ok) throw new Error();
      onConfirmed();
    } catch { setError('Could not confirm. Check the bank, exact amount and unique reference.'); }
    finally { setBusy(false); }
  }}>
    <fieldset disabled={busy}>
      <legend>Confirm an existing bank payment</legend>
      <p>Checkout for this older booking is retired. Confirm only money you have verified in the bank.</p>
      {error && <p role="alert">{error}</p>}
      <div className="catalog-fields">
        <label>12-digit UPI reference<input required pattern="[0-9]{12}" value={utr} onChange={event => setUtr(event.target.value)} /></label>
        <label>Amount received (INR)<input required type="number" min="0.01" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} /></label>
        <label>Bank-check note — internal only<textarea required minLength={5} maxLength={500} value={note} onChange={event => setNote(event.target.value)} /></label>
        <label className="catalog-checkbox"><input required type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} />I checked the receiving bank and verified the amount and reference.</label>
      </div>
      <button className="nc-primary">{busy ? 'Confirming…' : 'Confirm payment received'}</button>
    </fieldset>
  </form>;
}
