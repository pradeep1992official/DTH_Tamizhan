import { createHash } from 'node:crypto';
import { z } from 'zod';
import { field, and, or, countAll } from '@google-cloud/firestore/pipelines';
import { getAdminFirestore } from '../middleware/auth';
import { BookingError } from './newConnectionOrders';
import { connectionTransitions, bookingStatusSchema, paymentStatusSchema, paymentProviders, TN_DISTRICTS, withConnectionLedger, deriveConnectionLedger, moneyUnits, type NewConnectionOrder } from '../../src/lib/newConnectionOrders';
import { queueConnectionNotification, deliverConnectionNotifications } from './newConnectionNotifications';

export const connectionHash = (s: string) => createHash('sha256').update(s).digest('hex');
const money = z.number().positive().max(10000000).refine(v => /^\d+(?:\.\d{1,2})?$/.test(String(v)));
const note = z.string().trim().max(500).default('');
const reference = z.string().trim().max(128).transform(s => s.replace(/\s+/g, '').toUpperCase()).default('');
export const collectionInput = z.object({ amount: money, method: z.enum(['cash', 'upi', 'bank_transfer', 'other']), reference, note, privateNote: note, idempotencyKey: z.string().uuid() }).strict();
export const refundInput = z.object({ amount: money, paymentEntryId: z.string().min(1).max(128), method: z.enum(['cash', 'upi', 'bank_transfer', 'other', 'razorpay']), reference, reason: z.string().trim().min(5).max(500), note, idempotencyKey: z.string().uuid() }).strict();
export function validConnectionId(id: string) { if (!/^nc_[a-f0-9]{48}$/.test(id)) throw new BookingError('BOOKING_NOT_FOUND', 404); }
export async function adminConnection(id: string) {
  validConnectionId(id); const db = getAdminFirestore();
  const [snapshot, secret] = await Promise.all([db.doc(`newConnectionOrders/${id}`).get(), db.doc(`server_new_connection_private/${id}`).get()]);
  if (!snapshot.exists) throw new BookingError('BOOKING_NOT_FOUND', 404);
  const privateData = secret.data() || {};
  return { order: withConnectionLedger(snapshot.data()), privateNotes: privateData.notes || [], bankCheck: { note: privateData.adminNotes || '', by: privateData.bankCheckedBy || '', at: privateData.bankCheckedAt || '' } };
}
export function appendPrivateNote(tx: FirebaseFirestore.Transaction, id: string, previous: Record<string, any>, actor: string, text: string, at: string) {
  if (text) {
    if ((previous.notes || []).length >= 500) throw new BookingError('PRIVATE_NOTE_LIMIT_REQUIRES_SUPPORT');
    tx.set(getAdminFirestore().doc(`server_new_connection_private/${id}`), { notes: [...(previous.notes || []), { by: actor, at, text }] }, { merge: true });
  }
}
// Same namespace as Part 3's YouPI UTR claims, including offline UPI/bank receipts.
export async function claimConnectionReference(tx: FirebaseFirestore.Transaction, reference: string, operationId: string, orderId: string, at: string) {
  if (!reference) throw new BookingError('REFERENCE_REQUIRED', 400);
  const ref = getAdminFirestore().doc(`server_new_connection_payment_refs/${connectionHash(`youpi:${reference}`)}`); const previous = await tx.get(ref);
  if (previous.exists && previous.data()?.operationId !== operationId) throw new BookingError('PAYMENT_REFERENCE_USED');
  return () => tx.set(ref, { orderId, operationId, at });
}
export async function recordConnectionCollection(id: string, actor: string, input: unknown) {
  validConnectionId(id); const value = collectionInput.parse(input); const db = getAdminFirestore(); const operationId = connectionHash(`payment:${id}:${value.idempotencyKey}`); const fingerprint = connectionHash(JSON.stringify(value));
  const result = await db.runTransaction(async tx => {
    const ref = db.doc(`newConnectionOrders/${id}`), secret = db.doc(`server_new_connection_private/${id}`), fence = db.doc('server_runtime/newConnectionOrders'), operation = db.doc(`server_new_connection_operations/${operationId}`);
    const [snapshot, previous, privateSnapshot] = await Promise.all([tx.get(ref), tx.get(operation), tx.get(secret), tx.get(fence)]);
    if (!snapshot.exists) throw new BookingError('BOOKING_NOT_FOUND', 404);
    const order = withConnectionLedger(snapshot.data());
    if (previous.exists) { if (previous.data()?.fingerprint !== fingerprint) throw new BookingError('IDEMPOTENCY_CONFLICT'); return order; }
    if (['cancelled', 'refunded', 'refund_initiated'].includes(order.status)) throw new BookingError('COLLECTION_UNAVAILABLE');
    if (moneyUnits(value.amount) > moneyUnits(order.balance)) throw new BookingError('EXCEEDS_BALANCE');
    // An outstanding gateway attempt must be settled first; otherwise it could overpay later.
    if (order.amountDueNow > 0 && ['razorpay', 'youpi'].includes(order.provider) && !order.providerPaymentId) throw new BookingError('VERIFY_GATEWAY_FIRST');
    const at = new Date().toISOString();
    const claim = ['upi', 'bank_transfer'].includes(value.method) ? await claimConnectionReference(tx, value.reference, operationId, id, at) : null;
    const updated = deriveConnectionLedger({ ...order, updatedAt: at, statusHistory: [...order.statusHistory, { status: 'payment_recorded', at, by: actor, note: value.note }].slice(-100), ledger: [...order.ledger, { id: operationId, type: 'payment', amount: value.amount, method: value.method, reference: value.reference, note: value.note, paymentEntryId: '', recordedBy: actor, recordedAt: at }] });
    claim?.(); tx.set(ref, updated); tx.set(fence, { updatedAt: at }); tx.create(operation, { fingerprint, orderId: id, type: 'payment', at });
    appendPrivateNote(tx, id, privateSnapshot.data() || {}, actor, value.privateNote, at);
    queueConnectionNotification(tx, updated, 'payment_recorded', operationId);
    return updated;
  });
  await deliverConnectionNotifications(id); return result;
}
export async function changeConnectionStatus(id: string, actor: string, input: unknown) {
  validConnectionId(id);
  const value = z.object({ status: bookingStatusSchema, providerCustomerId: z.string().trim().min(1).max(128).optional(), providerBookingId: z.string().trim().min(1).max(128).optional(), visibleNote: note, privateNote: note, reason: note, schedule: z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s), slot: z.enum(['Morning', 'Afternoon', 'Evening', 'Any']) }).optional(), cancellationResponse: z.enum(['accepted', 'declined']).optional(), idempotencyKey: z.string().uuid() }).strict().parse(input);
  const db = getAdminFirestore(); const operationId = connectionHash(`status:${id}:${value.idempotencyKey}`); const fingerprint = connectionHash(JSON.stringify(value));
  const result = await db.runTransaction(async tx => {
    const ref = db.doc(`newConnectionOrders/${id}`), secret = db.doc(`server_new_connection_private/${id}`), fence = db.doc('server_runtime/newConnectionOrders'), op = db.doc(`server_new_connection_operations/${operationId}`);
    const [snapshot, privateSnapshot, previous] = await Promise.all([tx.get(ref), tx.get(secret), tx.get(op), tx.get(fence)]);
    if (!snapshot.exists) throw new BookingError('BOOKING_NOT_FOUND', 404);
    const current = withConnectionLedger(snapshot.data());
    if (previous.exists) { if (previous.data()?.fingerprint !== fingerprint) throw new BookingError('IDEMPOTENCY_CONFLICT'); return current; }
    if (value.cancellationResponse && current.cancellationRequest?.status !== 'open') throw new BookingError('NO_OPEN_CANCELLATION');
    const decline = value.cancellationResponse === 'declined';
    const noteOnly = value.status === current.status && !value.cancellationResponse && Boolean(value.privateNote || value.visibleNote || value.providerCustomerId || value.providerBookingId) && !value.reason;
    if (decline ? value.status !== current.status : !noteOnly && !connectionTransitions[current.status].includes(value.status)) throw new BookingError('INVALID_TRANSITION');
    if (!decline && !noteOnly && value.status === 'cancelled' && value.reason.trim().length < 5) throw new BookingError('PRIVATE_REASON_REQUIRED', 400);
    if (value.cancellationResponse === 'accepted' && value.status !== 'cancelled') throw new BookingError('INVALID_TRANSITION');
    if (value.status === 'scheduled' && !decline && !noteOnly && !value.schedule) throw new BookingError('SCHEDULE_REQUIRED', 400);
    if (!decline && value.status === 'booked' && !(value.providerCustomerId || current.providerCustomerId)) throw new BookingError('PROVIDER_CUSTOMER_ID_REQUIRED', 400);
    if (!decline && value.status === 'booked' && !(value.providerBookingId || current.providerBookingId)) throw new BookingError('PROVIDER_BOOKING_ID_REQUIRED', 400);
    const at = new Date().toISOString();
    const updated: NewConnectionOrder = { ...current, ...(value.providerCustomerId ? { providerCustomerId: value.providerCustomerId } : {}), ...(value.providerBookingId ? { providerBookingId: value.providerBookingId } : {}), status: value.status, updatedAt: at, schedule: value.status === 'scheduled' && !decline && !noteOnly ? value.schedule! : current.schedule, installedAt: value.status === 'installed' && !decline && !noteOnly ? at : current.installedAt, cancellationRequest: current.cancellationRequest && (value.cancellationResponse || value.status === 'cancelled') ? { ...current.cancellationRequest, status: value.cancellationResponse || 'accepted' } : current.cancellationRequest, statusHistory: noteOnly && !value.visibleNote ? current.statusHistory : [...current.statusHistory, { status: decline ? 'cancellation_declined' : noteOnly ? 'note_added' : value.status, at, by: actor, note: value.visibleNote }].slice(-100) };
    tx.set(ref, updated); tx.set(fence, { updatedAt: at }); tx.create(op, { fingerprint, orderId: id, type: 'status', actor, status: updated.status, ...(value.providerCustomerId ? { providerCustomerId: value.providerCustomerId } : {}), ...(value.providerBookingId ? { providerBookingId: value.providerBookingId } : {}), visibleNote: value.visibleNote, cancellationResponse: value.cancellationResponse || '', at });
    appendPrivateNote(tx, id, privateSnapshot.data() || {}, actor, [value.reason, value.privateNote].filter(Boolean).join('\n'), at);
    if (!noteOnly) queueConnectionNotification(tx, updated, decline ? 'cancellation_declined' : value.status, operationId); return updated;
  });
  await deliverConnectionNotifications(id); return result;
}
export async function requestConnectionCancellation(uid: string, id: string, input: unknown) {
  validConnectionId(id); const value = z.object({ customerReason: z.string().trim().min(3).max(500) }).strict().parse(input); const db = getAdminFirestore();
  return db.runTransaction(async tx => {
    const ref = db.doc(`newConnectionOrders/${id}`), fence = db.doc('server_runtime/newConnectionOrders'); const [snapshot] = await Promise.all([tx.get(ref), tx.get(fence)]);
    if (!snapshot.exists || snapshot.data()?.uid !== uid) throw new BookingError('BOOKING_NOT_FOUND', 404);
    const order = withConnectionLedger(snapshot.data());
    if (!['received', 'contacted'].includes(order.status)) throw new BookingError('CANCELLATION_UNAVAILABLE');
    if (order.cancellationRequest?.status === 'open') throw new BookingError('CANCELLATION_ALREADY_REQUESTED');
    const at = new Date().toISOString(); const updated: NewConnectionOrder = { ...order, cancellationRequest: { at, customerReason: value.customerReason, status: 'open' }, updatedAt: at };
    tx.set(ref, updated); tx.set(fence, { updatedAt: at }); return updated;
  });
}
export const connectionListSchema = z.object({ status: bookingStatusSchema.optional(), paymentStatus: paymentStatusSchema.optional(), provider: z.enum(paymentProviders).optional(), brandId: z.string().max(128).optional(), district: z.enum(TN_DISTRICTS).optional(), from: z.iso.date().optional(), to: z.iso.date().optional(), search: z.string().trim().max(100).optional(), cancellation: z.enum(['true']).optional(), awaiting: z.enum(['true']).optional(), cursor: z.string().max(500).optional() }).strict();
export type ConnectionListInput = z.infer<typeof connectionListSchema>;
export async function connectionBrandOptions() {
  const result = await getAdminFirestore().pipeline().collection('dthBrands').limit(201).execute();
  const brands = result.results.slice(0, 200).map(r => ({ id: String(r.data().id), name: String(r.data().name) })).sort((a, b) => a.name.localeCompare(b.name));
  return { brands, limited: result.results.length > 200 };
}
function paymentReviewFilter() {
  return and(field('status').equalAny(bookingStatusSchema.options.filter(status => status !== 'cancelled')), field('provider').equalAny(['razorpay', 'youpi']), field('paymentStatus').equalAny(['pending', 'awaiting_admin_confirmation']), field('providerPaymentId').equal(''), field('amountDueNow').greaterThan(0));
}
function filteredConnectionQuery(input: ConnectionListInput, uid?: string) {
  let q = getAdminFirestore().pipeline().collection('newConnectionOrders');
  if (uid) q = q.where(field('uid').equal(uid));
  for (const key of ['status', 'paymentStatus', 'provider', 'brandId'] as const) if (input[key]) q = q.where(field(key).equal(input[key]));
  if (input.district) q = q.where(field('customer.district').equal(input.district));
  if (input.cancellation) q = q.where(field('cancellationRequest.status').equal('open'));
  if (input.awaiting) q = q.where(paymentReviewFilter());
  if (input.from) q = q.where(field('createdAt').greaterThanOrEqual(new Date(input.from + 'T00:00:00+05:30').toISOString()));
  if (input.to) q = q.where(field('createdAt').lessThan(new Date(Date.parse(input.to + 'T00:00:00+05:30') + 86400000).toISOString()));
  if (input.search) { const search = input.search.toLowerCase(); q = q.where(or(field('customer.name').toLower().startsWith(search), field('customer.phone').startsWith(search), field('bookingId').toLower().startsWith(search))); }
  return q;
}
export async function listConnections(input: unknown, uid?: string, limit = 50) {
  const value = connectionListSchema.parse(input); let q = filteredConnectionQuery(value, uid);
  if (value.from && value.to && value.from > value.to) throw new BookingError('INVALID_DATE_RANGE', 400);
  if (value.cursor) { let cursor; try { cursor = z.object({ time: z.iso.datetime(), id: z.string().regex(/^nc_[a-f0-9]{48}$/) }).parse(JSON.parse(Buffer.from(value.cursor, 'base64url').toString())); } catch { throw new BookingError('INVALID_CURSOR', 400); } q = q.where(or(field('createdAt').lessThan(cursor.time), and(field('createdAt').equal(cursor.time), field('id').lessThan(cursor.id)))); }
  const rows = (await q.sort(field('createdAt').descending(), field('id').descending()).limit(limit + 1).execute()).results.map(r => withConnectionLedger(r.data()));
  const orders = rows.slice(0, limit); const last = orders.at(-1);
  return { orders, nextCursor: rows.length > limit && last ? Buffer.from(JSON.stringify({ time: last.createdAt, id: last.id })).toString('base64url') : null };
}
export function connectionCsv(orders: NewConnectionOrder[]) {
  const cell = (v: unknown) => '"' + String(v ?? '').replace(/^[\s]*[=+@-]/, s => "'" + s).replaceAll('"', '""') + '"';
  const headers = ['Booking ID', 'Created', 'Customer', 'Phone', 'Brand', 'Pack', 'District', 'Pincode', 'Total INR', 'Paid net INR', 'Refunded INR', 'Balance INR', 'Payment status', 'Booking status', 'Provider'];
  return [headers, ...orders.map(o => [o.bookingId, o.createdAt, o.customer.name, o.customer.phone, o.snapshot.brand, o.snapshot.pack, o.customer.district, o.customer.pincode, o.priceBreakdown.total, o.amountPaid, o.amountRefunded, o.balance, o.paymentStatus, o.status, o.provider])].map(r => r.map(cell).join(',')).join('\r\n');
}
export async function exportConnections(input: unknown) {
  let cursor: string | undefined; const rows: NewConnectionOrder[] = [];
  for (let page = 0; page < 20; page++) { const result = await listConnections({ ...connectionListSchema.parse(input), cursor }, undefined, 250); rows.push(...result.orders); if (!result.nextCursor) return connectionCsv(rows); cursor = result.nextCursor; }
  throw new BookingError('EXPORT_LIMIT_NARROW_FILTERS', 400);
}
export async function connectionCounters() {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()); const start = new Date(today + 'T00:00:00+05:30').toISOString(); const month = new Date(today.slice(0, 8) + '01T00:00:00+05:30').toISOString();
  const count = async (expression: ReturnType<ReturnType<typeof field>['equal']>) => Number((await getAdminFirestore().pipeline().collection('newConnectionOrders').where(expression).aggregate(countAll().as('count')).execute()).results[0]?.data().count || 0);
  const [newToday, awaitingContact, awaitingScheduling, awaitingConfirmation, installedThisMonth] = await Promise.all([count(field('createdAt').greaterThanOrEqual(start)), count(field('status').equal('received')), count(field('status').equalAny(['contacted', 'booked'])), count(paymentReviewFilter()), count(field('installedAt').greaterThanOrEqual(month))]);
  // Aggregate on the server: return totals, never download the full order collection.
  const ledger = getAdminFirestore().pipeline().collection('newConnectionOrders').where(and(field('testMode').equal(false), field('updatedAt').greaterThanOrEqual(month))).unnest(field('ledger').as('entry')).where(field('entry.recordedAt').greaterThanOrEqual(month));
  const [payments, refunds, legacy] = await Promise.all([
    ledger.where(field('entry.type').equal('payment')).aggregate(field('entry.amount').sum().as('total')).execute(),
    ledger.where(field('entry.type').equal('refund')).aggregate(field('entry.amount').sum().as('total')).execute(),
    getAdminFirestore().pipeline().collection('newConnectionOrders').where(and(field('testMode').equal(false), field('updatedAt').greaterThanOrEqual(month), field('ledger').ifNull([]).arrayLength().equal(0), field('paymentStatus').equal('paid'), field('providerPaymentId').notEqual(''))).unnest(field('statusHistory').as('history')).where(and(field('history.status').equal('paid'), field('history.at').greaterThanOrEqual(month))).aggregate(field('amountDueNow').sum().as('total')).execute(),
  ]);
  const total = (result: typeof payments) => Number(result.results[0]?.data().total || 0);
  return { newToday, awaitingContact, awaitingScheduling, awaitingConfirmation, installedThisMonth, collectedThisMonth: Math.round((total(payments) - total(refunds) + total(legacy)) * 100) / 100 };
}
