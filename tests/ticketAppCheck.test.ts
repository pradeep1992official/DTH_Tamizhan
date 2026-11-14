import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ initialize: vi.fn(), token: vi.fn(), fetch: vi.fn(), config: { appCheckSiteKey: '' } }));
vi.mock('../firebase-applet-config.json', () => ({ default: f.config }));
vi.mock('firebase/app-check', () => ({ initializeAppCheck: f.initialize, getToken: f.token, ReCaptchaEnterpriseProvider: class { constructor(public key: string) {} } }));
vi.mock('firebase/app', () => ({ getApps: () => [{ name: '[DEFAULT]' }] }));
vi.mock('../src/lib/paymentAuth', () => ({ paymentAuthHeaders: async () => ({ Authorization: 'Bearer user-token' }) }));
beforeEach(() => { vi.resetModules(); vi.stubEnv('VITE_FIREBASE_APPCHECK_SITE_KEY', ''); f.config.appCheckSiteKey = ''; f.initialize.mockReset(); f.token.mockReset(); f.fetch.mockReset(); f.initialize.mockReturnValue({ app: 'configured' }); f.token.mockResolvedValue({ token: 'attestation-token' }); vi.stubGlobal('fetch', f.fetch); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it('loads runtime public configuration when the built bundle has no site key', async () => {
  f.fetch.mockResolvedValue({ ok: true, json: async () => ({ appCheckSiteKey: 'public_recaptcha_site_key_fixture' }) });
  const { ticketAuthHeaders } = await import('../src/lib/ticketAppCheck');
  expect(await ticketAuthHeaders()).toEqual({ Authorization: 'Bearer user-token', 'X-Firebase-AppCheck': 'attestation-token' });
  await ticketAuthHeaders(); expect(f.initialize).toHaveBeenCalledTimes(1); expect(f.fetch).toHaveBeenCalledTimes(1);
  expect(f.fetch).toHaveBeenCalledWith('/api/support/config', expect.objectContaining({ cache: 'no-store' }));
});
it('fails closed without a configured key and allows retry after configuration is repaired', async () => {
  f.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ appCheckSiteKey: null }) });
  const { ticketAuthHeaders } = await import('../src/lib/ticketAppCheck');
  await expect(ticketAuthHeaders()).rejects.toThrow('not configured'); expect(f.token).not.toHaveBeenCalled();
  f.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ appCheckSiteKey: 'public_recaptcha_site_key_fixture' }) });
  expect(await ticketAuthHeaders()).toHaveProperty('X-Firebase-AppCheck', 'attestation-token');
});
it('uses the registered public Firebase site key without requiring a build environment variable', async () => {
  f.config.appCheckSiteKey = 'public_registered_site_key_fixture';
  const { ticketAuthHeaders } = await import('../src/lib/ticketAppCheck');
  expect(await ticketAuthHeaders()).toHaveProperty('X-Firebase-AppCheck', 'attestation-token');
  expect(f.fetch).not.toHaveBeenCalled(); expect(f.initialize).toHaveBeenCalledTimes(1);
});
