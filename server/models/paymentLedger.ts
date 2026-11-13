import fs from 'node:fs';
import path from 'node:path';
import type { Payments } from 'razorpay/dist/types/payments';
import type { Orders } from 'razorpay/dist/types/orders';

export interface PaymentLedgerEntry {
  id: string; orderId: string; paymentMethod: string; amount: number; currency: string;
  status: string; providerStatus: string; operator: string; customerName: string;
  smartCardNumber: string; packName: string; createdAt: string; operatorRefId: string;
  testMode: boolean; provider: 'Razorpay';
  customerUid?: string;
  packId?: string;
  packValidity?: string;
  customerPhone?: string;
}
const ledgerFile = () => path.join(process.cwd(), 'data', 'razorpay_payments.json');
export function readPaymentLedger(): PaymentLedgerEntry[] {
  const file = ledgerFile();
  if (!fs.existsSync(file)) return [];
  const entries = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(entries)) throw new Error('Invalid payment ledger.');
  return entries;
}

export function recordProviderPayment(payment: Payments.RazorpayPayment, order?: Orders.RazorpayOrder) {
  const entries = readPaymentLedger();
  const testMode = process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_') === true;
  const notes = (order?.notes || {}) as Record<string, string>;
  const previous = entries.find(entry => entry.id === payment.id && entry.testMode === testMode);
  const entry: PaymentLedgerEntry = {
    id: payment.id, orderId: payment.order_id || '', paymentMethod: payment.method || 'unknown',
    amount: Number(payment.amount) / 100, currency: payment.currency,
    status: payment.status === 'captured' ? 'paid' : payment.status === 'failed' ? 'failed' : payment.status === 'refunded' ? 'refunded' : 'initiated',
    providerStatus: payment.status, operator: notes.dth_operator || previous?.operator || 'unknown',
    customerName: notes.dth_customer_name || previous?.customerName || 'Subscriber',
    customerPhone: notes.dth_customer_phone || payment.contact || previous?.customerPhone || '',
    smartCardNumber: notes.dth_subscriber || previous?.smartCardNumber || '',
    packName: notes.dth_plan || previous?.packName || '',
    customerUid: notes.dth_customer_uid || previous?.customerUid,
    packId: notes.dth_pack_id || previous?.packId,
    packValidity: notes.dth_validity || previous?.packValidity,
    createdAt: new Date(payment.created_at * 1000).toISOString(), operatorRefId: '', testMode, provider: 'Razorpay',
  };
  const index = entries.findIndex(item => item.id === entry.id && item.testMode === testMode);
  if (index >= 0) entries[index] = entry; else entries.unshift(entry);
  // Write synchronously and replace atomically, so verification retries cannot duplicate records.
  fs.mkdirSync(path.dirname(ledgerFile()), { recursive: true });
  const temporary = `${ledgerFile()}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(entries, null, 2), 'utf8');
  fs.renameSync(temporary, ledgerFile());
  return entry;
}
