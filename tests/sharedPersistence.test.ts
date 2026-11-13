import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ docs: new Map<string, any>(), serial: Promise.resolve(), fail: false }));
const snapshot = (key: string) => ({ exists: state.docs.has(key), data: () => structuredClone(state.docs.get(key)) });
const reference = (collection: string, id: string) => ({ key: `${collection}/${id}`, get: async () => snapshot(`${collection}/${id}`),
  create: async (data: any) => { const key = `${collection}/${id}`; if (state.docs.has(key)) throw Object.assign(new Error('Exists'), { code: 6 }); state.docs.set(key, structuredClone(data)); },
  update: async (data: any) => { const key = `${collection}/${id}`; state.docs.set(key, { ...state.docs.get(key), ...structuredClone(data) }); },
  set: async (data: any) => { if (state.fail) throw new Error('Storage unavailable'); state.docs.set(`${collection}/${id}`, structuredClone(data)); } });
const db = {
  getAll: async (...refs: any[]) => refs.map(ref => snapshot(ref.key)),
  collection: (name: string) => ({ doc: (id: string) => reference(name, id) }),
  pipeline: () => ({ collection: (name: string) => ({ execute: async () => {
    if (state.fail) throw new Error('Storage unavailable');
    return { results: [...state.docs].filter(([key]) => key.startsWith(`${name}/`)).map(([key, value]) => ({ id: key.split('/')[1], data: () => structuredClone(value) })) };
  } }) }),
  runTransaction: async (fn: any) => {
    const old = state.serial; let release!: () => void; state.serial = new Promise<void>(resolve => { release = resolve; }); await old;
    try {
      if (state.fail) throw new Error('Storage unavailable');
      const writes: (() => void)[] = [];
      const result = await fn({ get: async (ref: any) => snapshot(ref.key), getAll: async (...refs: any[]) => refs.map(ref => snapshot(ref.key)),
        set: (ref: any, data: any) => writes.push(() => state.docs.set(ref.key, structuredClone(data))), delete: (ref: any) => writes.push(() => state.docs.delete(ref.key)) });
      writes.forEach(write => write()); return result;
    } finally { release(); }
  },
};
vi.mock('../server/middleware/auth', () => ({ getAdminFirestore: () => db, getSuperAdminEmail: () => 'root@example.com' }));
vi.mock('../server/queries', () => ({ limitedRecords: async (name: string, filters: any[], limit: number) => [...state.docs].filter(([key]) => key.startsWith(`${name}/`)).map(([, value]) => structuredClone(value)).filter(value => filters.every(filter =>
  filter.op === 'eq' ? value[filter.field] === filter.value : filter.op === 'in' ? filter.value.includes(value[filter.field]) : filter.op === 'lte' ? value[filter.field] <= filter.value : value[filter.field] > filter.value)).slice(0, limit) }));
vi.mock('../server/receiptPdf', () => ({ receiptPdf: async () => Buffer.from('PDF fixture') }));
import { acquireStorageLease, collections, paymentKey, usesFirestore } from '../server/persistence';
import { recordProviderPayment, readPaymentLedger } from '../server/models/paymentLedger';
import { updatePaidRechargeStatus, getRechargeOrders } from '../server/models/paidRechargeOrders';
import { processReceiptEmails, readEmailOutbox, saveEmailJobs } from '../server/emailDelivery';
import { planModel } from '../server/models/planModel';
import { readOperators, saveOperator } from '../server/models/sharedStore';

const payment = { id: 'pay_shared', order_id: 'order_shared', amount: 139600, currency: 'INR', method: 'upi', status: 'captured', created_at: 1700000000 } as any;
const order = { notes: { dth_operator: 'airtel_dth', dth_subscriber: '3015222222', dth_plan: 'Tamil HD', dth_customer_uid: 'customer', dth_customer_email: 'customer@example.com' } } as any;
beforeEach(() => {
  planModel.clearCache();
  state.docs.clear(); state.fail = false; state.serial = Promise.resolve();
  vi.stubEnv('PERSISTENCE_DRIVER', 'firestore'); vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_live_fixture');
  vi.stubEnv('BREVO_ENABLED', 'true'); vi.stubEnv('BREVO_API_KEY', 'test-secret'); vi.stubEnv('BREVO_SENDER_EMAIL', 'sender@example.com'); vi.stubEnv('BREVO_DAILY_LIMIT', '300');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it('does not write a worker lease when the outbox is empty', async () => {
  await processReceiptEmails();
  expect(state.docs.size).toBe(0);
});
it('serves cached catalog reads but reads the current selected plan at checkout', async () => {
  state.docs.set('plan_catalog/pack', { id: 'pack', amount: 279 });
  expect((await planModel.getAll())[0].amount).toBe(279);
  state.docs.set('plan_catalog/pack', { id: 'pack', amount: 309 });
  expect((await planModel.getAll())[0].amount).toBe(279);
  expect((await planModel.getById('pack'))!.amount).toBe(309);
});
it('invalidates operator caches immediately after an administrative update', async () => {
  await readOperators();
  await saveOperator({ id: 'airtel_dth', name: 'Airtel', tamilName: 'Airtel', isEnabled: false });
  expect((await readOperators()).find(operator => operator.id === 'airtel_dth')?.isEnabled).toBe(false);
});
it('queues captured receipts immediately and preserves accepted jobs on repeated verification', async () => {
  await recordProviderPayment(payment, order);
  expect((await readEmailOutbox())).toHaveLength(1);
  expect((await readPaymentLedger())[0].receiptPending).toBe(false);
  const fetcher = vi.fn(async () => new Response(JSON.stringify({ messageId: 'accepted' }), { status: 201 })); vi.stubGlobal('fetch', fetcher);
  await processReceiptEmails(); await recordProviderPayment(payment, order); await processReceiptEmails();
  expect(fetcher).toHaveBeenCalledOnce(); expect((await readEmailOutbox())[0].status).toBe('accepted');
});
it('stores concurrent payment updates once, retaining metadata and preventing stale status rollback', async () => {
  await Promise.all([recordProviderPayment(payment, order), recordProviderPayment(payment)]);
  await recordProviderPayment({ ...payment, status: 'authorized' });
  expect(await readPaymentLedger()).toEqual([expect.objectContaining({ status: 'paid', customerUid: 'customer', packName: 'Tamil HD' })]);
  await recordProviderPayment({ ...payment, status: 'refunded' }); await recordProviderPayment(payment);
  expect((await readPaymentLedger())[0].status).toBe('refunded');
});
it('persists fulfillment across repository reads and rejects completion after refund', async () => {
  await recordProviderPayment(payment, order);
  await Promise.all([updatePaidRechargeStatus(payment.order_id, 'completed'), updatePaidRechargeStatus(payment.order_id, 'completed')]);
  expect((await getRechargeOrders())[0].rechargeStatus).toBe('completed');
  await recordProviderPayment({ ...payment, status: 'refunded' });
  await expect(updatePaidRechargeStatus(payment.order_id, 'completed')).rejects.toThrow('captured');
});
it('allows one shared worker, renews leases, and releases only the owning lease', async () => {
  const [a, b] = await Promise.all([acquireStorageLease('worker'), acquireStorageLease('worker')]);
  expect([a, b].filter(Boolean)).toHaveLength(1);
  await (a || b)!.renew(); await (a || b)!.release(); expect(await acquireStorageLease('worker')).toBeTruthy();
});
it('does not send when another instance owns the email lease; accepted jobs survive the next scan', async () => {
  await recordProviderPayment(payment, order);
  const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ messageId: 'brevo-id' }), { status: 201 })); vi.stubGlobal('fetch', fetcher);
  const lease = await acquireStorageLease('receipt_email_worker'); await processReceiptEmails(); expect(fetcher).not.toHaveBeenCalled();
  await lease!.release(); await processReceiptEmails(); await processReceiptEmails();
  expect(fetcher).toHaveBeenCalledTimes(1); expect((await readEmailOutbox())[0].status).toBe('accepted');
});
it('chunks large attachments and preserves the exact payload and key for a retry', async () => {
  await recordProviderPayment(payment, order);
  const content = 'x'.repeat(1_200_000);
  await saveEmailJobs([{ id: 'live:pay_shared:payment', recipient: 'customer@example.com', name: 'Customer', event: 'payment',
    idempotencyKey: 'fixed-key', subject: 'Receipt', htmlContent: 'receipt', textContent: 'receipt', senderEmail: 'sender@example.com', senderName: 'DTH',
    status: 'pending', attempts: 1, firstAttemptAt: Date.now(), nextAttemptAt: 0, attachment: { name: 'receipt.pdf', content } }]);
  const stored = (await readEmailOutbox())[0]; expect(stored.attachment).toBeUndefined(); expect(stored.attachmentParts).toBe(3);
  const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ messageId: 'brevo-id' }), { status: 201 })); vi.stubGlobal('fetch', fetcher);
  await processReceiptEmails(); const payload = JSON.parse(fetcher.mock.calls[0][1]!.body as string);
  expect(payload.attachment[0].content).toBe(content); expect(payload.headers.idempotencyKey).toBe('fixed-key');
});
it('never falls back to files when Firestore fails and refuses production file mode', async () => {
  state.fail = true;
  await expect(readPaymentLedger()).rejects.toThrow('Storage unavailable');
  await expect(recordProviderPayment(payment, order)).rejects.toThrow('Storage unavailable');
  expect(state.docs.has(`${collections.payments}/${paymentKey(payment.id, false)}`)).toBe(false);
  vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('PERSISTENCE_DRIVER', 'file'); expect(usesFirestore).toThrow('Production requires');
});
it('excludes catalog bookkeeping without hiding real packs that need administrator review', async () => {
  state.docs.set('plan_catalog/catalog_state', { id: 'catalog_state', updatedAt: '2026-11-13' });
  state.docs.set('plan_catalog/real-pack', { id: 'real-pack', plan_name: 'Pack requiring review', amount: 0 });
  expect((await planModel.getAll()).map(plan => plan.id)).toEqual(['real-pack']);
});
