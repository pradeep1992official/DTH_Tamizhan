import express from 'express';
import type { Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ mutate: vi.fn(), read: vi.fn(), saveLogo: vi.fn() }));
vi.mock('../server/middleware/auth', () => ({ isCallerAdminAuthorized: async (req: any) => ({ authorized: req.headers.authorization === 'Bearer admin' }) }));
vi.mock('../server/middleware/rateLimiter', () => ({ adminLimiter: (_req: any, _res: any, next: any) => next() }));
vi.mock('../server/models/newConnectionCatalog', () => ({ mutateCatalog: f.mutate, readNewConnectionCatalog: f.read }));
vi.mock('firebase-admin/storage', () => ({ getStorage: () => ({ bucket: () => ({ name: 'test-bucket', file: () => ({ save: f.saveLogo }) }) }) }));
import { newConnectionCatalogRouter } from '../server/routes/newConnectionCatalog';
let server: Server; let url: string;
beforeAll(async () => { const app = express(); app.use(express.json()); app.use(newConnectionCatalogRouter); server = await new Promise<Server>(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); }); const a = server.address(); if (!a || typeof a === 'string') throw new Error(); url = `http://127.0.0.1:${a.port}/api/admin/catalog`; });
afterAll(async () => { await new Promise<void>(resolve => server.close(() => resolve())); });
beforeEach(() => { vi.clearAllMocks(); f.mutate.mockResolvedValue({ item: {}, softDeleted: false }); f.read.mockResolvedValue({ channels: [] }); });
const call = (path: string, token?: string, body?: unknown) => fetch(url + path, { method: body === undefined ? 'GET' : 'POST', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
it('denies guests/customers on every catalog operation before accessing data or Storage', async () => {
  for (const token of [undefined, 'customer']) for (const path of ['', '/save', '/import', '/channels/bulk', '/logo']) expect((await call(path, token, path ? {} : undefined)).status).toBe(403);
  expect(f.read).not.toHaveBeenCalled(); expect(f.mutate).not.toHaveBeenCalled(); expect(f.saveLogo).not.toHaveBeenCalled();
});
it('reports invalid import rows without stopping valid upserts', async () => {
  const res = await call('/import', 'admin', { kind: 'channels', csv: 'name,language,genre,isHD\nOne,Tamil,News,true\nTwo,Tamil,News,yes\nThree,Tamil,News,false' });
  expect(res.status).toBe(200); const result = await res.json();
  expect(result.imported).toBe(2); expect(result.errors[0]).toMatchObject({ row: 3, name: 'Two' });
  expect(f.mutate).toHaveBeenCalledTimes(2);
});
it('rejects invalid route kinds, IDs and unsafe logo uploads', async () => {
  expect((await call('/save', 'admin', { kind: 'users', data: {} })).status).toBe(400);
  expect((await call('/save', 'admin', { kind: 'brands', id: '../users', data: {} })).status).toBe(400);
  expect((await call('/logo', 'admin', { contentType: 'image/svg+xml', base64: 'PHN2Zz4=' })).status).toBe(400);
  expect((await call('/logo', 'admin', { contentType: 'image/png', base64: 'PHN2Zz4=' })).status).toBe(400);
  expect(f.saveLogo).not.toHaveBeenCalled();
});
it('uploads authorized logos to the catalog folder and returns a public logo URL', async () => {
  const res = await call('/logo', 'admin', { contentType: 'image/png', base64: Buffer.from([137,80,78,71,13,10,26,10]).toString('base64') });
  expect(res.status).toBe(200); expect((await res.json()).url).toContain('catalog-logos%2F');
  expect(f.saveLogo).toHaveBeenCalledWith(expect.any(Buffer), expect.objectContaining({ contentType: 'image/png' }));
});
