import React, { useState } from 'react';
import { downloadTicketFile } from '../../lib/ticketReceipt';
export function ServiceReceiptsPanel({ getAuthHeaders }: { getAuthHeaders: () => Promise<Record<string, string>> }) {
  const [receipts, setReceipts] = useState<{ id: string; number: string; ticketNo: string; status: string }[]>([]); const [range, setRange] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  return <details className="border border-rule rounded-lg p-4 my-4"><summary className="cursor-pointer font-semibold">Service receipts</summary>
    <form className="flex flex-wrap items-end gap-3 my-3" onSubmit={async event => { event.preventDefault(); const values = new FormData(event.currentTarget); const query = new URLSearchParams({ from: String(values.get('from')), to: String(values.get('to')) }).toString(); setBusy(true); setError(''); setReceipts([]); try { const response = await fetch(`/api/admin/service-receipts?${query}`, { headers: await getAuthHeaders(), cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setRange(query); setReceipts(data.receipts); } catch (e) { setError(e instanceof Error ? e.message : 'Please retry.'); } finally { setBusy(false); } }}>
      <label>From<input name="from" type="date" required className="block border border-rule rounded p-2" /></label><label>To<input name="to" type="date" required className="block border border-rule rounded p-2" /></label><button className="admin-primary" disabled={busy}>Find receipts</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {range && <button className="admin-quiet" onClick={() => void downloadTicketFile(`/api/admin/service-receipts?${range}&csv=true`, 'service-receipts.csv').catch(() => setError('Export failed. Please retry.'))}>Export CSV</button>}
    {receipts.map(receipt => <div key={receipt.id} className="flex flex-wrap items-center gap-3 p-2"><span>{receipt.number} - {receipt.ticketNo} - {receipt.status}</span><button className="admin-quiet" onClick={() => void downloadTicketFile(`/api/tickets/${receipt.id}/receipt`, `${receipt.ticketNo}.pdf`).catch(() => setError('Download failed. Please retry.'))}>Download</button></div>)}
  </details>;
}
