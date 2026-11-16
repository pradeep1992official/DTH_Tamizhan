import { beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ firestore: false, ledger: [] as any[], saved: [] as any[], query: vi.fn(), refresh: vi.fn() }));
vi.mock('../server/youpi', () => ({ refreshYoupiPayment: f.refresh }));
vi.mock('../server/persistence', () => ({ usesFirestore: () => f.firestore, collections: { payments: 'server_payments', recharges: 'server_recharges' }, paymentKey: (id: string, test: boolean) => `${test ? 'test' : 'live'}_${id}` }));
vi.mock('../server/models/paymentLedger', () => ({ readPaymentLedger: async () => f.ledger }));
vi.mock('../server/models/paidRechargeOrders', () => ({ readSavedRechargeOrders: async () => f.saved,
  mergePaidRechargeOrders: (saved: any[], payments: any[]) => payments.map(payment => ({ ...saved.find(order => order.paymentId === payment.id), orderId: payment.orderId, paymentId: payment.id, user_id: payment.customerUid, testMode: payment.testMode })) }));
vi.mock('../server/queries', () => ({ queryRecords: f.query }));
vi.mock('../server/middleware/auth', () => ({ getAdminFirestore: () => ({ collection: (name: string) => ({ doc: (id: string) => ({ name, id }) }), getAll: async () => [] }) }));
import { parsePage, paymentPage } from '../server/models/paymentPages';
beforeEach(() => {
  f.firestore = false; f.saved = []; f.query.mockReset(); f.refresh.mockReset();
  f.ledger = ['c', 'b', 'a'].map(id => ({ id, orderId: `order_${id}`, customerUid: 'owner', createdAt: '2026-11-13T10:00:00Z', testMode: false }));
  f.ledger.push({ ...f.ledger[0], id: 'other', customerUid: 'other' });
});
it('paginates equal timestamps without duplicates and excludes another account', async () => {
  const first = await paymentPage(parsePage({ limit: 2 }), 'owner');
  expect(first.payments.map(payment => payment.id)).toEqual(['c', 'b']);
  const second = await paymentPage(parsePage({ limit: 2, cursor: first.nextCursor }), 'owner');
  expect(second.payments.map(payment => payment.id)).toEqual(['a']); expect(second.nextCursor).toBeNull();
});
it('applies authenticated UID filtering and page bounds inside the database query', async () => {
  f.firestore = true; f.query.mockResolvedValue([]);
  await paymentPage(parsePage({ limit: 25 }), 'owner');
  expect(f.query).toHaveBeenCalledWith('server_payments', [{ field: 'customerUid', op: 'eq', value: 'owner' }], expect.objectContaining({ limit: 26 }));
});
it('rejects malformed cursors and unbounded page sizes', () => {
  for (const query of [{ limit: 0 }, { limit: 101 }, { limit: 2.5 }, { cursor: 'garbage' }]) expect(() => parsePage(query)).toThrow();
});
it('refreshes YouPI checkout contacts when loading the admin payment page', async () => {
  f.ledger = [{ ...f.ledger[0], provider: 'YouPI', status: 'paid' }];
  f.refresh.mockResolvedValue({ ...f.ledger[0], customerName: 'Hosted customer', customerPhone: '9876543210' });
  const page = await paymentPage(parsePage({}));
  expect(page.payments[0]).toMatchObject({ customerName: 'Hosted customer', customerPhone: '9876543210' });
  expect(page.orders).toHaveLength(1);
});
it('keeps existing orders readable when YouPI contact refresh is unavailable', async () => {
  f.ledger = [{ ...f.ledger[0], provider: 'YouPI', customerPhone: '9876543210' }];
  f.refresh.mockRejectedValue(new Error('Gateway offline'));
  const page = await paymentPage(parsePage({}));
  expect(page.payments[0].customerPhone).toBe('9876543210');
  expect(page.orders).toHaveLength(1);
});
