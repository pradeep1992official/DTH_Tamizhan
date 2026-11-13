import { beforeEach, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({ orders: [] as any[], payments: [] as any[], write: vi.fn(), rename: vi.fn() }));
vi.mock('node:fs', () => ({ default: { mkdirSync: vi.fn(), writeFileSync: fixture.write, renameSync: fixture.rename } }));
vi.mock('../server/models/store', () => ({ MEMORY_RECHARGE_ORDERS: fixture.orders, RECHARGE_ORDERS_FILE: 'fixture/orders.json', OPERATORS: [{ id: 'airtel_dth', name: 'Airtel Digital TV' }] }));
vi.mock('../server/models/paymentLedger', () => ({ readPaymentLedger: () => fixture.payments }));
import { getCustomerRechargeOrders, getRechargeOrders, updatePaidRechargeStatus } from '../server/models/paidRechargeOrders';
beforeEach(() => {
  vi.clearAllMocks(); fixture.orders.length = 0;
  fixture.payments = [{ id: 'pay_1', orderId: 'order_1', status: 'paid', providerStatus: 'captured', amount: 100,
    currency: 'INR', operator: 'airtel_dth', smartCardNumber: '3015222222', packName: 'Tamil HD',
    paymentMethod: 'upi', createdAt: '2026-11-13T10:00:00Z', testMode: true }];
});
it('persists test completion and removes it from the pending queue without losing the test marker', () => {
  expect(updatePaidRechargeStatus('order_1', 'completed')).toMatchObject({ rechargeStatus: 'completed', testMode: true });
  expect(fixture.rename).toHaveBeenCalled();
  expect(getRechargeOrders().filter(order => order.rechargeStatus === 'pending')).toHaveLength(0);
  expect(JSON.parse(fixture.write.mock.calls[0][1])[0]).toMatchObject({ rechargeStatus: 'completed', testMode: true });
  updatePaidRechargeStatus('order_1', 'completed');
  expect(fixture.write).toHaveBeenCalledTimes(1);
});
it('refuses refunded payments without writing', () => {
  fixture.payments[0].status = 'refunded'; fixture.payments[0].providerStatus = 'refunded';
  expect(() => updatePaidRechargeStatus('order_1', 'completed')).toThrow();
  expect(fixture.write).not.toHaveBeenCalled();
});
it('leaves memory pending if disk persistence fails', () => {
  fixture.write.mockImplementationOnce(() => { throw new Error('Disk unavailable'); });
  expect(() => updatePaidRechargeStatus('order_1', 'completed')).toThrow('Disk unavailable');
  expect(getRechargeOrders()[0].rechargeStatus).toBe('pending');
});
it('excludes seeded orders from customer, pending and history feeds while retaining Razorpay test orders', () => {
  const actual = getRechargeOrders()[0];
  fixture.orders.push({ ...actual, orderId: 'ORD-TN-894102', paymentId: undefined, user_id: 'cust-101', testMode: undefined });
  const customers = getCustomerRechargeOrders();
  expect(customers).toHaveLength(1);
  expect(customers[0]).toMatchObject({ orderId: 'order_1', paymentId: 'pay_1', testMode: true });
  expect(getRechargeOrders()).toHaveLength(1);
});
