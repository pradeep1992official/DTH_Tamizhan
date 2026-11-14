import { z } from 'zod';
import { getAdminFirestore } from '../middleware/auth';
import { helpInputSchema, helpProblems } from '../../src/lib/help';
import { ticketSchema, fullAddressSchema, pinCodeSchema, savedPinCode, type Ticket } from '../../src/lib/tickets';
import { readServiceBrands } from './serviceBrands';
import { validateServiceSubscriber } from '../../src/lib/serviceBrands';
import { ownedAssistantOrders } from './assistantHistory';
import { createTicket } from './tickets';
import { executeAssistantTool } from '../utils/assistantTools';
import { documentKey } from '../persistence';
import { TicketRequestError } from '../middleware/ticketProtection';

export async function createHelpTicket(uid: string, input: unknown, name: string) {
  const value = helpInputSchema.parse(input);
  const existing = await getAdminFirestore().collection('tickets').doc(documentKey(`${uid}:${value.requestKey}`)).get();
  if (existing.exists) { const ticket = ticketSchema.parse(existing.data()); if (ticket.uid !== uid) throw new Error('Request unavailable.'); return ticket; }
  const chip = helpProblems[value.problem as keyof typeof helpProblems];
  let route: 'free' | 'dth_service' = chip?.route || 'free'; let category: string = chip?.category || 'other';
  let description = value.description || (chip ? chip[value.language] : 'Support review requested.');
  if (!chip) {
    const action = await executeAssistantTool('recommend_support_option', { problem_text: description }, uid);
    if (action.type === 'support_recommendation') { route = action.recommendation.confident ? action.recommendation.route : 'free'; category = action.recommendation.confident ? action.recommendation.category : 'other'; description = action.recommendation.summary; }
  }
  const brand = (await readServiceBrands()).find(brand => brand.id === value.brand && brand.enabled);
  if (value.brand && !brand) throw new TicketRequestError(400, 'Choose an available brand.');
  if (route === 'dth_service' && chip && !validateServiceSubscriber(brand, value.subscriberId)) throw new TicketRequestError(400, 'Check your brand and subscriber ID.');
  if (route === 'dth_service' && chip && !fullAddressSchema.safeParse(value.fullAddress).success) throw new TicketRequestError(400, 'Enter your full address, including locality and city.');
  if (route === 'dth_service' && chip && !pinCodeSchema.safeParse(value.pinCode).success) throw new TicketRequestError(400, 'Enter a valid six-digit Indian PIN code.');
  if (value.subscriberId && !validateServiceSubscriber(brand, value.subscriberId)) throw new TicketRequestError(400, 'Check your subscriber ID.');
  if (value.orderId && !(await ownedAssistantOrders(uid, 1, value.orderId)).length) throw new TicketRequestError(400, 'Choose an order from your own account.');
  return createTicket(uid, { type: route === 'free' ? 'support' : 'dth_service', helpRoute: route, name, phone: value.phone,
    brand: value.brand, subscriberId: route === 'dth_service' ? value.subscriberId : '', fullAddress: route === 'dth_service' ? value.fullAddress : '', pinCode: route === 'dth_service' ? value.pinCode : '', issueCategory: category, description,
    ...(value.orderId ? { orderId: value.orderId } : {}),
  }, new Date(), value.requestKey);
}
export const upgradeHelpSchema = z.object({ acceptedTerms: z.literal(true), brand: z.string().max(50), subscriberId: z.string().regex(/^\d{1,25}$/), fullAddress: fullAddressSchema.optional(), pinCode: pinCodeSchema.optional() }).strict();
export async function upgradeHelpTicket(uid: string, id: string, input: unknown, by = uid, admin = false, now = Date.now()) {
  const value = upgradeHelpSchema.parse(input); const brand = (await readServiceBrands()).find(brand => brand.id === value.brand);
  if (!validateServiceSubscriber(brand, value.subscriberId)) throw new TicketRequestError(400, 'Check your brand and subscriber ID.');
  const db = getAdminFirestore(); const ref = db.collection('tickets').doc(id);
  return db.runTransaction(async tx => {
    const snapshot = await tx.get(ref); const ticket = ticketSchema.parse(snapshot.data());
    if (!admin && ticket.uid !== uid) throw new TicketRequestError(404, 'Ticket not found.');
    const fullAddress = fullAddressSchema.parse(value.fullAddress || ticket.fullAddress || '');
    const pinCode = pinCodeSchema.parse(value.pinCode ?? savedPinCode(ticket));
    if (ticket.type === 'service_request' && ticket.status === 'pending_payment') return ticket;
    if (!['open', 'in_progress'].includes(ticket.status) || (!admin && ticket.helpRoute !== 'dth_service')) throw new TicketRequestError(409, 'This ticket cannot be upgraded.');
    const lockRef = db.collection('server_ticket_locks').doc(documentKey(`${ticket.uid}:${value.brand}:${value.subscriberId}`)); const lock = await tx.get(lockRef);
    if (lock.data()?.active && lock.data()?.ticketId !== id) throw new TicketRequestError(409, 'You already have an open request for this subscriber ID and brand.');
    const oldLockRef = db.collection('server_ticket_locks').doc(documentKey(`${ticket.uid}:${ticket.brand}:${ticket.subscriberId}`)); const oldLock = oldLockRef.path !== lockRef.path ? await tx.get(oldLockRef) : null;
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    const capRef = db.collection('server_ticket_daily_caps').doc(documentKey(`${ticket.uid}:service_request:${day}`)); const cap = await tx.get(capRef); const count = cap.data()?.count || 0;
    if (count >= 5) throw new TicketRequestError(429, 'You can create up to 5 paid requests per day.');
    const timestamp = new Date(now).toISOString();
    const updated: Ticket = { ...ticket, fullAddress, pinCode, type: 'service_request', helpRoute: 'dth_service', status: 'pending_payment', brand: value.brand, subscriberId: value.subscriberId,
      payment: { ...ticket.payment, required: true, amount: 50, status: 'pending' }, updatedAt: timestamp, checkoutStartedAt: timestamp,
      statusHistory: [...ticket.statusHistory, { status: 'pending_payment', timestamp, by, type: 'service_request', event: 'upgraded' }] };
    tx.set(ref, ticketSchema.parse(updated)); tx.set(capRef, { count: count + 1, expiresAt: new Date(now + 3 * 86_400_000) }); tx.set(lockRef, { active: true, ticketId: id });
    if (oldLock?.data()?.ticketId === id) tx.set(oldLockRef, { active: false, ticketId: id });
    return updated;
  });
}
export async function chooseCustomerCare(uid: string, id: string, brandId?: string, address?: string, suppliedPin?: string) {
  if (brandId && !(await readServiceBrands()).some(brand => brand.id === brandId && brand.enabled)) throw new TicketRequestError(400, 'Choose an available brand.');
  const db = getAdminFirestore(); const ref = db.collection('tickets').doc(id);
  return db.runTransaction(async tx => {
    const snapshot = await tx.get(ref); const ticket = ticketSchema.parse(snapshot.data());
    if (ticket.uid !== uid || ticket.helpRoute !== 'dth_service' || ticket.payment.required || !['open', 'in_progress'].includes(ticket.status)) throw new Error('Ticket unavailable.');
    const fullAddress = fullAddressSchema.parse(address || ticket.fullAddress || '');
    const pinCode = pinCodeSchema.parse(suppliedPin ?? savedPinCode(ticket));
    if (brandId && ticket.subscriberId && brandId !== ticket.brand) throw new Error('Brand does not match this ticket.');
    if (ticket.type === 'support' && ticket.statusHistory.at(-1)?.event === 'customer_care_selected' && fullAddress === ticket.fullAddress && pinCode === ticket.pinCode && (!brandId || brandId === ticket.brand)) return ticket;
    const timestamp = new Date().toISOString();
    const updated = { ...ticket, fullAddress, pinCode, brand: brandId || ticket.brand, type: 'support' as const, issueCategory: 'other', updatedAt: timestamp,
      statusHistory: [...ticket.statusHistory, { status: ticket.status, timestamp, by: uid, type: 'support' as const, event: 'customer_care_selected' }] };
    tx.set(ref, updated); return updated;
  });
}
export async function reclassifyHelpTicket(id: string, by: string, route: 'free' | 'dth_service', reason: string) {
  const db = getAdminFirestore(); const ref = db.collection('tickets').doc(id);
  return db.runTransaction(async tx => {
    const snapshot = await tx.get(ref); const ticket = ticketSchema.parse(snapshot.data());
    if (ticket.payment.required || !['open', 'in_progress'].includes(ticket.status)) throw new TicketRequestError(409, 'Only open unpaid tickets can be reclassified.');
    const lockRef = db.collection('server_ticket_locks').doc(documentKey(`${ticket.uid}:${ticket.brand}:${ticket.subscriberId}`)); const lock = await tx.get(lockRef);
    if (route === 'dth_service' && ticket.subscriberId && lock.data()?.active && lock.data()?.ticketId !== id) throw new TicketRequestError(409, 'Another request is already open for this subscriber.');
    const timestamp = new Date().toISOString(); const type = route === 'free' ? 'support' as const : 'dth_service' as const;
    const updated = ticketSchema.parse({ ...ticket, helpRoute: route, type, issueCategory: 'other', updatedAt: timestamp,
      statusHistory: [...ticket.statusHistory, { status: ticket.status, timestamp, by, type, event: `reclassified_${route}` }] });
    tx.set(ref, updated);
    tx.set(db.collection('server_ticket_private').doc(id), { reclassificationReason: reason }, { merge: true });
    if (ticket.subscriberId) {
      if (route === 'dth_service') tx.set(lockRef, { active: true, ticketId: id });
      else if (lock.data()?.ticketId === id) tx.set(lockRef, { active: false, ticketId: id });
    }
    return updated;
  });
}
