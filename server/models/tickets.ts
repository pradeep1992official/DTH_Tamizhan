import { randomUUID } from 'node:crypto';
import { getAdminFirestore } from '../middleware/auth';
import { ticketInputSchema, ticketSchema, type Ticket } from '../../src/lib/tickets';
import { documentKey } from '../persistence';
import { TicketRequestError } from '../middleware/ticketProtection';

// Internal repository: callers must verify identity and validate linked-order ownership.
// No status, UID, payment or receipt fields are accepted in customer input.
export async function createTicket(uid: string, input: unknown, now = new Date(), requestKey?: string): Promise<Ticket> {
  if (!uid) throw new Error('Sign in to create a ticket.');
  const value = ticketInputSchema.parse(input);
  const db = getAdminFirestore();
  const ref = db.collection('tickets').doc(requestKey ? documentKey(`${uid}:${requestKey}`) : randomUUID());
  const counter = db.collection('server_ticket_counters').doc(value.type);
  return db.runTransaction(async transaction => {
    if (requestKey) {
      const existing = await transaction.get(ref);
      if (existing.exists) {
        const ticket = ticketSchema.parse(existing.data());
        if (ticket.uid !== uid || Object.entries(value).some(([key, field]) => ticket[key as keyof Ticket] !== field)) throw new Error('Request key already used.');
        return ticket;
      }
    }
    const lock = value.type === 'service_request' ? db.collection('server_ticket_locks').doc(documentKey(`${uid}:${value.brand}:${value.subscriberId}`)) : null;
    if (lock) {
      const held = await transaction.get(lock);
      if (held.exists && held.data()?.active) throw new TicketRequestError(409, 'You already have an open request for this brand and subscriber ID.');
    }
    const snapshot = await transaction.get(counter);
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    const capRef = db.collection('server_ticket_daily_caps').doc(documentKey(`${uid}:${value.type}:${day}`));
    const usage = await transaction.get(capRef); const used = usage.data()?.count || 0;
    if (used >= (value.type === 'support' ? 3 : 5)) throw new TicketRequestError(429, value.type === 'support' ? 'You can create up to 3 support tickets per day. Please try again tomorrow.' : 'You can create up to 5 paid requests per day. Please try again tomorrow.');
    const previous = snapshot.exists ? snapshot.data()?.value : 0;
    if (!Number.isSafeInteger(previous) || previous < 0 || previous >= Number.MAX_SAFE_INTEGER) throw new Error('Ticket counter unavailable.');
    const sequence = previous + 1;
    const timestamp = now.toISOString();
    const paid = value.type === 'service_request';
    const status = paid ? 'pending_payment' : 'open';
    const ticket = ticketSchema.parse({ ...value, id: ref.id, uid,
      ticketNo: `${paid ? 'SRQ' : 'SUP'}-${String(sequence).padStart(4, '0')}`,
      status, statusHistory: [{ status, timestamp, by: uid }], companyRefNo: '', adminNotes: '',
      payment: { required: paid, amount: paid ? 50 : 0, status: paid ? 'pending' : 'not_required',
        gatewayOrderId: null, paymentId: null, paidAt: null, refundId: null, refundedAt: null },
      receipt: { number: null, path: null, generatedAt: null }, createdAt: timestamp, updatedAt: timestamp,
    });
    transaction.set(counter, { value: sequence });
    transaction.set(capRef, { count: used + 1, expiresAt: new Date(now.getTime() + 3 * 86_400_000) });
    transaction.create(ref, ticket);
    transaction.set(db.collection('server_ticket_events').doc(`${ticket.id}_created`), { ticketId: ticket.id, event: 'created', createdAt: timestamp, processed: false });
    if (lock) transaction.set(lock, { active: true, ticketId: ticket.id });
    return ticket;
  });
}

// Private internal notes are never returned to customers, even via the owner API.
export function customerTicket(ticket: Ticket) {
  const { adminNotes: _notes, ...publicTicket } = ticket;
  return publicTicket;
}
