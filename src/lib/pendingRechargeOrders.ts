import type { RechargeOrder } from '../types';

// Older saved orders may still use processing; it now means pending.
export function normalizeRechargeOrder(order: RechargeOrder): RechargeOrder {
  return order.rechargeStatus === 'processing' ? { ...order, rechargeStatus: 'pending' } : order;
}

export function pendingPaidRecharges(orders: RechargeOrder[]): RechargeOrder[] {
  return orders.map(normalizeRechargeOrder).filter(order => order.paymentStatus === 'paid'
    && order.rechargeStatus === 'pending');
}
