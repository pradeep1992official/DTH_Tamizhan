import { beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ rows: [] as any[], pipeline: null as any, db: null as any, document: null as any, firestore: true, orders: vi.fn(), ledger: vi.fn(), allOrders: vi.fn() }));
vi.mock('../server/middleware/auth', () => ({ getAdminFirestore: () => f.db }));
vi.mock('@google-cloud/firestore/pipelines', () => ({ field: (name: string) => ({
  equalAny: (value: unknown) => ({ name, op: 'in', value }), equal: (value: unknown) => ({ name, op: 'eq', value }), greaterThan: (value: unknown) => ({ name, op: 'gt', value }),
  lessThanOrEqual: (value: unknown) => ({ name, op: 'lte', value }), ascending: () => ({ name, direction: 'asc' }), descending: () => ({ name, direction: 'desc' }),
}), and: vi.fn(), or: vi.fn() }));
vi.mock('../server/persistence', async importOriginal => ({ ...await importOriginal<typeof import('../server/persistence')>(), usesFirestore: () => f.firestore }));
vi.mock('../server/models/paidRechargeOrders', () => ({ getRechargeOrders: f.allOrders }));
vi.mock('../server/models/paymentPages', () => ({ ordersForPayments: f.orders }));
vi.mock('../server/models/paymentLedger', () => ({ readPaymentLedger: f.ledger }));
import { openSupportTickets, queryAdminRecharges, overallPendingRecharges, adminRechargeTotals, adminRevenueTotals, supportTicket } from '../server/models/adminAiData';
beforeEach(() => {
  f.rows = []; f.firestore = true; f.ledger.mockReset(); f.orders.mockReset();
  f.orders.mockImplementation(async payments => payments.map((row: Record<string, unknown>) => ({ ...row, paymentStatus: row.status, rechargeStatus: row.rechargeStatus || 'pending' })));
  const pipeline: any = {};
  for (const name of ['collection', 'where', 'sort', 'limit']) pipeline[name] = vi.fn(() => pipeline);
  pipeline.execute = vi.fn(async () => ({ results: f.rows.map(row => ({ id: row.id, data: () => { const { id, ...data } = row; return data; } })) }));
  f.pipeline = pipeline; f.document = vi.fn(async () => ({ exists: false }));
  f.db = { pipeline: () => pipeline, collection: vi.fn(() => ({ doc: vi.fn(() => ({ get: f.document })) })) };
});
it('binds only the fixed recharge collection, live mode, status and date filters and projects out contacts', async () => {
  f.rows = [{ id: 'doc', orderId: 'order_1', operator: 'airtel_dth', amount: 299, rechargeStatus: 'failed', createdAt: '2026-11-13T00:00:00Z', user_id: 'private', smartCardNumber: '1234567890', workerNotes: 'secret' }];
  const result = await queryAdminRecharges('failed', 'from', 'through', 20);
  expect(f.pipeline.collection).toHaveBeenCalledWith('server_recharges');
  expect(f.pipeline.where.mock.calls.map((call: unknown[]) => call[0])).toEqual([
    { name: 'rechargeStatus', op: 'eq', value: 'failed' }, { name: 'testMode', op: 'eq', value: false },
    { name: 'createdAt', op: 'gt', value: 'from' }, { name: 'createdAt', op: 'lte', value: 'through' },
  ]);
  expect(f.pipeline.limit).toHaveBeenCalledWith(20);
  expect(JSON.stringify(result)).not.toContain('private'); expect(JSON.stringify(result)).not.toContain('1234567890'); expect(JSON.stringify(result)).not.toContain('secret');
});
it('orders open imported tickets in the database before applying a bounded limit and omits recipients', async () => {
  f.rows = [{ id: 'ticket_1', kind: 'refund', status: 'open', category: 'refund', subject: 'Refund', message: 'Help', replyEmail: 'private@example.com', createdAt: '2026-11-13T00:00:00Z' }];
  const result = await openSupportTickets('refund', 10);
  expect(f.pipeline.collection).toHaveBeenCalledWith('server_support_tickets');
  expect(f.pipeline.sort).toHaveBeenCalledWith({ name: 'createdAt', direction: 'asc' });
  expect(f.pipeline.limit).toHaveBeenCalledWith(10);
  expect(f.pipeline.sort.mock.invocationCallOrder[0]).toBeLessThan(f.pipeline.limit.mock.invocationCallOrder[0]);
  expect(result).toHaveLength(1); expect(JSON.stringify(result)).not.toContain('private@example.com');
});
it('fails closed on malformed imports and rejects traversal IDs before document access', async () => {
  f.rows = [{ id: 'ticket_1', status: 'open' }];
  await expect(openSupportTickets('all', 20)).rejects.toThrow();
  await expect(supportTicket('../users')).rejects.toThrow();
  expect(f.document).not.toHaveBeenCalled();
});

it('queries pending and processing across all dates and offers a cursor when a page fills', async () => {
  f.rows = [{ id: 'a', orderId: 'new', status: 'paid', providerStatus: 'captured', testMode: true, createdAt: '2026-11-14T00:00:00Z', rechargeStatus: 'pending', amount: 299, operator: 'airtel_dth' },
    { id: 'b', orderId: 'old', status: 'paid', providerStatus: 'captured', testMode: false, createdAt: '2025-01-01T00:00:00Z', rechargeStatus: 'processing', amount: 299, operator: 'airtel_dth' }];
  const result = await overallPendingRecharges('end-of-today', 1);
  expect(f.pipeline.where.mock.calls.map((call: unknown[]) => call[0])).toEqual([
    { name: 'status', op: 'eq', value: 'paid' }, { name: 'providerStatus', op: 'eq', value: 'captured' },
    { name: 'createdAt', op: 'lte', value: 'end-of-today' },
  ]);
  expect(f.pipeline.collection).toHaveBeenCalledWith('server_payments');
  expect(f.pipeline.limit).toHaveBeenCalledWith(2);
  expect(result.nextCursor).toEqual({ time: '2026-11-14T00:00:00Z', id: 'a' });
  expect(result.rows[0].testMode).toBe(true);
});

it('uses the same pending-paid predicate and never shows completed or failed fulfillments', async () => {
  f.rows = [
    { id: 'pay_test', orderId: 'test_order', status: 'paid', rechargeStatus: 'pending', testMode: true },
    { id: 'pay_live', orderId: 'live_order', status: 'paid', rechargeStatus: 'processing', testMode: false },
    { id: 'pay_done', orderId: 'done', status: 'paid', rechargeStatus: 'completed' },
    { id: 'pay_failed', orderId: 'failed', status: 'paid', rechargeStatus: 'failed' },
  ];
  const result = await overallPendingRecharges('through-today', 100);
  expect(result.rows.map(row => row.orderId)).toEqual(['test_order', 'live_order']);
  expect(result.rows.map(row => row.testMode)).toEqual([true, false]);
  expect(result.rows[1].status).toBe('pending');
});
it('reads the configured local payment source too, matching Pending Orders during development', async () => {
  f.firestore = false;
  f.ledger.mockResolvedValue([{ id: 'pay_1', orderId: 'order_1', status: 'paid', providerStatus: 'captured', createdAt: '2026-11-13T00:00:00Z', testMode: true }]);
  const result = await overallPendingRecharges('2026-11-14T18:29:59.999Z', 100);
  expect(result.rows).toEqual([expect.objectContaining({ orderId: 'order_1', testMode: true })]);
  expect(f.pipeline.collection).not.toHaveBeenCalled();
});

it('counts all statuses separately from test orders instead of reporting pending as total', async () => {
  f.allOrders.mockResolvedValue([
    { rechargeStatus: 'pending', testMode: true, createdAt: '2026-11-13T00:00:00Z' },
    { rechargeStatus: 'completed', testMode: false, createdAt: '2026-11-12T00:00:00Z' },
    { rechargeStatus: 'failed', testMode: false, createdAt: '2026-11-11T00:00:00Z' },
  ]);
  expect(await adminRechargeTotals('2026-11-14T18:29:59.999Z')).toEqual({
    live: { total: 2, completed: 1, pending: 0, failed: 1, other: 0 },
    test: { total: 1, completed: 0, pending: 1, failed: 0, other: 0 },
  });
});

it('sums captured INR payments in paise, excludes failures/refunds, and keeps test money separate', async () => {
  const paid = { status: 'paid', providerStatus: 'captured', currency: 'INR', createdAt: '2026-11-13T00:00:00Z', amount: 1396, testMode: false };
  f.ledger.mockResolvedValue([paid, { ...paid, amount: 0.1 }, { ...paid, amount: 0.2 }, { ...paid, testMode: true, amount: 1546 },
    { ...paid, status: 'refunded' }, { ...paid, providerStatus: 'refunded' }, { ...paid, status: 'failed' }, { ...paid, providerStatus: 'authorized' },
    { ...paid, currency: 'USD' }, { ...paid, createdAt: '2026-11-15T00:00:00Z' }]);
  expect(await adminRevenueTotals('2026-11-14T18:29:59.999Z')).toEqual({ live: 1396.3, test: 1546, currency: 'INR' });
});
