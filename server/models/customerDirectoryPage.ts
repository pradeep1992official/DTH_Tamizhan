import { and, or, field, countAll } from '@google-cloud/firestore/pipelines';
import { customersFromPaidRecharges } from '../../src/lib/rechargeCustomers';
import type { CustomerRecord } from '../../src/types';
import type { PaymentLedgerEntry } from './paymentLedger';
import { getAdminFirestore } from '../middleware/auth';
import { collections, usesFirestore } from '../persistence';
import { getRechargeOrders } from './paidRechargeOrders';
import { ordersForPayments, parsePage } from './paymentPages';

export async function customerDirectoryPage(page: ReturnType<typeof parsePage>) {
  if (!usesFirestore()) {
    const all = customersFromPaidRecharges(await getRechargeOrders()).sort((a, b) => (b.lastRechargeDate || '').localeCompare(a.lastRechargeDate || '') || b.id.localeCompare(a.id));
    const rows = all.filter(item => !page.cursor || (item.lastRechargeDate || '') < page.cursor.time || ((item.lastRechargeDate || '') === page.cursor.time && item.id < page.cursor.id)).slice(0, page.limit + 1);
    const customers = rows.slice(0, page.limit); const last = customers.at(-1);
    return { customers, nextCursor: rows.length > page.limit && last ? encode(last.lastRechargeDate || '', last.id) : null };
  }
  const db = getAdminFirestore();
  const names = ['id', 'orderId', 'customerUid', 'customerName', 'customerPhone', 'customerEmail', 'packName', 'packId', 'packValidity', 'paymentMethod', 'currency', 'amount', 'status', 'providerStatus', 'createdAt'];
  let query = db.pipeline().collection(collections.payments)
    .where(and(field('status').equal('paid'), field('providerStatus').equal('captured')))
    .sort(field('createdAt').descending(), field('id').descending())
    .aggregate({ groups: ['operator', 'smartCardNumber', 'testMode'], accumulators: [
      ...names.map(name => field(name).first().as(name)), field('amount').sum().as('totalSpent'), countAll().as('totalRechargesCount'),
    ] });
  if (page.cursor) query = query.where(or(field('createdAt').lessThan(page.cursor.time), and(field('createdAt').equal(page.cursor.time), field('id').lessThan(page.cursor.id))));
  const result = await query.sort(field('createdAt').descending(), field('id').descending()).limit(page.limit + 1).execute();
  const rows = result.results.map(row => row.data() as PaymentLedgerEntry & { totalSpent: number; totalRechargesCount: number });
  const payments = rows.slice(0, page.limit);
  const orders = await ordersForPayments(payments);
  const customers = customersFromPaidRecharges(orders);
  const counts = new Map<string, number>();
  for (const customer of customers) {
    const payment = payments.find(payment => payment.operator === customer.operator && payment.smartCardNumber === customer.smartCardNumber && payment.testMode === customer.testMode)!;
    customer.totalSpent = payment.totalSpent; customer.totalRechargesCount = payment.totalRechargesCount;
    const key = `${customer.customerUid}:${Boolean(customer.testMode)}`;
    if (!counts.has(key) && customer.customerUid && customer.customerUid !== 'legacy-unassigned') {
      const count = await db.pipeline().collection(collections.payments)
        .where(and(field('customerUid').equal(customer.customerUid), field('testMode').equal(Boolean(customer.testMode)), field('status').equal('paid'), field('providerStatus').equal('captured')))
        .distinct('operator', 'smartCardNumber').aggregate(countAll().as('boxes')).execute();
      counts.set(key, Number(count.results[0]?.data().boxes || 1));
    }
    customer.boxCount = counts.get(key) || 1;
  }
  const last = payments.at(-1);
  return { customers, nextCursor: rows.length > page.limit && last ? encode(last.createdAt, last.id) : null };
}
function encode(time: string, id: string) { return Buffer.from(JSON.stringify({ time, id })).toString('base64url'); }
