import express from 'express';
import type { Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ reclassify: vi.fn(), upgrade: vi.fn(), query: vi.fn() }));
vi.mock('../server/middleware/auth', () => ({ verifyAuthToken: async (req: any) => req.headers.authorization ? { uid: req.headers.authorization.slice(7) } : null,
  isCallerAdminAuthorized: async (req: any) => ({ authorized: req.headers.authorization === 'Bearer admin' }), getAdminFirestore: vi.fn() }));
vi.mock('../server/models/help', () => ({ reclassifyHelpTicket: f.reclassify, upgradeHelpTicket: f.upgrade }));
vi.mock('../server/models/servicePayments', () => ({ attachServiceCheckout: vi.fn() }));
vi.mock('../server/models/serviceRefunds', () => ({ refundServiceRequest: vi.fn() }));
vi.mock('../server/models/adminAnalytics', () => ({ analyticsBounds: vi.fn() }));
vi.mock('../server/models/paymentPages', () => ({ parsePage: () => ({ limit: 25 }) }));
vi.mock('../server/routes/tickets', () => ({ replySchema: { parse: (value: unknown) => value } }));
vi.mock('../server/queries', () => ({ queryRecords: f.query }));
import { adminTicketsRouter } from '../server/routes/adminTickets';
let server: Server; let url: string;
beforeAll(async () => { const app = express(); app.use(express.json()); app.use(adminTicketsRouter); server = await new Promise<Server>(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); }); const address = server.address(); if (!address || typeof address === 'string') throw new Error(); url = `http://127.0.0.1:${address.port}/api/admin/tickets`; });
afterAll(async () => { await new Promise<void>(resolve => server.close(() => resolve())); });
beforeEach(() => { vi.clearAllMocks(); f.query.mockResolvedValue([]); f.reclassify.mockResolvedValue({ id: 'one', helpRoute: 'dth_service' }); f.upgrade.mockResolvedValue({ id: 'one', status: 'pending_payment', payment: { paidAt: null } }); });
const call = (path: string, token: string | undefined, body?: unknown) => fetch(url + path, { method: body === undefined ? 'GET' : 'POST', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
it('denies guests and customers before reclassification or upgrade', async () => {
  for (const token of [undefined, 'customer']) for (const path of ['/one/reclassify', '/one/upgrade']) expect([401, 403]).toContain((await call(path, token, {})).status);
  expect(f.reclassify).not.toHaveBeenCalled(); expect(f.upgrade).not.toHaveBeenCalled();
});
it('binds admin changes to the verified admin and never marks an upgrade paid', async () => {
  expect((await call('/one/reclassify', 'admin', { route: 'dth_service', reason: 'Company problem after review' })).status).toBe(200);
  expect(f.reclassify).toHaveBeenCalledWith('one', 'admin', 'dth_service', 'Company problem after review');
  const response = await call('/one/upgrade', 'admin', { brand: 'tata_play', subscriberId: '1234567890' });
  expect((await response.json()).ticket.payment.paidAt).toBeNull();
  expect(f.upgrade).toHaveBeenCalledWith('', 'one', { acceptedTerms: true, brand: 'tata_play', subscriberId: '1234567890' }, 'admin', true);
});
it('includes unpaid DTH tickets in the free queue and rejects raw query fields', async () => {
  expect((await call('?type=support', 'admin')).status).toBe(200);
  expect(f.query).toHaveBeenCalledWith('tickets', [{ field: 'type', op: 'in', value: ['support', 'dth_service'] }], { limit: 26 });
  expect((await call('?type=support&collection=users', 'admin')).status).toBe(400);
});
