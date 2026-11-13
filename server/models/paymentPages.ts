import { z } from 'zod';
import type { RechargeOrder } from '../../src/types';
import type { PaymentLedgerEntry } from './paymentLedger';
import { readPaymentLedger } from './paymentLedger';
import { mergePaidRechargeOrders, readSavedRechargeOrders } from './paidRechargeOrders';
import { getAdminFirestore } from '../middleware/auth';
import { collections, paymentKey, usesFirestore } from '../persistence';
import { queryRecords, type Filter } from '../queries';

const cursorSchema = z.object({ time: z.string().max(50), id: z.string().max(200) });
export function parsePage(query: Record<string, unknown>) {
  const limit = query.limit === undefined ? 25 : Number(query.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Invalid page size.');
  let cursor: z.infer<typeof cursorSchema> | undefined;
  if (query.cursor !== undefined) {
    if (typeof query.cursor !== 'string' || query.cursor.length > 1000) throw new Error('Invalid page cursor.');
    cursor = cursorSchema.parse(JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8')));
  }
  return { limit, cursor };
}
export async function paymentPage(page: ReturnType<typeof parsePage>, uid?: string) {
  const filters: Filter[] = uid ? [{ field: 'customerUid', op: 'eq', value: uid }] : [];
  const rows = usesFirestore() ? await queryRecords<PaymentLedgerEntry>(collections.payments, filters, { ...page, limit: page.limit + 1 }) :
    (await readPaymentLedger()).filter(item => !uid || item.customerUid === uid).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
      .filter(item => !page.cursor || item.createdAt < page.cursor.time || (item.createdAt === page.cursor.time && item.id < page.cursor.id)).slice(0, page.limit + 1);
  const payments = rows.slice(0, page.limit); const last = payments.at(-1);
  const nextCursor = rows.length > page.limit && last ? Buffer.from(JSON.stringify({ time: last.createdAt, id: last.id })).toString('base64url') : null;
  return { payments, orders: await ordersForPayments(payments), nextCursor };
}
export async function ordersForPayments(payments: PaymentLedgerEntry[]) {
  let saved: RechargeOrder[];
  if (usesFirestore()) {
    const refs = [...new Map(payments.filter(payment => payment.orderId).map(payment => {
      const key = paymentKey(payment.orderId, payment.testMode); return [key, getAdminFirestore().collection(collections.recharges).doc(key)];
    })).values()];
    saved = refs.length ? (await getAdminFirestore().getAll(...refs)).filter(doc => doc.exists).map(doc => doc.data() as RechargeOrder) : [];
  } else saved = await readSavedRechargeOrders();
  const provenance = new Set(payments.map(payment => `${payment.orderId}|${payment.id}|${payment.testMode}`));
  return mergePaidRechargeOrders(saved, payments).filter(order => provenance.has(`${order.orderId}|${order.paymentId}|${order.testMode}`));
}
export async function customerPayment(uid: string, id: string) {
  if (!usesFirestore()) return (await readPaymentLedger()).find(payment => payment.id === id && payment.customerUid === uid);
  const rows = await getAdminFirestore().getAll(...[false, true].map(test => getAdminFirestore().collection(collections.payments).doc(paymentKey(id, test))));
  return rows.filter(row => row.exists).map(row => row.data() as PaymentLedgerEntry).find(payment => payment.customerUid === uid && payment.id === id);
}
