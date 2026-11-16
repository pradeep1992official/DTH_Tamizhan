import { createHash } from 'node:crypto';
import { z } from 'zod';
import { getAdminFirestore } from '../middleware/auth';
import { queryRecords } from '../queries';
import { readNewConnectionCatalog } from './newConnectionCatalog';
import { paymentProvider, providerEnabled, type Checkout, type ProviderResult } from '../newConnectionPaymentProviders';
import { bookingInputSchema, newConnectionOrderSchema, installationDateBounds, bookingServiceable, selectedBookingItem, calculateNewConnectionPrice, advanceQuote, sameBookingQuote, moneyUnits, type BookingInput, type NewConnectionOrder } from '../../src/lib/newConnectionOrders';

const collection = 'newConnectionOrders'; const fencePath = 'server_runtime/newConnectionOrders';
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const privatePath = (id: string) => `server_new_connection_private/${id}`;
export class BookingError extends Error { constructor(public code: string, public status = 409, public details?: unknown) { super(code); } }
export async function ownedBooking(uid: string, id: string) {
  if (!/^nc_[a-f0-9]{48}$/.test(id)) throw new BookingError('BOOKING_NOT_FOUND', 404);
  const snapshot = await getAdminFirestore().collection(collection).doc(id).get();
  if (!snapshot.exists || snapshot.data()?.uid !== uid) throw new BookingError('BOOKING_NOT_FOUND', 404);
  return newConnectionOrderSchema.parse(snapshot.data());
}
export async function createBooking(uid: string, value: unknown, now = Date.now()) {
  const input = bookingInputSchema.parse(value); const bounds = installationDateBounds(now);
  if (now - input.formStartedAt < 3000 || input.formStartedAt > now || now - input.formStartedAt > 24 * 3600000) throw new BookingError('FORM_TOO_FAST', 400);
  if (input.customer.preferredDate < bounds.min || input.customer.preferredDate > bounds.max || new Date(`${input.customer.preferredDate}T00:00:00Z`).toISOString().slice(0, 10) !== input.customer.preferredDate) throw new BookingError('INVALID_DATE', 400);
  const id = `nc_${hash(`${uid}:${input.idempotencyKey}`).slice(0, 48)}`; const db = getAdminFirestore();
  const requestHash = hash(JSON.stringify({ ...input, formStartedAt: 0 }));
  return db.runTransaction(async tx => {
    const ref = db.collection(collection).doc(id); const secretRef = db.doc(privatePath(id)); const fence = db.doc(fencePath);
    const [previous, privateRecord] = await Promise.all([tx.get(ref), tx.get(secretRef), tx.get(fence), tx.get(db.doc('server_runtime/newConnectionCatalog'))]);
    if (previous.exists) {
      if (privateRecord.data()?.requestHash !== requestHash) throw new BookingError('IDEMPOTENCY_CONFLICT');
      return { order: newConnectionOrderSchema.parse(previous.data()), duplicate: false };
    }
    const data = await readNewConnectionCatalog(); const settings = data.settings;
    if (!bookingServiceable(input.customer, settings)) throw new BookingError('NOT_SERVICEABLE', 400);
    let selected;
    try { selected = selectedBookingItem(data, input.brandId, input.packId, input.offerId, input.selectedValidityDays); } catch { throw new BookingError('SELECTION_UNAVAILABLE'); }
    const quote = advanceQuote(calculateNewConnectionPrice(selected.option.price, selected.offer, input.connectionCount), settings);
    if (!sameBookingQuote(quote, input.displayedQuote)) throw new BookingError('PRICE_CHANGED', 409, quote);
    if (quote.amountDueNow === 0 ? input.provider !== 'none' : !['razorpay', 'youpi'].includes(input.provider) || !settings.enabledProviders.includes(input.provider as 'razorpay' | 'youpi') || !providerEnabled(input.provider)) throw new BookingError('PROVIDER_DISABLED');
    if (input.provider === 'razorpay' && quote.amountDueNow < 1) throw new BookingError('INVALID_PAYMENT_AMOUNT', 400);
    const since = new Date(now - 24 * 3600000).toISOString();
    const [byUser, byPhone] = await Promise.all([queryRecords<NewConnectionOrder>(collection, [{ field: 'uid', op: 'eq', value: uid }, { field: 'createdAt', op: 'gt', value: since }]), queryRecords<NewConnectionOrder>(collection, [{ field: 'customer.phone', op: 'eq', value: input.customer.phone }, { field: 'createdAt', op: 'gt', value: since }])]);
    const unpaid = (o: NewConnectionOrder) => ['pending', 'awaiting_admin_confirmation', 'failed'].includes(o.paymentStatus) && !['cancelled', 'refunded'].includes(o.status);
    const duplicate = byPhone.find(o => unpaid(o) && o.brandId === input.brandId && o.packId === input.packId && o.customer.pincode === input.customer.pincode);
    if (duplicate) { if (duplicate.uid !== uid) throw new BookingError('DUPLICATE_BOOKING'); return { order: newConnectionOrderSchema.parse(duplicate), duplicate: true }; }
    if (byUser.filter(unpaid).length >= 3 || byPhone.filter(unpaid).length >= 3) throw new BookingError('BOOKING_LIMIT', 429);
    const counterRef = db.doc(`server_new_connection_counters/${bounds.today}`); const counter = await tx.get(counterRef); const next = Number(counter.data()?.value ?? 0) + 1;
    if (next >= 36 ** 4) throw new BookingError('BOOKING_LIMIT', 503);
    const at = new Date(now).toISOString(); const order = newConnectionOrderSchema.parse({ ...quote, id, bookingId: `DTH-NC-${bounds.today.replaceAll('-', '').slice(2)}-${next.toString(36).toUpperCase().padStart(4, '0')}`, uid, brandId: input.brandId, packId: input.packId, offerId: input.offerId, selectedValidityDays: input.selectedValidityDays, connectionCount: input.connectionCount, snapshot: { brand: selected.item.brand.name, pack: selected.item.pack.name, offer: selected.offer.name }, customer: input.customer, provider: input.provider, providerOrderId: '', providerPaymentId: '', providerRaw: {}, paymentStatus: 'pending', status: 'received', statusHistory: [{ status: 'received', at, by: uid, note: '' }], consent: { ...input.consent, at }, createdAt: at, updatedAt: at, testMode: input.provider === 'razorpay' });
    tx.create(ref, order); tx.create(secretRef, { requestHash, gatewayCreationStarted: false }); tx.set(counterRef, { value: next }); tx.set(fence, { updatedAt: at });
    return { order, duplicate: false };
  });
}
export async function startBookingCheckout(uid: string, id: string, now = Date.now()): Promise<{ order: NewConnectionOrder; checkout: Checkout | null; pending?: boolean }> {
  let order = await ownedBooking(uid, id);
  if (order.paymentStatus === 'paid' || order.amountDueNow === 0) return { order, checkout: null };
  // Fetch any captured payment before offering a retry, including after a browser crash.
  if (order.providerOrderId) {
    order = await reconcileBooking(order);
    if (order.paymentStatus !== 'pending') return { order, checkout: null };
    if (order.providerRaw.status === 'authorized' || (order.provider === 'youpi' && ['FAILED', 'EXPIRED', 'CANCELLED'].includes(String(order.providerRaw.status)))) return { order, checkout: null, pending: true };
  }
  if (now - Date.parse(order.createdAt) >= 24 * 3600000 || order.status !== 'received') throw new BookingError('CHECKOUT_EXPIRED');
  const data = await readNewConnectionCatalog();
  try { selectedBookingItem(data, order.brandId, order.packId, order.offerId, order.selectedValidityDays); } catch { throw new BookingError('SELECTION_UNAVAILABLE'); }
  if (!data.settings.enabledProviders.includes(order.provider as 'razorpay' | 'youpi') || !providerEnabled(order.provider)) throw new BookingError('PROVIDER_DISABLED');
  const db = getAdminFirestore(); const secretRef = db.doc(privatePath(id)); const orderRef = db.collection(collection).doc(id);
  const claim = await db.runTransaction(async tx => {
    const [currentSnapshot, secretSnapshot] = await Promise.all([tx.get(orderRef), tx.get(secretRef)]); const current = newConnectionOrderSchema.parse(currentSnapshot.data()); const secret = secretSnapshot.data();
    if (current.paymentStatus !== 'pending') return { done: true };
    if (secret?.checkout) return { checkout: secret.checkout as Checkout };
    if (current.providerOrderId && current.provider === 'razorpay') return { checkout: { provider: 'razorpay', providerOrderId: current.providerOrderId, keyId: process.env.RAZORPAY_KEY_ID, amount: moneyUnits(current.amountDueNow), currency: 'INR', testMode: true } as Checkout };
    if (secret?.gatewayCreationStarted) return { pending: true };
    tx.set(secretRef, { gatewayCreationStarted: true, gatewayStartedAt: new Date(now).toISOString() }, { merge: true }); return { create: true };
  });
  if (claim.checkout) return { order, checkout: claim.checkout };
  if (!claim.create) return { order: await ownedBooking(uid, id), checkout: null, pending: true };
  // Never repeat a provider creation after an ambiguous failure. The durable claim
  // remains for webhook recovery/admin investigation; no external calls inside tx.
  const checkout = await paymentProvider(order.provider).createCheckout(order);
  await db.runTransaction(async tx => {
    const snapshot = await tx.get(orderRef); const current = newConnectionOrderSchema.parse(snapshot.data());
    if (current.providerOrderId && current.providerOrderId !== checkout.providerOrderId) throw new BookingError('PROVIDER_MISMATCH');
    tx.update(orderRef, { providerOrderId: checkout.providerOrderId, razorpayOrderId: current.provider === 'razorpay' ? checkout.providerOrderId : '', updatedAt: new Date().toISOString() });
    tx.set(secretRef, { checkout }, { merge: true });
  });
  return { order: await ownedBooking(uid, id), checkout };
}
async function applyResult(order: NewConnectionOrder, result: ProviderResult, deliveryId?: string, actor = 'payment_verification', adminNote?: string) {
  const db = getAdminFirestore();
  return db.runTransaction(async tx => {
    const ref = db.collection(collection).doc(order.id); const fence = db.doc(fencePath); const [snapshot] = await Promise.all([tx.get(ref), tx.get(fence)]); const current = newConnectionOrderSchema.parse(snapshot.data());
    const eventRef = deliveryId ? db.doc(`server_new_connection_events/${hash(`${order.provider}:${deliveryId}`)}`) : null;
    const event = eventRef ? await tx.get(eventRef) : null;
    if (event?.exists) return current;
    if (current.provider !== order.provider || (current.providerOrderId && current.providerOrderId !== order.providerOrderId)) throw new BookingError('PROVIDER_MISMATCH');
    if (current.provider === 'youpi' && result.state === 'paid' && !actor.startsWith('admin:')) throw new BookingError('ADMIN_CONFIRMATION_REQUIRED');
    const at = new Date().toISOString();
    if (['paid', 'refunded', 'partially_refunded'].includes(current.paymentStatus)) { if (eventRef) tx.create(eventRef, { orderId: order.id, at }); return current; }
    const nextState = current.paymentStatus === 'awaiting_admin_confirmation' && result.state === 'pending' ? current.paymentStatus : result.state;
    if (nextState === 'paid') {
      if (!result.paymentId) throw new BookingError('INVALID_CONFIRMATION');
      const paymentRef = db.doc(`server_new_connection_payment_refs/${hash(`${order.provider}:${result.paymentId}`)}`); const previous = await tx.get(paymentRef);
      if (previous.exists && previous.data()?.orderId !== order.id) throw new BookingError('PAYMENT_REFERENCE_USED');
      tx.set(paymentRef, { orderId: order.id, at });
    }
    const updated = newConnectionOrderSchema.parse({ ...current, providerOrderId: order.providerOrderId, razorpayOrderId: order.provider === 'razorpay' ? order.providerOrderId : '', paymentStatus: nextState, providerPaymentId: nextState === 'paid' ? result.paymentId! : current.providerPaymentId, razorpayPaymentId: order.provider === 'razorpay' && nextState === 'paid' ? result.paymentId! : current.razorpayPaymentId, providerRaw: { ...current.providerRaw, ...result.raw }, updatedAt: at, statusHistory: nextState === current.paymentStatus ? current.statusHistory : [...current.statusHistory, { status: nextState, at, by: actor, note: '' }] });
    tx.set(ref, updated); tx.set(fence, { updatedAt: at });
    if (adminNote && nextState === 'paid') tx.set(db.doc(privatePath(order.id)), { adminNotes: adminNote, bankCheckedBy: actor, bankCheckedAt: at }, { merge: true });
    if (eventRef) tx.create(eventRef, { orderId: order.id, at }); return updated;
  });
}
export async function reconcileBooking(order: NewConnectionOrder) {
  if (order.provider === 'none' || order.amountDueNow === 0 || ['paid', 'refunded', 'partially_refunded'].includes(order.paymentStatus)) return order;
  return applyResult(order, await paymentProvider(order.provider).getStatus(order));
}
export async function bookingStatus(uid: string, id: string) {
  const order = await ownedBooking(uid, id);
  try { return { order: await reconcileBooking(order), verificationPending: false }; }
  catch { return { order, verificationPending: true }; }
}
export async function verifyBooking(uid: string, id: string, confirmation: Record<string, unknown>) {
  const order = await ownedBooking(uid, id);
  return applyResult(order, await paymentProvider(order.provider).verifyConfirmation(order, confirmation));
}
export async function handleNewConnectionRazorpayEvent(event: any): Promise<boolean> {
  const payment = event.payload?.payment?.entity; const entity = event.payload?.order?.entity; const orderId = entity?.id ?? payment?.order_id;
  if (typeof orderId !== 'string' || !/^order_[a-zA-Z0-9]+$/.test(orderId)) return false;
  const matches = await queryRecords<NewConnectionOrder>(collection, [{ field: 'providerOrderId', op: 'eq', value: orderId }]);
  let order = matches.find(o => o.provider === 'razorpay');
  if (!order && /^nc_[a-f0-9]{48}$/.test(entity?.notes?.newConnectionOrderId ?? payment?.notes?.newConnectionOrderId ?? '')) {
    const id = entity?.notes?.newConnectionOrderId ?? payment?.notes?.newConnectionOrderId; const snapshot = await getAdminFirestore().collection(collection).doc(id).get();
    if (snapshot.exists && snapshot.data()?.provider === 'razorpay') order = { ...newConnectionOrderSchema.parse(snapshot.data()), providerOrderId: orderId };
  }
  if (!order) return false;
  if (!['payment.captured', 'order.paid', 'payment.failed'].includes(event.event)) return true;
  const result = await paymentProvider('razorpay').getStatus(order);
  if (['payment.captured', 'order.paid'].includes(event.event) && result.state !== 'paid') throw new BookingError('VERIFICATION_PENDING', 503);
  await applyResult(order, result, `${event.event}:${payment?.id ?? orderId}`); return true;
}
export async function handleNewConnectionYoupiCallback(raw: Buffer, headers: Record<string, unknown>) {
  const event = paymentProvider('youpi').handleWebhook!(raw, headers);
  if (!/^nc_[a-f0-9]{48}$/.test(event.orderId)) throw new BookingError('PROVIDER_MISMATCH');
  const snapshot = await getAdminFirestore().collection(collection).doc(event.orderId).get();
  if (!snapshot.exists) throw new BookingError('BOOKING_NOT_FOUND', 404);
  let order = newConnectionOrderSchema.parse(snapshot.data());
  if (order.provider !== 'youpi' || event.method !== 'UPI' || event.currency !== 'INR' || Number(event.amountPaise) !== moneyUnits(order.amountDueNow) || typeof event.paymentId !== 'string' || !/^[\w-]{1,128}$/.test(event.paymentId) || (order.providerOrderId && order.providerOrderId !== event.paymentId)) throw new BookingError('PROVIDER_MISMATCH');
  order = { ...order, providerOrderId: event.paymentId };
  const result = await paymentProvider('youpi').getStatus(order); await applyResult(order, result, event.deliveryId);
}
export async function paymentReviewQueue() {
  return (await queryRecords<NewConnectionOrder>(collection, [{ field: 'provider', op: 'in', value: ['razorpay', 'youpi'] }, { field: 'paymentStatus', op: 'in', value: ['pending', 'awaiting_admin_confirmation'] }], { limit: 100 })).filter(o => o.amountDueNow > 0);
}
export async function confirmYoupiByAdmin(id: string, actorUid: string, input: unknown) {
  if (!/^nc_[a-f0-9]{48}$/.test(id)) throw new BookingError('BOOKING_NOT_FOUND', 404);
  const value = z.object({ utr: z.string().regex(/^\d{12}$/), amount: z.number().positive(), bankChecked: z.literal(true), note: z.string().trim().min(5).max(500) }).strict().parse(input);
  const snapshot = await getAdminFirestore().collection(collection).doc(id).get();
  if (!snapshot.exists) throw new BookingError('BOOKING_NOT_FOUND', 404);
  const order = newConnectionOrderSchema.parse(snapshot.data());
  if (order.provider !== 'youpi' || moneyUnits(value.amount) !== moneyUnits(order.amountDueNow)) throw new BookingError('PROVIDER_MISMATCH');
  if (order.paymentStatus === 'paid' && order.providerPaymentId !== value.utr) throw new BookingError('ALREADY_CONFIRMED');
  const updated = await applyResult(order, { state: 'paid', paymentId: value.utr, raw: { bankConfirmed: true, utr: value.utr } }, undefined, `admin:${actorUid}`, value.note);
  return updated;
}
