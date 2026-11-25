import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import type { RechargeOrder } from '../src/types';

const fixture = vi.hoisted(() => ({
  admin: false,
  page: vi.fn(),
}));
vi.mock('../server/middleware/auth', () => ({
  verifyAuthToken: async () => ({ uid: 'owner' }),
  isCallerAdminAuthorized: async () => ({ authorized: fixture.admin }),
}));
vi.mock('../server/models/store', () => ({ APPROVED_ADMIN_EMAILS: new Set() }));
vi.mock('../server/models/paymentPages', () => ({ parsePage: () => ({ limit: 25 }), paymentPage: fixture.page }));
vi.mock('../server/models/paidRechargeOrders', () => ({ getRechargeOrders: vi.fn(), updatePaidRechargeStatus: vi.fn() }));
vi.mock('../server/models/savedRechargeConnections', () => ({ syncCompletedRechargeConnection: vi.fn() }));
vi.mock('../server/payments', () => ({ PaymentError: class extends Error {} }));

import { ordersController } from '../server/controllers/ordersController';

const order: RechargeOrder = {
  orderId: 'order_owner', user_id: 'owner', operator: 'airtel_dth', operatorName: 'Airtel Digital TV',
  smartCardNumber: '3015222222', customerName: 'Owner', amount: 299, packId: 'pack', packName: 'Tamil HD',
  packValidity: '1 month', paymentMethod: 'upi', paymentStatus: 'paid', rechargeStatus: 'pending',
  operatorRefId: 'reference', workerNotes: 'Private admin notes', paymentId: 'pay_owner', testMode: true,
  createdAt: '2026-11-13T05:00:00Z', updatedAt: '2026-11-13T05:00:00Z',
};
const request = (query = {}) => ({ query } as Request);
function response() {
  const res = { json: vi.fn(), status: vi.fn(), setHeader: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}
beforeEach(() => {
  vi.clearAllMocks();
  fixture.admin = false;
  fixture.page.mockResolvedValue({ orders: [order], nextCursor: 'next-page' });
});

it.each([{}, { all: 'true' }, { isWorker: 'true' }])('omits private notes from the legacy customer response with query %j', async query => {
  const res = response();
  await ordersController.list(request(query), res as unknown as Response);
  const { workerNotes: _notes, ...publicOrder } = order;
  expect(res.json).toHaveBeenCalledWith({ success: true, count: 1, orders: [publicOrder], nextCursor: 'next-page' });
  expect(res.json.mock.calls[0][0].orders[0]).not.toHaveProperty('workerNotes');
  expect(fixture.page).toHaveBeenCalledWith({ limit: 25 }, 'owner');
  expect(order.workerNotes).toBe('Private admin notes');
});

it('omits notes when an administrator uses the legacy personal view', async () => {
  fixture.admin = true;
  const res = response();
  await ordersController.list(request(), res as unknown as Response);
  expect(res.json.mock.calls[0][0].orders[0]).not.toHaveProperty('workerNotes');
  expect(fixture.page).toHaveBeenCalledWith({ limit: 25 }, 'owner');
});

it.each([{ all: 'true' }, { isWorker: 'true' }])('preserves notes in authorized legacy admin-wide responses with query %j', async query => {
  fixture.admin = true;
  const res = response();
  await ordersController.list(request(query), res as unknown as Response);
  expect(res.json).toHaveBeenCalledWith({ success: true, count: 1, orders: [order], nextCursor: 'next-page' });
  expect(fixture.page).toHaveBeenCalledWith({ limit: 25 }, undefined);
});

it('preserves notes in the dedicated admin orders response', async () => {
  fixture.admin = true;
  const res = response();
  await ordersController.listAdmin(request(), res as unknown as Response);
  expect(res.json).toHaveBeenCalledWith({ success: true, count: 1, orders: [order], nextCursor: 'next-page' });
  expect(res.json.mock.calls[0][0].orders[0].workerNotes).toBe('Private admin notes');
});
