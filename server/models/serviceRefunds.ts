import { createIdempotentRazorpayRefund } from '../razorpay';
import { getAdminFirestore } from '../middleware/auth';
import { servicePaymentConfig } from './servicePayments';
import { ticketSchema, type Ticket } from '../../src/lib/tickets';
import { documentKey } from '../persistence';
import { queryRecords } from '../queries';
import type { Refunds } from 'razorpay/dist/types/refunds';

export async function applyServiceRefund(ticketId: string, refund: Refunds.RazorpayRefund) {
  const db = getAdminFirestore(); const ref = db.collection('tickets').doc(ticketId); const privateRef = db.collection('server_ticket_private').doc(ticketId);
  await db.runTransaction(async tx => {
    const snapshot = await tx.get(ref); const ticket = ticketSchema.parse(snapshot.data());
    if (refund.payment_id !== ticket.payment.paymentId || Number(refund.amount) !== 5000 || refund.currency !== 'INR' || !['pending', 'processed', 'failed'].includes(refund.status)) throw new Error('Refund does not match request.');
    if (ticket.payment.refundId && ticket.payment.refundId !== refund.id) throw new Error('Another refund is already linked.');
    if (ticket.status === 'auto_refunded') return; // Monotonic: late pending/failed webhooks cannot undo a processed refund.
    if (ticket.status !== 'paid') throw new Error('Refund requires an unplaced paid request.');
    const lock = db.collection('server_ticket_locks').doc(documentKey(`${ticket.uid}:${ticket.brand}:${ticket.subscriberId}`)); const held = await tx.get(lock);
    const processed = refund.status === 'processed'; const now = new Date().toISOString();
    tx.update(ref, { payment: { ...ticket.payment, refundId: refund.id, status: processed ? 'refunded' : 'refunding', refundedAt: processed ? now : null },
      status: processed ? 'auto_refunded' : 'paid', updatedAt: now,
      statusHistory: processed ? [...ticket.statusHistory, { status: 'auto_refunded', timestamp: now, by: 'refund_verification' }] : ticket.statusHistory,
      ...(processed ? { 'receipt.generatedAt': null } : {}),
    });
    tx.set(privateRef, { refundLeaseUntil: 0, refundProviderStatus: refund.status, refundNeedsAttention: refund.status === 'failed' }, { merge: true });
    if (processed) {
      if (held.data()?.ticketId === ticketId) tx.set(lock, { active: false, ticketId });
      tx.set(db.collection('server_ticket_events').doc(`${ticketId}_auto_refunded`), { ticketId, event: 'auto_refunded', createdAt: now, processed: false });
    }
  });
}
export async function refundServiceRequest(ticketId: string, reason: string, by: string, automatic = false, now = Date.now()) {
  const client = servicePaymentConfig(); const db = getAdminFirestore(); const ref = db.collection('tickets').doc(ticketId); const privateRef = db.collection('server_ticket_private').doc(ticketId);
  const claimed = await db.runTransaction(async tx => {
    const [snapshot, internalSnapshot] = await Promise.all([tx.get(ref), tx.get(privateRef)]); const ticket = ticketSchema.parse(snapshot.data()); const internal = internalSnapshot.data() || {};
    if (ticket.status === 'auto_refunded') return null;
    if (ticket.type !== 'service_request' || ticket.status !== 'paid' || !ticket.payment.paidAt || !ticket.payment.paymentId || (automatic && Date.parse(ticket.payment.paidAt) > now - 24 * 3_600_000)) throw new Error('Only an unplaced paid request can be refunded.');
    if ((internal.refundLeaseUntil || 0) > now) return null;
    const stableReason = internal.refundReason || reason;
    tx.update(ref, { 'payment.status': 'refunding' });
    tx.set(privateRef, { refundLeaseUntil: now + 60_000, refundAttempts: (internal.refundAttempts || 0) + 1, refundReason: stableReason, refundBy: internal.refundBy || by }, { merge: true });
    return { ticket, reason: stableReason as string };
  });
  if (!claimed) return;
  try {
    const ticket = claimed.ticket; let refund: Refunds.RazorpayRefund | undefined;
    if (ticket.payment.refundId) refund = await client.refunds.fetch(ticket.payment.refundId);
    else {
      // Reconcile first, including dashboard refunds and a response lost after creation.
      const refunds = await client.payments.fetchMultipleRefund(ticket.payment.paymentId!, { count: 100 });
      refund = refunds.items.find(item => Number(item.amount) === 5000 && item.payment_id === ticket.payment.paymentId && ['pending', 'processed'].includes(item.status));
      if (!refund) {
        // The installed SDK filters out X-Refund-Idempotency; native fetch preserves
        // Razorpay's documented refund idempotency header without a second library.
        refund = await createIdempotentRazorpayRefund(ticket.payment.paymentId!, documentKey('service-refund:' + ticket.id + ':' + ticket.payment.paymentId), { amount: 5000, speed: 'normal', receipt: ticket.ticketNo!, notes: { ticketId: ticket.id, ticketNo: ticket.ticketNo!, reason: claimed.reason } }) as Refunds.RazorpayRefund;
      }
    }
    await applyServiceRefund(ticketId, refund);
  } catch {
    await db.runTransaction(async tx => { const snapshot = await tx.get(privateRef); const internal = snapshot.data() || {};
      tx.set(privateRef, { refundLeaseUntil: 0, refundNeedsAttention: (internal.refundAttempts || 0) >= 3 }, { merge: true });
    });
    throw new Error('Refund is unconfirmed. It will be checked again; do not initiate another refund.');
  }
}
export async function processOverdueServiceRefunds(now = Date.now()) {
  const rows = await queryRecords<Ticket>('tickets', [{ field: 'type', op: 'eq', value: 'service_request' }, { field: 'status', op: 'eq', value: 'paid' }, { field: 'payment.paidAt', op: 'lte', value: new Date(now - 24 * 3_600_000).toISOString() }], { limit: 100 });
  const cancelled = await queryRecords<Ticket>('tickets', [{ field: 'type', op: 'eq', value: 'service_request' }, { field: 'status', op: 'eq', value: 'paid' }, { field: 'cancelledAt', op: 'gt', value: '' }], { limit: 100 });
  let attempted = 0;
  for (const ticket of new Map([...rows, ...cancelled].map(ticket => [ticket.id, ticket])).values()) { try {
    await refundServiceRequest(ticket.id, ticket.cancelledAt ? 'request cancelled before payment confirmation' : 'not placed within 24h', 'scheduler', !ticket.cancelledAt, now); attempted++;
  } catch { /* Durable attempts/attention remain for retry and admin review. */ } }
  return attempted;
}
export async function reconcileServiceRefundWebhook(refundId: string) {
  if (!/^rfnd_[a-zA-Z0-9]+$/.test(refundId)) throw new Error('Invalid refund reference.');
  const refund = await servicePaymentConfig().refunds.fetch(refundId);
  const tickets = await queryRecords<Ticket>('tickets', [{ field: 'payment.paymentId', op: 'eq', value: refund.payment_id }], { limit: 2 });
  if (tickets.length !== 1) throw new Error('Refund request unavailable.');
  await applyServiceRefund(tickets[0].id, refund);
}
