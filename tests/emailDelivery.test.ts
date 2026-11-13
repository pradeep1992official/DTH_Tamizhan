import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({ files: new Map<string, string>(), payments: [] as any[], orders: [] as any[] }));
vi.mock('node:fs', () => ({ default: {
  existsSync: (file: string) => fixture.files.has(file), readFileSync: (file: string) => fixture.files.get(file), mkdirSync: vi.fn(),
  writeFileSync: (file: string, value: string) => fixture.files.set(file, value),
  renameSync: (from: string, to: string) => { fixture.files.set(to, fixture.files.get(from)!); fixture.files.delete(from); },
} }));
vi.mock('../server/models/paymentLedger', () => ({ readPaymentLedger: () => fixture.payments }));
vi.mock('../server/models/paidRechargeOrders', () => ({ getRechargeOrders: () => fixture.orders }));
vi.mock('../server/receiptPdf', () => ({ receiptPdf: vi.fn(async () => Buffer.from('%PDF-1.7 fixture')), receiptDataFromText: () => ({ title: 'Payment receipt', rows: [], note: '' }) }));
import { emailDeliveryConfig, processReceiptEmails, queueReceiptEmails, readEmailOutbox, retryRejectedEmails } from '../server/emailDelivery';
const payment = { id: 'pay_fixture', orderId: 'order_fixture', status: 'paid', providerStatus: 'captured', amount: 1396, currency: 'INR',
  customerUid: 'customer-1', customerEmail: 'customer@example.com', customerName: 'Customer <script>', customerPhone: '9876543210',
  smartCardNumber: '3015222222', operator: 'airtel_dth', packName: 'Tamil HD', packValidity: '6 months', createdAt: '2026-11-13T05:00:00Z', testMode: false } as any;
const now = Date.now();
beforeEach(() => {
  vi.unstubAllGlobals(); fixture.files.clear(); fixture.payments = [{ ...payment }]; fixture.orders = [];
  vi.stubEnv('BREVO_ENABLED', 'true'); vi.stubEnv('BREVO_API_KEY', 'fixture-secret'); vi.stubEnv('BREVO_SENDER_EMAIL', 'sender@example.com');
  vi.stubEnv('BREVO_SEND_TEST_EMAILS', 'false'); vi.stubEnv('BREVO_DAILY_LIMIT', '300');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it('queues captured payment receipts and completed recharge confirmations once per event', () => {
  const orders = [{ orderId: payment.orderId, paymentId: payment.id, rechargeStatus: 'completed', updatedAt: payment.createdAt, testMode: false }] as any;
  const jobs = queueReceiptEmails([], [payment], orders, now);
  expect(jobs.map(job => job.event)).toEqual(['payment', 'recharge']);
  expect(queueReceiptEmails(jobs, [payment], orders, now)).toHaveLength(2);
  expect(jobs[0].htmlContent).toContain('Customer &lt;script&gt;'); expect(jobs[0].htmlContent).not.toContain('Customer <script>');
  expect(jobs[0].textContent).toContain('awaiting manual processing'); expect(jobs[1].textContent).toContain('administrator has confirmed');
});
it('skips failed, uncaptured, unbound and missing-email payments', () => {
  for (const change of [{ status: 'failed' }, { providerStatus: 'authorized' }, { customerEmail: undefined }, { customerUid: undefined }]) {
    expect(queueReceiptEmails([], [{ ...payment, ...change }], [], now)).toHaveLength(0);
  }
});
it('suppresses test emails unless explicitly enabled, then clearly labels them', () => {
  expect(queueReceiptEmails([], [{ ...payment, testMode: true }], [], now)).toHaveLength(0);
  vi.stubEnv('BREVO_SEND_TEST_EMAILS', 'true');
  expect(queueReceiptEmails([], [{ ...payment, testMode: true }], [], now)[0].subject).toContain('[TEST]');
});
it('does not call Brevo or write the outbox while disabled or unconfigured', async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  vi.stubEnv('BREVO_ENABLED', 'false'); await processReceiptEmails(now);
  vi.stubEnv('BREVO_ENABLED', 'true'); vi.stubEnv('BREVO_API_KEY', ''); await processReceiptEmails(now);
  expect(fetcher).not.toHaveBeenCalled(); expect(fixture.files.size).toBe(0);
});
it('sends the receipt and attachment with a server-side key and persists acceptance across scans', async () => {
  const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ messageId: 'message-1' }), { status: 201 }));
  vi.stubGlobal('fetch', fetcher); await processReceiptEmails(now); await processReceiptEmails(now + 30000);
  expect(fetcher).toHaveBeenCalledTimes(1);
  const body = JSON.parse(fetcher.mock.calls[0][1]!.body as string);
  expect(body.to[0].email).toBe('customer@example.com'); expect(body.attachment[0].name).toBe('DTH-Tamizhan-payment-receipt.pdf');
  expect(Buffer.from(body.attachment[0].content, 'base64').toString()).toContain('%PDF');
  expect(body.headers.idempotencyKey).toBeTruthy(); expect(body.htmlContent).not.toContain('fixture-secret');
  expect(readEmailOutbox()[0]).toMatchObject({ status: 'accepted', messageId: 'message-1' });
});
it('retries transient failures with the same idempotency key and frozen email body', async () => {
  const fetcher = vi.fn().mockRejectedValueOnce(new Error('Network')).mockResolvedValue(new Response(JSON.stringify({ messageId: 'message-1' }), { status: 201 }));
  vi.stubGlobal('fetch', fetcher); await processReceiptEmails(now);
  vi.stubEnv('BREVO_SENDER_EMAIL', 'changed@example.com'); await processReceiptEmails(now + 30000);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls[0][1].body).toBe(fetcher.mock.calls[1][1].body);
  expect(readEmailOutbox()[0].status).toBe('accepted');
});
it('holds new jobs after the rolling free sending cap and resumes later', async () => {
  vi.stubEnv('BREVO_DAILY_LIMIT', '1'); fixture.payments.push({ ...payment, id: 'pay_2', orderId: 'order_2' });
  const fetcher = vi.fn(async () => new Response(JSON.stringify({ messageId: 'message-1' }), { status: 201 }));
  vi.stubGlobal('fetch', fetcher); await processReceiptEmails(now);
  expect(fetcher).toHaveBeenCalledTimes(1); expect(readEmailOutbox().filter(job => job.status === 'pending')).toHaveLength(1);
  await processReceiptEmails(now + 86400001); expect(fetcher).toHaveBeenCalledTimes(2);
});
it('requeues explicit rejections but never automatically resends accepted or uncertain jobs', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));
  await processReceiptEmails(now); expect(readEmailOutbox()[0].status).toBe('failed'); expect(retryRejectedEmails()).toBe(1);
  expect(readEmailOutbox()[0].status).toBe('pending');
});
it('marks an interrupted send outside its deduplication window for review', async () => {
  const fetcher = vi.fn().mockRejectedValue(new Error('Network')); vi.stubGlobal('fetch', fetcher);
  await processReceiptEmails(now); await processReceiptEmails(now + 15 * 60000);
  expect(fetcher).toHaveBeenCalledTimes(1); expect(readEmailOutbox()[0].status).toBe('review'); expect(retryRejectedEmails()).toBe(0);
});
it('defers provider rate limits without failing payment processing', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 429 })));
  await processReceiptEmails(now);
  expect(readEmailOutbox()[0]).toMatchObject({ status: 'pending', nextAttemptAt: now + 3600000 });
});
it('never permits a configured app cap above the free allowance', () => {
  vi.stubEnv('BREVO_DAILY_LIMIT', '999'); expect(emailDeliveryConfig().dailyLimit).toBe(300);
});
it('cancels an unsent email if the recorded payment has since been refunded', async () => {
  const fetcher = vi.fn().mockRejectedValue(new Error('Network')); vi.stubGlobal('fetch', fetcher);
  await processReceiptEmails(now); fixture.payments[0].status = 'refunded'; fixture.payments[0].providerStatus = 'refunded';
  await processReceiptEmails(now + 30000);
  expect(fetcher).toHaveBeenCalledTimes(1); expect(readEmailOutbox()[0].status).toBe('cancelled');
});
