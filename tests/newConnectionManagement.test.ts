import express from 'express';
import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, beforeEach, expect, it, vi } from 'vitest';
import { seedCatalog } from './fixtures/newConnectionCatalog';
import { newConnectionOrderSchema, withConnectionLedger, connectionTransitions, type NewConnectionOrder } from '../src/lib/newConnectionOrders';

const f = vi.hoisted(() => ({ records: new Map<string, any>(), tail: Promise.resolve(), send: vi.fn(), refund: vi.fn(), fetchRefund: vi.fn(), queryLimits: [] as number[], enabled: true }));
const snapshot = (path: string) => ({ exists: f.records.has(path), data: () => structuredClone(f.records.get(path)) });
const ref = (path: string): any => ({ path, get: async () => snapshot(path), set: async (v: any, o?: any) => { f.records.set(path, o?.merge ? { ...f.records.get(path), ...structuredClone(v) } : structuredClone(v)); }, update: async (v: any) => { if (!f.records.has(path)) throw new Error('Missing record'); f.records.set(path, { ...f.records.get(path), ...structuredClone(v) }); } });
const db = {
  doc: ref, collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }),
  runTransaction: (fn: any) => {
    const run = f.tail.then(async () => { const writes: (() => void)[] = []; let writing = false;
      const tx = { get: async (r: any) => { if (writing) throw new Error('Read after write'); return snapshot(r.path); }, set: (r: any, v: any, o?: any) => { writing = true; writes.push(() => { f.records.set(r.path, o?.merge ? { ...f.records.get(r.path), ...structuredClone(v) } : structuredClone(v)); }); }, create: (r: any, v: any) => { writing = true; if (f.records.has(r.path)) throw new Error('Already exists'); writes.push(() => f.records.set(r.path, structuredClone(v))); }, update: (r: any, v: any) => { writing = true; writes.push(() => f.records.set(r.path, { ...f.records.get(r.path), ...structuredClone(v) })); } };
      const result = await fn(tx); writes.forEach(w => w()); return result;
    }); f.tail = run.then(() => {}, () => {}); return run;
  },
  pipeline: () => { let collection = ''; let tests: any[] = []; let limit = Infinity; let sorts: any[] = [];
    const q: any = { collection: (name: string) => { collection = name; return q; }, where: (test: any) => { tests.push(test); return q; }, sort: (...values: any[]) => { sorts = values; return q; }, limit: (n: number) => { limit = n; f.queryLimits.push(n); return q; }, execute: async () => ({ results: [...f.records].filter(([key]) => key.startsWith(collection + '/')).map(([, v]) => structuredClone(v)).filter(v => tests.every(t => t(v))).sort((a, b) => { for (const sort of sorts) { const result = sort(b).localeCompare(sort(a)); if (result) return result; } return 0; }).slice(0, limit).map(v => ({ data: () => v })) }) }; return q;
  },
};
vi.mock('@google-cloud/firestore/pipelines', () => {
  const expression = (get: any): any => ({ equal: (v: any) => (r: any) => get(r) === v, notEqual: (v: any) => (r: any) => get(r) !== v, equalAny: (v: any[]) => (r: any) => v.includes(get(r)), greaterThan: (v: any) => (r: any) => get(r) > v, greaterThanOrEqual: (v: any) => (r: any) => get(r) >= v, lessThan: (v: any) => (r: any) => get(r) < v, toLower: () => expression((r: any) => String(get(r)).toLowerCase()), startsWith: (v: string) => (r: any) => String(get(r)).startsWith(v), descending: () => get });
  return { field: (key: string) => expression((r: any) => key.split('.').reduce((v: any, k) => v?.[k], r)), and: (...tests: any[]) => (r: any) => tests.every(t => t(r)), or: (...tests: any[]) => (r: any) => tests.some(t => t(r)), countAll: () => ({ as: () => null }) };
});
vi.mock('../server/middleware/auth', () => ({ getAdminFirestore: () => db, getSuperAdminEmail: () => 'admin@example.com', verifyAuthToken: async (req: any) => { const uid = req.headers.authorization?.slice(7); return uid && uid !== 'revoked-token' ? { uid, email: uid + '@example.com', emailVerified: true, signInProvider: 'google.com' } : null; }, isCallerAdminAuthorized: async (req: any) => ({ authorized: req.headers.authorization === 'Bearer approved-admin' }) }));
vi.mock('../server/middleware/rateLimiter', () => ({ orderCreateLimiter: (_q: any, _s: any, next: any) => next(), adminLimiter: (_q: any, _s: any, next: any) => next(), newConnectionStatusLimiter: (_q: any, _s: any, next: any) => next() }));
vi.mock('../server/emailDelivery', () => ({ sendBrevoMessage: (...args: any[]) => f.send(...args), emailDeliveryConfig: () => ({ enabled: true, configured: true, dailyLimit: 300, testEmails: true }) }));
vi.mock('../server/models/newConnectionCatalog', () => ({ readNewConnectionCatalog: async () => seedCatalog() }));
vi.mock('../server/queries', () => ({ queryRecords: async (collection: string, filters: any[] = [], page?: any) => [...f.records].filter(([key]) => key.startsWith(collection + '/')).map(([, v]) => structuredClone(v)).filter(v => filters.every(test => { const value = test.field.split('.').reduce((x: any, k: string) => x?.[k], v); return test.op === 'eq' ? value === test.value : test.op === 'in' ? test.value.includes(value) : true; })).slice(0, page?.limit || 100) }));
vi.mock('../server/newConnectionPaymentProviders', async original => { const actual = await original<typeof import('../server/newConnectionPaymentProviders')>(); return { ...actual, providerEnabled: () => f.enabled, paymentProvider: (id: string) => id === 'razorpay' ? { supportsRefund: true, createRefund: f.refund, getRefund: f.fetchRefund } : { supportsRefund: false } }; });
import { newConnectionOrdersRouter } from '../server/routes/newConnectionOrders';
import { recordConnectionCollection, changeConnectionStatus, requestConnectionCancellation, adminConnection, connectionCsv, listConnections } from '../server/models/newConnectionManagement';
import { refundConnection, reconcileConnectionRefund } from '../server/models/newConnectionRefunds';
import { connectionEmail, deliverConnectionNotifications, queueConnectionNotification } from '../server/models/newConnectionNotifications';
import { ownedBooking } from '../server/models/newConnectionOrders';

const id = 'nc_' + 'a'.repeat(48); const otherId = 'nc_' + 'b'.repeat(48);
function fixture(orderId = id, patch: Record<string, unknown> = {}) {
  const at = new Date().toISOString(); const value = newConnectionOrderSchema.parse({ id: orderId, uid: 'buyer', bookingId: 'DTH-NC-261116-0001', brandId: 'brand', packId: 'pack', offerId: 'offer', selectedValidityDays: 30, connectionCount: 1, snapshot: { brand: 'Test brand', pack: 'Test pack', offer: 'Test box' }, customer: { name: 'Customer', phone: '9876543210', email: 'customer@example.com', address: 'Example address 123', district: 'Chennai', pincode: '600001', preferredDate: '2026-11-18', preferredSlot: 'Morning' }, provider: 'none', providerOrderId: '', providerPaymentId: '', paymentStatus: 'pending', status: 'received', statusHistory: [{ status: 'received', at, by: 'buyer', note: 'PUBLIC MESSAGE' }], consent: { terms: true, contact: true, at }, createdAt: at, updatedAt: at, testMode: false, priceBreakdown: { hardware: 700, installation: 200, pack: 100, perConnectionTotal: 1000, total: 1000, currency: 'INR' }, advanceMode: 'none', amountDueNow: 0, balanceAtInstallation: 1000, ...patch });
  f.records.set(`newConnectionOrders/${orderId}`, withConnectionLedger(value)); f.records.set(`server_new_connection_private/${orderId}`, { adminNotes: 'PRIVATE BANK SECRET', notes: [{ at, by: 'approved-admin', text: 'PRIVATE INTERNAL SECRET' }] }); return withConnectionLedger(value);
}
const payment = (patch: Record<string, unknown> = {}) => ({ amount: 100, method: 'cash', reference: '', note: 'PUBLIC COLLECTION', privateNote: 'PRIVATE COLLECTION SECRET', idempotencyKey: randomUUID(), ...patch });
const refund = (order: NewConnectionOrder, patch: Record<string, unknown> = {}) => ({ amount: 50, paymentEntryId: order.ledger[0].id, method: 'upi', reference: randomUUID(), reason: 'PRIVATE REFUND SECRET', note: 'PUBLIC REFUND', idempotencyKey: randomUUID(), ...patch });
let server: Server, base: string;
beforeAll(async () => { const app = express(); app.use(express.json()); app.use(newConnectionOrdersRouter); server = await new Promise<Server>(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); }); const address = server.address(); if (!address || typeof address === 'string') throw new Error(); base = 'http://127.0.0.1:' + address.port; });
afterAll(async () => { await new Promise<void>(resolve => server.close(() => resolve())); });
beforeEach(() => { f.records.clear(); f.tail = Promise.resolve(); vi.clearAllMocks(); f.queryLimits.length = 0; f.enabled = true; f.send.mockResolvedValue('message1'); fixture(); });
async function call(path: string, uid?: string, body?: unknown) { return fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(uid ? { Authorization: 'Bearer ' + uid } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); }

it('rejects guest, customer, unapproved and revoked identities on EVERY new admin endpoint', async () => {
  const endpoints: [string, unknown?][] = [['', undefined], ['/options', undefined], ['/counters', undefined], ['/export', undefined], ['/' + id, undefined], ['/' + id + '/status', {}], ['/' + id + '/collections', {}], ['/' + id + '/refunds', {}], ['/' + id + '/retry-notification', {}]];
  for (const uid of [undefined, 'buyer', 'unapproved-admin', 'revoked-admin', 'revoked-token']) for (const [path, body] of endpoints) expect((await call('/api/admin/new-connection/orders' + path, uid, body)).status).toBe(403);
});
it('serves an approved admin private details and only owner public data to customers', async () => {
  expect((await call('/api/admin/new-connection/orders/' + id, 'approved-admin')).status).toBe(200);
  const customer = await call('/api/new-connection/orders/' + id, 'buyer'); expect(customer.status).toBe(200); expect(JSON.stringify(await customer.json())).not.toContain('PRIVATE');
  expect((await call('/api/new-connection/orders/' + id, 'other-owner')).status).toBe(404);
});
it('lists only owned orders, paginates before returning records, and filters names/phones/booking IDs server-side', async () => {
  fixture(otherId, { uid: 'other-owner', bookingId: 'DTH-NC-261116-0002' });
  expect((await call('/api/new-connection/orders')).status).toBe(401);
  const result = await (await call('/api/new-connection/orders', 'buyer')).json(); expect(result.orders.map((o: any) => o.id)).toEqual([id]); expect(JSON.stringify(result)).not.toContain('PRIVATE');
  const first = await listConnections({}, undefined, 1); expect(first.orders).toHaveLength(1); expect(first.nextCursor).toBeTruthy(); const second = await listConnections({ cursor: first.nextCursor }, undefined, 1); expect(second.orders[0].id).not.toBe(first.orders[0].id);
  expect((await listConnections({ search: 'cust' })).orders).toHaveLength(2); expect((await listConnections({ search: '98765' })).orders).toHaveLength(2); expect((await listConnections({ search: 'DTH-NC-261116-0001' })).orders).toHaveLength(1); expect(f.queryLimits).toContain(2);
  expect((await call('/api/new-connection/orders?status=received', 'buyer')).status).toBe(400);
});
it('validates transitions and confirmed scheduling while installed with balance remains allowed', async () => {
  await expect(changeConnectionStatus(id, 'approved-admin', { status: 'installed', idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  await changeConnectionStatus(id, 'approved-admin', { status: 'contacted', visibleNote: 'PUBLIC CONTACT', privateNote: 'PRIVATE CALL', idempotencyKey: randomUUID() });
  await expect(changeConnectionStatus(id, 'approved-admin', { status: 'scheduled', idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'SCHEDULE_REQUIRED' });
  const schedule = { status: 'scheduled', schedule: { date: '2026-11-20', slot: 'Morning' }, idempotencyKey: randomUUID() };
  await Promise.all([changeConnectionStatus(id, 'approved-admin', schedule), changeConnectionStatus(id, 'approved-admin', schedule)]);
  const installed = await changeConnectionStatus(id, 'approved-admin', { status: 'installed', idempotencyKey: randomUUID() }); expect(installed.balance).toBe(1000); expect(installed.installedAt).toBeTruthy(); expect(installed.statusHistory.filter(h => h.status === 'scheduled')).toHaveLength(1); expect(JSON.stringify(installed)).not.toContain('PRIVATE'); expect(installed.statusHistory.at(-1)?.by).toBe('approved-admin'); expect(connectionTransitions.installed).toEqual([]);
});
it('cancellation requests enforce ownership, pre-scheduled status, one open request and explicit admin response', async () => {
  const route = '/api/new-connection/orders/' + id + '/cancellation';
  expect((await call(route, undefined, { customerReason: 'No longer needed' })).status).toBe(401); expect((await call(route, 'other-owner', { customerReason: 'No longer needed' })).status).toBe(404);
  const requested = await requestConnectionCancellation('buyer', id, { customerReason: 'No longer needed' }); expect(requested.status).toBe('received'); expect(requested.cancellationRequest?.status).toBe('open');
  await expect(requestConnectionCancellation('buyer', id, { customerReason: 'Duplicate' })).rejects.toMatchObject({ code: 'CANCELLATION_ALREADY_REQUESTED' });
  await expect(changeConnectionStatus(id, 'approved-admin', { status: 'cancelled', cancellationResponse: 'accepted', idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'PRIVATE_REASON_REQUIRED' });
  const cancelled = await changeConnectionStatus(id, 'approved-admin', { status: 'cancelled', cancellationResponse: 'accepted', reason: 'PRIVATE CANCEL REASON', visibleNote: 'PUBLIC CANCEL', idempotencyKey: randomUUID() }); expect(cancelled.cancellationRequest?.status).toBe('accepted'); expect(cancelled.ledger).toEqual([]); expect(JSON.stringify(cancelled)).not.toContain('PRIVATE');
  await expect(requestConnectionCancellation('buyer', id, { customerReason: 'Again' })).rejects.toMatchObject({ code: 'CANCELLATION_UNAVAILABLE' });
});
it('serializes collections, enforces exact decimals and caps, and returns the same idempotent collection', async () => {
  const value = payment({ amount: 600 }); const result = await Promise.all([recordConnectionCollection(id, 'approved-admin', value), recordConnectionCollection(id, 'approved-admin', value)]); expect(result[1].ledger).toHaveLength(1); expect(result[1]).toMatchObject({ amountPaid: 600, balance: 400, paymentStatus: 'pending', provider: 'none', providerPaymentId: '' });
  await expect(recordConnectionCollection(id, 'approved-admin', { ...value, amount: 700 })).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
  const attempts = await Promise.allSettled([recordConnectionCollection(id, 'approved-admin', payment({ amount: 400 })), recordConnectionCollection(id, 'approved-admin', payment({ amount: 400 }))]); expect(attempts.filter(r => r.status === 'fulfilled')).toHaveLength(1); expect((await ownedBooking('buyer', id)).paymentStatus).toBe('paid');
  for (const amount of [-1, 0, 0.001, 1001]) await expect(recordConnectionCollection(id, 'approved-admin', payment({ amount }))).rejects.toBeTruthy();
});
it('claims UPI/bank references across bookings using the Part 3 namespace under concurrency', async () => {
  fixture(otherId); const attempts = await Promise.allSettled([recordConnectionCollection(id, 'approved-admin', payment({ method: 'upi', reference: '123456789012' })), recordConnectionCollection(otherId, 'approved-admin', payment({ method: 'bank_transfer', reference: ' 123456789012 ' }))]); expect(attempts.filter(r => r.status === 'fulfilled')).toHaveLength(1); expect(attempts.filter(r => r.status === 'rejected')).toHaveLength(1);
  fixture(otherId); f.records.set('server_new_connection_payment_refs/' + (await import('../server/models/newConnectionManagement')).connectionHash('youpi:999999999999'), { orderId: id }); await expect(recordConnectionCollection(otherId, 'approved-admin', payment({ method: 'upi', reference: '999999999999' }))).rejects.toMatchObject({ code: 'PAYMENT_REFERENCE_USED' });
});
it('does not allow collections to fake a gateway capture or bypass an outstanding checkout', async () => {
  fixture(id, { provider: 'youpi', amountDueNow: 100, advanceMode: 'partial' });
  await expect(recordConnectionCollection(id, 'approved-admin', payment())).rejects.toMatchObject({ code: 'VERIFY_GATEWAY_FIRST' });
  await expect(recordConnectionCollection(id, 'approved-admin', payment({ method: 'razorpay' }))).rejects.toBeTruthy();
});
it('backfills a legacy verified deposit once and derives a partial display without reopening gateway checkout', async () => {
  const order = fixture(id, { provider: 'youpi', providerPaymentId: '123456789012', paymentStatus: 'paid', amountDueNow: 200, advanceMode: 'partial' }); expect(order.ledger).toHaveLength(1); expect(order).toMatchObject({ amountPaid: 200, balance: 800, paymentStatus: 'pending' }); expect(withConnectionLedger(order).ledger).toHaveLength(1);
  expect((await recordConnectionCollection(id, 'approved-admin', payment({ amount: 800 }))).paymentStatus).toBe('paid');
});
it('manual refunds require a payment/private reason/reference, preserve provider, and enforce concurrent source and net caps', async () => {
  await expect(refundConnection(id, 'approved-admin', { amount: 1, paymentEntryId: 'missing', method: 'upi', reference: '123', reason: 'PRIVATE', idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'PAYMENT_REQUIRED' });
  const collected = await recordConnectionCollection(id, 'approved-admin', payment({ amount: 1000 })); const value = refund(collected, { amount: 600 });
  await expect(refundConnection(id, 'approved-admin', { ...value, reason: '' })).rejects.toBeTruthy(); await expect(refundConnection(id, 'approved-admin', { ...value, reference: '' })).rejects.toMatchObject({ code: 'REFERENCE_REQUIRED' });
  const results = await Promise.allSettled([refundConnection(id, 'approved-admin', value), refundConnection(id, 'approved-admin', refund(collected, { amount: 600 }))]); expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  const repeated = await refundConnection(id, 'approved-admin', value); expect(repeated).toMatchObject({ provider: 'none', amountPaid: 400, amountRefunded: 600, paymentStatus: 'partially_refunded' });
  const fully = await refundConnection(id, 'approved-admin', refund(collected, { amount: 400 })); expect(fully).toMatchObject({ amountPaid: 0, amountRefunded: 1000, paymentStatus: 'refunded', status: 'refunded' }); expect(f.refund).not.toHaveBeenCalled();
});
it('reserves gateway refund caps, verifies provider truth, deduplicates webhooks and keeps private reasons out of gateway data', async () => {
  const order = fixture(id, { provider: 'razorpay', providerOrderId: 'order_test', providerPaymentId: 'pay_test', paymentStatus: 'paid', amountDueNow: 1000, advanceMode: 'full' });
  let gateway: any;
  f.refund.mockImplementation(async (_order, paymentId, amount, operationId) => { gateway = { id: 'rfnd_test', payment_id: paymentId, amount: amount * 100, currency: 'INR', status: 'pending', notes: { purpose: 'new_connection', newConnectionOrderId: id, operationId } }; return gateway; }); f.fetchRefund.mockImplementation(async () => gateway);
  const value = refund(order, { method: 'razorpay', amount: 600, reference: '' }); const pending = await refundConnection(id, 'approved-admin', value); expect(pending.status).toBe('refund_initiated'); expect(pending.amountRefunded).toBe(0); expect(f.refund.mock.calls[0]).not.toContain('PRIVATE REFUND SECRET');
  await expect(refundConnection(id, 'approved-admin', refund(order, { method: 'razorpay', amount: 600 }))).rejects.toMatchObject({ code: 'REFUND_EXCEEDS_PAID' });
  gateway.amount = 60100; await expect(reconcileConnectionRefund('rfnd_test')).rejects.toMatchObject({ code: 'REFUND_MISMATCH' }); gateway.amount = 60000;
  gateway.status = 'processed'; await Promise.all([reconcileConnectionRefund('rfnd_test'), reconcileConnectionRefund('rfnd_test')]); const paid = await ownedBooking('buyer', id); expect(paid.ledger.filter(e => e.type === 'refund')).toHaveLength(1); expect(paid.amountRefunded).toBe(600); expect(paid.status).toBe('received');
  gateway.status = 'failed'; await reconcileConnectionRefund('rfnd_test'); expect((await ownedBooking('buyer', id)).amountRefunded).toBe(600);
});
it('notification failures retry once and never fail collections; manual retry clears flags without leaking private data', async () => {
  f.send.mockRejectedValue(new Error('transport unavailable')); const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const order = await recordConnectionCollection(id, 'approved-admin', payment()); expect(order.amountPaid).toBe(100); expect(f.send).toHaveBeenCalledTimes(4); const failed = await ownedBooking('buyer', id); expect(failed.notificationFailed).toBe(true); expect(failed.failedNotificationEvents).toEqual(['payment_recorded']);
  f.send.mockResolvedValue('delivered'); await deliverConnectionNotifications(id, true); expect((await ownedBooking('buyer', id)).notificationFailed).toBe(false);
  for (const args of f.send.mock.calls) expect(JSON.stringify(args)).not.toContain('PRIVATE'); warning.mockRestore();
});
it('exports only public selected fields with formula protection, and emails only explicit public projections', async () => {
  const order = fixture(id, { customer: { ...fixture().customer, name: ' =HYPERLINK("evil")' } }); const admin = await adminConnection(id); expect(JSON.stringify(admin.privateNotes)).toContain('PRIVATE');
  const csv = connectionCsv([order]); expect(csv).not.toContain('PRIVATE'); expect(csv).toContain("'=HYPERLINK"); const email = connectionEmail(order, 'contacted'); expect(JSON.stringify(email)).not.toContain('PRIVATE'); expect(email.text).toContain('PUBLIC MESSAGE'); expect(email.text).not.toContain('providerRaw');
});

it('rejects disabled gateway refund initiation before reserving money or changing booking status', async () => {
  const order = fixture(id, { provider: 'razorpay', providerOrderId: 'order_test', providerPaymentId: 'pay_test', paymentStatus: 'paid', amountDueNow: 1000, advanceMode: 'full' });
  f.enabled = false; await expect(refundConnection(id, 'approved-admin', refund(order, { method: 'razorpay' }))).rejects.toMatchObject({ code: 'PROVIDER_DISABLED' });
  expect((await ownedBooking('buyer', id)).pendingRefunds).toEqual([]); expect((await ownedBooking('buyer', id)).status).toBe('received'); expect(f.refund).not.toHaveBeenCalled();
});
it('allows private-only notes after installation without adding internal text to the public timeline', async () => {
  const original = fixture(id, { status: 'installed' }); const updated = await changeConnectionStatus(id, 'approved-admin', { status: 'installed', privateNote: 'PRIVATE AFTER INSTALL', idempotencyKey: randomUUID() });
  expect(updated.statusHistory).toEqual(original.statusHistory); expect(JSON.stringify(updated)).not.toContain('PRIVATE'); expect(JSON.stringify((await adminConnection(id)).privateNotes)).toContain('PRIVATE AFTER INSTALL');
});

it('retains the original booking status across multiple pending refunds and releases failed reservations', async () => {
  const order = fixture(id, { provider: 'razorpay', providerOrderId: 'order_test', providerPaymentId: 'pay_test', paymentStatus: 'paid', amountDueNow: 1000, advanceMode: 'full' });
  const gateways = new Map<string, any>(); let counter = 0;
  f.refund.mockImplementation(async (_order, paymentId, amount, operationId) => { const record = { id: 'rfnd_' + (++counter), payment_id: paymentId, amount: amount * 100, currency: 'INR', status: 'pending', notes: { purpose: 'new_connection', newConnectionOrderId: id, operationId } }; gateways.set(record.id, record); return record; });
  f.fetchRefund.mockImplementation(async (key: string) => gateways.get(key));
  const first = refund(order, { amount: 300, method: 'razorpay' }); const second = refund(order, { amount: 200, method: 'razorpay' });
  await refundConnection(id, 'approved-admin', first); await refundConnection(id, 'approved-admin', second);
  gateways.get('rfnd_1').status = 'failed'; await reconcileConnectionRefund('rfnd_1'); expect((await ownedBooking('buyer', id)).status).toBe('refund_initiated');
  gateways.get('rfnd_2').status = 'processed'; await reconcileConnectionRefund('rfnd_2'); expect((await ownedBooking('buyer', id))).toMatchObject({ status: 'received', amountRefunded: 200, amountPaid: 800 });
  await refundConnection(id, 'approved-admin', first); expect(f.refund).toHaveBeenCalledTimes(2);
});
it('retains an ambiguous refund reservation and safely retries with exactly the same provider operation key', async () => {
  const order = fixture(id, { provider: 'razorpay', providerOrderId: 'order_test', providerPaymentId: 'pay_test', paymentStatus: 'paid', amountDueNow: 1000, advanceMode: 'full' });
  const value = refund(order, { amount: 1000, method: 'razorpay' }); f.refund.mockRejectedValueOnce(new Error('Response lost'));
  await expect(refundConnection(id, 'approved-admin', value)).rejects.toMatchObject({ code: 'REFUND_VERIFICATION_PENDING' }); expect((await ownedBooking('buyer', id)).amountRefunded).toBe(0);
  const operationId = f.refund.mock.calls[0][3]; const truth = { id: 'rfnd_recovered', payment_id: 'pay_test', amount: 100000, currency: 'INR', status: 'processed', notes: { purpose: 'new_connection', newConnectionOrderId: id, operationId } };
  f.refund.mockResolvedValue(truth); f.fetchRefund.mockResolvedValue(truth);
  const result = await refundConnection(id, 'approved-admin', value); expect(result.paymentStatus).toBe('refunded'); expect(f.refund.mock.calls[1][3]).toBe(operationId); expect(result.ledger.filter(e => e.type === 'refund')).toHaveLength(1);
});

it('excludes cancelled bookings from payment review while retaining their payment records', async () => {
  fixture(id, { provider: 'razorpay', amountDueNow: 100, paymentStatus: 'pending', status: 'received' });
  fixture(otherId, { provider: 'razorpay', amountDueNow: 100, paymentStatus: 'pending', status: 'cancelled' });
  expect((await listConnections({ awaiting: 'true' })).orders.map(order => order.id)).toEqual([id]);
  expect((await listConnections({})).orders).toHaveLength(2);
  expect(f.records.get(`newConnectionOrders/${otherId}`).paymentStatus).toBe('pending');
});

it('saves provider references for the owner without changing payment or booking status', async () => {
  const before = fixture();
  const input = { status: 'booked', providerCustomerId: '  CUST-001  ', providerBookingId: ' PROV-123 ', idempotencyKey: randomUUID() };
  const saved = await changeConnectionStatus(id, 'approved-admin', input);
  expect(saved).toMatchObject({ providerCustomerId: 'CUST-001', providerBookingId: 'PROV-123', status: 'booked', paymentStatus: before.paymentStatus, bookingId: before.bookingId });
  expect(await changeConnectionStatus(id, 'approved-admin', input)).toEqual(saved);
  await expect(changeConnectionStatus(id, 'approved-admin', { ...input, providerBookingId: 'OTHER' })).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
  expect(await ownedBooking('buyer', id)).toMatchObject({ providerCustomerId: 'CUST-001', providerBookingId: 'PROV-123' });
  await expect(ownedBooking('other-owner', id)).rejects.toMatchObject({ code: 'BOOKING_NOT_FOUND' });
  await expect(changeConnectionStatus(id, 'approved-admin', { ...input, providerCustomerId: '   ', idempotencyKey: randomUUID() })).rejects.toThrow();
});

it('requires both provider IDs when marking a booking as booked and preserves the installation flow', async () => {
  await expect(changeConnectionStatus(id, 'approved-admin', { status: 'booked', idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'PROVIDER_CUSTOMER_ID_REQUIRED' });
  await expect(changeConnectionStatus(id, 'approved-admin', { status: 'booked', providerCustomerId: 'CUST-1', idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: 'PROVIDER_BOOKING_ID_REQUIRED' });
  await changeConnectionStatus(id, 'approved-admin', { status: 'booked', providerCustomerId: 'CUST-1', providerBookingId: 'BOOK-1', idempotencyKey: randomUUID() });
  const scheduled = await changeConnectionStatus(id, 'approved-admin', { status: 'scheduled', schedule: { date: '2026-11-26', slot: 'Morning' }, idempotencyKey: randomUUID() });
  expect(scheduled).toMatchObject({ providerCustomerId: 'CUST-1', providerBookingId: 'BOOK-1', status: 'scheduled' });
});
