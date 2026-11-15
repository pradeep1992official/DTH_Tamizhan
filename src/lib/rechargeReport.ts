import type { RechargeOrder } from '../types';

export function rechargeReport(orders: RechargeOrder[]) {
  const live = orders.filter(order => !order.testMode);
  const paid = live.filter(order => order.paymentStatus === 'paid');
  const testPaid = orders.filter(order => order.testMode && order.paymentStatus === 'paid');
  const total = (rows: RechargeOrder[]) => rows.reduce((sum, order) => sum + (Number.isFinite(order.amount) ? order.amount : 0), 0);
  return {
    totalCustomers: new Set(paid.map(order => order.user_id).filter(uid => uid && uid !== 'legacy-unassigned' && !uid.startsWith('demo-'))).size,
    totalConnections: new Set(paid.map(order => `${order.operator}:${order.smartCardNumber}`)).size,
    totalOrders: live.length,
    completedOrders: live.filter(order => order.rechargeStatus === 'completed').length,
    pendingOrders: live.filter(order => ['pending', 'processing'].includes(order.rechargeStatus)).length,
    totalRechargeVolume: total(paid), settledVolume: total(paid),
    testSettledVolume: total(testPaid), testOrders: orders.filter(order => order.testMode).length,
  };
}
export type RechargeReport = ReturnType<typeof rechargeReport>;
