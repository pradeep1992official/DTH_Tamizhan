import { describe, expect, it } from 'vitest';
import { customersFromSuccessfulRecharges } from '../src/lib/rechargeCustomers';
import type { RechargeOrder } from '../src/types';
const order = (overrides: Partial<RechargeOrder> = {}): RechargeOrder => ({
  orderId: 'order-1', user_id: 'user-1', operator: 'sun_direct', operatorName: 'Sun Direct',
  smartCardNumber: '40000000001', amount: 300, packId: 'pack', packName: 'Tamil', packValidity: '30 Days',
  paymentMethod: 'upi', paymentStatus: 'paid', rechargeStatus: 'completed', operatorRefId: 'ref',
  createdAt: '2026-01-01', updatedAt: '2026-01-01', ...overrides,
});
describe('successful recharge customer directory', () => {
  it('excludes paid but unfulfilled orders, failed payments and demo orders', () => {
    expect(customersFromSuccessfulRecharges([
      order({ rechargeStatus: 'pending' }), order({ rechargeStatus: 'processing' }),
      order({ rechargeStatus: 'failed' }), order({ paymentStatus: 'failed' }),
      order({ orderId: 'DEMO-ORDER-1' }), order({ user_id: 'demo-customer-1' }),
    ])).toEqual([]);
  });
  it('uses the latest successful pack, counts repeat recharges and keeps separate connections', () => {
    const rows = customersFromSuccessfulRecharges([
      order(), order({ orderId: 'order-2', updatedAt: '2026-02-01', packName: 'New pack' }),
      order({ orderId: 'order-3', smartCardNumber: '40000000002' }),
      order({ orderId: 'order-4', updatedAt: '2026-03-01', rechargeStatus: 'failed' }),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ activePackName: 'New pack', totalRechargesCount: 2, totalSpent: 600 });
    expect(rows[0].currentBalance).toBeUndefined();
    expect(rows[0].expiryDate).toBeUndefined();
    expect(rows[0].registeredCity).toBeUndefined();
  });
});
