import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { getAdminFirestore } from '../middleware/auth';
import { razorpayClient, verifyPaymentSignature } from '../razorpay';
import { ticketSchema, type Ticket } from '../../src/lib/tickets';
import { documentKey } from '../persistence';

export function servicePaymentConfig() {
  // Live service payments stay disabled until the merchant completes the test checklist.
  if (!process.env.RAZORPAY_KEY_ID?.startsWith('rzp_test_') || !process.env.RAZORPAY_KEY_SECRET) throw new Error('Service checkout is available only with configured Razorpay test keys.');
  return razorpayClient();
}
export async function attachServiceCheckout(uid: string, ticket: Ticket) {
  const client = servicePaymentConfig();
  const db = getAdminFirestore(); const ref = db.collection('tickets').doc(ticket.id); const privateRef = db.collection('server_ticket_private').doc(ticket.id);
  const claim = await db.runTransaction(async tx => {
    const [snapshot, privateSnapshot] = await Promise.all([tx.get(ref), tx.get(privateRef)]);
    const current = ticketSchema.parse(snapshot.data());
    if (current.uid !== uid || current.status !== 'pending_payment' || Date.now() - Date.parse(current.checkoutStartedAt || current.createdAt) >= 30 * 60_000) throw new Error('This checkout is no longer available.');
    if (current.payment.gatewayOrderId) return current.payment.gatewayOrderId;
    if (privateSnapshot.data()?.gatewayCreationStarted) throw new Error('Checkout creation is unconfirmed. Contact Support before trying another payment.');
    tx.set(privateRef, { gatewayCreationStarted: true }, { merge: true }); return null;
  });
  let orderId = claim;
  if (!orderId) {
    // Never blindly repeat a provider order creation after an ambiguous network failure.
    const order = await client.orders.create({ amount: 5000, currency: 'INR', receipt: ticket.ticketNo, notes: { ticketId: ticket.id, uid, purpose: 'service_request' } });
    if (Number(order.amount) !== 5000 || order.currency !== 'INR') throw new Error('Provider order mismatch.');
    orderId = order.id;
    await db.runTransaction(async tx => { const snapshot = await tx.get(ref); const current = ticketSchema.parse(snapshot.data());
      if (current.payment.gatewayOrderId && current.payment.gatewayOrderId !== order.id) throw new Error('Checkout mismatch.');
      tx.update(ref, { 'payment.gatewayOrderId': order.id });
    });
  }
  return { ticketId: ticket.id, ticketNo: ticket.ticketNo, order_id: orderId, key_id: process.env.RAZORPAY_KEY_ID, amount: 5000, currency: 'INR' };
}
export async function confirmServicePayment(ticketId: string, paymentId: string, expectedUid?: string) {
  if (!/^[\w-]{1,128}$/.test(ticketId) || !/^pay_[a-zA-Z0-9]+$/.test(paymentId)) throw new Error('Invalid payment reference.');
  const client = servicePaymentConfig(); const db = getAdminFirestore(); const ref = db.collection('tickets').doc(ticketId);
  const snapshot = await ref.get(); const ticket = ticketSchema.parse(snapshot.data());
  if (ticket.type !== 'service_request' || (expectedUid && ticket.uid !== expectedUid)) throw new Error('Payment does not belong to your account.');
  const payment = await client.payments.fetch(paymentId);
  const order = await client.orders.fetch(payment.order_id);
  const notes = order.notes as Record<string, string>;
  if (order.id !== ticket.payment.gatewayOrderId || payment.order_id !== order.id || Number(payment.amount) !== 5000 || payment.currency !== 'INR' || Number(order.amount) !== 5000 || order.currency !== 'INR' || notes.ticketId !== ticket.id || notes.uid !== ticket.uid || notes.purpose !== 'service_request') throw new Error('Payment does not match this request.');
  if (payment.status !== 'captured' || order.status !== 'paid') return { paid: false, ticketId };
  const processedRef = db.collection('server_service_payments').doc(documentKey(paymentId));
  await db.runTransaction(async tx => {
    const [currentSnapshot, processed] = await Promise.all([tx.get(ref), tx.get(processedRef)]);
    const current = ticketSchema.parse(currentSnapshot.data());
    if (processed.exists) { if (processed.data()?.ticketId !== ticketId) throw new Error('Payment already linked.'); return; }
    if (current.payment.paymentId && current.payment.paymentId !== paymentId) throw new Error('Another payment is already linked.');
    if (!['pending_payment', 'expired'].includes(current.status)) throw new Error('Unexpected payment state.');
    const lockRef = db.collection('server_ticket_locks').doc(documentKey(`${current.uid}:${current.brand}:${current.subscriberId}`));
    const held = await tx.get(lockRef);
    const now = new Date().toISOString();
    tx.update(ref, { status: 'paid', payment: { ...current.payment, status: 'paid', paymentId, paidAt: now }, updatedAt: now,
      statusHistory: [...current.statusHistory, { status: 'paid', timestamp: now, by: 'payment_verification' }] });
    tx.create(processedRef, { ticketId, paymentId, createdAt: now });
    // Durable event is consumed by receipt/email workers; no external side effect in transaction.
    tx.set(db.collection('server_ticket_events').doc(`${ticketId}_paid`), { ticketId, event: 'paid', createdAt: now, processed: false });
    if (held.data()?.active && held.data()?.ticketId !== ticketId) {
      tx.set(db.collection('server_ticket_private').doc(ticketId), { latePaymentNeedsReview: true, refundNeedsAttention: true }, { merge: true });
    } else tx.set(lockRef, { active: true, ticketId });
  });
  return { paid: true, ticketId };
}
export const serviceSignatureSchema = z.object({ ticketId: z.string().regex(/^[\w-]{1,128}$/), razorpay_order_id: z.string().regex(/^order_[a-zA-Z0-9]+$/), razorpay_payment_id: z.string().regex(/^pay_[a-zA-Z0-9]+$/), razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i) }).strict();
export async function verifyServiceCheckout(uid: string, input: unknown) {
  const value = serviceSignatureSchema.parse(input); servicePaymentConfig();
  const snapshot = await getAdminFirestore().collection('tickets').doc(value.ticketId).get(); const ticket = ticketSchema.parse(snapshot.data());
  if (ticket.uid !== uid || ticket.payment.gatewayOrderId !== value.razorpay_order_id || !verifyPaymentSignature(ticket.payment.gatewayOrderId, value.razorpay_payment_id, value.razorpay_signature, process.env.RAZORPAY_KEY_SECRET!)) throw new Error('Payment signature or ownership could not be verified.');
  return confirmServicePayment(value.ticketId, value.razorpay_payment_id, uid);
}
export async function resumeServiceCheckout(uid: string, ticketId: string, now = Date.now()) {
  if (!/^[\w-]{1,128}$/.test(ticketId)) throw new Error('Invalid ticket reference.');
  const client = servicePaymentConfig(); const snapshot = await getAdminFirestore().collection('tickets').doc(ticketId).get();
  const ticket = ticketSchema.parse(snapshot.data());
  if (ticket.uid !== uid || ticket.type !== 'service_request') throw new Error('Request unavailable.');
  if (ticket.payment.paidAt) return { paid: true };
  if (!ticket.payment.gatewayOrderId) throw new Error('Checkout creation is unconfirmed. Contact Support.');
  const order = await client.orders.fetch(ticket.payment.gatewayOrderId); const notes = order.notes as Record<string, string>;
  if (Number(order.amount) !== 5000 || order.currency !== 'INR' || notes.uid !== uid || notes.ticketId !== ticketId || notes.purpose !== 'service_request') throw new Error('Checkout mismatch.');
  // Reconcile a captured payment before showing a payment button after reload.
  if (order.status === 'paid' || order.status === 'attempted') {
    const payments = await client.orders.fetchPayments(order.id); const captured = payments.items.find(payment => payment.status === 'captured');
    if (captured) return confirmServicePayment(ticketId, captured.id, uid);
    if (order.status === 'paid' || payments.items.some(payment => payment.status === 'authorized')) return { paid: false, pending: true };
  }
  if (ticket.status !== 'pending_payment' || now >= Date.parse(ticket.checkoutStartedAt || ticket.createdAt) + 30 * 60_000) throw new Error('This unpaid checkout has expired.');
  return { paid: false, ticketId, ticketNo: ticket.ticketNo, order_id: order.id, key_id: process.env.RAZORPAY_KEY_ID, amount: 5000, currency: 'INR' };
}
export function verifyServiceWebhook(raw: Buffer, signature: unknown) {
  const secret = process.env.SERVICE_RAZORPAY_WEBHOOK_SECRET;
  if (!secret || typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  return timingSafeEqual(createHmac('sha256', secret).update(raw).digest(), Buffer.from(signature, 'hex'));
}
