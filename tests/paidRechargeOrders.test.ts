import { expect, it, vi } from 'vitest';
vi.mock('../server/models/store', () => ({ MEMORY_RECHARGE_ORDERS: [], OPERATORS: [{ id: 'airtel_dth', name: 'Airtel Digital TV' }] }));
import { mergePaidRechargeOrders } from '../server/models/paidRechargeOrders';
import type { PaymentLedgerEntry } from '../server/models/paymentLedger';
const payment: PaymentLedgerEntry = { id: 'pay_fixture', orderId: 'order_fixture', paymentMethod: 'upi', amount: 1396,
  currency: 'INR', status: 'paid', providerStatus: 'captured', operator: 'airtel_dth', customerName: 'Subscriber',
  smartCardNumber: '3015222222', packName: 'Tamil HD', createdAt: '2026-11-13T10:00:00Z', operatorRefId: '',
  testMode: true, provider: 'Razorpay', customerUid: 'customer-1', packValidity: '6 months', packId: 'airtel-6m' };
it('queues a captured payment with its subscriber, plan, owner, and test marker', () => {
  expect(mergePaidRechargeOrders([], [payment])).toEqual([expect.objectContaining({ orderId: 'order_fixture', user_id: 'customer-1', paymentStatus: 'paid', rechargeStatus: 'pending', testMode: true, packValidity: '6 months' })]);
});
it('does not duplicate orders or reset completed fulfillment on retries', () => {
  const completed = { ...mergePaidRechargeOrders([], [payment])[0], rechargeStatus: 'completed' as const, operatorRefId: 'operator-confirmation' };
  const result = mergePaidRechargeOrders([completed], [payment, payment]);
  expect(result).toHaveLength(1); expect(result[0]).toMatchObject({ rechargeStatus: 'completed', operatorRefId: 'operator-confirmation' });
});
it('does not queue uncaptured, failed, generic, or incomplete payments', () => {
  for (const changes of [{ status: 'initiated', providerStatus: 'authorized' }, { status: 'failed', providerStatus: 'failed' }, { operator: 'unknown' }, { smartCardNumber: '' }, { packName: '' }]) {
    expect(mergePaidRechargeOrders([], [{ ...payment, ...changes }])).toEqual([]);
  }
});
it('removes refunded payments from the paid queue', () => {
  const existing = mergePaidRechargeOrders([], [payment]);
  expect(mergePaidRechargeOrders(existing, [{ ...payment, status: 'refunded', providerStatus: 'refunded' }])[0].paymentStatus).toBe('failed');
});
