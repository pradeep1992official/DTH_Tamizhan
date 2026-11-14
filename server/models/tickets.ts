import { randomUUID } from 'node:crypto';
import { getAdminFirestore } from '../middleware/auth';
import { ticketInputSchema, ticketSchema, type Ticket } from '../../src/lib/tickets';

// Internal repository: callers must verify identity and validate linked-order ownership.
// No status, UID, payment or receipt fields are accepted in customer input.
export async function createTicket(uid: string, input: unknown, now = new Date()): Promise<Ticket> {
  if (!uid) throw new Error('Sign in to create a ticket.');
  const value = ticketInputSchema.parse(input);
  const db = getAdminFirestore();
  const ref = db.collection('tickets').doc(randomUUID());
  const counter = db.collection('server_ticket_counters').doc(value.type);
  return db.runTransaction(async transaction => {
    const snapshot = await transaction.get(counter);
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
    transaction.create(ref, ticket);
    return ticket;
  });
}

// Private internal notes are never returned to customers, even via the owner API.
export function customerTicket(ticket: Ticket) {
  const { adminNotes: _notes, ...publicTicket } = ticket;
  return publicTicket;
}
