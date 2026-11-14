import React from 'react';
import type { AdminAnalyticsResult as AnalyticsResult } from '../../lib/adminAnalytics';

const labels: Record<string, string> = {
  totalOrders: 'Total orders', liveOrders: 'Live', testOrders: 'Test',
  formattedRevenue: 'Revenue', successfulRecharges: 'Successful recharges',
  totalFailed: 'Failed recharges', returned: 'Open refund requests',
  orderId: 'Order', ticketId: 'Ticket', operator: 'Operator', amount: 'Amount',
  createdAt: 'Created', testMode: 'Mode', name: 'Plan', planId: 'Plan ID',
  completed: 'Completed', pending: 'Pending', failed: 'Failed', category: 'Category',
};
export function AdminAnalyticsResult({ result }: { result: AnalyticsResult }) {
  const fields = result.tool === 'get_total_orders' ? ['totalOrders', 'liveOrders', 'testOrders'] :
    result.tool === 'get_total_revenue' ? ['formattedRevenue', 'successfulRecharges'] :
    result.tool === 'get_failed_recharges' ? ['totalFailed'] :
    result.tool === 'get_pending_refunds' ? ['returned'] : [];
  const rows = (result.data.recharges || result.data.plans || result.data.operators || result.data.refunds) as Record<string, unknown>[] | undefined;
  const columns = rows?.length ? Object.keys(rows[0]).filter(key => labels[key] && key !== 'planId') : [];
  function display(key: string, value: unknown) {
    if (value === null || value === undefined) return '-';
    if (key === 'testMode') return value ? 'Test' : 'Live';
    if (key === 'amount') return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value));
    if (key === 'createdAt') return new Date(String(value)).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
    return String(value);
  }
  return <section aria-label="Query results" className="space-y-2 text-sm">
    {!!fields.length && <dl className="flex flex-wrap gap-x-6 gap-y-2">{fields.map(key => <div key={key} className="flex items-baseline gap-2">
      <dt className="text-muted">{labels[key]}</dt><dd className="font-semibold">{display(key, result.data[key])}</dd>
    </div>)}</dl>}
    {rows && (rows.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <caption className="sr-only">Query details</caption>
      <thead><tr>{columns.map(key => <th key={key} scope="col" className="p-2">{labels[key]}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={index}>{columns.map(key => <td key={key} className="p-2">{display(key, row[key])}</td>)}</tr>)}</tbody>
    </table></div> : <p className="text-muted">No matching records.</p>)}
    {result.data.limited === true && <p className="text-muted">Showing a limited list.</p>}
  </section>;
}
