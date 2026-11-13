import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import express from 'express';
const fixture = vi.hoisted(() => ({ orders: [] as any[], ledger: [] as any[], pdf: vi.fn(async () => Buffer.from('%PDF-1.7 receipt')) }));
vi.mock('../server/middleware/auth', () => ({ verifyAuthToken: async (req: express.Request) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  return ['owner', 'other', 'admin'].includes(token || '') ? { uid: token, email: `${token}@example.com`, emailVerified: true } : null;
} }));
vi.mock('../server/models/paymentLedger', () => ({ readPaymentLedger: () => fixture.ledger }));
vi.mock('../server/models/paidRechargeOrders', () => ({ getRechargeOrders: () => fixture.orders }));
vi.mock('../server/models/paymentPages', async importOriginal => {
  const original = await importOriginal<typeof import('../server/models/paymentPages')>();
  return { ...original,
    paymentPage: async (_page: unknown, uid?: string) => ({ payments: fixture.ledger.filter(payment => !uid || payment.customerUid === uid), orders: fixture.orders.filter(order => !uid || order.user_id === uid), nextCursor: null }),
    customerPayment: async (uid: string, id: string) => fixture.ledger.find(payment => payment.customerUid === uid && payment.id === id),
    ordersForPayments: async (payments: any[]) => fixture.orders.filter(order => payments.some(payment => payment.orderId === order.orderId)),
  };
});
vi.mock('../server/receiptPdf', () => ({ receiptPdf: fixture.pdf }));
import { customerHistoryRouter } from '../server/routes/customerHistory';
import { pageMetadata } from '../src/lib/pageMetadata';
const payment = { id: 'pay_owner', orderId: 'order_owner', customerUid: 'owner', customerEmail: 'owner@example.com', customerPhone: '9876543210',
  customerName: 'Owner', amount: 100, currency: 'INR', status: 'paid', providerStatus: 'captured', operator: 'airtel_dth', smartCardNumber: '3015222222',
  packName: 'Tamil HD', packValidity: '1 month', paymentMethod: 'upi', createdAt: '2026-11-13T05:00:00Z', testMode: true };
beforeEach(() => {
  vi.clearAllMocks(); fixture.ledger = [payment, { ...payment, id: 'pay_other', orderId: 'order_other', customerUid: 'other' }];
  fixture.orders = [{ orderId: 'order_owner', paymentId: 'pay_owner', user_id: 'owner', workerNotes: 'Private admin notes', createdAt: payment.createdAt, rechargeStatus: 'pending' },
    { orderId: 'order_other', paymentId: 'pay_other', user_id: 'other', createdAt: payment.createdAt }];
});
afterEach(() => vi.clearAllMocks());
async function request(path: string, token?: string) {
  const app = express(); app.use(customerHistoryRouter); const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as { port: number }).port}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const body = Buffer.from(await response.arrayBuffer());
    return { status: response.status, headers: response.headers, body, json: () => JSON.parse(body.toString()) };
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
}
it.each(['/api/my/history', '/api/my/payments/pay_owner/receipt'])('requires a verified session for %s', async path => {
  expect((await request(path)).status).toBe(401); expect((await request(path, 'forged')).status).toBe(401);
});
it('returns only the signed-in account history and ignores admin-wide/client identity flags', async () => {
  const response = await request('/api/my/history?uid=other&all=true&isWorker=true', 'owner');
  expect(response.status).toBe(200); expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(response.json().orders.map((item: any) => item.orderId)).toEqual(['order_owner']);
  expect(response.json().payments.map((item: any) => item.id)).toEqual(['pay_owner']);
  expect(response.body.toString()).not.toContain('Private admin notes'); expect(response.body.toString()).not.toContain('customerEmail');
});
it('does not give administrators all customers on the personal-history endpoint', async () => {
  expect((await request('/api/my/history?all=true', 'admin')).json()).toMatchObject({ orders: [], payments: [] });
});
it('includes multiple boxes for the same owner', async () => {
  fixture.orders.push({ orderId: 'order_second_box', user_id: 'owner', smartCardNumber: 'another-box', createdAt: payment.createdAt });
  expect((await request('/api/my/history', 'owner')).json().orders).toHaveLength(2);
});
it('downloads a captured payment PDF only for its owner', async () => {
  expect((await request('/api/my/payments/pay_owner/receipt', 'other')).status).toBe(404);
  expect(fixture.pdf).not.toHaveBeenCalled();
  const response = await request('/api/my/payments/pay_owner/receipt', 'owner');
  expect(response.status).toBe(200); expect(response.headers.get('content-type')).toContain('application/pdf');
  expect(response.body.toString()).toContain('%PDF');
});
it('blocks receipt downloads for uncaptured/refunded payments', async () => {
  fixture.ledger = [{ ...payment, status: 'refunded', providerStatus: 'refunded' }];
  expect((await request('/api/my/payments/pay_owner/receipt', 'owner')).status).toBe(409); expect(fixture.pdf).not.toHaveBeenCalled();
});
it('uses a completed recharge confirmation when downloading a completed order receipt', async () => {
  fixture.orders[0] = { ...fixture.orders[0], rechargeStatus: 'completed', updatedAt: '2026-11-13T06:00:00Z' };
  await request('/api/my/payments/pay_owner/receipt', 'owner');
  expect(fixture.pdf).toHaveBeenCalledWith(expect.objectContaining({ title: 'Recharge confirmation' }));
});
it('serves history metadata as a private page rather than 404', () => {
  expect(pageMetadata('/history')).toMatchObject({ status: 200, noindex: true });
});
