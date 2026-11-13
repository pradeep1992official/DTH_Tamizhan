import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const disk = vi.hoisted(() => ({ files: new Map<string, string>() }));
vi.mock('node:fs', () => ({ default: {
  existsSync: (file: string) => disk.files.has(file),
  readFileSync: (file: string) => disk.files.get(file),
  mkdirSync: vi.fn(),
  writeFileSync: (file: string, value: string) => disk.files.set(file, value),
  renameSync: (from: string, to: string) => { disk.files.set(to, disk.files.get(from)!); disk.files.delete(from); },
} }));
import { readPaymentLedger, recordProviderPayment } from '../server/models/paymentLedger';
beforeEach(() => { disk.files.clear(); vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_test_fixture'); });
afterEach(() => vi.unstubAllEnvs());
const payment = { id: 'pay_fixture', order_id: 'order_fixture', amount: 139600, currency: 'INR', method: 'upi', status: 'captured', created_at: 1700000000 } as any;
const order = { notes: { dth_operator: 'airtel_dth', dth_subscriber: '3015222222', dth_plan: 'Tamil pack' } } as any;
it('persists provider amounts and metadata with an explicit test marker', () => {
  recordProviderPayment(payment, order);
  expect(readPaymentLedger()).toEqual([expect.objectContaining({ id: 'pay_fixture', amount: 1396, status: 'paid', testMode: true, smartCardNumber: '3015222222', packName: 'Tamil pack' })]);
});
it('updates repeated verification without duplicating records or losing metadata', () => {
  recordProviderPayment({ ...payment, status: 'authorized' }, order);
  recordProviderPayment(payment);
  expect(readPaymentLedger()).toHaveLength(1);
  expect(readPaymentLedger()[0]).toMatchObject({ status: 'paid', smartCardNumber: '3015222222' });
});
it('keeps test and live records separate', () => {
  recordProviderPayment(payment, order);
  vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_live_fixture');
  recordProviderPayment(payment, order);
  expect(readPaymentLedger()).toHaveLength(2);
});
