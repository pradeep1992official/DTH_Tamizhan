import fs from 'node:fs';
import path from 'node:path';
import type { Orders } from 'razorpay/dist/types/orders';
import type { Payments } from 'razorpay/dist/types/payments';
import { field, and } from '@google-cloud/firestore/pipelines';
import { getAdminFirestore } from '../middleware/auth';
import { cleanData, paymentKey, usesFirestore } from '../persistence';
import { razorpayClient } from '../razorpay';
import { PaymentError } from '../payments';
import { subscriberError } from '../../src/lib/subscriberValidation';
import { recordProviderPayment } from './paymentLedger';

const collection = 'server_recharge_payment_intents';
export interface RechargePaymentIntent {
  id: string; testMode: boolean; status: 'pending' | 'captured'; createdAt: string;
  nextCheckAt: number; attempts: number; amount: number; currency: string; uid: string;
}
const file = () => path.join(process.cwd(), 'data', 'recharge_payment_intents.json');
const testMode = () => process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_') === true;
function localIntents(): RechargePaymentIntent[] {
  if (!fs.existsSync(file())) return [];
  const rows = JSON.parse(fs.readFileSync(file(), 'utf8'));
  if (!Array.isArray(rows)) throw new Error('Invalid payment recovery store.');
  return rows;
}
async function updateIntent(id: string, test: boolean, change: (old?: RechargePaymentIntent) => RechargePaymentIntent | undefined) {
  if (usesFirestore()) {
    const ref = getAdminFirestore().collection(collection).doc(paymentKey(id, test));
    await getAdminFirestore().runTransaction(async tx => {
      const snapshot = await tx.get(ref); const next = change(snapshot.exists ? snapshot.data() as RechargePaymentIntent : undefined);
      if (next) tx.set(ref, cleanData(next));
    }); return;
  }
  // No await between reading and atomically replacing the local development store.
  const rows = localIntents(); const index = rows.findIndex(row => row.id === id && row.testMode === test);
  const next = change(index >= 0 ? rows[index] : undefined); if (!next) return;
  if (index >= 0) rows[index] = next; else rows.push(next);
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  fs.writeFileSync(`${file()}.tmp`, JSON.stringify(rows, null, 2)); fs.renameSync(`${file()}.tmp`, file());
}
export async function rememberRechargeOrder(order: Orders.RazorpayOrder) {
  const notes = order.notes as Record<string, string>;
  if (notes?.dth_app !== 'dth-tamizhan' || !notes.dth_customer_uid) throw new Error('Recharge metadata is required.');
  await updateIntent(order.id, testMode(), previous => previous || ({ id: order.id, testMode: testMode(), status: 'pending',
    amount: Number(order.amount), currency: order.currency, uid: notes.dth_customer_uid,
    createdAt: new Date().toISOString(), nextCheckAt: Date.now(), attempts: 0 }));
}
export function assertRechargePayment(order: Orders.RazorpayOrder, payment: Payments.RazorpayPayment, expectedUid?: string) {
  const notes = order.notes as Record<string, string>;
  if (notes?.dth_app !== 'dth-tamizhan' || !notes.dth_customer_uid || !notes.dth_plan || !notes.dth_pack_id ||
      !notes.dth_operator || !notes.dth_subscriber || subscriberError(notes.dth_operator, notes.dth_subscriber)) throw new PaymentError(400, 'Recharge order metadata is invalid.');
  if (expectedUid && notes.dth_customer_uid !== expectedUid) throw new PaymentError(403, 'This payment does not belong to your account.');
  if (payment.order_id !== order.id || Number(payment.amount) !== Number(order.amount) || payment.currency !== order.currency ||
      order.currency !== 'INR' || !Number.isSafeInteger(Number(order.amount)) || Number(order.amount) < 100) throw new PaymentError(400, 'Payment does not match the recharge order.');
  if (payment.status === 'captured' && order.status !== 'paid') throw new PaymentError(409, 'Order capture is not confirmed yet.');
}
export async function reconcileRechargePayment(paymentId: string, orderId: string, expectedUid?: string) {
  const client = razorpayClient();
  const [order, payment] = await Promise.all([client.orders.fetch(orderId), client.payments.fetch(paymentId)]);
  assertRechargePayment(order, payment, expectedUid);
  await recordProviderPayment(payment, order);
  if (payment.status === 'captured' || payment.status === 'refunded') {
    await updateIntent(order.id, testMode(), previous => previous ? { ...previous, status: 'captured' } : undefined);
  }
  return { order, payment };
}
export async function recoverRechargeOrder(orderId: string, expected?: RechargePaymentIntent) {
  const client = razorpayClient(); const order = await client.orders.fetch(orderId);
  if ((order.notes as Record<string, string>)?.dth_app !== 'dth-tamizhan') return false;
  if (expected && (Number(order.amount) !== expected.amount || order.currency !== expected.currency || (order.notes as Record<string, string>).dth_customer_uid !== expected.uid)) throw new PaymentError(409, 'Provider order differs from the persisted checkout.');
  const payments = await client.orders.fetchPayments(order.id);
  // Refetch each captured result before recording it, never trust callback status.
  for (const payment of payments.items) if (['captured', 'refunded'].includes(payment.status)) await reconcileRechargePayment(payment.id, order.id);
  return payments.items.some(payment => ['captured', 'refunded'].includes(payment.status));
}
export async function reconcilePendingRecharges(now = Date.now(), limit = 50) {
  const max = Math.max(1, Math.min(limit, 100));
  const due = usesFirestore()
    ? (await getAdminFirestore().pipeline().collection(collection)
      .where(and(field('status').equal('pending'), field('testMode').equal(testMode()), field('nextCheckAt').lessThanOrEqual(now)))
      .sort(field('nextCheckAt').ascending()).limit(max).execute()).results.map(row => row.data() as RechargePaymentIntent)
    : localIntents().filter(row => row.status === 'pending' && row.testMode === testMode() && row.nextCheckAt <= now)
      .sort((a, b) => a.nextCheckAt - b.nextCheckAt).slice(0, max);
  let recovered = 0; let failed = 0;
  for (const intent of due) {
    try { if (await recoverRechargeOrder(intent.id, intent)) recovered++; }
    catch { failed++; }
    finally {
      await updateIntent(intent.id, intent.testMode, previous => previous?.status === 'pending' ? {
        ...previous, attempts: previous.attempts + 1,
        nextCheckAt: now + Math.min(60 * 60_000, 60_000 * 2 ** Math.min(previous.attempts, 6)),
      } : previous);
    }
  }
  return { checked: due.length, recovered, failed };
}
export function startRechargeRecoveryWorker() {
  if (process.env.RECHARGE_RECONCILIATION_ENABLED === 'false' || !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return () => {};
  let running = false;
  const tick = async () => {
    if (running) return; running = true;
    try { await reconcilePendingRecharges(); }
    catch { console.warn('[payments] Recovery is pending; the next scheduled run will retry.'); }
    finally { running = false; }
  };
  const timer = setInterval(() => void tick(), 60_000); timer.unref();
  return () => clearInterval(timer);
}
