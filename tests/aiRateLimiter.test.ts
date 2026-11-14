import { beforeEach, expect, it, vi } from 'vitest';
const store = vi.hoisted(() => ({ shared: false, mutate: vi.fn() }));
vi.mock('../server/persistence', () => ({ collections: { runtime: 'server_runtime' },
  documentKey: (uid: string) => uid, usesFirestore: () => store.shared, mutateRecord: store.mutate }));
import { allowAiRequest } from '../server/middleware/aiRateLimiter';
const response = () => { const res = { status: vi.fn(), json: vi.fn(), setHeader: vi.fn() }; res.status.mockReturnValue(res); return res; };
beforeEach(() => { store.shared = false; store.mutate.mockReset(); });
it('allows 20 per user, rejects the 21st, isolates users and expires the sliding window', async () => {
  const res = response(); const now = 100_000;
  for (let i = 0; i < 20; i++) expect(await allowAiRequest('limited', res as any, now)).toBe(true);
  expect(await allowAiRequest('limited', res as any, now)).toBe(false);
  expect(res.status).toHaveBeenCalledWith(429);
  expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '60');
  expect(await allowAiRequest('other', res as any, now)).toBe(true);
  expect(await allowAiRequest('limited', res as any, now + 60_000)).toBe(true);
});
it('uses shared atomic storage and rejects requests when storage fails', async () => {
  store.shared = true; const res = response();
  store.mutate.mockImplementation(async (_collection, _id, reserve) => reserve({ timestamps: Array(20).fill(100_000) }));
  expect(await allowAiRequest('shared', res as any, 100_000)).toBe(false);
  expect(res.status).toHaveBeenCalledWith(429);
  store.mutate.mockRejectedValue(new Error('offline'));
  expect(await allowAiRequest('shared', res as any)).toBe(false);
  expect(res.status).toHaveBeenCalledWith(503);
});
