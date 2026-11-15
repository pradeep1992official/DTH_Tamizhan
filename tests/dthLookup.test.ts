import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import express from 'express';
const auth = vi.hoisted(() => ({ signedIn: true, admin: true }));
vi.mock('../server/middleware/auth', () => ({
  verifyAuthToken: async () => auth.signedIn ? { uid: 'test-admin' } : null,
  isCallerAdminAuthorized: async () => ({ authorized: auth.admin }),
}));
import { lookupDth } from '../server/models/dthLookup';
import { dthLookupRouter } from '../server/routes/dthLookup';
import { dthLookupInput } from '../src/lib/dthLookup';
import { pageMetadata } from '../src/lib/pageMetadata';
const live = { mode: 'live' as const, subscriberId: '3012012012', operator: 'airtel_dth' as const, consent: true };
const nativeFetch = globalThis.fetch;
beforeEach(() => { auth.signedIn = true; auth.admin = true; vi.stubEnv('WAY2API_API_KEY', 'test-server-secret'); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it('demo mode never calls the provider or requires credentials', async () => {
  vi.stubEnv('WAY2API_API_KEY', ''); const provider = vi.fn(); vi.stubGlobal('fetch', provider);
  const result = await lookupDth({ ...live, mode: 'demo', consent: false });
  expect(result.mode).toBe('demo'); expect(result.charged).toBe(false);
  expect(result.details?.name).toContain('sample'); expect(provider).not.toHaveBeenCalled();
});
it('only calls the documented lookup endpoint with server authentication', async () => {
  const provider = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, charged: true, order_id: 'ref-1', data: { result: { name: 'Test customer', balance: 0, plan: 'N/A', extra: 'not exposed' } } })));
  vi.stubGlobal('fetch', provider);
  const result = await lookupDth(live);
  expect(provider).toHaveBeenCalledOnce();
  const [url, request] = provider.mock.calls[0];
  expect(url).toBe('https://app.way2api.com/api/v1/dth/info');
  expect(request.headers.Authorization).toBe('Bearer test-server-secret');
  expect(JSON.parse(request.body)).toEqual({ dth_number: live.subscriberId, operator: 'airtel_dth' });
  expect(result.details).toEqual({ name: 'Test customer', balance: '0' });
  expect(JSON.stringify(result)).not.toContain('test-server-secret');
});
it('keeps pending and billable negative results distinct from successful details', async () => {
  const provider = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ success: false, status: 'PENDING', charged: true, order_id: 'pending-ref' }), { status: 202 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ success: false, charged: true, message_code: 'NO_RECORD_FOUND', order_id: 'failed-ref' }), { status: 422 }));
  vi.stubGlobal('fetch', provider);
  expect(await lookupDth(live)).toMatchObject({ outcome: 'pending', charged: true, reference: 'pending-ref' });
  expect(await lookupDth(live)).toMatchObject({ outcome: 'failed', charged: true, reference: 'failed-ref', details: null });
});
it('does not retry ambiguous failures or expose upstream errors', async () => {
  const provider = vi.fn().mockRejectedValue(new Error('test-server-secret')); vi.stubGlobal('fetch', provider);
  const result = await lookupDth(live);
  expect(result.charged).toBeNull(); expect(result.error).toContain('before retrying');
  expect(JSON.stringify(result)).not.toContain('test-server-secret'); expect(provider).toHaveBeenCalledOnce();
});
it('rejects live use without permission acknowledgement or server credentials', async () => {
  const provider = vi.fn(); vi.stubGlobal('fetch', provider);
  await expect(lookupDth({ ...live, consent: false })).rejects.toThrow('Confirm permission');
  vi.stubEnv('WAY2API_API_KEY', ''); await expect(lookupDth(live)).rejects.toThrow('WAY2API_API_KEY');
  expect(provider).not.toHaveBeenCalled();
});
it('validates leading zeros, operator selection and digit-only identifiers', () => {
  expect(dthLookupInput.safeParse({ ...live, subscriberId: '01234567890' }).success).toBe(true);
  expect(dthLookupInput.safeParse({ ...live, subscriberId: '../secret' }).success).toBe(false);
  expect(dthLookupInput.safeParse({ ...live, operator: 'unknown' }).success).toBe(false);
  expect(dthLookupInput.safeParse({ ...live, endpoint: 'https://other.example' }).success).toBe(false);
  expect(pageMetadata('/admin/api-test')).toMatchObject({ status: 200, noindex: true });
});
async function route(path: string, body?: unknown) {
  const app = express(); app.use(express.json()); app.use(dthLookupRouter);
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const response = await nativeFetch(`http://127.0.0.1:${(server.address() as { port: number }).port}/api/admin/dth-lookup/${path}`, {
      method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, headers: response.headers, body: await response.json() };
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
}
it('protects configuration and lookups against anonymous and non-admin access', async () => {
  auth.signedIn = false; expect((await route('config')).status).toBe(401);
  auth.signedIn = true; auth.admin = false;
  expect((await route('test', live)).status).toBe(403);
});
it('exposes only credential availability and serves demo results without provider calls', async () => {
  const config = await route('config'); expect(config.body).toEqual({ success: true, configured: true, provider: 'Way2API' });
  expect(config.headers.get('cache-control')).toBe('no-store');
  const provider = vi.fn(); vi.stubGlobal('fetch', provider);
  const demo = await route('test', { ...live, mode: 'demo', consent: false });
  expect(demo.body.mode).toBe('demo'); expect(provider).not.toHaveBeenCalled();
  expect((await route('test', { ...live, consent: false })).status).toBe(400);
  vi.stubEnv('WAY2API_API_KEY', ''); expect((await route('test', live)).status).toBe(503);
});
