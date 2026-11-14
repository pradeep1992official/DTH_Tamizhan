import { getAdminFirestore } from '../middleware/auth';
import { queryRecords } from '../queries';
import { documentKey } from '../persistence';
import { ticketSchema, type Ticket } from '../../src/lib/tickets';
export async function expireUnpaidServiceRequests(now = Date.now()) {
  const rows = await queryRecords<Ticket>('tickets', [{ field: 'type', op: 'eq', value: 'service_request' }, { field: 'status', op: 'eq', value: 'pending_payment' }, { field: 'createdAt', op: 'lte', value: new Date(now - 30 * 60_000).toISOString() }], { limit: 100 });
  const db = getAdminFirestore();
  for (const row of rows) await db.runTransaction(async tx => {
    const ref = db.collection('tickets').doc(row.id); const snapshot = await tx.get(ref); const current = ticketSchema.parse(snapshot.data());
    if (current.status !== 'pending_payment' || Date.parse(current.createdAt) > now - 30 * 60_000) return;
    const lock = db.collection('server_ticket_locks').doc(documentKey(`${current.uid}:${current.brand}:${current.subscriberId}`));
    const held = await tx.get(lock); const timestamp = new Date(now).toISOString();
    tx.update(ref, { status: 'expired', updatedAt: timestamp, statusHistory: [...current.statusHistory, { status: 'expired', timestamp, by: 'scheduler' }] });
    if (held.data()?.ticketId === current.id) tx.set(lock, { active: false, ticketId: current.id });
  });
  return rows.length;
}
