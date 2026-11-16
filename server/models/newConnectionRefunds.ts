import { getAdminFirestore } from '../middleware/auth';
import { paymentProvider, providerEnabled } from '../newConnectionPaymentProviders';
import { BookingError } from './newConnectionOrders';
import { appendPrivateNote, claimConnectionReference, connectionHash, refundInput, validConnectionId } from './newConnectionManagement';
import { withConnectionLedger, deriveConnectionLedger, moneyUnits, type NewConnectionOrder } from '../../src/lib/newConnectionOrders';
import { queueConnectionNotification, deliverConnectionNotifications } from './newConnectionNotifications';

export async function refundConnection(id: string, actor: string, input: unknown) {
  validConnectionId(id); const value = refundInput.parse(input); const db = getAdminFirestore();
  const operationId = connectionHash(`refund:${id}:${value.idempotencyKey}`); const fingerprint = connectionHash(JSON.stringify(value)); const opRef = db.doc(`server_new_connection_operations/${operationId}`);
  const claim = await db.runTransaction(async tx => {
    const ref = db.doc(`newConnectionOrders/${id}`), secret = db.doc(`server_new_connection_private/${id}`), fence = db.doc('server_runtime/newConnectionOrders');
    const [snapshot, previous, privateSnapshot] = await Promise.all([tx.get(ref), tx.get(opRef), tx.get(secret), tx.get(fence)]);
    if (!snapshot.exists) throw new BookingError('BOOKING_NOT_FOUND', 404); const order = withConnectionLedger(snapshot.data()); const saved = previous.data();
    if (saved) {
      if (saved.fingerprint !== fingerprint) throw new BookingError('IDEMPOTENCY_CONFLICT');
      return { order, gateway: saved.gateway as boolean, done: saved.status === 'completed' || saved.status === 'failed', refundId: saved.providerRefundId as string | undefined, leased: (saved.leaseUntil || 0) > Date.now() };
    }
    const source = order.ledger.find(e => e.type === 'payment' && e.id === value.paymentEntryId); if (!source) throw new BookingError('PAYMENT_REQUIRED');
    const sourceRefunded = order.ledger.filter(e => e.type === 'refund' && e.paymentEntryId === source.id).reduce((n, e) => n + moneyUnits(e.amount), 0);
    const reserved = order.pendingRefunds.filter(r => r.status === 'initiated');
    if (order.ledger.length + reserved.length >= 500) throw new BookingError('LEDGER_LIMIT_REQUIRES_SUPPORT');
    if (moneyUnits(value.amount) > moneyUnits(source.amount) - sourceRefunded - reserved.filter(r => r.paymentEntryId === source.id).reduce((n, r) => n + moneyUnits(r.amount), 0) || moneyUnits(value.amount) > moneyUnits(order.amountPaid) - reserved.reduce((n, r) => n + moneyUnits(r.amount), 0)) throw new BookingError('REFUND_EXCEEDS_PAID');
    const gateway = source.method === 'razorpay'; const provider = paymentProvider(order.provider);
    if (gateway && !providerEnabled('razorpay')) throw new BookingError('PROVIDER_DISABLED');
    if (gateway ? order.provider !== 'razorpay' || !provider.supportsRefund || value.method !== 'razorpay' : value.method === 'razorpay') throw new BookingError('INVALID_REFUND_METHOD', 400);
    if (!gateway && !value.reference) throw new BookingError('REFERENCE_REQUIRED', 400);
    const at = new Date().toISOString(); const referenceClaim = !gateway ? await claimConnectionReference(tx, value.reference, operationId, id, at) : null;
    const updated = gateway ? { ...order, status: 'refund_initiated' as const, updatedAt: at, pendingRefunds: [...order.pendingRefunds, { id: operationId, paymentEntryId: source.id, amount: value.amount, status: 'initiated' as const, providerRefundId: '' }], statusHistory: [...order.statusHistory, { status: 'refund_initiated', at, by: actor, note: value.note }].slice(-100) } : deriveConnectionLedger({ ...order, updatedAt: at, ledger: [...order.ledger, { id: operationId, type: 'refund', amount: value.amount, method: value.method, reference: value.reference, recordedBy: actor, recordedAt: at, note: value.note, paymentEntryId: source.id }] });
    if (!gateway && updated.paymentStatus === 'refunded') updated.status = 'refunded';
    if (!gateway) updated.statusHistory = [...updated.statusHistory, { status: updated.paymentStatus, at, by: actor, note: value.note }].slice(-100);
    referenceClaim?.(); tx.set(ref, updated); tx.set(fence, { updatedAt: at });
    tx.create(opRef, { fingerprint, orderId: id, type: 'refund', gateway, amount: value.amount, sourceId: source.id, paymentId: source.reference, actor, note: value.note, originalStatus: order.status === 'refund_initiated' ? privateSnapshot.data()?.refundOriginalStatus || 'cancelled' : order.status, status: gateway ? 'initiated' : 'completed', leaseUntil: gateway ? Date.now() + 60000 : 0, createdAt: at });
    appendPrivateNote(tx, id, privateSnapshot.data() || {}, actor, value.reason, at);
    if (gateway && order.status !== 'refund_initiated') tx.set(secret, { refundOriginalStatus: order.status }, { merge: true });
    if (!gateway) queueConnectionNotification(tx, updated, 'refund_recorded', operationId);
    return { order: updated, gateway, done: !gateway, leased: false, refundId: undefined as string | undefined };
  });
  if (!claim.gateway || claim.done || claim.leased) { await deliverConnectionNotifications(id); return claim.order; }
  try {
    // A stable provider key survives ambiguous network failures. Never generate another key automatically.
    const provider = paymentProvider('razorpay');
    const source = claim.order.ledger.find(e => e.id === value.paymentEntryId)!;
    const refund = claim.refundId ? await provider.getRefund!(claim.refundId) : await provider.createRefund!(claim.order, source.reference, value.amount, operationId);
    await reconcileConnectionRefund(refund.id); const snapshot = await db.doc(`newConnectionOrders/${id}`).get(); return withConnectionLedger(snapshot.data());
  } catch { await opRef.set({ leaseUntil: 0 }, { merge: true }); throw new BookingError('REFUND_VERIFICATION_PENDING', 503); }
}
export async function reconcileConnectionRefund(refundId: string): Promise<boolean> {
  const refund = await paymentProvider('razorpay').getRefund!(refundId);
  const operationId = refund.notes?.operationId; const id = refund.notes?.newConnectionOrderId;
  if (refund.notes?.purpose !== 'new_connection') return false;
  validConnectionId(id); if (typeof operationId !== 'string' || !/^[a-f0-9]{64}$/.test(operationId)) throw new BookingError('REFUND_MISMATCH');
  const db = getAdminFirestore(); const opRef = db.doc(`server_new_connection_operations/${operationId}`);
  await db.runTransaction(async tx => {
    const ref = db.doc(`newConnectionOrders/${id}`), fence = db.doc('server_runtime/newConnectionOrders'), refundClaim = db.doc(`server_new_connection_refund_refs/${connectionHash(refundId)}`);
    const [snapshot, operation, , claimed] = await Promise.all([tx.get(ref), tx.get(opRef), tx.get(fence), tx.get(refundClaim)]); const op = operation.data();
    if (!snapshot.exists || !op || op.orderId !== id || !op.gateway || op.paymentId !== refund.payment_id || refund.currency !== 'INR' || Number(refund.amount) !== moneyUnits(op.amount) || (claimed.exists && claimed.data()?.operationId !== operationId) || (op.providerRefundId && op.providerRefundId !== refundId)) throw new BookingError('REFUND_MISMATCH');
    const order = withConnectionLedger(snapshot.data());
    if (op.status === 'completed') return;
    if (!['pending', 'processed', 'failed'].includes(refund.status)) throw new BookingError('REFUND_VERIFICATION_PENDING', 503);
    const at = new Date().toISOString(); const state = refund.status === 'processed' ? 'completed' : refund.status === 'failed' ? 'failed' : 'initiated';
    // A delayed failure must not roll back a completed ledger entry.
    const updated = deriveConnectionLedger({ ...order, updatedAt: at, pendingRefunds: order.pendingRefunds.map(r => r.id === operationId ? { ...r, status: state, providerRefundId: refundId } : r), ledger: state === 'completed' ? [...order.ledger, { id: operationId, type: 'refund', amount: op.amount, method: 'razorpay', reference: refundId, paymentEntryId: op.sourceId, recordedBy: op.actor, recordedAt: at, note: op.note }] : order.ledger });
    if (state === 'completed' || state === 'failed') {
      if (!updated.pendingRefunds.some(r => r.status === 'initiated')) updated.status = updated.paymentStatus === 'refunded' ? 'refunded' : op.originalStatus;
      if (op.status !== state) updated.statusHistory = [...updated.statusHistory, { status: state === 'failed' ? 'refund_failed' : updated.paymentStatus, at, by: op.actor, note: state === 'completed' ? op.note : '' }].slice(-100);
    }
    tx.set(ref, updated); tx.set(fence, { updatedAt: at }); tx.set(opRef, { status: state, providerRefundId: refundId, leaseUntil: 0 }, { merge: true }); tx.set(refundClaim, { operationId, orderId: id });
    if (state === 'completed') queueConnectionNotification(tx, updated, 'refund_recorded', operationId);
  });
  await deliverConnectionNotifications(id); return true;
}
