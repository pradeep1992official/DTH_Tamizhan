import { useEffect, useState } from 'react';
import type { Language } from '../../types';

export function BrokenLinksPanel({ getAuthHeaders, currentLang }: { getAuthHeaders: () => Promise<Record<string, string>>; currentLang: Language }) {
  const [reports, setReports] = useState<{ path: string; count: number; lastReportedAt: string }[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(false); const [refresh, setRefresh] = useState(0);
  const ta = currentLang === 'ta';
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(false);
    void (async () => {
      try {
        const response = await fetch('/api/admin/broken-links', { headers: await getAuthHeaders(), signal: controller.signal });
        const data = await response.json(); if (!response.ok || !Array.isArray(data.reports)) throw new Error();
        if (!controller.signal.aborted) setReports(data.reports);
      } catch { if (!controller.signal.aborted) setError(true); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })(); return () => controller.abort();
  }, [getAuthHeaders, refresh]);
  return <section className="rounded-xl border border-rule bg-paper p-4 space-y-3">
    <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{ta ? 'செயல்படாத இணைப்புகள்' : 'Broken link reports'}</h3><button type="button" disabled={loading} className="text-sm underline" onClick={() => setRefresh(value => value + 1)}>{ta ? 'புதுப்பிக்கவும்' : 'Refresh'}</button></div>
    {loading ? <p role="status" className="text-sm text-muted">{ta ? 'ஏற்றுகிறது…' : 'Loading reports…'}</p> : error ? <p role="alert" className="text-sm text-error">{ta ? 'புகார்களை ஏற்ற முடியவில்லை.' : 'Could not load broken link reports.'}</p> : !reports.length ? <p className="text-sm text-muted">{ta ? 'இணைப்புப் புகார்கள் இல்லை.' : 'No broken links reported.'}</p> : <ul className="divide-y divide-rule">{reports.map(report => <li key={report.path} className="py-3 flex flex-wrap items-center justify-between gap-2 text-sm"><code className="break-all">{report.path}</code><span className="text-muted">{report.count} {ta ? 'புகார்கள்' : 'reports'} · {new Date(report.lastReportedAt).toLocaleString(ta ? 'ta-IN' : 'en-IN', { timeZone: 'Asia/Kolkata' })} IST</span></li>)}</ul>}
  </section>;
}
