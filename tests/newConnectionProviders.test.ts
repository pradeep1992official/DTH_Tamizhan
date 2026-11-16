import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ create: vi.fn(), order: vi.fn(), payments: vi.fn(), payment: vi.fn(), gateway: vi.fn(), refund: vi.fn(), fetchRefund: vi.fn() }));
vi.mock('../server/razorpay', async original => ({ ...await original<typeof import('../server/razorpay')>(), createIdempotentRazorpayRefund: f.refund, razorpayClient: () => ({ orders: { create: f.create, fetch: f.order, fetchPayments: f.payments }, payments: { fetch: f.payment }, refunds: { fetch: f.fetchRefund } }) }));
vi.mock('../server/youpi', () => ({ youpiGatewayConfig: () => ({ checkout: new URL('https://pay.example.com'), returnUrl: 'https://shop.example.com' }), youpiGatewayRequest: f.gateway }));
import { NoPaymentProvider, RazorpayProvider, YoupiProvider, providerEnabled } from '../server/newConnectionPaymentProviders';
import type { NewConnectionOrder } from '../src/lib/newConnectionOrders';
const booking = { id: `nc_${'a'.repeat(48)}`, bookingId: 'DTH-NC-261116-0001', uid: 'buyer', amountDueNow: 123.45, providerOrderId: 'order_test', provider: 'razorpay' } as NewConnectionOrder;
const gatewayOrder = { id: 'order_test', amount: 12345, currency: 'INR', notes: { purpose: 'new_connection', newConnectionOrderId: booking.id, uid: 'buyer' } };
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_test_fixture'); vi.stubEnv('RAZORPAY_KEY_SECRET', 'secret'); vi.stubEnv('NC_RAZORPAY_TEST_ENABLED', 'true'); vi.stubEnv('NC_YOUPI_ENABLED', 'true'); vi.stubEnv('YOUPI_WEBHOOK_SECRET', 'youpi-secret'); f.create.mockResolvedValue(gatewayOrder); f.order.mockResolvedValue(gatewayOrder); f.payment.mockResolvedValue({ id: 'pay_test', order_id: 'order_test', amount: 12345, currency: 'INR', status: 'captured', captured: true }); f.payments.mockResolvedValue({ items: [] }); });
afterEach(() => vi.unstubAllEnvs());
it('implements the provider contract without online effects for none/manual', async () => {
  for (const id of ['none', 'manual'] as const) { const provider = new NoPaymentProvider(id); expect(provider.supportsRefund).toBe(false); expect((await provider.createCheckout()).provider).toBe(id); expect((await provider.getStatus()).state).toBe('pending'); expect((await provider.verifyConfirmation()).state).toBe('pending'); }
  expect(f.create).not.toHaveBeenCalled(); expect(f.gateway).not.toHaveBeenCalled();
});
it('wraps existing Razorpay creation and checkout signatures with exact server amounts', async () => {
  const provider = new RazorpayProvider(); expect((await provider.createCheckout(booking)).amount).toBe(12345);
  expect(f.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 12345, notes: expect.objectContaining({ newConnectionOrderId: booking.id }) }));
  const signature = createHmac('sha256', 'secret').update('order_test|pay_test').digest('hex');
  expect((await provider.verifyConfirmation(booking, { razorpay_order_id: 'order_test', razorpay_payment_id: 'pay_test', razorpay_signature: signature })).state).toBe('paid');
  await expect(provider.verifyConfirmation(booking, { razorpay_order_id: 'order_other', razorpay_payment_id: 'pay_test', razorpay_signature: signature })).rejects.toThrow();
  f.payment.mockResolvedValueOnce({ id: 'pay_test', order_id: 'order_test', amount: 1, currency: 'INR', status: 'captured', captured: true });
  await expect(provider.verifyConfirmation(booking, { razorpay_order_id: 'order_test', razorpay_payment_id: 'pay_test', razorpay_signature: signature })).rejects.toThrow('PROVIDER_MISMATCH');
});
it('refuses live Razorpay keys and leaves authorized-only payments pending', async () => {
  const provider = new RazorpayProvider(); vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_live_forbidden');
  expect(providerEnabled('razorpay')).toBe(false); await expect(provider.createCheckout(booking)).rejects.toThrow('RAZORPAY_TEST_ONLY'); expect(f.create).not.toHaveBeenCalled();
  vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_test_fixture'); f.payments.mockResolvedValue({ items: [{ id: 'pay_test', order_id: 'order_test', amount: 12345, currency: 'INR', status: 'authorized', captured: false }] });
  expect((await provider.getStatus(booking)).state).toBe('pending');
});
it('creates a YouPI session with a merchant-owned idempotency key and validates the returned origin', async () => {
  const provider = new YoupiProvider(); const order = { ...booking, provider: 'youpi' as const, providerOrderId: '' };
  f.gateway.mockResolvedValue({ paymentId: 'session-1', orderId: booking.id, amountPaise: '12345', currency: 'INR', checkoutUrl: 'https://pay.example.com/checkout/session-1' });
  expect((await provider.createCheckout(order)).providerOrderId).toBe('session-1'); expect(f.gateway).toHaveBeenCalledWith('payments', expect.objectContaining({ amount: '123.45', idempotencyKey: booking.id }));
  f.gateway.mockResolvedValue({ paymentId: 'session-1', orderId: booking.id, amountPaise: 12345, currency: 'INR', checkoutUrl: 'https://evil.example/checkout' });
  await expect(provider.createCheckout(order)).rejects.toThrow('PROVIDER_MISMATCH');
});
it('never promotes YouPI observations/reconciliation to paid and rejects wrong attribution', async () => {
  const provider = new YoupiProvider(); const order = { ...booking, provider: 'youpi' as const, providerOrderId: 'session-1' };
  const response = { paymentId: 'session-1', orderId: booking.id, amountPaise: 12345, currency: 'INR', method: 'UPI', status: 'OBSERVED_SUCCESS' };
  for (const status of ['OBSERVED_SUCCESS', 'RECONCILED', 'MANUAL_REVIEW']) { f.gateway.mockResolvedValue({ ...response, status }); expect((await provider.verifyConfirmation(order, { status: 'paid' })).state).toBe('awaiting_admin_confirmation'); }
  for (const status of ['EXPIRED', 'FAILED', 'SUCCESS', 'ACTIVE']) { f.gateway.mockResolvedValue({ ...response, status }); expect((await provider.getStatus(order)).state).toBe('pending'); }
  for (const wrong of [{ amountPaise: 1 }, { currency: 'USD' }, { orderId: 'other' }, { method: 'COD' }, { paymentId: 'other' }]) { f.gateway.mockResolvedValue({ ...response, ...wrong }); await expect(provider.getStatus(order)).rejects.toThrow('PROVIDER_MISMATCH'); }
});
it('authenticates raw YouPI callbacks, binds delivery identity and rejects forged bytes', () => {
  const provider = new YoupiProvider(); const raw = Buffer.from(JSON.stringify({ orderId: booking.id, deliveryId: 'delivery-1', timestamp: Date.now() - 3600000 }));
  const signature = `sha256=${createHmac('sha256', 'youpi-secret').update(raw).digest('hex')}`;
  expect(provider.handleWebhook(raw, { 'x-gateway-signature': signature, 'x-gateway-delivery-id': 'delivery-1' }).deliveryId).toBe('delivery-1'); // Delayed, signed delivery is held for manual review, never settled automatically.
  expect(() => provider.handleWebhook(Buffer.from(raw.toString() + ' '), { 'x-gateway-signature': signature, 'x-gateway-delivery-id': 'delivery-1' })).toThrow();
  expect(() => provider.handleWebhook(raw, { 'x-gateway-signature': signature, 'x-gateway-delivery-id': 'forged' })).toThrow();
  expect(() => provider.handleWebhook(raw, {})).toThrow();
});

it('refunds only captured bound test payments through the shared idempotent transport', async () => {
  const provider = new RazorpayProvider(); const order = { ...booking, providerPaymentId: 'pay_test' };
  f.refund.mockResolvedValue({ id: 'rfnd_test' }); await expect(provider.createRefund(order, 'pay_test', 20.05, 'stable-operation-key')).resolves.toEqual({ id: 'rfnd_test' });
  expect(f.refund).toHaveBeenCalledWith('pay_test', 'stable-operation-key', { amount: 2005, speed: 'normal', receipt: 'stable-operation-key', notes: { purpose: 'new_connection', newConnectionOrderId: booking.id, operationId: 'stable-operation-key' } });
  f.refund.mockClear(); vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_live_forbidden');
  await expect(provider.createRefund(order, 'pay_test', 20, 'stable-operation-key')).rejects.toThrow('RAZORPAY_TEST_ONLY'); expect(f.refund).not.toHaveBeenCalled();
  await expect(provider.getRefund('rfnd_test')).rejects.toThrow('RAZORPAY_TEST_ONLY');
  vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_test_fixture'); vi.stubEnv('NC_RAZORPAY_TEST_ENABLED', 'false');
  await expect(provider.createRefund(order, 'pay_test', 20, 'stable-operation-key')).rejects.toThrow('PROVIDER_DISABLED');
});
