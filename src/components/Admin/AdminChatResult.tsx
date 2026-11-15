import React from 'react';
import type { AdminQueryResult } from '../../lib/adminAi';
import { AdminAnalyticsResult } from './AdminAnalyticsResult';
import { AdminRechargeTotals } from './AdminRechargeTotals';
export function AdminChatResult({ result, busy, blocked, onLoadMore }: { result: AdminQueryResult | null; busy: boolean; blocked: boolean; onLoadMore: () => void }) { return <div className="space-y-3 admin-chat-result">
    {result?.type === 'analytics' && <AdminAnalyticsResult result={result} />}
    {result?.type === 'revenue_totals'  && <section className="space-y-2" aria-label="Revenue">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 role="status" className="font-semibold">Revenue</h3><span className="text-xs text-muted">Through {result.through_date} (IST)</span></div>
      <dl className="flex flex-wrap gap-6">{([['Live collections', result.live], ['Test payments', result.test]] as const).map(([label, amount]) => <div key={label}>
        <dt className="text-sm text-muted">{label}</dt><dd className="text-xl font-semibold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)}</dd>
      </div>)}</dl>
      <p className="text-xs text-muted">Captured payments only. Test payments are not real revenue.</p>
    </section>}
    {result?.type === 'recharge_totals'  && <AdminRechargeTotals result={result} />}
    {(result?.type === 'recharges' || result?.type === 'pending_recharges') && <div className="overflow-x-auto">
      {result.type === 'pending_recharges' ? <p role="status" className="text-sm">{result.rows.length} awaiting recharge - through {result.through_date} (IST){result.nextCursor ? ' - more available' : ''}</p> : <p role="status" className="text-sm">{result.parameters.status}: {result.parameters.start_date} to {result.parameters.end_date} (IST){result.limited ? ' - more available' : ''}</p>}
      {!result.rows.length ? <p>{result.type === 'pending_recharges' && result.nextCursor ? 'No pending orders on this page. Load more to check older payments.' : 'No matching recharges.'}</p> : <table className="w-full text-left text-sm"><caption className="sr-only">Matching recharges</caption>
        <thead><tr>{['Order', 'Mode', 'Operator', 'Amount', 'Status', 'Created'].map(label => <th key={label} scope="col" className="p-2">{label}</th>)}</tr></thead>
        <tbody>{result.rows.map(row => <tr key={`${row.testMode}:${row.orderId}`}><td className="p-2">{row.orderId}</td><td className="p-2">{row.testMode ? 'TEST - No real recharge' : 'Live'}</td><td className="p-2">{row.operator}</td><td className="p-2">Rs. {row.amount}</td><td className="p-2">{row.status}</td><td className="p-2">{new Date(row.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td></tr>)}</tbody>
      </table>}
      {result.type === 'pending_recharges' && result.nextCursor && <button type="button" className="admin-primary" disabled={busy || blocked} onClick={onLoadMore}}>Load more pending recharges</button>}
    </div>}
    {result?.type === 'tickets' && <section className="space-y-3" aria-label="Ticket search results">
      <h3 className="font-semibold">Matching tickets ({result.tickets.length})</h3>
      {!result.tickets.length && <p>No matching tickets.</p>}
      {result.limited && <p className="text-sm text-muted">More matches are available. Narrow your search.</p>}
      {result.tickets.map(ticket => <article key={ticket.id} className="border border-rule rounded-lg p-3 space-y-2">
        <h4 className="font-semibold">{ticket.subject}</h4>
        <p className="text-sm text-muted">{ticket.id} / {ticket.category}</p>
        <p className="whitespace-pre-line">{ticket.message}</p>
      </article>)}
    </section>}

</div>; }
