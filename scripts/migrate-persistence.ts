import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { getApps, initializeApp } from 'firebase-admin/app';
import config from '../firebase-applet-config.json';
import { getAdminFirestore } from '../server/middleware/auth';
import { acquireStorageLease, cleanData, collections, documentKey, paymentKey } from '../server/persistence';
import type { PaymentLedgerEntry } from '../server/models/paymentLedger';
import type { RechargeOrder } from '../src/types';
import type { EmailJob } from '../server/emailDelivery';
import { assertValidCatalogPack } from '../src/lib/catalog';

const apply = process.argv.includes('--apply');
process.env.PERSISTENCE_DRIVER = 'firestore';
if (!getApps().length) initializeApp({ projectId: config.projectId });
const db = getAdminFirestore();
const sources = new Map<string, string>();
function rows<T = any>(name: string): T[] {
  const file = path.join(process.cwd(), 'data', name);
  if (!fs.existsSync(file)) return [];
  const raw = fs.readFileSync(file, 'utf8'); sources.set(file, raw);
  const value = JSON.parse(raw); if (!Array.isArray(value)) throw new Error(`${name} is not an array.`); return value;
}
type RecordToImport = { collection: string; id: string; data: any };
const records: RecordToImport[] = [];
const add = (collection: string, id: string, data: any) => {
  if (!id || id.includes('/')) throw new Error('Invalid migration document ID.');
  records.push({ collection, id, data: cleanData(data) });
};
const payments = rows<PaymentLedgerEntry>('razorpay_payments.json');
for (const payment of payments) {
  if (!/^pay_[a-zA-Z0-9]+$/.test(payment.id) || !/^order_[a-zA-Z0-9]+$/.test(payment.orderId) || payment.provider !== 'Razorpay' || typeof payment.testMode !== 'boolean' || !Number.isFinite(payment.amount)) throw new Error('Invalid provider payment; migration stopped.');
  add(collections.payments, paymentKey(payment.id, payment.testMode), payment);
}
const provenance = new Set(payments.map(p => `${p.orderId}:${p.id}:${p.testMode}`));
for (const order of rows<RechargeOrder>('recharge_orders.json')) {
  if (provenance.has(`${order.orderId}:${order.paymentId}:${order.testMode}`)) add(collections.recharges, paymentKey(order.orderId, order.testMode === true), order);
}
for (const job of rows<EmailJob>('email_outbox.json')) {
  if (!job.id || !job.idempotencyKey || !job.status) throw new Error('Invalid email job; migration stopped.');
  const { attachment, ...metadata } = job;
  if (attachment) {
    const chunks = attachment.content.match(/.{1,400000}/g) || [];
    chunks.forEach((content, i) => add('server_email_payloads', `${documentKey(job.id)}_${i}`, { content }));
    metadata.attachmentParts = chunks.length; metadata.attachmentName = attachment.name;
  }
  add(collections.emails, documentKey(job.id), metadata);
}
const deleted = rows<string>('deleted_plan_ids.json');
for (const plan of rows('plan_catalog.json')) {
  if (deleted.includes(plan.id)) continue;
  assertValidCatalogPack(plan); add(collections.plans, plan.id, plan);
}
for (const id of deleted) add(collections.deletedPlans, id, { id });
// Older files may still contain demo lookup rows hidden by the admin feeds.
// Keep provider-backed connections; do not resurrect seeded customers in production.
for (const customer of rows('customers.json')) {
  if (payments.some(payment => payment.operator === customer.operator && payment.smartCardNumber === customer.smartCardNumber)) add(collections.customers, documentKey(customer.id), customer);
}
for (const operator of rows('operator_settings.json')) add(collections.operators, operator.id, operator);
for (const request of rows('admin_requests.json')) add(collections.requests, documentKey(request.userId), request);
for (const request of rows('installation_requests.json')) add('server_installation_requests', request.id, request);

async function main() {
  const counts: Record<string, number> = {}; for (const row of records) counts[row.collection] = (counts[row.collection] || 0) + 1;
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', database: config.firestoreDatabaseId, records: counts }));
  if (!apply) return;
  const lease = await acquireStorageLease('receipt_email_worker');
  if (!lease) throw new Error('Email worker active. Retry migration shortly.');
  let created = 0, retained = 0, conflicts = 0;
  try {
    for (const row of records) {
      await lease.renew();
      await db.runTransaction(async transaction => {
        const ref = db.collection(row.collection).doc(row.id); const existing = await transaction.get(ref);
        if (existing.exists) return;
        // Preserve cloud plan edits/deletions when a local snapshot is older.
        if (row.collection === collections.plans) {
          const opposite = db.collection(collections.deletedPlans).doc(row.id);
          if ((await transaction.get(opposite)).exists) return;
        }
        transaction.create(ref, row.data);
      });
      const saved = await db.collection(row.collection).doc(row.id).get();
      if (!saved.exists) { conflicts++; continue; }
      const normalize = (value: any): any => Array.isArray(value) ? value.map(normalize) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, normalize(value[key])])) : value;
      const canonical = (value: any): string => JSON.stringify(normalize(value));
      // Report differences without printing customer data or email payloads.
      if (canonical(saved.data()) !== canonical(row.data)) retained++; else created++;
    }
    for (const [file, raw] of sources) if (fs.readFileSync(file, 'utf8') !== raw) throw new Error('Local data changed during migration. Stop writers and rerun before switching storage.');
    const fingerprint = createHash('sha256').update([...sources.values()].join('\n')).digest('hex');
    console.log(JSON.stringify({ verifiedMatching: created, existingCloudRecordsRetained: retained, planConflictsSkipped: conflicts, sourceFingerprint: fingerprint }));
  } finally { await lease.release(); }
}
main().catch(error => { console.error('Migration failed:', error instanceof Error ? error.message : 'Unknown error'); process.exitCode = 1; });
