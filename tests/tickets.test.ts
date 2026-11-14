import { beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ counters: new Map<string, number>(), writes: [] as any[], transactions: Promise.resolve() as Promise<unknown> }));
vi.mock('../server/middleware/auth', () => ({ getAdminFirestore: () => ({
  collection: (collection: string) => ({ doc: (id: string) => ({ id, collection }) }),
  runTransaction: (callback: any) => {
    const result = f.transactions.then(() => callback({
      get: async (ref: any) => ({ exists: f.counters.has(ref.id), data: () => ({ value: f.counters.get(ref.id) }) }),
      set: (ref: any, value: any) => f.counters.set(ref.id, value.value),
      create: (ref: any, value: any) => f.writes.push({ ref, value }),
    }));
    f.transactions = result.catch(() => {}); return result;
  },
}) }));
import { createTicket, customerTicket } from '../server/models/tickets';
beforeEach(() => { f.counters.clear(); f.writes = []; f.transactions = Promise.resolve(); });
const input = { type: 'support', name: 'Customer', phone: '9876543210', issueCategory: 'refund', description: 'Please review this order.' };
it('allocates unique sequential numbers and creates each record in the same transaction', async () => {
  const tickets = await Promise.all(Array.from({ length: 8 }, () => createTicket('owner', input)));
  expect(tickets.map(ticket => ticket.ticketNo)).toEqual(Array.from({ length: 8 }, (_, index) => `SUP-000${index + 1}`));
  expect(new Set(tickets.map(ticket => ticket.id)).size).toBe(8);
  expect(tickets[0]).toMatchObject({ uid: 'owner', status: 'open', payment: { amount: 0, status: 'not_required' } });
  expect(customerTicket(tickets[0])).not.toHaveProperty('adminNotes');
});
it('creates paid requests as unpaid at the fixed server price with a separate counter', async () => {
  const ticket = await createTicket('owner', { ...input, type: 'service_request', brand: 'airtel_dth', subscriberId: '3012345678', issueCategory: 'no_signal' });
  expect(ticket).toMatchObject({ ticketNo: 'SRQ-0001', status: 'pending_payment', payment: { required: true, amount: 50, paidAt: null } });
});
it('rejects client authority, malformed input and missing auth before writing', async () => {
  for (const extra of [{ status: 'paid' }, { uid: 'victim' }, { ticketNo: 'SUP-9999' }, { payment: {} }, { receipt: {} }, { companyRefNo: 'x' }]) await expect(createTicket('owner', { ...input, ...extra })).rejects.toThrow();
  await expect(createTicket('', input)).rejects.toThrow();
  await expect(createTicket('owner', { ...input, phone: '123' })).rejects.toThrow();
  expect(f.writes).toHaveLength(0);
});
