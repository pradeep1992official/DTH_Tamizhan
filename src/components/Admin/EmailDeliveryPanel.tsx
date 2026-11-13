import { useEffect, useState } from 'react';
interface Status { enabled: boolean; configured: boolean; pending: number; accepted: number; failed: number; review: number }
export function EmailDeliveryPanel({ getAuthHeaders }: { getAuthHeaders: () => Promise<Record<string, string>> }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch('/api/admin/email/status', { headers: await getAuthHeaders(), signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load email status.');
        if (active) { setStatus(data); setError(''); }
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Unable to load email status.'); }
    })();
    return () => { active = false; controller.abort(); };
  }, [getAuthHeaders, version]);
  async function retry() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/email/retry', { method: 'POST', headers: await getAuthHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to retry emails.');
      setVersion(value => value + 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to retry emails.'); }
    finally { setBusy(false); }
  }
  return <section aria-label="Receipt email delivery" className="border border-rule rounded-lg p-4 space-y-2 bg-paper">
    <div className="flex flex-wrap items-center justify-between gap-3"><strong className="text-sm">Receipt emails</strong><button type="button" className="text-xs underline" onClick={() => setVersion(value => value + 1)}>Refresh email status</button></div>
    {error && <p role="alert" className="text-error text-sm">{error}</p>}
    {status && <>
      <p className="text-sm text-muted">{status.enabled && status.configured ? 'Brevo enabled' : 'Email sending is off. Configure Brevo on the server to enable it.'}</p>
      <p className="text-xs text-muted">{status.pending} queued · {status.accepted} accepted by Brevo · {status.failed} rejected · {status.review} need review</p>
      {status.failed > 0 && <button type="button" disabled={busy || !status.configured || !status.enabled} onClick={() => void retry()} className="border border-rule rounded-lg px-3 py-2 text-sm">{busy ? 'Requeueing…' : 'Retry rejected emails (super admin)'}</button>}
      {status.review > 0 && <p className="text-xs text-muted">Check uncertain sends in Brevo’s transactional logs before resending. Accepted does not confirm inbox delivery.</p>}
    </>}
  </section>;
}
