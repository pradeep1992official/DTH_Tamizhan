import { beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ query: vi.fn(), orders: vi.fn(), refunds: vi.fn() }));
vi.mock('../server/queries', () => ({ queryRecords: f.query }));
vi.mock('../server/persistence', () => ({ collections: { payments: 'server_payments' }, usesFirestore: () => true }));
vi.mock('../server/models/paymentPages', () => ({ ordersForPayments: f.orders }));
vi.mock('../server/models/adminAiData', () => ({ openSupportTickets: f.refunds }));
import { executeAnalyticsRead, analyticsBounds } from '../server/models/adminAnalytics';
const now = Date.parse('2026-11-14T00:00:00Z');
const range = { from: '2026-11-09', to: '2026-11-14' };
const payment = { id: 'pay_1', orderId: 'order_1', status: 'paid', providerStatus: 'captured', testMode: false, amount: 1396, currency: 'INR', createdAt: '2026-11-10T00:00:00Z' };
const order = { orderId: 'order_1', paymentId: 'pay_1', user_id: 'owner', rechargeStatus: 'completed', paymentStatus: 'paid', testMode: false, amount: 1396, operator: 'airtel_dth', packId: 'pack_1', packName: 'Tamil HD', createdAt: payment.createdAt };
beforeEach(() => { vi.clearAllMocks(); f.query.mockResolvedValue([payment]); f.orders.mockResolvedValue([order]); });
it('binds inclusive India week dates to fixed Firestore predicates', async () => {
  await executeAnalyticsRead('get_total_orders', { ...range, status: 'all' }, now);
  expect(f.query).toHaveBeenCalledWith('server_payments', [
    { field: 'createdAt', op: 'lte', value: '2026-11-14T18:29:59.999Z' },
    { field: 'createdAt', op: 'gt', value: '2026-11-08T18:29:59.999Z' },
  ], expect.objectContaining({ limit: 201 }));
  expect(() => analyticsBounds({ from: '2026-11-15', to: '2026-11-14' }, now)).toThrow();
  expect(() => analyticsBounds({ from: null, to: '2026-11-15' }, now)).toThrow();
});
it('computes revenue only for completed live recharges with matching successful payments', async () => {
  f.query.mockResolvedValue([payment, { ...payment, id: 'pay_pending', orderId: 'pending' }, { ...payment, id: 'pay_test', orderId: 'test', testMode: true },
    { ...payment, id: 'pay_refund', orderId: 'refund', status: 'refunded', providerStatus: 'refunded' }]);
  f.orders.mockResolvedValue([order, { ...order, orderId: 'pending', paymentId: 'pay_pending', rechargeStatus: 'pending' },
    { ...order, orderId: 'test', paymentId: 'pay_test', testMode: true }, { ...order, orderId: 'refund', paymentId: 'pay_refund' }]);
  const result = await executeAnalyticsRead('get_total_revenue', range, now);
  expect(result).toMatchObject({ revenue: 1396, revenuePaise: 139600, successfulRecharges: 1, testExcluded: true });
});
it('counts order status and computes operator/top-plan groupings in code', async () => {
  f.orders.mockResolvedValue([order, { ...order, orderId: 'test', testMode: true, rechargeStatus: 'processing' }]);
  expect(await executeAnalyticsRead('get_total_orders', { ...range, status: 'pending' }, now)).toMatchObject({ totalOrders: 1, testOrders: 1 });
  expect(await executeAnalyticsRead('get_orders_by_operator', range, now)).toMatchObject({ operators: [{ operator: 'airtel_dth', totalOrders: 2, completed: 1, pending: 1 }] });
  expect(await executeAnalyticsRead('get_top_plans', { limit: 1 }, now)).toMatchObject({ plans: [{ planId: 'pack_1', successfulRecharges: 1, revenuePaise: 139600 }] });
});
it('returns projected failed recharge rows and open imported refunds only', async () => {
  f.orders.mockResolvedValue([{ ...order, rechargeStatus: 'failed', smartCardNumber: '1234567890' }]);
  const failed = await executeAnalyticsRead('get_failed_recharges', range, now);
  expect(failed.totalFailed).toBe(1); expect(JSON.stringify(failed)).not.toContain('1234567890');
  f.refunds.mockResolvedValue([{ id: 'ticket_1', createdAt: payment.createdAt, category: 'refund', replyEmail: 'private@example.com' }]);
  const refunds = await executeAnalyticsRead('get_pending_refunds', {}, now);
  expect(f.refunds).toHaveBeenCalledWith('refund', 50); expect(JSON.stringify(refunds)).not.toContain('private@example.com');
});
