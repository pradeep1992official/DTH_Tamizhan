import { expect, it } from 'vitest';
import { pendingPaidRecharges } from '../src/lib/pendingRechargeOrders';
import type { RechargeOrder } from '../src/types';
it('queues only paid orders awaiting fulfillment, treating legacy processing as pending', () => {
  const orders = ['paid', 'initiated', 'failed'].flatMap(paymentStatus =>
    ['pending', 'processing', 'completed', 'failed'].map(rechargeStatus => ({
      paymentStatus, rechargeStatus, orderId: `${paymentStatus}-${rechargeStatus}`,
    } as RechargeOrder)));
  expect(pendingPaidRecharges(orders).every(order => order.rechargeStatus === 'pending')).toBe(true);
  expect(pendingPaidRecharges(orders).map(order => order.orderId)).toEqual(['paid-pending', 'paid-processing']);
});
