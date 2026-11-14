import type { RechargeOrder } from '../../src/types';
import type { AnalyticsRange, AdminDataTool } from '../../src/lib/adminAnalytics';
import { analyticsRangeSchema } from '../../src/lib/adminAnalytics';
import { queryRecords, type Filter } from '../queries';
import { collections, usesFirestore } from '../persistence';
import { ordersForPayments } from './paymentPages';
import { readPaymentLedger, type PaymentLedgerEntry } from './paymentLedger';
import { openSupportTickets } from './adminAiData';
export function indiaToday(now = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function analyticsBounds(input: AnalyticsRange, now = Date.now()) {
  const range = analyticsRangeSchema.parse(input);
  const start = range.from ? Date.parse(`${range.from}T00:00:00+05:30`) : null;
  const end = Date.parse(`${range.to}T00:00:00+05:30`) + 86_400_000 - 1;
  if (range.to > indiaToday(now) || (start !== null && start > end)) throw new Error('Invalid analytics date range.');
  return { after: start === null ? null : new Date(start - 1).toISOString(), through: new Date(end).toISOString() };
}
async function source(range: AnalyticsRange, now: number) {
  const bounds = analyticsBounds(range, now);
  const payments = new Map<string, PaymentLedgerEntry>(); const orders = new Map<string, RechargeOrder>();
  let cursor: { time: string; id: string } | undefined;
  const local = usesFirestore() ? null : (await readPaymentLedger()).filter(row => row.createdAt <= bounds.through && (!bounds.after || row.createdAt > bounds.after))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  for (let page = 0; page < 100; page++) {
    const filters: Filter[] = [{ field: 'createdAt', op: 'lte', value: bounds.through }];
    if (bounds.after) filters.push({ field: 'createdAt', op: 'gt', value: bounds.after });
    const records = local ? local.slice(page * 200, page * 200 + 201) : await queryRecords<PaymentLedgerEntry>(collections.payments, filters, { limit: 201, cursor });
    const visible = records.slice(0, 200);
    for (const payment of visible) payments.set(`${payment.testMode === true}:${payment.id}`, payment);
    for (const order of await ordersForPayments(visible)) {
      const key = `${order.testMode === true}:${order.orderId}`;
      if (!orders.has(key)) orders.set(key, order);
    }
    if (records.length <= 200) return { payments, orders: [...orders.values()] };
    const last = visible.at(-1)!;
    cursor = { time: last.createdAt, id: last.id };
  }
  // Never return a partial aggregate as an exact total.
  throw new Error('Analytics scan limit reached. Use a narrower date range.');
}
function status(order: RechargeOrder) { return order.rechargeStatus === 'processing' ? 'pending' : order.rechargeStatus; }
function successes(data: Awaited<ReturnType<typeof source>>) {
  return data.orders.filter(order => {
    const payment = data.payments.get(`${order.testMode === true}:${order.paymentId}`);
    return !order.testMode && order.rechargeStatus === 'completed' && order.paymentStatus === 'paid' &&
      payment?.status === 'paid' && payment.providerStatus === 'captured' && payment.currency === 'INR' &&
      payment.orderId === order.orderId && payment.amount === order.amount;
  });
}
function paise(orders: RechargeOrder[]) {
  return orders.reduce((sum, order) => {
    const amount = Math.round(order.amount * 100);
    if (!Number.isSafeInteger(amount) || amount < 0 || !Number.isSafeInteger(sum + amount)) throw new Error('Invalid revenue data.');
    return sum + amount;
  }, 0);
}
const money = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount / 100);
export async function executeAnalyticsRead(tool: AdminDataTool, args: Record<string, unknown>, now = Date.now()): Promise<Record<string, unknown>> {
  if (tool === 'get_pending_refunds') {
    const tickets = await openSupportTickets('refund', 50);
    return { returned: tickets.length, limited: tickets.length === 50, refunds: tickets.map(ticket => ({ ticketId: ticket.id, createdAt: ticket.createdAt, category: ticket.category, orderId: ticket.orderId || null })),
      note: 'Open imported refund tickets only; returned is not a full-backlog count when limited.' };
  }
  const range: AnalyticsRange = tool === 'get_top_plans' ? { from: null, to: indiaToday(now) } : { from: args.from as string | null, to: args.to as string };
  const data = await source(range, now);
  if (tool === 'get_total_orders') {
    const selected = data.orders.filter(order => args.status === 'all' || (args.status === 'processing' ? order.rechargeStatus === 'processing' : status(order) === args.status));
    return { totalOrders: selected.length, liveOrders: selected.filter(order => !order.testMode).length, testOrders: selected.filter(order => order.testMode).length, status: args.status };
  }
  if (tool === 'get_total_revenue') {
    const successful = successes(data); const revenuePaise = paise(successful);
    return { currency: 'INR', revenuePaise, revenue: revenuePaise / 100, formattedRevenue: money(revenuePaise), successfulRecharges: successful.length, testExcluded: true,
      definition: 'Completed live recharges with matching captured paid INR payments; excludes pending, failed, refunded and test records.' };
  }
  if (tool === 'get_failed_recharges') {
    const failed = data.orders.filter(order => order.rechargeStatus === 'failed');
    return { totalFailed: failed.length, limited: failed.length > 100, recharges: failed.slice(0, 100).map(order => ({ orderId: order.orderId, operator: order.operator, amount: order.amount, createdAt: order.createdAt, testMode: order.testMode === true })) };
  }
  if (tool === 'get_top_plans') {
    const groups = new Map<string, RechargeOrder[]>();
    for (const order of successes(data)) { const id = order.packId || 'unknown'; const group = groups.get(id) || []; group.push(order); groups.set(id, group); }
    const plans = [...groups].map(([planId, orders]) => ({ planId, name: orders[0].packName, successfulRecharges: orders.length, revenuePaise: paise(orders), formattedRevenue: money(paise(orders)) }))
      .sort((a, b) => b.successfulRecharges - a.successfulRecharges || a.planId.localeCompare(b.planId));
    return { ranking: 'successful live recharge count', testExcluded: true, plans: plans.slice(0, args.limit as number), from: null, to: range.to };
  }
  const operators = new Map<string, RechargeOrder[]>();
  for (const order of data.orders) { const group = operators.get(order.operator) || []; group.push(order); operators.set(order.operator, group); }
  return { operators: [...operators].map(([operator, orders]) => ({ operator, totalOrders: orders.length, liveOrders: orders.filter(order => !order.testMode).length,
    testOrders: orders.filter(order => order.testMode).length, completed: orders.filter(order => status(order) === 'completed').length,
    pending: orders.filter(order => status(order) === 'pending').length, failed: orders.filter(order => status(order) === 'failed').length })).sort((a, b) => a.operator.localeCompare(b.operator)) };
}
