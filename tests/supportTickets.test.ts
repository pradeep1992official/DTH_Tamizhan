import express from 'express';
import type { Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../server/middleware/ticketProtection', () => ({ ticketProtection: (_req: any, _res: any, next: any) => next(), logTicketBlock: async () => {}, TicketRequestError: class extends Error {} }));
const f = vi.hoisted(() => ({ create: vi.fn(), owned: vi.fn(), query: vi.fn() }));
vi.mock('../server/middleware/auth', () => ({ verifyAuthToken: async (req: any) => req.headers.authorization === 'Bearer owner' ? { uid: 'owner' } : null, getAdminFirestore: vi.fn() }));
vi.mock('../server/models/help', () => ({ createHelpTicket: f.create, upgradeHelpTicket: vi.fn(), chooseCustomerCare: vi.fn() }));
vi.mock('../server/models/servicePayments', () => ({ attachServiceCheckout: vi.fn(), resumeServiceCheckout: vi.fn() }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ getUser: async () => ({ displayName: 'Customer' }) }) }));
vi.mock('../server/models/tickets', () => ({ createTicket: f.create, customerTicket: (value: any) => value }));
vi.mock('../server/models/assistantHistory', () => ({ ownedAssistantOrders: f.owned }));
vi.mock('../server/models/paymentPages', () => ({ parsePage: () => ({ limit: 25 }) }));
vi.mock('../server/queries', () => ({ queryRecords: f.query }));
import { ticketsRouter } from '../server/routes/tickets';
let server: Server; let url: string;
beforeAll(async () => {
  const app = express(); app.use(express.json()); app.use(ticketsRouter);
  server = await new Promise<Server>(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('address');
  url = `http://127.0.0.1:${address.port}/api/tickets`;
});
afterAll(async () => { await new Promise<void>(resolve => server.close(() => resolve())); });
beforeEach(() => { vi.clearAllMocks(); f.query.mockResolvedValue([]); f.create.mockResolvedValue({ ticketNo: 'SUP-0001' }); f.owned.mockResolvedValue([]); });
const input = { name: 'Customer', phone: '9876543210', issueCategory: 'refund', description: 'Please review my order.' };
const post = (body: unknown, auth = true) => fetch(`${url}/support`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer owner' } : {}) }, body: JSON.stringify(body) });
it('requires sign-in before ticket access or creation', async () => {
  expect((await post(input, false)).status).toBe(401);
  expect((await fetch(url)).status).toBe(401);
  expect(f.create).not.toHaveBeenCalled(); expect(f.query).not.toHaveBeenCalled();
});
it('retires the old route-specific creation endpoint', async () => {
  expect((await post(input)).status).toBe(410); expect(f.create).not.toHaveBeenCalled();
});
it('scopes ticket listing by UID before pagination and returns friendly errors', async () => {
  const response = await fetch(url, { headers: { Authorization: 'Bearer owner' } });
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(f.query).toHaveBeenCalledWith('tickets', [{ field: 'uid', op: 'eq', value: 'owner' }], { limit: 26 });
  expect(await (await post(input)).text()).not.toContain('secret stack');
});
