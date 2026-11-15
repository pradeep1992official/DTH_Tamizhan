import { expect, it } from 'vitest';
import { rechargeReport } from '../src/lib/rechargeReport';
import type { RechargeOrder } from '../src/types';
const order = { orderId: 'one', user_id: 'owner', operator: 'sun_direct', smartCardNumber: '40000000001', amount: 259, paymentStatus: 'paid', rechargeStatus: 'completed' } as RechargeOrder;
it('separates live paid totals from test captures', () => {
  const summary = rechargeReport([order, { ...order, orderId: 'test', testMode: true, amount: 12450 }]);
  expect(summary.settledVolume).toBe(259); expect(summary.totalRechargeVolume).toBe(259);
  expect(summary.testSettledVolume).toBe(12450); expect(summary.completedOrders).toBe(1);
});
it('counts one account across multiple boxes, and separates connections', () => {
  expect(rechargeReport([order, { ...order, orderId: 'repeat' }, { ...order, orderId: 'box', smartCardNumber: '40000000002' }]))
    .toMatchObject({ totalCustomers: 1, totalConnections: 2 });
});
it('does not invent an account for legacy unassigned records or unpaid orders', () => {
  expect(rechargeReport([{ ...order, user_id: 'legacy-unassigned' }, { ...order, user_id: 'other', paymentStatus: 'failed' }]).totalCustomers).toBe(0);
});
