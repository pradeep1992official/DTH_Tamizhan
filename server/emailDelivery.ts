import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { readPaymentLedger } from './models/paymentLedger';
import { getRechargeOrders } from './models/paidRechargeOrders';
import type { PaymentLedgerEntry } from './models/paymentLedger';
import type { RechargeOrder } from '../src/types';
import { receiptEmail, type ReceiptEvent } from './receiptEmail';
import { receiptPdf, receiptDataFromText, type ReceiptPdfData } from './receiptPdf';

export interface EmailJob {
  id: string; idempotencyKey: string; recipient: string; name: string; event: ReceiptEvent;
  subject: string; htmlContent: string; textContent: string;
  senderEmail: string; senderName: string;
  pdfData?: ReceiptPdfData;
  attachment?: { name: string; content: string };
  status: 'pending' | 'sending' | 'accepted' | 'failed' | 'review' | 'cancelled';
  attempts: number; nextAttemptAt: number; firstAttemptAt?: number; lastAttemptAt?: number;
  acceptedAt?: number; messageId?: string; error?: string;
}
const file = () => path.join(process.cwd(), 'data', 'email_outbox.json');
export function readEmailOutbox(): EmailJob[] {
  if (!fs.existsSync(file())) return [];
  const jobs = JSON.parse(fs.readFileSync(file(), 'utf8'));
  if (!Array.isArray(jobs)) throw new Error('Invalid email outbox.');
  return jobs;
}
function save(jobs: EmailJob[]) {
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  fs.writeFileSync(`${file()}.tmp`, JSON.stringify(jobs, null, 2), 'utf8');
  fs.renameSync(`${file()}.tmp`, file());
}
export function emailDeliveryConfig() {
  const enabled = process.env.BREVO_ENABLED === 'true';
  const configured = Boolean(process.env.BREVO_API_KEY && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.BREVO_SENDER_EMAIL || ''));
  const raw = Number(process.env.BREVO_DAILY_LIMIT || 300);
  const dailyLimit = Number.isInteger(raw) && raw > 0 ? Math.min(raw, 300) : 300;
  return { enabled, configured, dailyLimit, testEmails: process.env.BREVO_SEND_TEST_EMAILS === 'true' };
}

export function receiptEmailStatus() {
  const jobs = readEmailOutbox();
  return { ...emailDeliveryConfig(), pending: jobs.filter(job => ['pending', 'sending'].includes(job.status)).length,
    accepted: jobs.filter(job => job.status === 'accepted').length,
    failed: jobs.filter(job => job.status === 'failed').length, review: jobs.filter(job => job.status === 'review').length };
}
export function retryRejectedEmails() {
  if (processing) throw new Error('Email delivery is busy. Please retry shortly.');
  const jobs = readEmailOutbox();
  let retried = 0;
  for (const job of jobs) {
    // Only explicit provider rejections are safe to retry after correcting configuration.
    if (job.status !== 'failed') continue;
    job.status = 'pending'; job.idempotencyKey = randomUUID(); job.attempts = 0; job.nextAttemptAt = Date.now();
    job.senderEmail = process.env.BREVO_SENDER_EMAIL || ''; job.senderName = process.env.BREVO_SENDER_NAME || 'DTH Tamizhan';
    delete job.firstAttemptAt; delete job.error; retried++;
  }
  save(jobs);
  return retried;
}

export function queueReceiptEmails(jobs: EmailJob[], payments: PaymentLedgerEntry[], orders: RechargeOrder[], now = Date.now()) {
  const ids = new Set(jobs.map(job => job.id));
  for (const payment of payments) {
    if (payment.status !== 'paid' || payment.providerStatus !== 'captured' || !payment.customerUid ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payment.customerEmail || '') || (payment.testMode && !emailDeliveryConfig().testEmails)) continue;
    const order = orders.find(item => item.orderId === payment.orderId && item.paymentId === payment.id && Boolean(item.testMode) === payment.testMode);
    for (const event of ['payment', 'recharge'] as const) {
      if (event === 'recharge' && order?.rechargeStatus !== 'completed') continue;
      const id = `${payment.testMode ? 'test' : 'live'}:${payment.id}:${event}`;
      if (ids.has(id)) continue;
      jobs.push({ id, idempotencyKey: randomUUID(), recipient: payment.customerEmail!, name: payment.customerName,
        senderEmail: process.env.BREVO_SENDER_EMAIL || '', senderName: process.env.BREVO_SENDER_NAME || 'DTH Tamizhan',
        event, ...receiptEmail(payment, event, order), status: 'pending', attempts: 0, nextAttemptAt: now });
      ids.add(id);
    }
  }
  return jobs;
}

let processing = false;
export async function processReceiptEmails(now = Date.now()) {
  const config = emailDeliveryConfig();
  if (!config.enabled || !config.configured || processing) return;
  processing = true;
  try {
    const payments = readPaymentLedger();
    const jobs = queueReceiptEmails(readEmailOutbox(), payments, getRechargeOrders(), now);
    const currentPayments = new Map(payments.map(payment => [`${payment.testMode ? 'test' : 'live'}:${payment.id}`, payment]));
    save(jobs);
    let attempted = 0;
    for (const job of jobs) {
      if (!['pending', 'sending'].includes(job.status) || job.nextAttemptAt > now) continue;
      const payment = currentPayments.get(job.id.slice(0, job.id.lastIndexOf(':')));
      if (!payment || payment.status !== 'paid' || payment.providerStatus !== 'captured') {
        job.status = 'cancelled'; job.error = 'Payment no longer captured; pending email cancelled.'; save(jobs); continue;
      }
      if (job.id.startsWith('test:') && !config.testEmails) continue;
      if (job.firstAttemptAt && now - job.firstAttemptAt >= 14 * 60_000) {
        job.status = 'review'; job.error = 'Delivery unconfirmed; check Brevo logs before retrying.'; save(jobs); continue;
      }
      // A rolling 24-hour cap is conservative across daily-reset timezones.
      const used = jobs.filter(item => (item.acceptedAt || item.lastAttemptAt || 0) > now - 86_400_000).length;
      const alreadyReserved = Boolean(job.lastAttemptAt && job.lastAttemptAt > now - 86_400_000);
      if (used >= config.dailyLimit && !alreadyReserved) continue;
      if (attempted++ >= 5) break;
      if (!job.attachment && job.attempts === 0) {
        const pdf = await receiptPdf(job.pdfData || receiptDataFromText(job.textContent));
        job.attachment = { name: `DTH-Tamizhan-${job.event}-receipt.pdf`, content: pdf.toString('base64') };
        save(jobs);
      }
      job.status = 'sending'; job.attempts++; job.firstAttemptAt ||= now; job.lastAttemptAt = now;
      save(jobs); // Persist before the network call so a restart reuses the same key and payload.
      try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST',
          headers: { 'api-key': process.env.BREVO_API_KEY!, 'Content-Type': 'application/json', Accept: 'application/json' },
          signal: AbortSignal.timeout(15000), body: JSON.stringify({
            sender: { email: job.senderEmail, name: job.senderName },
            to: [{ email: job.recipient, name: job.name }], subject: job.subject,
            htmlContent: job.htmlContent, textContent: job.textContent,
            headers: { idempotencyKey: job.idempotencyKey },
            // Preserve the original payload for any pre-upgrade request already attempted.
            attachment: [job.attachment || { name: `${job.event}-receipt.html`, content: Buffer.from(job.htmlContent).toString('base64') }],
          }) });
        const result = await response.json().catch(() => ({})) as { messageId?: string; code?: string };
        if (response.ok && result.messageId) {
          job.status = 'accepted'; job.acceptedAt = now; job.messageId = result.messageId; delete job.error;
        } else if (result.code === 'duplicate_parameter') {
          job.status = 'review'; job.error = 'Provider reported a duplicate; check Brevo delivery logs.';
        } else if (response.status === 429) {
          job.status = 'pending'; job.nextAttemptAt = now + 3_600_000; delete job.firstAttemptAt;
          job.error = 'Provider limit reached; retry deferred.';
        } else if (response.status >= 400 && response.status < 500) {
          job.status = 'failed'; job.error = `Brevo rejected email (HTTP ${response.status}). Check sender, recipient and account configuration.`;
        } else { throw new Error('Provider response unconfirmed.'); }
      } catch {
        job.status = job.attempts >= 5 ? 'review' : 'pending';
        job.nextAttemptAt = now + 30_000 * 2 ** Math.min(job.attempts - 1, 4);
        job.error = 'Delivery unconfirmed; retrying with the same provider idempotency key.';
      }
      save(jobs);
    }
  } finally { processing = false; }
}

export function startReceiptEmailWorker() {
  const tick = () => { void processReceiptEmails().catch(() => console.warn('[email] Outbox processing failed. Check persistent storage.')); };
  tick();
  const timer = setInterval(tick, 30_000); timer.unref();
  return () => clearInterval(timer);
}
