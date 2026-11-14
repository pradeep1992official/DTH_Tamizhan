import { getAuth } from 'firebase-admin/auth';
import { getAdminFirestore } from '../middleware/auth';
import { queryRecords } from '../queries';
import { downloadServiceReceipt } from './serviceReceipts';
import { ticketSchema, type Ticket } from '../../src/lib/tickets';
import { emailDeliveryConfig } from '../emailDelivery';
import { documentKey } from '../persistence';
export function ticketEmail(ticket: Ticket, event: string) {
  const subject = `${ticket.ticketNo}: ${event === 'paid' ? 'Payment received' : event.replace(/_/g, ' ')}`;
  const text = event === 'paid' ? `Your Rs. 50 test payment is verified. Your receipt is attached. No real money was collected. Current request status: ${ticket.status.replace(/_/g, ' ')}.` :
    event === 'created' ? `Your ${ticket.type === 'support' ? 'free support ticket' : 'service request'} has been created. Current status: ${ticket.status.replace(/_/g, ' ')}.` :
    event === 'placed_with_company' ? `Your complaint was registered with the DTH company. Company complaint number: ${ticket.companyRefNo}.` :
    event === 'auto_refunded' ? `Your Rs. 50 test refund has been processed. Refund reference: ${ticket.payment.refundId}. For real normal refunds, bank credit usually takes 5-7 working days and can vary by bank. No real money moved in this test.` :
    `Your request status is ${event.replace(/_/g, ' ')}.`;
  const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
  return { subject, textContent: `${subject}\n${text}`, htmlContent: `<div style="max-width:600px;margin:auto;padding:24px;font-family:Arial,sans-serif;line-height:1.6"><h2>${escape(subject)}</h2><p>${escape(text)}</p><p>DTH Tamizhan</p></div>` };
}
export async function processTicketNotifications() {
  const config = emailDeliveryConfig();
  // All service payments are test-mode until the merchant completes the rollout checklist.
  if (!config.enabled || !config.configured) return 0;
  const db = getAdminFirestore(); let sent = 0;
  const events = await queryRecords<{ id: string; ticketId: string; event: string }>('server_ticket_events', [{ field: 'processed', op: 'eq', value: false }], { limit: 25 });
  for (const event of events) {
    const eventRef = db.collection('server_ticket_events').doc(event.id);
    try {
      const snapshot = await db.collection('tickets').doc(event.ticketId).get(); const ticket = ticketSchema.parse(snapshot.data());
      if (ticket.type === 'service_request' && !config.testEmails) continue;
      const account = await getAuth().getUser(ticket.uid);
      if (!account.email || !account.emailVerified) continue;
      const content = ticketEmail(ticket, event.event);
      const attachment = event.event === 'paid' ? [{ name: `${ticket.ticketNo}.pdf`, content: (await downloadServiceReceipt(ticket.id)).pdf.toString('base64') }] : undefined;
      const claim = await db.runTransaction(async tx => {
        const current = await tx.get(eventRef); const value = current.data(); const now = Date.now();
        if (!value || value.processed || value.status === 'review' || (value.leaseUntil || 0) > now) return false;
        // Provider idempotency is time-bounded. Ambiguous older attempts require review.
        if (value.firstAttemptAt && now - value.firstAttemptAt > 10 * 60_000) { tx.update(eventRef, { status: 'review' }); return false; }
        const allowanceRef = db.collection('server_runtime').doc(`ticket_email_${new Date(now).toISOString().slice(0, 10)}`); const allowance = await tx.get(allowanceRef);
        const count = allowance.data()?.count || 0; if (count >= Math.min(config.dailyLimit, 50)) return false;
        tx.set(allowanceRef, { count: count + 1 });
        tx.update(eventRef, { status: 'sending', firstAttemptAt: value.firstAttemptAt || now, leaseUntil: now + 60_000 }); return true;
      });
      if (!claim) continue;
      const response = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', signal: AbortSignal.timeout(15_000), headers: { 'api-key': process.env.BREVO_API_KEY!, 'Content-Type': 'application/json' }, body: JSON.stringify({ sender: { email: process.env.BREVO_SENDER_EMAIL, name: process.env.BREVO_SENDER_NAME || 'DTH Tamizhan' }, to: [{ email: account.email, name: ticket.name }], ...content, headers: { idempotencyKey: documentKey(`ticket:${event.id}`) }, ...(attachment ? { attachment } : {}) }) });
      const data = await response.json();
      if (!response.ok || !data.messageId) throw new Error('Email not confirmed.');
      await eventRef.update({ processed: true, status: 'accepted', messageId: data.messageId, leaseUntil: 0 }); sent++;
    } catch { /* Persistent unprocessed event retries with same provider idempotency key. */ }
  }
  return sent;
}
