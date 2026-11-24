import express from 'express';
import type { Server } from 'node:http';
import { createHmac, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { seedCatalog } from './fixtures/newConnectionCatalog';
import { advanceQuote, calculateNewConnectionPrice, installationDateBounds, type BookingInput, type NewConnectionOrder } from '../src/lib/newConnectionOrders';
import { compatibleEquipment, visibleCatalog } from '../src/lib/newConnectionBrowse';

const f = vi.hoisted(() => ({ records: new Map<string, any>(), tail: Promise.resolve(), catalog: null as any, catalogRead: vi.fn(), create: vi.fn(), getStatus: vi.fn(), verify: vi.fn(), enabled: true }));
const snapshot = (path: string) => ({ exists: f.records.has(path), data: () => structuredClone(f.records.get(path)) });
const ref = (path: string) => ({ path, get: async () => snapshot(path), set: async (value: unknown, options?: any) => { f.records.set(path, options?.merge ? { ...f.records.get(path), ...(value as any) } : value); } });
const db = {
  doc: ref, collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }),
  runTransaction: (action: any) => {
    const run = f.tail.then(async () => {
      const writes: (() => void)[] = [];
      const tx = { get: async (r: any) => snapshot(r.path), create: (r: any, v: any) => writes.push(() => { if (f.records.has(r.path)) throw new Error('Already exists'); f.records.set(r.path, structuredClone(v)); }), set: (r: any, v: any, o?: any) => writes.push(() => f.records.set(r.path, o?.merge ? { ...f.records.get(r.path), ...structuredClone(v) } : structuredClone(v))), update: (r: any, v: any) => writes.push(() => f.records.set(r.path, { ...f.records.get(r.path), ...structuredClone(v) })) };
      const value = await action(tx); writes.forEach(write => write()); return value;
    }); f.tail = run.then(() => {}, () => {}); return run;
  },
};
vi.mock('../server/middleware/auth', () => ({
  getAdminFirestore: () => db,
  getSuperAdminEmail: () => 'root@example.com',
  verifyAuthToken: async (req: any) => { const token = req.headers.authorization?.replace('Bearer ', ''); return token ? { uid: token, email: `${token}@example.com`, emailVerified: true, signInProvider: token === 'password-user' ? 'password' : 'google.com' } : null; },
  isCallerAdminAuthorized: async (req: any) => ({ authorized: req.headers.authorization === 'Bearer approved-admin' }),
}));
vi.mock('../server/middleware/rateLimiter', () => ({ newConnectionStatusLimiter: (_req: any, _res: any, next: any) => next(), orderCreateLimiter: (_req: any, _res: any, next: any) => next(), adminLimiter: (_req: any, _res: any, next: any) => next() }));
vi.mock('../server/models/newConnectionCatalog', () => ({ readNewConnectionCatalog: async () => { await f.catalogRead(); return structuredClone(f.catalog); }, catalogIdentity: (kind: string, data: any) => `${kind}-${data.slug || `${data.brandId || ''}-${data.name}`}`.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120) }));
vi.mock('../server/queries', () => ({ queryRecords: async (_name: string, filters: any[], page?: any) => [...f.records].filter(([key]) => key.startsWith('newConnectionOrders/')).map(([, value]) => structuredClone(value)).filter(value => filters.every(filter => { const v = filter.field.split('.').reduce((a: any, key: string) => a?.[key], value); return filter.op === 'eq' ? v === filter.value : filter.op === 'gt' ? v > filter.value : filter.op === 'in' ? filter.value.includes(v) : true; })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, page?.limit ?? 10000) }));
vi.mock('../server/newConnectionPaymentProviders', async original => {
  const actual = await original<typeof import('../server/newConnectionPaymentProviders')>();
  return { ...actual, providerEnabled: () => f.enabled, paymentProvider: (id: string) => id === 'none' ? new actual.NoPaymentProvider() : { createCheckout: f.create, getStatus: f.getStatus, verifyConfirmation: f.verify, handleWebhook: (raw: Buffer, headers: any) => new actual.YoupiProvider().handleWebhook(raw, headers) } };
});
import { newConnectionOrdersRouter } from '../server/routes/newConnectionOrders';
import { bookingStatus, createBooking, handleNewConnectionRazorpayEvent, handleNewConnectionYoupiCallback, startBookingCheckout } from '../server/models/newConnectionOrders';
let server: Server; let base: string;
const now = Date.parse('2026-11-16T10:00:00Z');
beforeAll(async () => { const app = express(); app.use(express.json()); app.use(newConnectionOrdersRouter); server = await new Promise<Server>(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); }); const address = server.address(); if (!address || typeof address === 'string') throw new Error(); base = `http://127.0.0.1:${address.port}`; });
afterAll(async () => { await new Promise<void>(resolve => server.close(() => resolve())); vi.unstubAllEnvs(); });
beforeEach(() => {
  vi.stubEnv('RECHARGE_ENABLED', 'false');
  f.records.clear(); f.tail = Promise.resolve(); vi.clearAllMocks(); f.catalog = seedCatalog(); f.enabled = true;
  f.create.mockImplementation(async (order: NewConnectionOrder) => ({ provider: order.provider, providerOrderId: order.provider === 'youpi' ? 'session-1' : 'order_r1', keyId: 'rzp_test_fixture', amount: Math.round(order.amountDueNow * 100), currency: 'INR', testMode: order.provider === 'razorpay' }));
  f.getStatus.mockResolvedValue({ state: 'pending', raw: {} }); f.verify.mockResolvedValue({ state: 'paid', paymentId: 'pay_r1', raw: { status: 'captured' } }); vi.stubEnv('YOUPI_WEBHOOK_SECRET', 'secret');
});
function input(provider: 'none' | 'razorpay' | 'youpi' = 'none', packIndex = 0): BookingInput {
  const item = visibleCatalog(f.catalog)[packIndex]; const offer = compatibleEquipment(item, f.catalog.equipment)[0];
  if (provider !== 'none') f.catalog.settings = { ...f.catalog.settings, enabledProviders: ['razorpay', 'youpi'], defaultProvider: provider, advanceMode: 'full' };
  return { brandId: item.brand.id, packId: item.pack.id, offerId: offer.id, selectedValidityDays: 30, connectionCount: 1, customer: { name: 'Sample Customer', phone: '9876543210', altPhone: '', email: '', address: '12 Sample Road, Chennai', landmark: '', pincode: '600001', district: 'Chennai', preferredDate: installationDateBounds().min, preferredSlot: 'Any', notes: '' }, provider, consent: { terms: true, contact: true }, displayedQuote: advanceQuote(calculateNewConnectionPrice(item.pack.pricingOptions[0].price, offer, 1), f.catalog.settings), idempotencyKey: randomUUID(), honeypot: '', formStartedAt: Date.now() - 10000 };
}
async function call(path: string, token?: string, body?: unknown) { return fetch(`${base}${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) }); }
it('saves the server-selected box type in the order and rejects a stale box selection', async () => {
  f.catalog.packs[0].packageType = 'full_set';
  f.catalog.packs[0].boxType = 'Android';
  await expect(createBooking('buyer', { ...input(), boxType: 'HD' })).rejects.toMatchObject({ code: 'SELECTION_UNAVAILABLE' });
  const result = await createBooking('buyer', { ...input(), boxType: 'Android' });
  expect(result.order.snapshot.boxType).toBe('Android');
  f.catalog.packs[0].boxType = 'HD';
  expect(f.records.get(`newConnectionOrders/${result.order.id}`).snapshot.boxType).toBe('Android');
});
it('resolves the submitted pack from the server catalog and rejects foreign validities and mismatched IDs', async () => {
  const selected = input();
  await expect(createBooking('buyer', { ...selected, selectedValidityDays: 31 })).rejects.toMatchObject({ code: 'SELECTION_UNAVAILABLE' });
  await expect(createBooking('buyer', { ...selected, packId: 'missing-pack' })).rejects.toMatchObject({ code: 'SELECTION_UNAVAILABLE' });
  await expect(createBooking('buyer', { ...selected, brandId: 'different-brand' })).rejects.toMatchObject({ code: 'SELECTION_UNAVAILABLE' });
  // A saved/URL ID cannot keep a removed validity alive on the server.
  f.catalog.packs.find((pack: any) => pack.id === selected.packId).pricingOptions = [{ validityDays: 90, price: 1000 }];
  await expect(createBooking('buyer', selected)).rejects.toMatchObject({ code: 'SELECTION_UNAVAILABLE' });
  expect([...f.records.keys()].filter(key => key.startsWith('newConnectionOrders/'))).toHaveLength(0);
  expect(f.create).not.toHaveBeenCalled();
});
it.each([360, 365])('records the catalog calendar term for option %i and rejects stale selections', async (days) => {
  f.catalog.packs[0].packageType = 'full_set';
  f.catalog.packs[0].pricingOptions = [{ validityDays: days, validityMonths: 12, price: 3100 }];
  const request = { ...input(), selectedValidityDays: days };
  await expect(createBooking('buyer', request)).rejects.toMatchObject({ code: 'SELECTION_UNAVAILABLE' });
  await expect(createBooking('buyer', { ...request, selectedValidityMonths: 11 })).rejects.toMatchObject({ code: 'SELECTION_UNAVAILABLE' });
  const { order } = await createBooking('buyer', { ...request, selectedValidityMonths: 12 });
  expect(order.selectedValidityDays).toBe(days);
  expect(order.selectedValidityMonths).toBe(12);
  expect(f.records.get(`newConnectionOrders/${order.id}`).selectedValidityMonths).toBe(12);
});
it('runs none-mode end-to-end through HTTP, persistence and owner-only status with no gateway call', async () => {
  const config = await (await call('/api/new-connection/config')).json(); expect(config.settings.advanceMode).toBe('none'); expect(config.enabledProviders).toEqual([]);
  const created = await call('/api/new-connection/orders', 'buyer', input()); expect(created.status).toBe(200); const result = await created.json();
  expect(result.checkout).toBeNull(); expect(result.order).toMatchObject({ provider: 'none', paymentStatus: 'pending', status: 'received', amountDueNow: 0 }); expect(result.order.bookingId).toMatch(/^DTH-NC-\d{6}-0001$/);
  expect(f.create).not.toHaveBeenCalled(); expect(f.getStatus).not.toHaveBeenCalled();
  expect((await call(`/api/new-connection/orders/${result.order.id}`, 'buyer')).status).toBe(200);
  expect((await call(`/api/new-connection/orders/${result.order.id}`, 'other-user')).status).toBe(404);
  expect((await call(`/api/new-connection/orders/${result.order.id}`)).status).toBe(401);
  expect((await call(`/api/new-connection/orders/${result.order.bookingId}`, 'buyer')).status).toBe(404);
  expect((await call('/api/new-connection/orders', undefined, input())).status).toBe(401);
  expect((await call('/api/new-connection/orders', 'password-user', input())).status).toBe(403);
});
it('rejects stale displayed prices before reserving a booking for every provider', async () => {
  for (const provider of ['none', 'razorpay', 'youpi'] as const) {
    const payload = input(provider); payload.displayedQuote.priceBreakdown.pack += 1;
    const response = await call('/api/new-connection/orders', 'buyer', payload); expect(response.status).toBe(409); expect((await response.json()).code).toBe('PRICE_CHANGED');
  }
  expect([...f.records.keys()].some(k => k.startsWith('newConnectionOrders/'))).toBe(false); expect(f.create).not.toHaveBeenCalled();
});
it('rejects inactive selections, uncovered areas, fast forms, honeypots and invalid consent', async () => {
  const payload = input(); const pack = f.catalog.packs.find((p: any) => p.id === payload.packId); pack.active = false;
  expect((await call('/api/new-connection/orders', 'buyer', payload)).status).toBe(409); pack.active = true;
  f.catalog.settings.serviceablePincodes = ['600002']; expect((await call('/api/new-connection/orders', 'buyer', payload)).status).toBe(400); f.catalog.settings.serviceablePincodes = [];
  for (const patch of [{ formStartedAt: Date.now() }, { honeypot: 'bot' }, { consent: { terms: false, contact: true } }, { connectionCount: 4 }]) expect((await call('/api/new-connection/orders', 'buyer', { ...payload, ...patch })).status).toBe(400);
});
it('serializes simultaneous requests and creates only one booking/provider checkout', async () => {
  const payload = input('razorpay'); const results = await Promise.all([createBooking('buyer', payload), createBooking('buyer', payload)]); expect(results[0].order.id).toBe(results[1].order.id);
  await Promise.all(results.map(r => startBookingCheckout('buyer', r.order.id))); expect(f.create).toHaveBeenCalledTimes(1);
  expect([...f.records.keys()].filter(k => k.startsWith('newConnectionOrders/'))).toHaveLength(1);
  await expect(createBooking('buyer', { ...payload, customer: { ...payload.customer, name: 'Changed request' } })).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
});
it('returns same-owner duplicates for review, rejects cross-owner duplicates and enforces three unpaid limits', async () => {
  const a = await createBooking('buyer', input()); const duplicate = await createBooking('buyer', input()); expect(duplicate).toMatchObject({ duplicate: true, order: { id: a.order.id } });
  await expect(createBooking('other', input())).rejects.toMatchObject({ code: 'DUPLICATE_BOOKING' });
  await createBooking('buyer', input('none', 1)); await createBooking('buyer', input('none', 2)); await expect(createBooking('buyer', input('none', 3))).rejects.toMatchObject({ code: 'BOOKING_LIMIT', status: 429 });
});
it('preserves an ambiguous gateway creation claim and expires unpaid checkouts after 24 hours', async () => {
  const { order } = await createBooking('buyer', input('razorpay')); f.create.mockRejectedValueOnce(new Error('ambiguous timeout'));
  await expect(startBookingCheckout('buyer', order.id)).rejects.toThrow('ambiguous'); expect((await startBookingCheckout('buyer', order.id)).pending).toBe(true); expect(f.create).toHaveBeenCalledTimes(1);
  await expect(startBookingCheckout('buyer', order.id, Date.parse(order.createdAt) + 24 * 3600000)).rejects.toMatchObject({ code: 'CHECKOUT_EXPIRED' });
});
it('recovers Razorpay capture by webhook without browser completion and handles duplicates idempotently', async () => {
  const result = await createBooking('buyer', input('razorpay')); await startBookingCheckout('buyer', result.order.id);
  const event = { event: 'payment.captured', payload: { payment: { entity: { id: 'pay_r1', order_id: 'order_r1' } } } };
  await expect(handleNewConnectionRazorpayEvent(event)).rejects.toMatchObject({ status: 503 }); // API capture visibility may lag; do not consume the event yet.
  f.getStatus.mockResolvedValue({ state: 'paid', paymentId: 'pay_r1', raw: { status: 'captured' } });
  expect(await handleNewConnectionRazorpayEvent(event)).toBe(true); expect(await handleNewConnectionRazorpayEvent(event)).toBe(true);
  const order = (await bookingStatus('buyer', result.order.id)).order; expect(order.paymentStatus).toBe('paid'); expect(order.statusHistory.filter(h => h.status === 'paid')).toHaveLength(1);
});
it('records a captured payment with 100 history entries and deduplicates webhook redelivery', async () => {
  const { order } = await createBooking('buyer', input('razorpay'));
  await startBookingCheckout('buyer', order.id);
  const stored = f.records.get(`newConnectionOrders/${order.id}`);
  stored.statusHistory = Array.from({ length: 100 }, (_, index) => ({ status: 'note_added', at: order.createdAt, by: 'admin', note: `note ${index}` }));
  f.getStatus.mockResolvedValue({ state: 'paid', paymentId: 'pay_r1', raw: { status: 'captured' } });
  const event = { event: 'payment.captured', payload: { payment: { entity: { id: 'pay_r1', order_id: 'order_r1' } } } };
  expect(await handleNewConnectionRazorpayEvent(event)).toBe(true);
  expect(await handleNewConnectionRazorpayEvent(event)).toBe(true);
  const current = (await bookingStatus('buyer', order.id)).order;
  expect(current.paymentStatus).toBe('paid'); expect(current.amountPaid).toBe(order.amountDueNow);
  expect(current.ledger.filter(entry => entry.type === 'payment')).toHaveLength(1);
  expect(current.statusHistory).toHaveLength(100);
  expect(current.statusHistory[0].note).toBe('note 1'); expect(current.statusHistory.at(-1)?.status).toBe('paid');
});
it.each([false, true])('blocks cancellation before the checkout claim with cached checkout %s', async cached => {
  const { order } = await createBooking('buyer', input('razorpay'));
  if (cached) await startBookingCheckout('buyer', order.id);
  f.create.mockClear();
  f.catalogRead.mockImplementationOnce(() => { f.records.get(`newConnectionOrders/${order.id}`).status = 'cancelled'; });
  await expect(startBookingCheckout('buyer', order.id)).rejects.toMatchObject({ code: 'CHECKOUT_EXPIRED' });
  expect(f.create).not.toHaveBeenCalled();
});
it('keeps the provider reference for reconciliation but withholds checkout cancelled during creation', async () => {
  const { order } = await createBooking('buyer', input('razorpay'));
  f.create.mockImplementationOnce(async () => {
    f.records.get(`newConnectionOrders/${order.id}`).status = 'cancelled';
    return { provider: 'razorpay', providerOrderId: 'order_cancelled', amount: 10000, currency: 'INR', testMode: true };
  });
  await expect(startBookingCheckout('buyer', order.id)).rejects.toMatchObject({ code: 'CHECKOUT_EXPIRED' });
  expect(f.records.get(`newConnectionOrders/${order.id}`)).toMatchObject({ status: 'cancelled', providerOrderId: 'order_cancelled' });
});
it('holds duplicate/delayed YouPI observations for admins and rejects forged or wrong-amount callbacks', async () => {
  const result = await createBooking('buyer', input('youpi')); const { order } = await startBookingCheckout('buyer', result.order.id);
  const event = { event: 'OBSERVED_SUCCESS', deliveryId: 'delivery-1', timestamp: Date.now() - 86400000, paymentId: 'session-1', orderId: order.id, method: 'UPI', currency: 'INR', amountPaise: Math.round(order.amountDueNow * 100) };
  const deliver = async (value: any, forged = false) => { const raw = Buffer.from(JSON.stringify(value)); return handleNewConnectionYoupiCallback(raw, { 'x-gateway-signature': forged ? 'sha256=' + '0'.repeat(64) : `sha256=${createHmac('sha256', 'secret').update(raw).digest('hex')}`, 'x-gateway-delivery-id': value.deliveryId }); };
  f.getStatus.mockResolvedValue({ state: 'awaiting_admin_confirmation', raw: { status: 'OBSERVED_SUCCESS' } });
  await expect(deliver(event, true)).rejects.toThrow(); await expect(deliver({ ...event, amountPaise: 1 })).rejects.toThrow();
  await deliver(event); await deliver(event); const updated = (await bookingStatus('buyer', order.id)).order;
  expect(updated.paymentStatus).toBe('awaiting_admin_confirmation'); expect(updated.statusHistory.filter(h => h.status === 'awaiting_admin_confirmation')).toHaveLength(1);
  expect((await call(`/api/admin/new-connection/payments/${order.id}/confirm`, 'buyer', { utr: '123456789012', amount: order.amountDueNow, bankChecked: true, note: 'Bank checked' })).status).toBe(403);
  expect((await call(`/api/admin/new-connection/payments/${order.id}/confirm`, 'approved-admin', { utr: '123456789012', amount: 1, bankChecked: true, note: 'Bank checked' })).status).toBe(409);
  const confirmed = await call(`/api/admin/new-connection/payments/${order.id}/confirm`, 'approved-admin', { utr: '123456789012', amount: order.amountDueNow, bankChecked: true, note: 'Independently checked bank entry' }); expect(confirmed.status).toBe(200);
  expect((await confirmed.json()).order).toMatchObject({ paymentStatus: 'paid', adminNotes: '' }); expect(f.records.get(`server_new_connection_private/${order.id}`).adminNotes).toContain('Independently');
  f.getStatus.mockResolvedValue({ state: 'pending', raw: { status: 'EXPIRED' } }); await deliver({ ...event, deliveryId: 'delivery-late' }); expect((await bookingStatus('buyer', order.id)).order.paymentStatus).toBe('paid');
});
it('keeps YouPI timeout orders pending in the admin queue and never permits a new payment on an expired session', async () => {
  const result = await createBooking('buyer', input('youpi')); await startBookingCheckout('buyer', result.order.id);
  f.getStatus.mockResolvedValue({ state: 'pending', raw: { status: 'EXPIRED' } }); const retry = await startBookingCheckout('buyer', result.order.id); expect(retry.checkout).toBeNull(); expect(retry.order.paymentStatus).toBe('pending');
  const queue = await (await call('/api/admin/new-connection/payments', 'approved-admin')).json(); expect(queue.orders.some((o: any) => o.id === result.order.id)).toBe(true);
});
it('keeps partial balances authoritative and prevents a UPI reference being used for two orders', async () => {
  const payload = input('razorpay'); f.catalog.settings.advanceMode = 'partial'; f.catalog.settings.partialAmount = 500; payload.displayedQuote = advanceQuote(payload.displayedQuote.priceBreakdown, f.catalog.settings);
  const partial = await createBooking('buyer', payload); expect(partial.order.amountDueNow).toBe(500); expect(partial.order.balanceAtInstallation).toBe(partial.order.priceBreakdown.total - 500);
  const first = await createBooking('buyer', input('youpi', 1)); const second = await createBooking('buyer', input('youpi', 2));
  const confirm = (order: NewConnectionOrder) => call(`/api/admin/new-connection/payments/${order.id}/confirm`, 'approved-admin', { utr: '123456789012', amount: order.amountDueNow, bankChecked: true, note: 'Verified independently in bank' });
  expect((await confirm(first.order)).status).toBe(200); const duplicate = await confirm(second.order); expect(duplicate.status).toBe(409); expect((await duplicate.json()).code).toBe('PAYMENT_REFERENCE_USED');
  expect((await bookingStatus('buyer', second.order.id)).order.paymentStatus).toBe('pending');
});
