import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ verify: vi.fn(), records: new Map<string, any>(), logs: [] as any[] }));
vi.mock('firebase-admin/app-check', () => ({ getAppCheck: () => ({ verifyToken: f.verify }) }));
vi.mock('../server/middleware/auth', () => ({ getAdminFirestore: () => ({
  collection: (name: string) => ({ doc: (id = 'log') => ({ key: `${name}/${id}`, create: async (value: any) => f.logs.push(value) }) }),
  runTransaction: async (callback: any) => callback({ get: async (ref: any) => ({ data: () => f.records.get(ref.key) }), set: (ref: any, data: any) => f.records.set(ref.key, data) }),
}) }));
import { ticketProtection } from '../server/middleware/ticketProtection';
import { stripTicketHtml } from '../src/lib/tickets';
import config from '../firebase-applet-config.json';
beforeEach(() => { f.records.clear(); f.logs = []; f.verify.mockReset(); f.verify.mockResolvedValue({ appId: config.appId }); vi.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000); });
afterEach(() => vi.restoreAllMocks());
async function call({ token = 'valid', uid = 'owner', ip = '127.0.0.1', body = {} as any } = {}) {
  const req: any = { method: 'POST', headers: token ? { 'x-firebase-appcheck': token } : {}, ip, path: '/api/tickets/support', body };
  const res: any = { locals: { ticketUid: uid }, status: vi.fn().mockReturnThis(), json: vi.fn() }; const next = vi.fn();
  await ticketProtection(req, res, next); return { res, next, req };
}
it('requires valid App Check for the configured Firebase app and logs blocked attempts', async () => {
  expect((await call({ token: '' })).res.status).toHaveBeenCalledWith(403);
  f.verify.mockResolvedValueOnce({ appId: 'another-app' }); expect((await call()).next).not.toHaveBeenCalled();
  expect(f.logs).toHaveLength(2); expect(f.logs[0].uid).toBe('owner');
});
it('enforces persistent per-user and IP buckets', async () => {
  for (let i = 0; i < 20; i++) expect((await call()).next).toHaveBeenCalled();
  expect((await call()).res.status).toHaveBeenCalledWith(429);
  f.records.clear();
  for (let i = 0; i < 40; i++) expect((await call({ uid: `user${i}` })).next).toHaveBeenCalled();
  expect((await call({ uid: 'new-user' })).res.status).toHaveBeenCalledWith(429);
});
it('rejects honeypots and strips HTML/control characters before validation', async () => {
  expect((await call({ body: { website: 'bot-filled' } })).next).not.toHaveBeenCalled();
  const result = await call({ body: { website: '', description: '<script>steal()</script><b>No signal</b>' } });
  expect(result.req.body).toEqual({ description: 'No signal' }); expect(result.next).toHaveBeenCalled();
  expect(stripTicketHtml('<style>bad</style>Help\u0000 me')).toBe('Help me');
});
