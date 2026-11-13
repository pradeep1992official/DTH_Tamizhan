import { afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import { createHmac } from 'node:crypto';
import { paymentsRouter } from '../server/routes/payments';
import { verifyPaymentSignature } from '../server/razorpay';

const provider = vi.hoisted(() => ({ create: vi.fn(), order: vi.fn(), payment: vi.fn() }));
const ledger = vi.hoisted(() => ({ record: vi.fn() }));
vi.mock('../server/middleware/auth', () => ({ getSuperAdminEmail: () => 'root@example.com',
  verifyAuthToken: async (req: express.Request) => req.headers.authorization === 'Bearer customer-token' ? { uid: 'customer-1', email: 'customer@example.com', emailVerified: true } : null }));
vi.mock('../server/models/paymentLedger', () => ({ recordProviderPayment: ledger.record }));
vi.mock('razorpay', () => ({ default: class {
  orders = { create: provider.create, fetch: provider.order };
  payments = { fetch: provider.payment };
} }));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

async function request(path: string, body: unknown, authenticated = true) {
  vi.stubEnv('RAZORPAY_KEY_ID', 'test-key'); vi.stubEnv('RAZORPAY_KEY_SECRET', 'test-secret');
  const app = express(); app.use(express.json()); app.use(paymentsRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const address = server.address() as { port: number };
    const res = await fetch(`http://127.0.0.1:${address.port}${path}`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: 'Bearer customer-token' } : {}) }, body: JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
}
const signature = createHmac('sha256', 'test-secret').update('order_123|pay_123').digest('hex');
const payment = { razorpay_order_id: 'order_123', razorpay_payment_id: 'pay_123', razorpay_signature: signature };
describe('Razorpay checkout', () => {
  it.each(['/api/create-order', '/api/verify-payment', '/api/payments/session', '/api/recharge/create'])('requires authentication for %s', async path => {
    expect((await request(path, {}, false)).status).toBe(401);
    expect(provider.create).not.toHaveBeenCalled(); expect(ledger.record).not.toHaveBeenCalled();
  });
  it('checks signatures and rejects malformed or forged values', () => {
    expect(verifyPaymentSignature('order_123', 'pay_123', signature, 'test-secret')).toBe(true);
    for (const value of ['', 'x'.repeat(64), '0'.repeat(64)]) expect(verifyPaymentSignature('order_123', 'pay_123', value, 'test-secret')).toBe(false);
    expect(verifyPaymentSignature('order_other', 'pay_123', signature, 'test-secret')).toBe(false);
  });
  it('creates an INR order and never returns the secret', async () => {
    provider.create.mockResolvedValue({ id: 'order_123', amount: 100, currency: 'INR' });
    const result = await request('/api/create-order', { amount: 100, customerEmail: 'untrusted@example.com' });
    expect(result.status).toBe(200); expect(result.body.order_id).toBe('order_123');
    expect(JSON.stringify(result.body)).not.toContain('test-secret');
    expect(provider.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 100, currency: 'INR' }));
    expect(provider.create).toHaveBeenCalledWith(expect.objectContaining({ notes: expect.objectContaining({ dth_customer_uid: 'customer-1' }) }));
    expect(provider.create).toHaveBeenCalledWith(expect.objectContaining({ notes: expect.objectContaining({ dth_customer_email: 'customer@example.com' }) }));
  });
  it.each([99, -1, 100.1])('rejects invalid amount %s', async amount => {
    expect((await request('/api/create-order', { amount })).status).toBe(400);
    expect(provider.create).not.toHaveBeenCalled();
  });
  it.each([401, 500])('handles provider error %s', async status => {
    provider.create.mockRejectedValue({ statusCode: status });
    expect((await request('/api/create-order', { amount: 100 })).status).toBe(status);
  });
  it('rejects missing fields and signature mismatch before contacting provider', async () => {
    expect((await request('/api/verify-payment', {})).status).toBe(400);
    expect((await request('/api/verify-payment', { ...payment, razorpay_signature: '0'.repeat(64) })).status).toBe(400);
    expect(provider.payment).not.toHaveBeenCalled();
    expect(ledger.record).not.toHaveBeenCalled();
  });
  it.each(['authorized', 'captured'])('verifies %s but marks paid only after capture', async status => {
    provider.order.mockResolvedValue({ id: 'order_123', amount: 100, currency: 'INR', notes: { dth_customer_uid: 'customer-1' } });
    provider.payment.mockResolvedValue({ id: 'pay_123', order_id: 'order_123', amount: 100, currency: 'INR', status });
    const result = await request('/api/verify-payment', payment);
    expect(result.status).toBe(200); expect(result.body.paid).toBe(status === 'captured');
    expect(ledger.record).toHaveBeenCalledWith(expect.objectContaining({ id: 'pay_123', status }), expect.objectContaining({ id: 'order_123' }));
  });
  it('rejects payment attached to another order', async () => {
    provider.order.mockResolvedValue({ id: 'order_123', amount: 100, currency: 'INR', notes: { dth_customer_uid: 'customer-1' } });
    provider.payment.mockResolvedValue({ order_id: 'order_other', amount: 100, currency: 'INR', status: 'captured' });
    expect((await request('/api/verify-payment', payment)).status).toBe(400);
  });
  it('rejects another customer’s validly signed payment without recording it', async () => {
    provider.order.mockResolvedValue({ id: 'order_123', amount: 100, currency: 'INR', notes: { dth_customer_uid: 'someone-else' } });
    provider.payment.mockResolvedValue({ id: 'pay_123', order_id: 'order_123', amount: 100, currency: 'INR', status: 'captured' });
    expect((await request('/api/verify-payment', payment)).status).toBe(403);
    expect(ledger.record).not.toHaveBeenCalled();
  });
});
