import { afterEach, expect, it, vi } from 'vitest';
import express from 'express';
const worker = vi.hoisted(() => ({ process: vi.fn() }));
vi.mock('../server/emailDelivery', () => ({ processReceiptEmails: worker.process }));
import { emailRouter } from '../server/routes/email';
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
async function request(token?: string) {
  const app = express(); app.use(emailRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    return await fetch(`http://127.0.0.1:${(server.address() as { port: number }).port}/api/internal/email/process`, {
      method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
}
it('keeps the scheduler disabled without a configured secret', async () => {
  vi.stubEnv('EMAIL_WORKER_TOKEN', ''); expect((await request()).status).toBe(404); expect(worker.process).not.toHaveBeenCalled();
});
it('rejects unauthorized scheduler requests', async () => {
  vi.stubEnv('EMAIL_WORKER_TOKEN', 'a'.repeat(32)); expect((await request('wrong')).status).toBe(401); expect(worker.process).not.toHaveBeenCalled();
});
it('processes the outbox only for the configured scheduler secret', async () => {
  const token = 'a'.repeat(32); vi.stubEnv('EMAIL_WORKER_TOKEN', token);
  expect((await request(token)).status).toBe(200); expect(worker.process).toHaveBeenCalledTimes(1);
});
