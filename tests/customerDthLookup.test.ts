import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import express from 'express';
import { createHash } from 'node:crypto';
const f = vi.hoisted(() => ({ records: new Map<string, any>(), provider: vi.fn(), auth: true, protections: 0 }));
vi.mock('../server/persistence', () => ({
  documentKey: (value: string) => createHash('sha256').update(value).digest('hex'),
  mutateRecord: async (_name: string, id: string, update: (old: any) => any) => { const record = update(f.records.get(id)); f.records.set(id, record); return record; },
}));
vi.mock('../server/models/dthLookup', () => ({ dthLookupConfigured: () => true, lookupDth: f.provider }));
vi.mock('../server/middleware/auth', () => ({ verifyAuthToken: async () => f.auth ? { uid: 'route-user' } : null, isCallerAdminAuthorized: async () => ({ authorized: false }) }));
vi.mock('../server/middleware/ticketProtection', () => ({ ticketProtection: (_req: unknown, res: any, next: () => void) => {
  f.protections++; res.status(403).json({ success: false, error: 'App verification required.' });
} }));
import { customerDthLookup } from '../server/models/customerDthLookup';
import { dthLookupRouter } from '../server/routes/dthLookup';
import { customerLookupInput, lookupOperatorId } from '../src/lib/dthLookup';
const input = { operator: 'airtel_dth' as const, subscriberId: '3012012012' };
beforeEach(() => {
  f.records.clear(); f.protections = 0; f.auth = true; f.provider.mockReset();
  f.provider.mockResolvedValue({ success: true, outcome: 'found', mode: 'live', charged: true, reference: 'private-reference', details: { name: 'Test customer', balance: '0', plan: 'Pack', address: 'Private home address', registered_mobile: '9876543210' } });
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
it('caches repeat lookups and excludes private contact fields and provider billing', async () => {
  const first = await customerDthLookup('cache-user', input);
  const second = await customerDthLookup('cache-user', input);
  expect(first.details).toEqual({ name: 'Test customer', balance: '0', plan: 'Pack' });
  expect(second.cached).toBe(true); expect(f.provider).toHaveBeenCalledOnce();
  expect(JSON.stringify(first)).not.toContain('private-reference');
  expect(JSON.stringify(first)).not.toContain('registered_mobile');
});
it('deduplicates concurrent calls, but isolates users and operator IDs', async () => {
  await Promise.all([customerDthLookup('parallel', input), customerDthLookup('parallel', input)]);
  expect(f.provider).toHaveBeenCalledOnce();
  await customerDthLookup('another-user', input);
  await customerDthLookup('parallel', { ...input, operator: 'tata_play' });
  expect(f.provider).toHaveBeenCalledTimes(3);
});
it('expires the short cache instead of presenting stale balances indefinitely', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-15T10:00:00Z'));
  await customerDthLookup('expiry-user', input);
  vi.advanceTimersByTime(301_000);
  await customerDthLookup('expiry-user', input);
  expect(f.provider).toHaveBeenCalledTimes(2);
});
it('enforces the shared app budget before calling the provider', async () => {
  vi.stubEnv('DTH_CUSTOMER_LOOKUP_DAILY_LIMIT', '1');
  await customerDthLookup('budget-user-1', input);
  await expect(customerDthLookup('budget-user-2', input)).rejects.toThrow('Daily lookup limit');
  expect(f.provider).toHaveBeenCalledOnce();
});
it('briefly caches uncertain or failed responses to reduce paid retries', async () => {
  f.provider.mockResolvedValue({ success: false, outcome: 'pending', charged: true, details: null });
  const first = await customerDthLookup('pending-user', input);
  expect(first.success).toBe(false); expect(first.error).toContain('wait');
  await customerDthLookup('pending-user', input);
  expect(f.provider).toHaveBeenCalledOnce();
});
it('requires consent and correctly maps the combined Dish TV/d2h selector', () => {
  expect(customerLookupInput.safeParse({ ...input, consent: false }).success).toBe(false);
  expect(customerLookupInput.safeParse({ ...input, consent: true, mode: 'demo' }).success).toBe(false);
  expect(lookupOperatorId('dish_tv', '02589412356')).toBe('dish_tv');
  expect(lookupOperatorId('dish_tv', '894561234')).toBe('videocon_d2h');
  expect(lookupOperatorId('airtel_dth', input.subscriberId)).toBe('airtel_dth');
  expect(lookupOperatorId('unsupported', input.subscriberId)).toBeNull();
});
async function route(method: string, path: string) {
  const app = express(); app.use(express.json()); app.use(dthLookupRouter);
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const res = await fetch(`http://127.0.0.1:${(server.address() as { port: number }).port}${path}`, {
      method, headers: { 'Content-Type': 'application/json' }, ...(method === 'POST' && { body: JSON.stringify({ ...input, consent: true }) }),
    });
    return { status: res.status, body: await res.json() };
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
}
it('requires sign-in and app verification before any customer provider call', async () => {
  f.auth = false; expect((await route('POST', '/api/dth-lookup')).status).toBe(401);
  expect(f.protections).toBe(0);
  f.auth = true; expect((await route('POST', '/api/dth-lookup')).status).toBe(403);
  expect(f.protections).toBe(1); expect(f.provider).not.toHaveBeenCalled();
});
it('supports disabling customer access without exposing credentials', async () => {
  vi.stubEnv('DTH_CUSTOMER_LOOKUP_ENABLED', 'false');
  expect((await route('GET', '/api/dth-lookup/config')).body).toEqual({ enabled: false });
});
