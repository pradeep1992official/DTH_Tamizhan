import express from 'express';
import type { Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ registry: {} as Record<string, unknown>, tickets: vi.fn(), ticket: vi.fn(), query: vi.fn(), summary: vi.fn(), draft: vi.fn(), pending: vi.fn() }));
vi.mock('firebase-admin/app', () => ({ getApps: () => [{}] }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ verifyIdToken: async (token: string) => {
  if (token === 'bad') throw new Error('bad');
  return { uid: token, email: token === 'root' ? 'professorpradeeps@gmail.com' : `${token}@example.com`, email_verified: token !== 'unverified', admin: token === 'claim-only' };
} }) }));
vi.mock('firebase-admin/firestore', () => ({ getFirestore: () => ({ collection: () => ({ doc: (id: string) => ({ create: async () => {}, get: async () => ({ data: () => f.registry[id] }) }) }) }) }));
vi.mock('../server/middleware/aiRateLimiter', () => ({ allowAiRequest: async () => true }));
vi.mock('../server/models/adminAiData', () => ({ overallPendingRecharges: f.pending, openSupportTickets: f.tickets, supportTicket: f.ticket, ticketView: (ticket: unknown) => ticket }));
vi.mock('../server/utils/adminAiModel', () => ({ adminNaturalQuery: f.query, summarizeAdminTickets: f.summary, draftAdminReply: f.draft }));
import { adminAiRouter } from '../server/routes/adminAi';
let server: Server; let url: string;
beforeAll(async () => { const app = express(); app.use(express.json()); app.use('/api/admin/ai', adminAiRouter);
  server = await new Promise<Server>(resolve => { const active = app.listen(0, '127.0.0.1', () => resolve(active)); });
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('address');
  url = `http://127.0.0.1:${address.port}/api/admin/ai`;
});
afterAll(async () => { await new Promise<void>(resolve => server.close(() => resolve())); });
beforeEach(() => {
  vi.clearAllMocks(); f.registry = { approved: { email: 'approved@example.com', status: 'approved' }, revoked: { email: 'revoked@example.com', status: 'revoked' } };
  f.pending.mockResolvedValue({ rows: [], nextCursor: null }); f.tickets.mockResolvedValue([]); f.summary.mockResolvedValue([]); f.query.mockResolvedValue({ text: 'No matches' });
  f.ticket.mockResolvedValue({ id: 'ticket_1', kind: 'refund', status: 'open', replyEmail: 'customer@example.com' });
  f.draft.mockResolvedValue({ subject: 'Reply', body: 'We will review your request.' });
});
function call(path: string, token?: string, body?: unknown) { return fetch(url + path, { method: body === undefined ? 'GET' : 'POST',
  headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }); }
it('denies anonymous, invalid, non-admin, unverified and revoked identities before model or ticket access', async () => {
  for (const token of [undefined, 'bad', 'customer', 'unverified', 'revoked', 'claim-only']) {
    for (const [path, body] of [['/tickets', undefined], ['/pending', { limit: 100 }], ['/query', { message: 'failed recharges yesterday' }], ['/summarize', {}],
      ['/tickets/ticket_1/draft', {}], ['/tickets/ticket_1/approve', { subject: 'Reply', body: 'Approved', approved: true }]] as const) {
      expect([401, 403]).toContain((await call(path, token, body)).status);
    }
  }
  for (const mock of [f.tickets, f.ticket, f.query, f.summary, f.draft]) expect(mock).not.toHaveBeenCalled();
});
it('allows existing root and approved admins and rechecks registry revocation per request', async () => {
  expect((await call('/tickets', 'root')).status).toBe(200);
  expect((await call('/tickets', 'approved')).status).toBe(200);
  f.registry.approved = { email: 'approved@example.com', status: 'revoked' };
  expect((await call('/tickets', 'approved')).status).toBe(403);
});
it('validates request shape rather than accepting a model/client query object', async () => {
  expect((await call('/query', 'root', { message: 'test', query: { collection: 'users' } })).status).toBe(400);
  expect((await call('/query', 'root', { message: 'x'.repeat(501) })).status).toBe(400);
  expect(f.query).not.toHaveBeenCalled();
});
it('returns a draft without sending or invoking approval', async () => {
  const response = await call('/tickets/ticket_1/draft', 'approved', {});
  expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ draft: { subject: 'Reply' } });
  expect(f.draft).toHaveBeenCalledWith('approved', expect.objectContaining({ id: 'ticket_1' }), '');
});
it('requires explicit approval and takes the recipient exclusively from the current ticket', async () => {
  expect((await call('/tickets/ticket_1/approve', 'root', { subject: 'Reply', body: 'Hello' })).status).toBe(400);
  expect((await call('/tickets/ticket_1/approve', 'root', { subject: 'Reply', body: 'Hello', approved: true, recipient: 'attacker@example.com' })).status).toBe(400);
  const response = await call('/tickets/ticket_1/approve', 'root', { subject: 'Reply & review', body: 'Hello', approved: true });
  expect(await response.json()).toMatchObject({ emailUrl: 'mailto:customer@example.com?subject=Reply%20%26%20review&body=Hello', delivery: 'email_app_required' });
});
it('rechecks ticket closure before drafting or handing off approved mail and exposes no destructive endpoint', async () => {
  f.ticket.mockResolvedValue({ status: 'closed' });
  expect((await call('/tickets/ticket_1/draft', 'root', {})).status).toBe(409);
  expect((await call('/tickets/ticket_1/approve', 'root', { subject: 'Reply', body: 'Hello', approved: true })).status).toBe(409);
  expect((await call('/tickets/ticket_1/delete', 'root', {})).status).toBe(404);
});

it('serves overall pending to admins without a model call and rejects arbitrary filter fields', async () => {
  const response = await call('/pending', 'approved', { limit: 100 });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ result: { type: 'pending_recharges', rows: [], nextCursor: null } });
  expect(f.pending).toHaveBeenCalled(); expect(f.query).not.toHaveBeenCalled();
  expect((await call('/pending', 'approved', { limit: 100, collection: 'users' })).status).toBe(400);
});
