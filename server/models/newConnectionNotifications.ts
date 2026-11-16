import { createHash } from 'node:crypto';
import { getAdminFirestore, getSuperAdminEmail } from '../middleware/auth';
import { sendBrevoMessage, emailDeliveryConfig } from '../emailDelivery';
import { queryRecords } from '../queries';
import type { NewConnectionOrder } from '../../src/lib/newConnectionOrders';
import { connectionStatusLabel } from '../../src/lib/newConnectionTrackingCopy';

const hash = (s: string) => createHash('sha256').update(s).digest('hex');
export function connectionEmail(order: NewConnectionOrder, event: string) {
  // Explicit public projection: never accept private records or gateway payloads here.
  const publicNote = event === 'refund_recorded' || event === 'payment_recorded' ? order.ledger.at(-1)?.note || '' : order.statusHistory.at(-1)?.note || '';
  const schedule = order.schedule ? `${order.schedule.date}, ${order.schedule.slot}` : 'Not confirmed / இன்னும் உறுதிசெய்யப்படவில்லை';
  const tamilEvent: Record<string, string> = { booking_received: 'பதிவு பெறப்பட்டது', payment_recorded: 'கட்டணம் பதிவு செய்யப்பட்டது', payment_needs_confirmation: 'கட்டணத்தைச் சரிபார்க்க வேண்டும்', refund_recorded: 'பணம் திருப்பியது பதிவு செய்யப்பட்டது' };
  return { subject: `${order.bookingId}: ${event.replaceAll('_', ' ')}`, text: `${order.bookingId}\n${event.replaceAll('_', ' ')} / ${tamilEvent[event] || connectionStatusLabel(event, 'ta')}\nBooking status / பதிவு நிலை: ${order.status} / ${connectionStatusLabel(order.status, 'ta')}\nTotal / மொத்தம்: INR ${order.priceBreakdown.total.toFixed(2)}\nPaid (net) / செலுத்தியது: INR ${order.amountPaid.toFixed(2)}\nBalance / நிலுவை: INR ${order.balance.toFixed(2)}\nRefunded / திருப்பிய தொகை: INR ${order.amountRefunded.toFixed(2)}\nConfirmed slot / உறுதியான நேரம்: ${schedule}\n${publicNote}\nDTH Tamizhan` };
}
export function queueConnectionNotification(tx: FirebaseFirestore.Transaction, order: NewConnectionOrder, event: string, operation: string) {
  const admin = ['booking_received', 'payment_recorded', 'payment_needs_confirmation'].includes(event);
  const customer = ['booking_received', 'payment_recorded', 'contacted', 'scheduled', 'installed', 'cancelled', 'refund_recorded', 'cancellation_declined'].includes(event);
  const content = connectionEmail(order, event); const at = new Date().toISOString();
  for (const audience of [admin && 'admin', customer && order.customer.email && 'customer'].filter(Boolean) as string[]) {
    const id = hash(`${order.id}:${event}:${operation}:${audience}`);
    tx.create(getAdminFirestore().doc(`server_new_connection_notifications/${id}`), { id, orderId: order.id, createdAt: at, event, audience, testMode: order.testMode, recipient: audience === 'admin' ? getSuperAdminEmail() : order.customer.email, name: audience === 'admin' ? 'DTH Tamizhan admin' : order.customer.name, ...content, attempts: 0, status: 'pending', leaseUntil: 0 });
  }
}
async function refreshFailureFlag(orderId: string) {
  const failures = await queryRecords<{ event: string }>('server_new_connection_notifications', [{ field: 'orderId', op: 'eq', value: orderId }, { field: 'status', op: 'eq', value: 'failed' }], { limit: 100 });
  await getAdminFirestore().doc(`newConnectionOrders/${orderId}`).update({ notificationFailed: failures.length > 0, failedNotificationEvents: [...new Set(failures.map(f => f.event))] });
}
export async function deliverConnectionNotifications(orderId: string, retry = false) {
  try {
    const db = getAdminFirestore();
    const jobs = await queryRecords<any>('server_new_connection_notifications', [{ field: 'orderId', op: 'eq', value: orderId }, { field: 'status', op: 'in', value: retry ? ['pending', 'sending', 'failed'] : ['pending', 'sending'] }], { limit: 100 });
    for (const job of jobs) {
      const ref = db.doc(`server_new_connection_notifications/${job.id}`);
      for (let attempt = 0; attempt < 2; attempt++) {
        const claimed = await db.runTransaction(async tx => {
          const snapshot = await tx.get(ref); const current = snapshot.data(); const now = Date.now();
          if (!current || current.status === 'accepted' || current.leaseUntil > now) return false;
          if (!retry && current.attempts >= 2) { tx.update(ref, { status: 'failed', leaseUntil: 0 }); return false; }
          const config = emailDeliveryConfig(); const quota = db.doc(`server_runtime/connection_email_${new Date().toISOString().slice(0, 10)}`); const usage = await tx.get(quota);
          if ((usage.data()?.count || 0) >= Math.min(config.dailyLimit, 50)) { tx.update(ref, { status: 'failed' }); return false; }
          tx.set(quota, { count: (usage.data()?.count || 0) + 1 });
          tx.update(ref, { status: 'sending', attempts: (current.attempts || 0) + 1, leaseUntil: now + 60000 }); return true;
        });
        if (!claimed) break;
        try {
          // Keep the same provider idempotency key for automatic/manual retry.
          if (job.testMode && !emailDeliveryConfig().testEmails) throw new Error('TEST_EMAILS_DISABLED');
          const messageId = await sendBrevoMessage(job.recipient, job.name, job.subject, job.text, job.id);
          await ref.update({ status: 'accepted', messageId, leaseUntil: 0 }); break;
        } catch { console.warn('New connection notification failed', { orderId, event: job.event }); await ref.update({ status: 'failed', leaseUntil: 0 }); }
      }
    }
    await refreshFailureFlag(orderId);
  } catch { console.warn('New connection notification queue unavailable', { orderId }); }
}
export async function processConnectionNotifications() {
  const jobs = await queryRecords<{ orderId: string }>('server_new_connection_notifications', [{ field: 'status', op: 'in', value: ['pending', 'sending'] }], { limit: 25 });
  for (const id of new Set(jobs.map(j => j.orderId))) await deliverConnectionNotifications(id);
}
