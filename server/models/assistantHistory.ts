import type { RechargeOrder } from '../../src/types';
import { rechargeSummarySchema, type RechargeSummary } from '../../src/lib/assistantActions';
import { collections } from '../persistence';
import { queryRecords, type Filter } from '../queries';
import type { PaymentLedgerEntry } from './paymentLedger';

// Admin SDK bypasses rules. Always scope the database query itself to the verified UID.
export async function ownedAssistantOrders(uid: string, limit: number, orderId?: string): Promise<RechargeOrder[]> {
  if (!uid) throw new Error('Authenticated UID required.');
  const filters: Filter[] = [{ field: 'user_id', op: 'eq', value: uid }];
  if (orderId) filters.push({ field: 'orderId', op: 'eq', value: orderId });
  const rows = await queryRecords<RechargeOrder>(collections.recharges, filters, { limit, idField: 'orderId' });
  const paymentFilters: Filter[] = [{ field: 'customerUid', op: 'eq', value: uid }];
  if (orderId) paymentFilters.push({ field: 'orderId', op: 'eq', value: orderId });
  // Captured payments can precede a saved fulfillment record, including test orders.
  // Scope both sources before reading; never search another customer's ledger.
  const payments = (await queryRecords<PaymentLedgerEntry>(collections.payments, paymentFilters, { limit: orderId ? 2 : limit }))
    .filter(payment => payment.customerUid === uid && (!orderId || payment.orderId === orderId));
  const backed = payments.length ? await (await import('./paymentPages')).ordersForPayments(payments) : [];
  const merged = new Map<string, RechargeOrder>();
  for (const row of [...rows, ...backed]) {
    if (row.user_id === uid && (!orderId || row.orderId === orderId)) merged.set(`${row.testMode === true}:${row.orderId}`, row);
  }
  return [...merged.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}
export function summarizeAssistantOrder(row: RechargeOrder): RechargeSummary {
  const status = row.rechargeStatus === 'failed' || row.paymentStatus === 'failed' ? 'failed' :
    row.rechargeStatus === 'completed' && row.paymentStatus === 'paid' ? 'success' :
    ['pending', 'processing'].includes(row.rechargeStatus) || row.paymentStatus === 'initiated' ? 'pending' : 'unknown';
  // Explicit projection excludes subscriber IDs, customer contacts and worker notes.
  return rechargeSummarySchema.parse({ orderId: row.orderId, status, amount: row.amount,
    packName: row.packName, createdAt: row.createdAt, testMode: row.testMode === true });
}
export async function assistantHistory(uid: string, limit: number, orderId?: string): Promise<RechargeSummary[]> {
  return (await ownedAssistantOrders(uid, limit, orderId)).map(summarizeAssistantOrder);
}
