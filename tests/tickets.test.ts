import { beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ counters: new Map<string, any>(), writes: [] as any[], transactions: Promise.resolve() as Promise<unknown> }));
vi.mock('../server/middleware/auth', () => ({ getAdminFirestore: () => ({
  collection: (collection: string) => ({ doc: (id: string) => ({ id, collection }) }),
  runTransaction: (callback: any) => {
    const result = f.transactions.then(() => callback({
      get: async (ref: any) => ({ exists: f.counters.has(`${ref.collection}/${ref.id}`), data: () => f.counters.get(`${ref.collection}/${ref.id}`) }),
      set: (ref: any, value: any) => f.counters.set(`${ref.collection}/${ref.id}`, value),
      create: (ref: any, value: any) => { f.counters.set(`${ref.collection}/${ref.id}`, value); f.writes.push({ ref, value }); },
    }));
    f.transactions = result.catch(() => {}); return result;
  },
}) }));
import { createTicket, customerTicket } from '../server/models/tickets';
beforeEach(() => { f.counters.clear(); f.writes = []; f.transactions = Promise.resolve(); });
const input = { type: 'support', name: 'Customer', phone: '9876543210', issueCategory: 'refund', description: 'Please review this order.' };
it('allocates unique sequential numbers and creates each record in the same transaction', async () => {
  const tickets = await Promise.all(Array.from({ length: 8 }, (_, index) => createTicket(`owner${index}`, input)));
  expect(tickets.map(ticket => ticket.ticketNo)).toEqual(Array.from({ length: 8 }, (_, index) => `SUP-000${index + 1}`));
  expect(new Set(tickets.map(ticket => ticket.id)).size).toBe(8);
  expect(tickets[0]).toMatchObject({ uid: 'owner0', status: 'open', payment: { amount: 0, status: 'not_required' } });
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

it('enforces daily caps atomically and resets on the next India calendar day', async () => {
  const day = new Date('2026-11-14T12:00:00Z');
  for (let i = 0; i < 3; i++) await createTicket('owner', input, day);
  await expect(createTicket('owner', input, day)).rejects.toThrow('3 support tickets');
  expect((await createTicket('owner', input, new Date('2026-11-15T12:00:00Z'))).ticketNo).toBe('SUP-0004');
});

it('counts paid request caps once per idempotent request and rejects duplicate open subscribers', async () => {
  const value = { ...input, type: 'service_request', brand: 'tata_play', subscriberId: '1234567890', issueCategory: 'no_signal' };
  const first = await createTicket('owner', value, new Date(), 'stable-key');
  expect((await createTicket('owner', value, new Date(), 'stable-key')).id).toBe(first.id);
  await expect(createTicket('owner', value)).rejects.toThrow('already have an open request');
  for (let i = 1; i < 5; i++) await createTicket('owner', { ...value, subscriberId: `123456789${i}` });
  await expect(createTicket('owner', { ...value, subscriberId: '1234567899' })).rejects.toThrow('5 paid requests');
});
