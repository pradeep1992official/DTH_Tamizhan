import express from 'express';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ enabled: true, getById: vi.fn(), readOperators: vi.fn(), create: vi.fn() }));
vi.mock('../server/middleware/auth', () => ({ verifyAuthToken: async () => ({ uid: 'owner', emailVerified: false }) }));
vi.mock('../server/models/planModel', () => ({ planModel: { getById: f.getById, getAll: () => { throw new Error('Must not scan the catalog at payment creation'); } } }));
vi.mock('../server/models/sharedStore', () => ({ readOperators: f.readOperators }));
vi.mock('../server/razorpay', () => ({ razorpayClient: () => ({ orders: { create: f.create } }), verifyPaymentSignature: vi.fn() }));
vi.mock('../server/models/paymentLedger', () => ({ recordProviderPayment: vi.fn() }));
import { paymentsRouter } from '../server/routes/payments';
beforeEach(() => {
  vi.clearAllMocks(); f.enabled = true;
  f.getById.mockResolvedValue({ id: 'hd', operator: 'airtel_dth', pack_type: 'HD', duration_months: 1, plan_name: 'HD', amount: 309, channel_list: [], is_recommended: false, channel_counts_unavailable: true });
  f.readOperators.mockImplementation(async () => [{ id: 'airtel_dth', isEnabled: f.enabled }, { id: 'sun_direct', isEnabled: true }]);
  f.create.mockImplementation(async ({ amount }: { amount: number }) => ({ id: 'order_fixture', amount, currency: 'INR' }));
});
afterEach(() => vi.unstubAllEnvs());
async function request(body: object) {
  const app = express(); app.use(express.json()); app.use(paymentsRouter);
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as { port: number }).port}/api/create-order`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
}
it('uses a fresh selected-plan price and bypasses operator caches', async () => {
  const result = await request({ packId: 'hd', operator: 'airtel_dth', smartCardNumber: '3012345678' });
  expect(result.status).toBe(200); expect(result.body.amount).toBe(30900);
  expect(f.readOperators).toHaveBeenCalledWith(true); expect(f.getById).toHaveBeenCalledWith('hd');
});
it('rejects a newly disabled operator without creating a provider order', async () => {
  f.enabled = false;
  expect((await request({ packId: 'hd', operator: 'airtel_dth', smartCardNumber: '3012345678' })).status).toBe(409);
  expect(f.create).not.toHaveBeenCalled();
});
it('rejects cross-operator packs and avoids catalog reads for direct top-ups', async () => {
  expect((await request({ packId: 'hd', operator: 'sun_direct', smartCardNumber: '41289456123' })).status).toBe(400);
  f.getById.mockClear();
  expect((await request({ packId: 'custom', customAmount: 279, operator: 'airtel_dth', smartCardNumber: '3012345678' })).body.amount).toBe(27900);
  expect(f.getById).not.toHaveBeenCalled();
});
