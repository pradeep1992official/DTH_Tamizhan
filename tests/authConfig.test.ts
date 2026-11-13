import { afterEach, expect, it, vi } from 'vitest';
import express from 'express';
import { authConfigRouter } from '../server/routes/authConfig';
afterEach(() => vi.unstubAllEnvs());
async function configuration() {
  const app = express(); app.use(authConfigRouter); const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as { port: number }).port}/api/auth/config`);
    return { headers: response.headers, data: await response.json() };
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
}
it('keeps SMS sign-in off unless explicitly opted in', async () => {
  vi.stubEnv('FIREBASE_PHONE_AUTH_ENABLED', 'false'); expect((await configuration()).data).toEqual({ phoneEnabled: false });
  vi.stubEnv('FIREBASE_PHONE_AUTH_ENABLED', 'TRUE'); expect((await configuration()).data).toEqual({ phoneEnabled: false });
});
it('exposes only the phone availability flag and no credentials', async () => {
  vi.stubEnv('FIREBASE_PHONE_AUTH_ENABLED', 'true'); vi.stubEnv('BREVO_API_KEY', 'private-fixture');
  const response = await configuration(); expect(response.data).toEqual({ phoneEnabled: true });
  expect(response.headers.get('Cache-Control')).toBe('no-store');
});
