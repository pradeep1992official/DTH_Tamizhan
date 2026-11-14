import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ticketSchema } from '../src/lib/tickets';
const f = vi.hoisted(() => ({ records: new Map<string, any>(), payment: vi.fn(), order: vi.fn(), create: vi.fn() }));
vi.mock('../server/razorpay', async original => ({ ...await original<typeof import('../server/razorpay')>(), razorpayClient: () => ({ payments: { fetch: f.payment }, orders: { fetch: f.order, create: f.create } }) }));
vi.mock('../server/middleware/auth', () => {
  const ref = (collection: string, id: string) => ({ id, key: `${collection}/${id}`, get: async () => ({ exists: f.records.has(`${collection}/${id}`), data: () => f.records.get(`${collection}/${id}`) }) });
  return { getAdminFirestore: () => ({ collection: (collection: string) => ({ doc: (id: string) => ref(collection, id) }), runTransaction: async (callback: any) => callback({
    get: (value: any) => value.get(), set: (value: any, data: any) => f.records.set(value.key, data), create: (value: any, data: any) => { if (f.records.has(value.key)) throw new Error('duplicate'); f.records.set(value.key, data); },
    update: (value: any, data: any) => f.records.set(value.key, { ...f.records.get(value.key), ...data }),
  }) }) };
});
import { confirmServicePayment, verifyServiceCheckout, verifyServiceWebhook, servicePaymentConfig } from '../server/models/servicePayments';
const now = '2026-11-14T12:00:00.000Z';
const ticket = ticketSchema.parse({ id: 'ticket_1', ticketNo: 'SRQ-0001', type: 'service_request', uid: 'owner', name: 'Customer', phone: '9876543210', state: 'Tamil Nadu', brand: 'tata_play', subscriberId: '1234567890', issueCategory: 'no_signal', description: 'There is no signal.', status: 'expired', statusHistory: [], companyRefNo: '', adminNotes: '', payment: { required: true, amount: 50, status: 'pending', gatewayOrderId: 'order_1', paymentId: null, paidAt: null, refundId: null, refundedAt: null }, receipt: { number: null, path: null, generatedAt: null }, createdAt: now, updatedAt: now });
beforeEach(() => { vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_test_fake'); vi.stubEnv('RAZORPAY_KEY_SECRET', 'testsecret'); f.records.clear(); f.records.set('tickets/ticket_1', structuredClone(ticket));
  f.payment.mockReset(); f.order.mockReset();
  f.payment.mockResolvedValue({ id: 'pay_1', order_id: 'order_1', amount: 5000, currency: 'INR', status: 'captured' });
  f.order.mockResolvedValue({ id: 'order_1', amount: 5000, currency: 'INR', status: 'paid', notes: { ticketId: 'ticket_1', uid: 'owner', purpose: 'service_request' } });
});
afterEach(() => vi.unstubAllEnvs());
it('accepts a verified late capture once and creates a durable payment event', async () => {
  await confirmServicePayment('ticket_1', 'pay_1', 'owner'); await confirmServicePayment('ticket_1', 'pay_1', 'owner');
  const updated = f.records.get('tickets/ticket_1'); expect(updated.status).toBe('paid'); expect(updated.statusHistory).toHaveLength(1);
  expect(f.records.get('server_ticket_events/ticket_1_paid')).toMatchObject({ event: 'paid', processed: false });
});
it('rejects ownership, amount/currency, order and provider-note mismatches before confirming', async () => {
  await expect(confirmServicePayment('ticket_1', 'pay_1', 'other')).rejects.toThrow();
  for (const extra of [{ amount: 1 }, { currency: 'USD' }, { order_id: 'order_other' }]) {
    f.payment.mockResolvedValueOnce({ id: 'pay_1', order_id: 'order_1', amount: 5000, currency: 'INR', status: 'captured', ...extra });
    await expect(confirmServicePayment('ticket_1', 'pay_1', 'owner')).rejects.toThrow();
  }
  f.order.mockResolvedValueOnce({ id: 'order_1', amount: 5000, currency: 'INR', status: 'paid', notes: { ticketId: 'ticket_1', uid: 'victim' } });
  await expect(confirmServicePayment('ticket_1', 'pay_1', 'owner')).rejects.toThrow();
  expect(f.records.get('tickets/ticket_1').status).toBe('expired');
});
it('requires checkout signature and refuses live keys', async () => {
  await expect(verifyServiceCheckout('owner', { ticketId: 'ticket_1', razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: '0'.repeat(64) })).rejects.toThrow();
  vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_live_fake'); expect(servicePaymentConfig).toThrow();
});
it('verifies webhook signatures against exact bytes and rejects altered bodies', () => {
  vi.stubEnv('SERVICE_RAZORPAY_WEBHOOK_SECRET', 'webhooksecret'); const raw = Buffer.from('{"event":"payment.captured"}');
  const signature = createHmac('sha256', 'webhooksecret').update(raw).digest('hex');
  expect(verifyServiceWebhook(raw, signature)).toBe(true); expect(verifyServiceWebhook(Buffer.from(raw + ' '), signature)).toBe(false);
});
