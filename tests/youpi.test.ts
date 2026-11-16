import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ entry: undefined as any }));
vi.mock('../server/models/paymentLedger', () => ({ mutateYoupiPayment: vi.fn(async (_id, update) => state.entry = update(state.entry)) }));
import { refreshYoupiPayment } from '../server/youpi';
import { isTestPaymentEnvironment } from '../server/payments';
beforeEach(() => {
  vi.stubEnv('YOUPI_API_URL', 'https://api.example.com');
  vi.stubEnv('YOUPI_CHECKOUT_URL', 'https://pay.example.com');
  vi.stubEnv('YOUPI_MERCHANT_ID', 'merchant');
  vi.stubEnv('YOUPI_MERCHANT_API_KEY', 'private-key');
  vi.stubEnv('APP_URL', 'https://store.example.com');
  state.entry = { id: 'youpi_order', orderId: 'gateway-payment', provider: 'YouPI', amount: 100, status: 'initiated' };
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
function respond(status: string, extra = {}) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ paymentId: 'gateway-payment', orderId: 'youpi_order', amountPaise: '10000', currency: 'INR', method: 'UPI', status, settlementState: status === 'RECONCILED' ? 'RECONCILED' : 'NOT_RECONCILED', ...extra }) }));
}
it.each(['SUCCESS', 'OBSERVED_SUCCESS', 'MANUAL_REVIEW', 'FAILED', 'EXPIRED'])('does not fulfill %s', async status => {
  respond(status); expect(await refreshYoupiPayment(state.entry)).toMatchObject({ status: 'initiated', providerStatus: status });
});
it('queues reconciled payment and ignores stale notifications', async () => {
  respond('RECONCILED'); expect(await refreshYoupiPayment(state.entry)).toMatchObject({ status: 'paid', providerStatus: 'captured' });
  respond('OBSERVED_SUCCESS'); expect((await refreshYoupiPayment(state.entry)).status).toBe('paid');
});
it.each([{ amountPaise: '10001' }, { orderId: 'another' }, { paymentId: 'another' }, { method: 'COD' }, { currency: 'USD' }])('rejects mismatched details %j', async extra => {
  respond('RECONCILED', extra); await expect(refreshYoupiPayment(state.entry)).rejects.toThrow('do not match');
});
it('requires both reconciliation markers', async () => {
  respond('RECONCILED', { settlementState: 'NOT_RECONCILED' }); expect((await refreshYoupiPayment(state.entry)).status).toBe('initiated');
});
it('ignores unused Razorpay test keys for YouPI environment', () => {
  expect(isTestPaymentEnvironment('youpi', 'rzp_test_unused')).toBe(false);
});
