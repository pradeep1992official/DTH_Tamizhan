import { expect, it } from 'vitest';
import { customerDetails } from '../server/models/customerDetails';
import type { RechargeOrder } from '../src/types';
import type { PaymentLedgerEntry } from '../server/models/paymentLedger';
const order: RechargeOrder = { orderId: 'order_1', user_id: 'user_1', operator: 'airtel_dth', operatorName: 'Airtel Digital TV',
  smartCardNumber: '3015222222', customerName: 'Customer Name', registeredMobile: '9876543210', amount: 100,
  packId: 'pack_1', packName: 'Tamil HD', packValidity: '1 month', paymentMethod: 'upi', paymentStatus: 'paid',
  rechargeStatus: 'completed', operatorRefId: 'operator_1', createdAt: '2026-11-13T05:00:00Z', updatedAt: '2026-11-13T06:00:00Z' };
const payment: PaymentLedgerEntry = { id: 'pay_1', orderId: 'order_1', paymentMethod: 'upi', amount: 100, currency: 'INR', status: 'paid',
  providerStatus: 'captured', operator: 'airtel_dth', customerName: 'Customer Name', smartCardNumber: '3015222222', packName: 'Tamil HD',
  createdAt: '2026-11-13T05:00:00Z', operatorRefId: '', testMode: false, provider: 'Razorpay' };
it('combines contact, connection, recharge and payment records on the selected customer', () => {
  const result = customerDetails('airtel_dth_3015222222', [order], [payment]);
  expect(result?.customer).toMatchObject({ customerName: 'Customer Name', registeredMobile: '9876543210', activePackName: 'Tamil HD' });
  expect(result?.orders).toEqual([order]); expect(result?.payments).toEqual([payment]);
});
it('includes other boxes and operators belonging to the same account', () => {
  const secondBox = { ...order, orderId: 'order_2', operator: 'sun_direct' as const, operatorName: 'Sun Direct', smartCardNumber: '41289456123' };
  const secondPayment = { ...payment, id: 'pay_2', orderId: 'order_2', customerUid: 'user_1', operator: 'sun_direct', smartCardNumber: '41289456123' };
  const result = customerDetails('airtel_dth_3015222222', [order, secondBox], [payment, secondPayment]);
  expect(result?.connections).toHaveLength(2); expect(result?.orders).toHaveLength(2); expect(result?.payments).toHaveLength(2);
});
it('keeps other accounts and test/live records separate even with matching names and phone numbers', () => {
  const result = customerDetails('airtel_dth_3015222222', [order, { ...order, orderId: 'other_order', user_id: 'user_2', smartCardNumber: '3015222223' }, { ...order, orderId: 'test_order', testMode: true }],
    [payment, { ...payment, id: 'pay_other', customerUid: 'user_2' }, { ...payment, id: 'pay_test', testMode: true }]);
  expect(result?.connections).toHaveLength(1); expect(result?.orders).toHaveLength(1); expect(result?.payments).toHaveLength(1);
});
it('never merges unassigned legacy customers across different boxes', () => {
  const result = customerDetails('airtel_dth_3015222222', [{ ...order, user_id: 'legacy-unassigned' }, { ...order, user_id: 'legacy-unassigned', orderId: 'order_2', smartCardNumber: '3015222223' }], [payment]);
  expect(result?.connections).toHaveLength(1); expect(result?.orders).toHaveLength(1);
});
it('includes failed payment attempts for the same connection without treating them as recharges', () => {
  const failed = { ...payment, id: 'pay_failed', status: 'failed', providerStatus: 'failed', createdAt: '2026-11-13T07:00:00Z' };
  const result = customerDetails('airtel_dth_3015222222', [order], [payment, failed]);
  expect(result?.payments.map(item => item.id)).toEqual(['pay_failed', 'pay_1']);
  expect(result?.orders).toHaveLength(1);
});
it('returns not found for unknown customers and never fabricates details', () => {
  expect(customerDetails('unknown', [order], [payment])).toBeNull();
});
