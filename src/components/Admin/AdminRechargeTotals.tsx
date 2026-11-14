import React from 'react';
import type { AdminQueryResult } from '../../lib/adminAi';

export function AdminRechargeTotals({ result }: { result: Extract<AdminQueryResult, { type: 'recharge_totals' }> }) {
  const date = new Date(`${result.through_date}T00:00:00+05:30`).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
  });
  return <section className="space-y-2" aria-label="Recharge totals">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold" role="status">Recharge totals</h3><span className="text-xs text-muted">Through {date} (IST)</span></div>
    <dl className="flex flex-wrap gap-x-6 gap-y-2">
      {([
        ['Total orders', result.live.total + result.test.total], ['Live orders', result.live.total], ['Test orders', result.test.total],
      ] as const).map(([label, count]) => <div key={label} className="flex items-baseline gap-2">
        <dt className="text-sm text-muted">{label}</dt><dd className="text-xl font-semibold">{count}</dd>
      </div>)}
    </dl>
    <details><summary className="cursor-pointer text-sm">Status breakdown</summary>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <caption className="sr-only">Recharge totals by mode and status</caption>
      <thead><tr>{['Mode', 'Total', 'Completed', 'Pending', 'Failed', 'Other'].map(label => <th key={label} scope="col" className="p-2">{label}</th>)}</tr></thead>
      <tbody>{([['Live', result.live], ['Test', result.test]] as const).map(([label, counts]) => <tr key={label}>
        <th scope="row" className="p-2">{label}</th>{[counts.total, counts.completed, counts.pending, counts.failed, counts.other].map((count, i) => <td key={i} className="p-2">{count}</td>)}
      </tr>)}</tbody>
    </table></div>
    <p className="text-xs text-muted">Test orders: no real recharge.</p>
    </details>
  </section>;
}
