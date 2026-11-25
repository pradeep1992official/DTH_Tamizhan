import { createHmac, timingSafeEqual } from 'node:crypto';
import { razorpayClient, createIdempotentRazorpayRefund, verifyPaymentSignature, verifyRazorpayWebhookSignature } from './razorpay';
import { youpiGatewayRequest } from './youpi';
import { moneyUnits, type NewConnectionOrder, type NewConnectionProvider } from '../src/lib/newConnectionOrders';

export interface ProviderResult { state: 'pending' | 'paid' | 'awaiting_admin_confirmation'; paymentId?: string; raw: Record<string, string | number | boolean> }
export interface Checkout { provider: NewConnectionProvider; providerOrderId: string; checkoutUrl?: string; keyId?: string; amount?: number; currency: 'INR'; testMode: boolean }
export interface PaymentProvider {
  readonly id: NewConnectionProvider;
  readonly supportsRefund: boolean;
  createCheckout(order: NewConnectionOrder): Promise<Checkout>;
  verifyConfirmation(order: NewConnectionOrder, confirmation: Record<string, unknown>): Promise<ProviderResult>;
  handleWebhook?(raw: Buffer, headers: Record<string, unknown>): Record<string, any>;
  getStatus(order: NewConnectionOrder): Promise<ProviderResult>;
  createRefund?(order: NewConnectionOrder, paymentId: string, amount: number, operationId: string): Promise<any>;
  getRefund?(refundId: string): Promise<any>;
}
function testRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_') || !process.env.RAZORPAY_KEY_SECRET) throw new Error('RAZORPAY_TEST_ONLY');
  return razorpayClient();
}
function validRazorpayOrder(order: any, booking: NewConnectionOrder) {
  if (typeof order.id !== 'string' || !/^order_[a-zA-Z0-9]+$/.test(order.id)) throw new Error('PROVIDER_MISMATCH');
  if (order.id !== booking.providerOrderId || Number(order.amount) !== moneyUnits(booking.amountDueNow) || order.currency !== 'INR' || order.notes?.purpose !== 'new_connection' || order.notes?.newConnectionOrderId !== booking.id || order.notes?.uid !== booking.uid) throw new Error('PROVIDER_MISMATCH');
}
export class RazorpayProvider implements PaymentProvider {
  readonly id = 'razorpay' as const; readonly supportsRefund = true;
  async createRefund(order: NewConnectionOrder, paymentId: string, amount: number, operationId: string) {
    if (process.env.NC_RAZORPAY_TEST_ENABLED !== 'true') throw new Error('PROVIDER_DISABLED');
    const client = testRazorpay(); const payment = await client.payments.fetch(paymentId);
    const providerOrder = await client.orders.fetch(payment.order_id); validRazorpayOrder(providerOrder, order);
    if (payment.id !== order.providerPaymentId || payment.status !== 'captured' || !payment.captured || payment.currency !== 'INR' || Number(payment.amount) !== moneyUnits(order.amountDueNow)) throw new Error('PROVIDER_MISMATCH');
    return createIdempotentRazorpayRefund(paymentId, operationId, { amount: moneyUnits(amount), speed: 'normal', receipt: operationId.slice(0, 40), notes: { purpose: 'new_connection', newConnectionOrderId: order.id, operationId } });
  }
  async getRefund(refundId: string) { if (!/^rfnd_[a-zA-Z0-9]+$/.test(refundId)) throw new Error('INVALID_REFUND_REFERENCE'); return testRazorpay().refunds.fetch(refundId); }
  async createCheckout(booking: NewConnectionOrder): Promise<Checkout> {
    if (process.env.NC_RAZORPAY_TEST_ENABLED !== 'true') throw new Error('PROVIDER_DISABLED');
    const client = testRazorpay();
    const order = await client.orders.create({ amount: moneyUnits(booking.amountDueNow), currency: 'INR', receipt: booking.bookingId, notes: { purpose: 'new_connection', newConnectionOrderId: booking.id, uid: booking.uid } });
    validRazorpayOrder(order, { ...booking, providerOrderId: order.id });
    return { provider: this.id, providerOrderId: order.id, keyId: process.env.RAZORPAY_KEY_ID, amount: Number(order.amount), currency: 'INR', testMode: true };
  }
  async verifyConfirmation(booking: NewConnectionOrder, value: Record<string, unknown>): Promise<ProviderResult> {
    if (value.razorpay_order_id !== booking.providerOrderId || typeof value.razorpay_payment_id !== 'string' || !/^pay_[a-zA-Z0-9]+$/.test(value.razorpay_payment_id) || typeof value.razorpay_signature !== 'string' || !verifyPaymentSignature(booking.providerOrderId, value.razorpay_payment_id, value.razorpay_signature, process.env.RAZORPAY_KEY_SECRET || '')) throw new Error('INVALID_CONFIRMATION');
    const client = testRazorpay(); const order = await client.orders.fetch(booking.providerOrderId); validRazorpayOrder(order, booking);
    return this.payment(booking, await client.payments.fetch(value.razorpay_payment_id));
  }
  private payment(booking: NewConnectionOrder, payment: any): ProviderResult {
    if (payment.order_id !== booking.providerOrderId || payment.currency !== 'INR' || Number(payment.amount) !== moneyUnits(booking.amountDueNow)) throw new Error('PROVIDER_MISMATCH');
    return { state: payment.status === 'captured' && payment.captured === true ? 'paid' : 'pending', paymentId: payment.id, raw: { status: String(payment.status).slice(0, 80), testMode: true } };
  }
  async getStatus(booking: NewConnectionOrder): Promise<ProviderResult> {
    if (!booking.providerOrderId) return { state: 'pending', raw: {} };
    const client = testRazorpay(); validRazorpayOrder(await client.orders.fetch(booking.providerOrderId), booking);
    const payments = await client.orders.fetchPayments(booking.providerOrderId); const payment = payments.items.find(p => p.status === 'captured') ?? payments.items.find(p => p.status === 'authorized');
    return payment ? this.payment(booking, payment) : { state: 'pending', raw: {} };
  }
  handleWebhook(raw: Buffer, headers: Record<string, unknown>) {
    if (!verifyRazorpayWebhookSignature(raw, headers['x-razorpay-signature'], process.env.RAZORPAY_RECHARGE_WEBHOOK_SECRET)) throw new Error('INVALID_CONFIRMATION');
    return JSON.parse(raw.toString('utf8'));
  }
}
function validYoupi(value: any, booking: NewConnectionOrder, paymentId: string) {
  if (value.paymentId !== paymentId || value.orderId !== booking.id || value.currency !== 'INR' || Number(value.amountPaise) !== moneyUnits(booking.amountDueNow) || (value.method !== undefined && value.method !== 'UPI')) throw new Error('PROVIDER_MISMATCH');
}
export class YoupiProvider implements PaymentProvider {
  readonly id = 'youpi' as const; readonly supportsRefund = false;
  async createCheckout(_booking: NewConnectionOrder): Promise<Checkout> { throw new Error('PROVIDER_DISABLED'); }
  async getStatus(booking: NewConnectionOrder): Promise<ProviderResult> {
    if (!booking.providerOrderId) return { state: 'pending', raw: {} };
    const value = await youpiGatewayRequest(`payments/${encodeURIComponent(booking.providerOrderId)}`);
    validYoupi(value, booking, booking.providerOrderId);
    if (value.method !== 'UPI') throw new Error('PROVIDER_MISMATCH');
    const observed = ['OBSERVED_SUCCESS', 'RECONCILED', 'MANUAL_REVIEW'].includes(value.status);
    const utr = typeof value.utr === 'string' && /^\d{12}$/.test(value.utr) ? value.utr : '';
    return { state: observed ? 'awaiting_admin_confirmation' : 'pending', raw: { status: String(value.status).slice(0, 80), ...(utr ? { utr } : {}) } };
  }
  async verifyConfirmation(booking: NewConnectionOrder, _value: Record<string, unknown>) { return this.getStatus(booking); }
  handleWebhook(raw: Buffer, headers: Record<string, unknown>) {
    const secret = process.env.YOUPI_WEBHOOK_SECRET; const signature = String(headers['x-gateway-signature'] ?? '').replace(/^sha256=/, '');
    if (!secret || !/^[a-f0-9]{64}$/i.test(signature) || !timingSafeEqual(createHmac('sha256', secret).update(raw).digest(), Buffer.from(signature, 'hex'))) throw new Error('INVALID_CONFIRMATION');
    const event = JSON.parse(raw.toString('utf8'));
    if (typeof event.deliveryId !== 'string' || !/^[\w-]{1,128}$/.test(event.deliveryId) || event.deliveryId !== headers['x-gateway-delivery-id']) throw new Error('INVALID_CONFIRMATION');
    return event;
  }
}
export class NoPaymentProvider implements PaymentProvider {
  readonly id: 'none' | 'manual'; readonly supportsRefund = false;
  constructor(id: 'none' | 'manual' = 'none') { this.id = id; }
  async createCheckout(): Promise<Checkout> { return { provider: this.id, providerOrderId: '', currency: 'INR', testMode: false }; }
  async getStatus(): Promise<ProviderResult> { return { state: 'pending', raw: {} }; }
  async verifyConfirmation(): Promise<ProviderResult> { return this.getStatus(); }
}
export function paymentProvider(id: NewConnectionProvider): PaymentProvider { return id === 'razorpay' ? new RazorpayProvider() : id === 'youpi' ? new YoupiProvider() : new NoPaymentProvider(id); }
export function providerEnabled(id: NewConnectionProvider) { return Boolean(id === 'none' || (id === 'razorpay' && process.env.NC_RAZORPAY_TEST_ENABLED === 'true' && process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_') && process.env.RAZORPAY_KEY_SECRET)); }
