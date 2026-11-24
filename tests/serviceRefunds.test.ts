import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ records: new Map<string, any>(), list: vi.fn(), refund: vi.fn(), fetch: vi.fn(), query: vi.fn(), chain: Promise.resolve() as Promise<unknown> }));
vi.mock('../server/models/servicePayments', () => ({ servicePaymentConfig: () => ({ payments: { fetchMultipleRefund: f.list }, refunds: { fetch: f.refund } }) }));
vi.mock('../server/queries', () => ({ queryRecords: f.query }));
vi.mock('../server/middleware/auth', () => {
  const apply = (key: string, fields: any, merge = true) => { const data = merge ? f.records.get(key) || {} : {}; for (const [field, value] of Object.entries(fields)) { if (field.includes('.')) { const [parent, child] = field.split('.'); data[parent][child] = value; } else data[field] = value; } f.records.set(key, data); };
  const ref = (key: string) => ({ key, get: async () => ({ exists: f.records.has(key), data: () => structuredClone(f.records.get(key)) }) });
  return { getAdminFirestore: () => ({ collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }), runTransaction: (callback: any) => {
    const result = f.chain.then(() => callback({ get: (value: any) => value.get(), set: (value: any, data: any, options: any) => apply(value.key, data, !!options?.merge), update: (value: any, data: any) => apply(value.key, data) })); f.chain = result.catch(() => {}); return result;
  } }) };
});
import { refundServiceRequest, applyServiceRefund, processOverdueServiceRefunds } from '../server/models/serviceRefunds';
import { ticketSchema } from '../src/lib/tickets';
const now = Date.parse('2026-11-14T12:00:00Z');
const ticket = ticketSchema.parse({ id: 'one', ticketNo: 'SRQ-0001', type: 'service_request', uid: 'owner', name: 'Customer', phone: '9876543210', state: 'Tamil Nadu', brand: 'tata_play', subscriberId: '1234567890', issueCategory: 'no_signal', description: 'No signal', status: 'paid', statusHistory: [], companyRefNo: '', adminNotes: '', payment: { required: true, amount: 50, status: 'paid', gatewayOrderId: 'order_1', paymentId: 'pay_1', paidAt: '2026-11-13T10:00:00.000Z', refundId: null, refundedAt: null }, receipt: { number: null, path: null, generatedAt: null }, createdAt: '2026-11-13T10:00:00.000Z', updatedAt: '2026-11-13T10:00:00.000Z' });
const refund: any = { id: 'rfnd_1', payment_id: 'pay_1', amount: 5000, currency: 'INR', status: 'processed' };
beforeEach(() => { f.chain = Promise.resolve(); f.records.clear(); f.records.set('tickets/one', structuredClone(ticket)); f.query.mockReset(); f.query.mockResolvedValue([]); f.list.mockReset(); f.list.mockResolvedValue({ items: [] }); f.refund.mockReset(); f.fetch.mockReset(); f.fetch.mockResolvedValue({ ok: true, json: async () => refund }); vi.stubGlobal('fetch', f.fetch); });
afterEach(() => vi.unstubAllGlobals());
it('refunds the full amount once and cannot regress a processed refund', async () => {
  await Promise.all([refundServiceRequest('one', 'not placed within 24h', 'scheduler', true, now), refundServiceRequest('one', 'not placed within 24h', 'scheduler', true, now)]);
  expect(f.fetch).toHaveBeenCalledTimes(1);
  expect(f.records.get('tickets/one')).toMatchObject({ status: 'auto_refunded', payment: { status: 'refunded', refundId: 'rfnd_1' } });
  await applyServiceRefund('one', { ...refund, status: 'failed' }); expect(f.records.get('tickets/one').status).toBe('auto_refunded');
  expect(f.fetch.mock.calls[0][1].headers['X-Refund-Idempotency']).toMatch(/^[a-f0-9]{64}$/);
});
it('reconciles existing provider refunds instead of creating another', async () => {
  f.list.mockResolvedValue({ items: [refund] }); await refundServiceRequest('one', 'not placed within 24h', 'scheduler', true, now);
  expect(f.fetch).not.toHaveBeenCalled(); expect(f.records.get('tickets/one').status).toBe('auto_refunded');
});
it('uses the same idempotency key/body after ambiguous failures and flags the third failure', async () => {
  f.fetch.mockRejectedValue(new Error('network timeout'));
  for (let i = 0; i < 3; i++) await expect(refundServiceRequest('one', `reason ${i}`, 'admin', false, now + i * 3_600_000)).rejects.toThrow('unconfirmed');
  const requests = f.fetch.mock.calls.map(call => call[1]);
  expect(new Set(requests.map(request => request.body)).size).toBe(1);
  expect(new Set(requests.map(request => request.headers['X-Refund-Idempotency'])).size).toBe(1);
  expect(f.records.get('server_ticket_private/one').refundNeedsAttention).toBe(true);
});
it('never refunds placed requests or starts automatic refunds before the deadline', async () => {
  await expect(refundServiceRequest('one', 'not placed within 24h', 'scheduler', true, now - 4 * 3_600_000)).rejects.toThrow();
  f.records.get('tickets/one').status = 'placed_with_company';
  await expect(refundServiceRequest('one', 'manual review', 'admin', false, now)).rejects.toThrow();
  expect(f.fetch).not.toHaveBeenCalled();
});

it('retries refunds for late captures on cancelled requests without waiting 24 hours', async () => {
  const current = f.records.get('tickets/one'); current.cancelledAt = new Date(now).toISOString(); current.payment.paidAt = new Date(now).toISOString();
  f.query.mockResolvedValueOnce([]).mockResolvedValueOnce([structuredClone(current)]);
  expect(await processOverdueServiceRefunds(now)).toBe(1);
  expect(f.fetch).toHaveBeenCalledTimes(1); expect(f.records.get('tickets/one').status).toBe('auto_refunded');
});
it.each([false, true])('reaches older refunds beyond 100 failing requests (cancelled: %s)', async cancelled => {
  f.records.clear();
  for (let i = 1; i <= 102; i++) {
    const id = `request-${String(i).padStart(3, '0')}`;
    f.records.set(`tickets/${id}`, { ...structuredClone(ticket), id,
      ...(cancelled ? { cancelledAt: new Date(now).toISOString() } : {}),
      payment: { ...ticket.payment, paymentId: `pay_${i}`, ...(cancelled ? { paidAt: new Date(now).toISOString() } : {}) } });
  }
  f.query.mockImplementation(async (_collection: string, filters: any[], page: any) => [...f.records]
    .filter(([key]) => key.startsWith('tickets/')).map(([, value]) => structuredClone(value))
    .filter(value => filters.every(filter => {
      const field = filter.field.split('.').reduce((object: any, key: string) => object?.[key], value);
      return filter.op === 'eq' ? field === filter.value : filter.op === 'lte' ? field <= filter.value : field > filter.value;
    }))
    .filter(value => !page.cursor || value.createdAt < page.cursor.time || value.createdAt === page.cursor.time && value.id < page.cursor.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)).slice(0, page.limit));
  f.list.mockImplementation(async (paymentId: string) => {
    if (!['pay_1', 'pay_2'].includes(paymentId)) throw new Error('Provider still unavailable');
    return { items: [{ ...refund, id: `rfnd_${paymentId}`, payment_id: paymentId }] };
  });
  expect(await processOverdueServiceRefunds(now)).toBe(2);
  expect(f.list).toHaveBeenCalledTimes(102);
  expect(f.records.get('tickets/request-001').status).toBe('auto_refunded');
  expect(f.records.get('tickets/request-002').status).toBe('auto_refunded');
  expect(f.records.get('tickets/request-102').status).toBe('paid');
  expect(f.query).toHaveBeenCalledWith('tickets', expect.any(Array), expect.objectContaining({ cursor: { time: ticket.createdAt, id: 'request-003' } }));
  expect(f.fetch).not.toHaveBeenCalled();
});
it('attempts a pending refund only once when it is both overdue and cancelled', async () => {
  const current = f.records.get('tickets/one'); current.cancelledAt = new Date(now).toISOString();
  f.query.mockResolvedValueOnce([structuredClone(current)]).mockResolvedValueOnce([structuredClone(current)]);
  f.list.mockResolvedValue({ items: [{ ...refund, status: 'pending' }] });
  expect(await processOverdueServiceRefunds(now)).toBe(1);
  expect(f.list).toHaveBeenCalledOnce(); expect(f.records.get('tickets/one').status).toBe('paid');
});
