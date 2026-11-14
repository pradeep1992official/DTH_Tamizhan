import { getRechargeOrders } from './paidRechargeOrders';
import type { RechargeCounts } from '../../src/lib/adminAi';
import { ordersForPayments } from './paymentPages';
import { readPaymentLedger, type PaymentLedgerEntry } from './paymentLedger';
import { pendingPaidRecharges } from '../../src/lib/pendingRechargeOrders';
import { field } from '@google-cloud/firestore/pipelines';
import { getAdminFirestore } from '../middleware/auth';
import { queryRecords } from '../queries';
import { collections, usesFirestore } from '../persistence';
import { importedTicketSchema, ticketIdSchema, type SupportTicket, type TicketView } from '../../src/lib/adminAi';
export const SUPPORT_TICKETS = 'server_support_tickets';
export function ticketView(ticket: SupportTicket): TicketView {
  const { replyEmail: _email, ...view } = ticket; return view;
}
export async function openSupportTickets(kind: 'all' | 'contact' | 'refund', limit: number): Promise<TicketView[]> {
  // Fixed query: caller/model cannot choose collection, fields or arbitrary predicates.
  let query = getAdminFirestore().pipeline().collection(SUPPORT_TICKETS).where(field('status').equal('open'));
  if (kind !== 'all') query = query.where(field('kind').equal(kind));
  const snapshot = await query.sort(field('createdAt').ascending()).limit(limit).execute();
  const rows = snapshot.results.map(row => ({ ...row.data(), id: row.id }));
  // Imported tickets must conform to the contract; malformed records fail closed.
  return rows.map(row => {
    const { id, ...fields } = row;
    return { id: ticketIdSchema.parse(id), ...importedTicketSchema.parse(fields) };
  }).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)).slice(0, limit).map(ticketView);
}
export async function supportTicket(id: string): Promise<SupportTicket | null> {
  const snapshot = await getAdminFirestore().collection(SUPPORT_TICKETS).doc(ticketIdSchema.parse(id)).get();
  if (!snapshot.exists) return null;
  return { id, ...importedTicketSchema.parse(snapshot.data()) };
}
export async function queryAdminRecharges(status: string, start: string, endInclusive: string, limit: number) {
  const rows = await queryRecords<Record<string, unknown>>(collections.recharges, [
    { field: 'rechargeStatus', op: 'eq', value: status }, { field: 'testMode', op: 'eq', value: false },
    { field: 'createdAt', op: 'gt', value: start }, { field: 'createdAt', op: 'lte', value: endInclusive },
  ], { limit, idField: 'orderId' });
  return rows.map(row => ({ orderId: String(row.orderId), operator: String(row.operator), amount: Number(row.amount),
    status: String(row.rechargeStatus), createdAt: String(row.createdAt), testMode: row.testMode === true }));
}

export async function overallPendingRecharges(through: string, limit: number, cursor?: { time: string; id: string }) {
  // Use the same payment-backed fulfillment source as Pending Orders. This also
  // includes captured payments that do not yet have a saved fulfillment record.
  const records = usesFirestore() ? await queryRecords<PaymentLedgerEntry>(collections.payments, [
    { field: 'status', op: 'eq', value: 'paid' }, { field: 'providerStatus', op: 'eq', value: 'captured' },
    { field: 'createdAt', op: 'lte', value: through },
  ], { limit: limit + 1, cursor }) : (await readPaymentLedger())
    .filter(row => row.status === 'paid' && row.providerStatus === 'captured' && row.createdAt <= through)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
    .filter(row => !cursor || row.createdAt < cursor.time || (row.createdAt === cursor.time && row.id < cursor.id)).slice(0, limit + 1);
  const payments = records.slice(0, limit);
  const orders = pendingPaidRecharges(await ordersForPayments(payments));
  const last = payments.at(-1);
  return { rows: orders.map(row => ({ orderId: row.orderId, operator: row.operator, amount: row.amount,
    status: row.rechargeStatus, createdAt: row.createdAt, testMode: row.testMode === true })),
    nextCursor: records.length > limit && last ? { time: last.createdAt, id: last.id } : null };
}

export async function adminRechargeTotals(through: string) {
  // Same fixed payment-backed source as the existing admin reports. Return counts only.
  const orders = (await getRechargeOrders()).filter(order => order.createdAt <= through);
  const count = (testMode: boolean): RechargeCounts => {
    const result = { total: 0, completed: 0, pending: 0, failed: 0, other: 0 };
    for (const order of orders.filter(order => (order.testMode === true) === testMode)) {
      result.total++;
      if (order.rechargeStatus === 'completed') result.completed++;
      else if (order.rechargeStatus === 'pending' || order.rechargeStatus === 'processing') result.pending++;
      else if (order.rechargeStatus === 'failed') result.failed++;
      else result.other++;
    }
    return result;
  };
  return { live: count(false), test: count(true) };
}

export async function adminRevenueTotals(through: string) {
  // Recorded captured collections, not order counts or accounting profit.
  const payments = (await readPaymentLedger()).filter(payment => payment.status === 'paid' && payment.providerStatus === 'captured' &&
    payment.currency === 'INR' && payment.createdAt <= through && Number.isFinite(payment.amount) && payment.amount > 0);
  const sum = (testMode: boolean) => payments.filter(payment => (payment.testMode === true) === testMode)
    .reduce((paise, payment) => paise + Math.round(payment.amount * 100), 0) / 100;
  return { live: sum(false), test: sum(true), currency: 'INR' as const };
}
