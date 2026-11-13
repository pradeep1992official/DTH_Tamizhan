import type { CustomerRecord, RechargeOrder } from '../types';

// One row per recharged connection, using its latest successful order.
export function customersFromSuccessfulRecharges(orders: RechargeOrder[]): CustomerRecord[] {
  return customersFromPaidRecharges(orders.filter(order => !order.testMode && order.rechargeStatus === 'completed'));
}

// Include paid customers immediately and show their latest recharge status separately.
export function customersFromPaidRecharges(orders: RechargeOrder[]): CustomerRecord[] {
  const customers = new Map<string, CustomerRecord>();
  const successful = orders.filter(order => order.paymentStatus === 'paid'
    && !order.orderId.startsWith('DEMO-') && !order.user_id.startsWith('demo-'));
  successful.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  for (const order of successful) {
    const id = `${order.operator}_${order.smartCardNumber}${order.testMode ? '_test' : ''}`;
    const existing = customers.get(id);
    if (existing) {
      if (existing.customerName === 'Subscriber' && order.customerName) existing.customerName = order.customerName;
      if (!existing.registeredMobile && order.registeredMobile) existing.registeredMobile = order.registeredMobile;
      existing.totalRechargesCount! += 1;
      existing.totalSpent! += order.amount;
      continue;
    }
    customers.set(id, {
      id, customerName: order.customerName || 'Subscriber', registeredMobile: order.registeredMobile || '',
      operator: order.operator, operatorName: order.operatorName, smartCardNumber: order.smartCardNumber,
      activePackName: order.packName,
      testMode: order.testMode, latestRechargeStatus: order.rechargeStatus, customerUid: order.user_id,
      lastRechargeAmount: order.amount, lastRechargeDate: order.updatedAt || order.createdAt,
      totalRechargesCount: 1, totalSpent: order.amount,
    });
  }
  return [...customers.values()];
}
