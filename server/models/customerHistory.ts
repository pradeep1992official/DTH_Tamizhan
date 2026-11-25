import type { RechargeOrder } from '../../src/types';
import type { PaymentLedgerEntry } from './paymentLedger';

export function customerOrder({ workerNotes: _notes, ...order }: RechargeOrder) {
  return order;
}

export function customerHistory(uid: string, allOrders: RechargeOrder[], ledger: PaymentLedgerEntry[]) {
  const orders = allOrders.filter(order => order.user_id === uid).map(customerOrder);
  const payments = ledger.filter(payment => payment.customerUid === uid).map(payment => ({
    id: payment.id, orderId: payment.orderId, operator: payment.operator, smartCardNumber: payment.smartCardNumber,
    packName: payment.packName, amount: payment.amount, currency: payment.currency, status: payment.status,
    paymentMethod: payment.paymentMethod, createdAt: payment.createdAt, testMode: payment.testMode === true,
  }));
  return { orders: orders.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    payments: payments.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)) };
}
