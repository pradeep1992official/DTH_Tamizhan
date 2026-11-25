import { beforeEach, afterEach, expect, it, vi } from 'vitest';

const f = vi.hoisted(() => ({
  events: new Map<string, any>(), records: new Map<string, any>(), queries: 0,
  user: vi.fn(), send: vi.fn(),
}));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ getUser: f.user }) }));
vi.mock('firebase-admin/firestore', () => ({ FieldPath: { documentId: () => '__name__' } }));
vi.mock('../server/emailDelivery', () => ({ emailDeliveryConfig: () => ({ enabled: true, configured: true, testEmails: true, dailyLimit: 50 }) }));
vi.mock('../server/models/serviceReceipts', () => ({ downloadServiceReceipt: vi.fn() }));
vi.mock('../server/persistence', () => ({ documentKey: (key: string) => key }));
vi.mock('../server/middleware/auth', () => {
  const ref = (collection: string, id: string) => ({
    id, collection,
    get: async () => ({ data: () => collection === 'server_ticket_events' ? f.events.get(id) : f.records.get(`${collection}/${id}`) }),
    update: async (value: any) => Object.assign(f.events.get(id), value),
  });
  const snapshot = (id: string, value: any) => ({ id, ref: ref('server_ticket_events', id), data: () => ({ ...value }) });
  function query(cursor?: any) {
    return {
      orderBy(field: string, direction: string) {
        expect(['createdAt', '__name__']).toContain(field); expect(direction).toBe('desc'); return this;
      },
      limit(size: number) { expect(size).toBe(25); return this; },
      startAfter(last: any) { return query(last); },
      async get() {
        f.queries++;
        const last = cursor?.data();
        const docs = [...f.events].filter(([, value]) => value.processed === false && value.createdAt !== undefined)
          .sort(([a, x], [b, y]) => y.createdAt.localeCompare(x.createdAt) || b.localeCompare(a))
          .filter(([id, value]) => !cursor || value.createdAt < last.createdAt || (value.createdAt === last.createdAt && id < cursor.id))
          .slice(0, 25).map(([id, value]) => snapshot(id, value));
        return { docs, empty: docs.length === 0 };
      },
    };
  }
  return { getAdminFirestore: () => ({
    collection: (collection: string) => ({
      doc: (id: string) => ref(collection, id),
      where: (field: string, op: string, value: unknown) => {
        expect(collection).toBe('server_ticket_events'); expect([field, op, value]).toEqual(['processed', '==', false]); return query();
      },
    }),
    runTransaction: async (callback: any) => callback({
      get: (document: any) => document.get(),
      update: (document: any, value: any) => document.update(value),
      set: (document: any, value: any) => f.records.set(`${document.collection}/${document.id}`, value),
    }),
  }) };
});
import { processTicketNotifications } from '../server/models/ticketNotifications';
import { ticketSchema } from '../src/lib/tickets';

beforeEach(() => {
  vi.clearAllMocks(); f.events.clear(); f.records.clear(); f.queries = 0;
  f.user.mockImplementation(async (uid: string) => uid === 'deliverable'
    ? { email: 'customer@example.com', emailVerified: true }
    : uid === 'unverified' ? { email: 'unverified@example.com', emailVerified: false } : { emailVerified: false });
  f.send.mockResolvedValue({ ok: true, json: async () => ({ messageId: 'message-1' }) });
  vi.stubGlobal('fetch', f.send);
});
afterEach(() => vi.unstubAllGlobals());

function add(id: string, uid: string, createdAt: string, extra = {}) {
  // Match the real event writer: document ID is metadata, never stored in data.
  f.events.set(id, { ticketId: id, event: 'created', createdAt, processed: false, ...extra });
  f.records.set(`tickets/${id}`, ticketSchema.parse({
    id, uid, ticketNo: 'SUP-0001', type: 'support', name: 'Customer', phone: '9876543210',
    state: 'Tamil Nadu', brand: '', subscriberId: '', issueCategory: 'other', description: 'Please help.',
    status: 'open', statusHistory: [], companyRefNo: '', adminNotes: '',
    payment: { required: false, amount: 0, status: 'not_required', gatewayOrderId: null, paymentId: null, paidAt: null, refundId: null, refundedAt: null },
    receipt: { number: null, path: null, generatedAt: null }, createdAt, updatedAt: createdAt,
  }));
}

it('drains more than 25 undeliverable events and sends an older deliverable event', async () => {
  for (let i = 0; i < 30; i++) add(`new-${i}`, i % 2 ? 'unverified' : 'missing', '2026-11-25T10:00:00Z');
  add('older', 'deliverable', '2026-11-24T10:00:00Z');
  expect(await processTicketNotifications()).toBe(1);
  expect(f.send).toHaveBeenCalledTimes(1);
  for (let i = 0; i < 30; i++) {
    expect(f.events.get(`new-${i}`)).toMatchObject({ processed: true, skipped: 'no_verified_email' });
    expect(f.records.get(`tickets/new-${i}`).status).toBe('open');
  }
  expect(f.events.get('older')).toMatchObject({ processed: true, status: 'accepted' });
  expect(f.queries).toBe(3);
  expect(f.records.get('tickets/older').status).toBe('open');
});

it('advances past review events without sending or marking them processed, including tied timestamps', async () => {
  for (let i = 0; i < 26; i++) add(`z-review-${i}`, 'missing', '2026-11-25T10:00:00Z', { status: 'review' });
  add('a-deliverable', 'deliverable', '2026-11-25T10:00:00Z');
  expect(await processTicketNotifications()).toBe(1);
  for (let i = 0; i < 26; i++) expect(f.events.get(`z-review-${i}`)).toMatchObject({ processed: false, status: 'review' });
  expect(f.send).toHaveBeenCalledTimes(1);
});

it('retains the review eligibility check for a verified recipient', async () => {
  add('review', 'deliverable', '2026-11-25T10:00:00Z', { status: 'review' });
  expect(await processTicketNotifications()).toBe(0);
  expect(f.events.get('review')).toMatchObject({ processed: false, status: 'review' });
  expect(f.send).not.toHaveBeenCalled();
});
