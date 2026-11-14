import { z } from 'zod';
import { getAdminFirestore } from '../middleware/auth';
import { ticketSchema, ticketStatusSchema, stripTicketHtml, type TicketStatus } from '../../src/lib/tickets';
import { documentKey } from '../persistence';
export const adminTicketUpdate = z.object({ status: ticketStatusSchema.optional(), companyRefNo: z.string().transform(stripTicketHtml).pipe(z.string().max(120)).optional(), adminNotes: z.string().transform(stripTicketHtml).pipe(z.string().max(3000)).optional() }).strict();
export const supportTransitions: Partial<Record<TicketStatus, TicketStatus[]>> = { open: ['in_progress', 'resolved', 'closed'], in_progress: ['resolved', 'closed'], resolved: ['closed'] };
export const serviceTransitions: Partial<Record<TicketStatus, TicketStatus[]>> = { paid: ['placed_with_company'], placed_with_company: ['resolved', 'closed'], resolved: ['closed'] };
export function validateTicketTransition(type: string, current: TicketStatus, next: TicketStatus, companyRefNo: string, paidAt: string | null, now: number, refunding = false) {
  if (next === current) return;
  const allowed = (type !== 'service_request' ? supportTransitions : serviceTransitions)[current] || [];
  if (!allowed.includes(next)) throw new Error('This status change is not allowed.');
  if (next === 'placed_with_company' && (!companyRefNo.trim() || !paidAt || now >= Date.parse(paidAt) + 24 * 3_600_000 || refunding)) throw new Error('A company reference is required and the placement deadline must not have passed or refund begun.');
}
export async function updateAdminTicket(id: string, uid: string, input: unknown, now = Date.now()) {
  const value = adminTicketUpdate.parse(input); const db = getAdminFirestore(); const ref = db.collection('tickets').doc(id); const privateRef = db.collection('server_ticket_private').doc(id);
  return db.runTransaction(async tx => {
    const snapshot = await tx.get(ref); const ticket = ticketSchema.parse(snapshot.data());
    const next = value.status || ticket.status; const companyRefNo = value.companyRefNo ?? ticket.companyRefNo;
    if (ticket.cancelledAt && next !== ticket.status) throw new Error('Cancelled requests cannot be placed or reopened.');
    validateTicketTransition(ticket.type, ticket.status, next, companyRefNo, ticket.payment.paidAt, now, ticket.payment.status === 'refunding' || ticket.payment.status === 'refunded');
    if (ticket.status !== 'paid' && companyRefNo !== ticket.companyRefNo) throw new Error('Company reference can only be entered when placing a paid request.');
    if (companyRefNo !== ticket.companyRefNo && next !== 'placed_with_company') throw new Error('Save the company reference together with placement.');
    const lock = db.collection('server_ticket_locks').doc(documentKey(`${ticket.uid}:${ticket.brand}:${ticket.subscriberId}`));
    const held = ['resolved', 'closed'].includes(next) ? await tx.get(lock) : null;
    const timestamp = new Date(now).toISOString();
    const updated = { ...ticket, status: next, companyRefNo, updatedAt: timestamp, statusHistory: next === ticket.status ? ticket.statusHistory : [...ticket.statusHistory, { status: next, timestamp, by: uid }] };
    tx.set(ref, updated);
    if (value.adminNotes !== undefined) tx.set(privateRef, { adminNotes: value.adminNotes }, { merge: true });
    if (held?.data()?.ticketId === id) tx.set(lock, { active: false, ticketId: id });
    if (next !== ticket.status) tx.set(db.collection('server_ticket_events').doc(`${id}_${next}`), { ticketId: id, event: next, createdAt: timestamp, processed: false });
    return updated;
  });
}
