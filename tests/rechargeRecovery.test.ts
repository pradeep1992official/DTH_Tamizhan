import { createHmac } from 'node:crypto';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ disk: '[]', order: vi.fn(), payments: vi.fn(), payment: vi.fn(), record: vi.fn() }));
vi.mock('node:fs', () => ({ default: { existsSync: () => true, mkdirSync: vi.fn(),
  readFileSync: () => f.disk, writeFileSync: (_path: string, body: string) => { f.disk = body; }, renameSync: vi.fn() } }));
vi.mock('../server/persistence', () => ({ usesFirestore: () => false, cleanData: (data: unknown) => data, paymentKey: (id: string, test: boolean) => `${test}:${id}` }));
vi.mock('../server/middleware/auth', () => ({ getSuperAdminEmail: () => 'root@example.com', getAdminFirestore: () => { throw new Error('No live database in this test'); } }));
vi.mock('../server/razorpay', async original => ({ ...await original<typeof import('../server/razorpay')>(), razorpayClient: () => ({ orders: { fetch: f.order, fetchPayments: f.payments }, payments: { fetch: f.payment } }) }));
vi.mock('../server/models/paymentLedger', () => ({ recordProviderPayment: f.record }));
import { assertRechargePayment, rememberRechargeOrder, reconcilePendingRecharges } from '../server/models/rechargeRecovery';
import { validRechargeWebhook } from '../server/routes/rechargeRecovery';
const notes = { dth_app: 'dth-tamizhan', dth_customer_uid: 'owner', dth_operator: 'airtel_dth', dth_subscriber: '3012345678', dth_plan: 'Monthly', dth_pack_id: 'pack' };
const order = { id: 'order_fixture', amount: 30900, currency: 'INR', status: 'paid', notes } as any;
const payment = { id: 'pay_fixture', order_id: order.id, amount: 30900, currency: 'INR', status: 'captured' } as any;
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_test_fixture'); f.disk = '[]';
  f.order.mockResolvedValue(order); f.payments.mockResolvedValue({ items: [payment] }); f.payment.mockResolvedValue(payment);
});
afterEach(() => vi.unstubAllEnvs());
it('validates the exact webhook bytes and rejects missing/wrong signatures', () => {
  const body = Buffer.from('{"event":"payment.captured"}');
  const signature = createHmac('sha256', 'fixture-secret').update(body).digest('hex');
  expect(validRechargeWebhook(body, signature, 'fixture-secret')).toBe(true);
  expect(validRechargeWebhook(Buffer.from(body.toString() + ' '), signature, 'fixture-secret')).toBe(false);
  expect(validRechargeWebhook(body, signature, 'wrong-secret')).toBe(false);
  expect(validRechargeWebhook(body, undefined, 'fixture-secret')).toBe(false);
});
it('recovers capture from a persistent pending order with no browser callback', async () => {
  await rememberRechargeOrder(order);
  expect(f.record).not.toHaveBeenCalled();
  expect(await reconcilePendingRecharges(Date.now() + 1000)).toEqual({ checked: 1, recovered: 1, failed: 0 });
  expect(f.record).toHaveBeenCalledWith(payment, order);
  expect(JSON.parse(f.disk)[0].status).toBe('captured');
  expect((await reconcilePendingRecharges(Date.now() + 2000)).checked).toBe(0);
});
it('keeps uncertain provider responses retryable rather than dropping the order', async () => {
  await rememberRechargeOrder(order); f.order.mockRejectedValue(new Error('timeout'));
  const now = Date.now() + 1000;
  expect(await reconcilePendingRecharges(now)).toMatchObject({ checked: 1, failed: 1 });
  const intent = JSON.parse(f.disk)[0];
  expect(intent.status).toBe('pending'); expect(intent.nextCheckAt).toBeGreaterThan(now);
  expect(f.record).not.toHaveBeenCalled();
});
it('advances through more than 100 pending orders without starving later records', async () => {
  f.disk = JSON.stringify(Array.from({ length: 120 }, (_, i) => ({ id: `order_${i}`, testMode: true, status: 'pending', nextCheckAt: 0, attempts: 0 })));
  f.order.mockRejectedValue(new Error('temporary outage'));
  await reconcilePendingRecharges(1000, 50); await reconcilePendingRecharges(1000, 50); await reconcilePendingRecharges(1000, 50);
  expect(new Set(f.order.mock.calls.map(call => call[0])).size).toBe(120);
});
it('does not reconcile a pending order from another key mode', async () => {
  await rememberRechargeOrder(order); vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_live_fixture');
  expect((await reconcilePendingRecharges(Date.now() + 1000)).checked).toBe(0);
  expect(f.order).not.toHaveBeenCalled();
});
it('rejects wrong owner, amount, currency and non-recharge metadata', () => {
  expect(() => assertRechargePayment(order, payment, 'other')).toThrow('does not belong');
  expect(() => assertRechargePayment(order, { ...payment, amount: 1 })).toThrow('does not match');
  expect(() => assertRechargePayment(order, { ...payment, currency: 'USD' })).toThrow('does not match');
  expect(() => assertRechargePayment({ ...order, notes: { ticketId: 'service' } }, payment)).toThrow('metadata');
});

it('drains a previously created recharge after new checkout is disabled', async () => {
  await rememberRechargeOrder(order); vi.stubEnv('RECHARGE_ENABLED', 'false');
  expect(await reconcilePendingRecharges(Date.now() + 1000)).toEqual({ checked: 1, recovered: 1, failed: 0 });
  expect(f.record).toHaveBeenCalledWith(payment, order);
});
