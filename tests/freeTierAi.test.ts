import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ generate: vi.fn(), token: vi.fn(), usage: new Map<string, any>(), client: vi.fn() }));
vi.mock('firebase-admin/app', () => ({ applicationDefault: () => ({ getAccessToken: state.token }) }));
vi.mock('@google/genai', () => ({ ThinkingLevel: { MINIMAL: 'MINIMAL' }, GoogleGenAI: class { models = { generateContent: state.generate }; constructor(config: unknown) { state.client(config); } } }));
vi.mock('../server/persistence', () => ({ collections: { runtime: 'server_runtime' }, usesFirestore: () => true,
  mutateRecord: async (_collection: string, id: string, update: any) => { const value = update(state.usage.get(id)); state.usage.set(id, value); return value; } }));
import { freeTierRank, verifiedFreeKey, reserveFreeRequest, FREE_RECOMMENDATION_MODEL } from '../server/utils/freeTierAi';
const candidates = [{ id: 'catalog-plan', name: 'Tamil HD', tags: ['movies'] }];
const freeResponses = (billing: object = { billingEnabled: false }) => vi.fn()
  .mockResolvedValueOnce(new Response(JSON.stringify({ parent: 'projects/123/locations/global', name: 'projects/123/locations/global/keys/key-id' })))
  .mockResolvedValueOnce(new Response(JSON.stringify(billing)));
beforeEach(() => {
  vi.clearAllMocks(); state.usage.clear(); state.token.mockResolvedValue({ access_token: 'server-oauth-fixture' });
  vi.stubEnv('GEMINI_FREE_ENABLED', 'true'); vi.stubEnv('GEMINI_FREE_API_KEY', 'AIzaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'); vi.stubEnv('GEMINI_FREE_DAILY_LIMIT', '10');
  vi.stubEnv('GEMINI_FREE_CUSTOMER_DAILY_LIMIT', '3');
  state.generate.mockResolvedValue({ text: '{"planIds":["catalog-plan"]}' });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it('never calls Gemini when disabled or missing the dedicated key, even with a legacy paid key', async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher); vi.stubEnv('GEMINI_API_KEY', 'legacy-key');
  vi.stubEnv('GEMINI_FREE_ENABLED', 'false'); await expect(freeTierRank('customer', candidates, '')).rejects.toMatchObject({ reason: 'setup' });
  vi.stubEnv('GEMINI_FREE_ENABLED', 'true'); vi.stubEnv('GEMINI_FREE_API_KEY', ''); await expect(verifiedFreeKey()).rejects.toMatchObject({ reason: 'setup' });
  expect(fetcher).not.toHaveBeenCalled(); expect(state.generate).not.toHaveBeenCalled();
});
it('checks the actual key project billing before one bounded request to the fixed model', async () => {
  const fetcher = freeResponses(); vi.stubGlobal('fetch', fetcher);
  expect(await freeTierRank('customer', candidates, 'Movies')).toEqual(['catalog-plan']);
  expect(String(fetcher.mock.calls[1][0])).toBe('https://cloudbilling.googleapis.com/v1/projects/123/billingInfo');
  expect(state.client).toHaveBeenCalledWith(expect.objectContaining({ apiKey: 'AIzaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', vertexai: false }));
  expect(state.generate).toHaveBeenCalledTimes(1);
  expect(state.generate).toHaveBeenCalledWith(expect.objectContaining({ model: FREE_RECOMMENDATION_MODEL, config: expect.objectContaining({ maxOutputTokens: 768, thinkingConfig: { thinkingLevel: 'MINIMAL' }, responseMimeType: 'application/json' }) }));
});
it.each([{ billingEnabled: true }, {}, { billingEnabled: false, billingAccountName: 'billingAccounts/linked' }])('refuses paid, linked or unknown billing: %j', async billing => {
  vi.stubGlobal('fetch', freeResponses(billing));
  await expect(freeTierRank('customer', candidates, '')).rejects.toMatchObject({ reason: 'billing' }); expect(state.generate).not.toHaveBeenCalled();
});
it('fails closed when billing verification or credentials are unavailable', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 403 })));
  await expect(verifiedFreeKey()).rejects.toMatchObject({ reason: 'setup' }); expect(state.generate).not.toHaveBeenCalled();
});
it('never switches models or retries paid alternatives after provider quota errors', async () => {
  vi.stubGlobal('fetch', freeResponses()); state.generate.mockRejectedValueOnce({ status: 429 });
  await expect(freeTierRank('customer', candidates, '')).rejects.toMatchObject({ reason: 'provider' }); expect(state.generate).toHaveBeenCalledTimes(1);
});
it('rejects hallucinated IDs instead of presenting invented packs', async () => {
  vi.stubGlobal('fetch', freeResponses()); state.generate.mockResolvedValueOnce({ text: '{"planIds":["invented"]}' });
  await expect(freeTierRank('customer', candidates, '')).rejects.toMatchObject({ reason: 'provider' });
});
it('enforces the shared daily ceiling, per-customer allowance and minute limit', async () => {
  const now = Date.parse('2026-11-13T12:00:00Z');
  vi.stubEnv('GEMINI_FREE_DAILY_LIMIT', '500');
  await reserveFreeRequest('a', now); await reserveFreeRequest('b', now);
  for (let i = 0; i < 13; i++) await reserveFreeRequest(`minute-${i}`, now);
  await expect(reserveFreeRequest('c', now)).rejects.toMatchObject({ reason: 'quota', limit: 'minute_limit' });
  state.usage.clear();
  vi.stubEnv('GEMINI_FREE_DAILY_LIMIT', '10');
  await reserveFreeRequest('a', now); await reserveFreeRequest('b', now);
  for (let i = 2; i < 10; i++) await reserveFreeRequest(`customer-${i}`, now + i * 61000);
  await expect(reserveFreeRequest('last', now + 700000)).rejects.toMatchObject({ reason: 'quota' });
  state.usage.clear(); for (let i = 0; i < 3; i++) await reserveFreeRequest('same', now + i * 61000);
  await expect(reserveFreeRequest('same', now + 200000)).rejects.toMatchObject({ reason: 'quota' });
});

it('identifies placeholder keys without sending them to Google', async () => {
  vi.stubEnv('GEMINI_FREE_API_KEY', 'YOUR_API_KEY');
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  await expect(verifiedFreeKey()).rejects.toThrow('placeholder or invalid');
  expect(fetcher).not.toHaveBeenCalled();
});
it('accepts newer AQ. authorization keys and still verifies ownership and billing', async () => {
  vi.stubEnv('GEMINI_FREE_API_KEY', `AQ.${'x'.repeat(50)}`);
  const fetcher = freeResponses(); vi.stubGlobal('fetch', fetcher);
  expect(await verifiedFreeKey()).toBe(`AQ.${'x'.repeat(50)}`);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(state.generate).not.toHaveBeenCalled();
});
it('lets one customer use the app allowance by default without raising the global ceiling', async () => {
  vi.stubEnv('GEMINI_FREE_CUSTOMER_DAILY_LIMIT', '');
  const now = Date.parse('2026-11-13T12:00:00Z');
  for (let i = 0; i < 10; i++) await reserveFreeRequest('one-customer', now + i * 61000);
  await expect(reserveFreeRequest('another-customer', now + 700000)).rejects.toMatchObject({ reason: 'quota', limit: 'daily_limit' });
});
