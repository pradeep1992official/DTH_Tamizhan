import type { CustomerRecord, RechargeOrder } from '../types';

// One row per recharged connection, using its latest successful order.
export function customersFromSuccessfulRecharges(orders: RechargeOrder[]): CustomerRecord[] {
  const customers = new Map<string, CustomerRecord>();
  const successful = orders.filter(order => order.paymentStatus === 'paid' && order.rechargeStatus === 'completed'
    && !order.orderId.startsWith('DEMO-') && !order.user_id.startsWith('demo-'));
  successful.sort((a, b) => Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt));
  for (const order of successful) {
    const id = `${order.operator}_${order.smartCardNumber}`;
    const existing = customers.get(id);
    if (existing) {
      existing.totalRechargesCount! += 1;
      existing.totalSpent! += order.amount;
      continue;
    }
    customers.set(id, {
      id, customerName: order.customerName || 'Subscriber', registeredMobile: order.registeredMobile || '',
      operator: order.operator, operatorName: order.operatorName, smartCardNumber: order.smartCardNumber,
      activePackName: order.packName,
      lastRechargeAmount: order.amount, lastRechargeDate: order.updatedAt || order.createdAt,
      totalRechargesCount: 1, totalSpent: order.amount,
    });
  }
  return [...customers.values()];
}
