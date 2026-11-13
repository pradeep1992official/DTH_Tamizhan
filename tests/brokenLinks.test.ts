import { beforeEach, expect, it, vi } from 'vitest';
import express from 'express';
const state = vi.hoisted(() => ({ reports: new Map<string, any>(), admin: false }));
vi.mock('../server/persistence', () => ({ usesFirestore: () => true, documentKey: (value: string) => encodeURIComponent(value),
  mutateRecord: async (_collection: string, key: string, update: any) => { const value = update(state.reports.get(key)); state.reports.set(key, value); return value; },
  readCollection: async () => [...state.reports.values()] }));
vi.mock('../server/middleware/auth', () => ({ isCallerAdminAuthorized: async () => ({ authorized: state.admin }) }));
vi.mock('../server/models/store', () => ({ APPROVED_ADMIN_EMAILS: new Set() }));
vi.mock('express-rate-limit', () => ({ default: () => (_req: any, _res: any, next: () => void) => next() }));
import { brokenLinksRouter } from '../server/routes/brokenLinks';
beforeEach(() => { state.reports.clear(); state.admin = false; });
async function request(path: string, body?: object, accept = 'application/json') {
  const app = express(); app.use(express.json()); app.use(brokenLinksRouter);
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as { port: number }).port}${path}`, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Accept: accept }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.text() };
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
}
it('saves broken paths without contact data and aggregates repeated reports', async () => {
  expect((await request('/api/broken-links', { path: '/missing' })).status).toBe(200);
  await request('/api/broken-links', { path: '/missing' });
  expect([...state.reports.values()]).toEqual([expect.objectContaining({ path: '/missing', count: 2 })]);
});
it('rejects external URLs, query data, control characters and unexpected personal fields', async () => {
  for (const body of [{ path: 'https://example.test' }, { path: '//external.test' }, { path: '/missing?token=secret' }, { path: '/bad\npath' }, { path: '/missing', email: 'person@example.test' }]) expect((await request('/api/broken-links', body)).status).toBe(400);
  expect(state.reports.size).toBe(0);
});
it('restricts the report listing to administrators and supports native form recovery', async () => {
  expect((await request('/api/admin/broken-links')).status).toBe(403);
  const sent = await request('/api/broken-links', { path: '/missing' }, 'text/html'); expect(sent.body).toContain('has been reported');
  state.admin = true; const result = await request('/api/admin/broken-links'); expect(JSON.parse(result.body).reports[0].path).toBe('/missing');
});
