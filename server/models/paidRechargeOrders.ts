import type { RechargeOrder, DthOperatorId } from '../../src/types';
import type { PaymentLedgerEntry } from './paymentLedger';
import { readPaymentLedger } from './paymentLedger';
import { MEMORY_RECHARGE_ORDERS, OPERATORS } from './store';
import { subscriberError } from '../../src/lib/subscriberValidation';
import fs from 'node:fs';
import path from 'node:path';
import { RECHARGE_ORDERS_FILE } from './store';
import { PaymentError } from '../payments';

// The durable provider ledger is also the source for the paid recharge queue.
// Payment capture queues the request; it never confirms operator fulfillment.
export function mergePaidRechargeOrders(existing: RechargeOrder[], payments: PaymentLedgerEntry[]): RechargeOrder[] {
  const result = [...existing];
  for (const payment of payments) {
    const operator = OPERATORS.find(item => item.id === payment.operator);
    if (!operator || !payment.orderId || !payment.packName || !payment.smartCardNumber || payment.currency !== 'INR' ||
      !Number.isFinite(payment.amount) || payment.amount <= 0 || subscriberError(payment.operator, payment.smartCardNumber)) continue;
    const index = result.findIndex(order => order.orderId === payment.orderId || order.paymentId === payment.id);
    if (index >= 0) {
      // Keep fulfillment status, but remove failed/refunded payments from the paid queue.
      result[index] = { ...result[index], paymentStatus: payment.status === 'paid' ? 'paid' : payment.status === 'initiated' ? 'initiated' : 'failed', testMode: payment.testMode, paymentId: payment.id,
        customerName: payment.customerName !== 'Subscriber' ? payment.customerName : result[index].customerName,
        registeredMobile: payment.customerPhone || result[index].registeredMobile };
      continue;
    }
    if (payment.status !== 'paid' || payment.providerStatus !== 'captured') continue;
    result.push({ orderId: payment.orderId, user_id: payment.customerUid || 'legacy-unassigned',
      operator: payment.operator as DthOperatorId, operatorName: operator.name,
      smartCardNumber: payment.smartCardNumber, customerName: payment.customerName,
      registeredMobile: payment.customerPhone,
      amount: payment.amount, packId: payment.packId || 'legacy-unavailable', packName: payment.packName,
      packValidity: payment.packValidity || 'Not recorded',
      paymentMethod: payment.paymentMethod as RechargeOrder['paymentMethod'], paymentStatus: 'paid',
      rechargeStatus: 'pending', operatorRefId: '', createdAt: payment.createdAt, updatedAt: payment.createdAt,
      testMode: payment.testMode, paymentId: payment.id,
    });
  }
  return result.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function getRechargeOrders(): RechargeOrder[] {
  const payments = readPaymentLedger();
  const provenance = new Set(payments.map(payment => JSON.stringify([payment.orderId, payment.id, payment.testMode])));
  return mergePaidRechargeOrders(MEMORY_RECHARGE_ORDERS, payments).filter(order =>
    provenance.has(JSON.stringify([order.orderId, order.paymentId, order.testMode])));
}

export const getCustomerRechargeOrders = getRechargeOrders;

export function updatePaidRechargeStatus(orderId: string, status: RechargeOrder['rechargeStatus'], workerNotes?: string): RechargeOrder {
  const payments = readPaymentLedger();
  const order = mergePaidRechargeOrders(MEMORY_RECHARGE_ORDERS, payments).find(item => item.orderId === orderId);
  if (!order) throw new PaymentError(404, 'Recharge order not found.');
  const payment = payments.find(item => item.id === order.paymentId && item.orderId === orderId && item.testMode === order.testMode);
  if (!payment || payment.status !== 'paid' || payment.providerStatus !== 'captured' || payment.amount !== order.amount) {
    throw new PaymentError(409, 'A captured payment is required before updating this recharge.');
  }
  if (order.rechargeStatus === status) return order;
  if (order.rechargeStatus === 'completed') throw new PaymentError(409, 'This recharge has already been completed.');
  const updated = { ...order, rechargeStatus: status, workerNotes: workerNotes || order.workerNotes,
    updatedAt: new Date().toISOString() };
  const records = [...MEMORY_RECHARGE_ORDERS];
  const index = records.findIndex(item => item.orderId === orderId);
  if (index >= 0) records[index] = updated; else records.unshift(updated);
  fs.mkdirSync(path.dirname(RECHARGE_ORDERS_FILE), { recursive: true });
  fs.writeFileSync(`${RECHARGE_ORDERS_FILE}.tmp`, JSON.stringify(records, null, 2), 'utf8');
  fs.renameSync(`${RECHARGE_ORDERS_FILE}.tmp`, RECHARGE_ORDERS_FILE);
  MEMORY_RECHARGE_ORDERS.splice(0, MEMORY_RECHARGE_ORDERS.length, ...records);
  return updated;
}
