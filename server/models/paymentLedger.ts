import fs from 'node:fs';
import path from 'node:path';
import type { Payments } from 'razorpay/dist/types/payments';
import type { Orders } from 'razorpay/dist/types/orders';
import { collections, mutateRecord, paymentKey, readCollection, usesFirestore } from '../persistence';

export interface PaymentLedgerEntry {
  id: string; orderId: string; paymentMethod: string; amount: number; currency: string;
  status: string; providerStatus: string; operator: string; customerName: string;
  smartCardNumber: string; packName: string; createdAt: string; operatorRefId: string;
  testMode: boolean; provider: 'Razorpay' | 'YouPI';
  checkoutUrl?: string;
  youpiOutcome?: string;
  customerUid?: string;
  packId?: string;
  packValidity?: string;
  receiptPending?: boolean;
  customerPhone?: string;
  customerEmail?: string;
}
const ledgerFile = () => path.join(process.cwd(), 'data', 'razorpay_payments.json');
let localWrites: Promise<void> = Promise.resolve();
function mutateLocalPayment(id: string, testMode: boolean, update: (previous: PaymentLedgerEntry | undefined) => PaymentLedgerEntry) {
  const operation = localWrites.then(async () => {
    const entries = await readPaymentLedger();
    const index = entries.findIndex(entry => entry.id === id && entry.testMode === testMode);
    const entry = update(index < 0 ? undefined : entries[index]);
    if (index < 0) entries.unshift(entry); else entries[index] = entry;
    const file = ledgerFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(`${file}.tmp`, JSON.stringify(entries, null, 2), 'utf8');
    fs.renameSync(`${file}.tmp`, file);
    return entry;
  });
  // A rejected write must not prevent later operations from acquiring the queue.
  localWrites = operation.then(() => {}, () => {});
  return operation;
}
export async function readPaymentLedger(): Promise<PaymentLedgerEntry[]> {
  if (usesFirestore()) return readCollection<PaymentLedgerEntry>(collections.payments);
  const file = ledgerFile();
  if (!fs.existsSync(file)) return [];
  const entries = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(entries)) throw new Error('Invalid payment ledger.');
  return entries;
}

export async function recordProviderPayment(payment: Payments.RazorpayPayment, order?: Orders.RazorpayOrder) {
  const testMode = process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_') === true;
  const notes = (order?.notes || {}) as Record<string, string>;
  const build = (previous?: PaymentLedgerEntry): PaymentLedgerEntry => {
    // A stale authorization response must not undo capture or refund already recorded.
    if (previous && ((previous.providerStatus === 'refunded' && payment.status !== 'refunded') ||
      (previous.providerStatus === 'captured' && !['captured', 'refunded'].includes(payment.status)))) return previous;
    return {
      id: payment.id, orderId: payment.order_id || previous?.orderId || '', paymentMethod: payment.method || previous?.paymentMethod || 'unknown',
      amount: Number(payment.amount) / 100, currency: payment.currency,
      status: payment.status === 'captured' ? 'paid' : payment.status === 'failed' ? 'failed' : payment.status === 'refunded' ? 'refunded' : 'initiated',
      providerStatus: payment.status, operator: notes.dth_operator || previous?.operator || 'unknown',
      customerName: notes.dth_customer_name || previous?.customerName || 'Subscriber',
      customerPhone: notes.dth_customer_phone || (payment.contact ? String(payment.contact) : '') || previous?.customerPhone || '',
      smartCardNumber: notes.dth_subscriber || previous?.smartCardNumber || '', packName: notes.dth_plan || previous?.packName || '',
      customerUid: notes.dth_customer_uid || previous?.customerUid, customerEmail: notes.dth_customer_email || previous?.customerEmail,
      packId: notes.dth_pack_id || previous?.packId, packValidity: notes.dth_validity || previous?.packValidity,
      createdAt: new Date(payment.created_at * 1000).toISOString(), operatorRefId: previous?.operatorRefId || '', testMode, provider: 'Razorpay',
      receiptPending: payment.status === 'captured' && (previous?.receiptPending === true || previous?.providerStatus !== 'captured'),
    };
  };
  if (usesFirestore()) {
    const entry = await mutateRecord<PaymentLedgerEntry>(collections.payments, paymentKey(payment.id, testMode), build);
    if (entry.receiptPending) await import('../emailDelivery').then(module => module.enqueueReceiptEvents(entry)).catch(() => console.warn('[email] Payment receipt remains queued for recovery.'));
    return entry;
  }
  return mutateLocalPayment(payment.id, testMode, build);
}

// Shared durable ledger for temporary YouPI checkout; callers own validation.
export async function mutateYoupiPayment(id: string, update: (previous: PaymentLedgerEntry | undefined) => PaymentLedgerEntry) {
  if (usesFirestore()) return mutateRecord<PaymentLedgerEntry>(collections.payments, paymentKey(id, false), update);
  return mutateLocalPayment(id, false, update);
}
