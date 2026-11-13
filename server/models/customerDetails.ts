import type { RechargeOrder } from '../../src/types';
import { customersFromPaidRecharges } from '../../src/lib/rechargeCustomers';
import type { PaymentLedgerEntry } from './paymentLedger';

export function customerDetails(id: string, orders: RechargeOrder[], ledger: PaymentLedgerEntry[]) {
  const customer = customersFromPaidRecharges(orders).find(item => item.id === id);
  if (!customer) return null;
  const uid = customer.customerUid;
  const hasAccount = Boolean(uid && uid !== 'legacy-unassigned');
  const sameMode = (testMode?: boolean) => Boolean(testMode) === Boolean(customer.testMode);
  const relatedOrders = orders.filter(order => sameMode(order.testMode) && (hasAccount ? order.user_id === uid :
    order.operator === customer.operator && order.smartCardNumber === customer.smartCardNumber && order.user_id === uid));
  const connections = customersFromPaidRecharges(relatedOrders);
  const orderIds = new Set(relatedOrders.map(order => order.orderId));
  const boxIds = new Set(relatedOrders.map(order => `${order.operator}:${order.smartCardNumber}`));
  return { customer, connections,
    orders: relatedOrders,
    payments: ledger.filter(payment => sameMode(payment.testMode) && (hasAccount && payment.customerUid ? payment.customerUid === uid :
      orderIds.has(payment.orderId) && boxIds.has(`${payment.operator}:${payment.smartCardNumber}`)))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
  };
}
