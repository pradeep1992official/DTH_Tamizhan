import { beforeEach, describe, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({
  registry: {} as Record<string, any>, update: vi.fn(), save: vi.fn(), fail: false,
  lookup: vi.fn(), set: vi.fn(),
}));
vi.mock('firebase-admin/app', () => ({ getApps: () => [{}] }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({
  verifyIdToken: async (token: string) => ({ uid: token, email: token === 'root' || token === 'unverified' ? 'professorpradeeps@gmail.com' : 'customer@example.com', email_verified: token !== 'unverified' }),
  getUserByEmail: fixture.lookup,
}) }));
vi.mock('firebase-admin/firestore', () => ({ getFirestore: () => ({
  collection: () => ({ doc: (id: string) => ({ id, set: (data: any, options: any) => fixture.set(id, data, options) }) }),
  runTransaction: async (action: any) => {
    if (fixture.fail) throw new Error('private credential detail');
    return action({
      get: async (ref: any) => ({ exists: !!fixture.registry[ref.id], data: () => fixture.registry[ref.id] }),
      update: (ref: any, data: any) => { fixture.update(ref.id, data); fixture.registry[ref.id] = { ...fixture.registry[ref.id], ...data }; },
    });
  },
}) }));
vi.mock('../server/models/store', () => ({
  APPROVED_ADMIN_EMAILS: new Set(), MEMORY_ADMINS: [], MEMORY_ADMIN_REQUESTS: [], MEMORY_CUSTOMERS: [], MEMORY_RECHARGE_ORDERS: [], OPERATORS: [],
  refreshApprovedAdminEmails: vi.fn(), saveAdminsToDisk: fixture.save, saveCustomersToDisk: vi.fn(), saveOperatorSettingsToDisk: vi.fn(),
}));
import { adminController } from '../server/controllers/adminController';

const response = () => { const res = { status: vi.fn(), json: vi.fn() }; res.status.mockReturnValue(res); return res; };
async function revoke(token: string | undefined = 'root', body: any = { uid: 'delegate', userEmail: 'delegate@example.com' }) {
  const res = response();
  await adminController.revokeUser({ headers: token ? { authorization: `Bearer ${token}` } : {}, body } as any, res as any);
  return res;
}
beforeEach(() => {
  vi.clearAllMocks(); fixture.fail = false;
  fixture.registry = { delegate: { email: 'delegate@example.com', status: 'approved', role: 'admin' } };
  fixture.lookup.mockRejectedValue(Object.assign(new Error('missing'), { code: 'auth/user-not-found' }));
  fixture.set.mockResolvedValue(undefined);
});
describe('administrator approval failures', () => {
  async function approve(token = 'root') {
    const res = response();
    await adminController.approveUser({ headers: { authorization: `Bearer ${token}` }, body: { userEmail: 'new@example.com', name: 'New Admin' } } as any, res as any);
    return res;
  }
  it('explains that an unregistered email must sign in first without creating an account or registry', async () => {
    const res = await approve();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'ADMIN_ACCOUNT_NOT_REGISTERED', error: expect.stringContaining('sign in with Google once') }));
    expect(fixture.set).not.toHaveBeenCalled(); expect(fixture.save).not.toHaveBeenCalled();
  });
  it('separates Auth credentials/permissions failures from missing accounts', async () => {
    fixture.lookup.mockRejectedValue(Object.assign(new Error('secret credential detail'), { code: 'auth/insufficient-permission' }));
    const res = await approve();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json.mock.calls[0][0].code).toBe('ADMIN_AUTH_UNAVAILABLE');
    expect(res.json.mock.calls[0][0].error).not.toContain('secret credential detail');
    expect(fixture.set).not.toHaveBeenCalled();
  });
  it('separates registry write failures and does not report approval or update the cache', async () => {
    fixture.lookup.mockResolvedValue({ uid: 'new-user' });
    fixture.set.mockRejectedValue(new Error('database private error'));
    const res = await approve();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json.mock.calls[0][0].code).toBe('ADMIN_REGISTRY_UNAVAILABLE');
    expect(fixture.save).not.toHaveBeenCalled();
  });
  it('grants a registered email using its real UID after successful persistence', async () => {
    fixture.lookup.mockResolvedValue({ uid: 'new-user', displayName: 'Existing Name' });
    const res = await approve();
    expect(fixture.set).toHaveBeenCalledWith('new-user', expect.objectContaining({ uid: 'new-user', email: 'new@example.com', displayName: 'New Admin', status: 'approved' }), { merge: true });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
  it.each(['customer', 'unverified'])('denies approval from %s before lookup or writes', async token => {
    expect((await approve(token)).status).toHaveBeenCalledWith(403);
    expect(fixture.lookup).not.toHaveBeenCalled(); expect(fixture.set).not.toHaveBeenCalled();
  });
});
describe('administrator revocation', () => {
  it('revokes the listed UID without requiring its Auth account to exist', async () => {
    const res = await revoke();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(fixture.lookup).not.toHaveBeenCalled();
    expect(fixture.update).toHaveBeenCalledWith('delegate', expect.objectContaining({ status: 'revoked', revokedBy: 'professorpradeeps@gmail.com' }));
    expect(fixture.registry.delegate.email).toBe('delegate@example.com');
  });
  it('does not repeat registry writes when already revoked', async () => {
    await revoke(); fixture.update.mockClear();
    const res = await revoke();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(fixture.update).not.toHaveBeenCalled();
  });
  it.each(['customer', 'unverified', ''])('denies writes for principal %s', async token => {
    expect((await revoke(token)).status).toHaveBeenCalledWith(403);
    expect(fixture.update).not.toHaveBeenCalled(); expect(fixture.save).not.toHaveBeenCalled();
  });
  it('protects root by email, caller UID and stored registry identity', async () => {
    for (const body of [{ uid: 'delegate', userEmail: 'professorpradeeps@gmail.com' }, { uid: 'root', userEmail: 'delegate@example.com' }]) {
      expect((await revoke('root', body)).status).toHaveBeenCalledWith(400);
    }
    fixture.registry.delegate.email = 'professorpradeeps@gmail.com';
    expect((await revoke()).status).toHaveBeenCalledWith(409);
    expect(fixture.update).not.toHaveBeenCalled();
  });
  it('rejects a missing registry entry and stale UID/email binding', async () => {
    expect((await revoke('root', { uid: 'missing', userEmail: 'delegate@example.com' })).status).toHaveBeenCalledWith(404);
    expect((await revoke('root', { uid: 'delegate', userEmail: 'other@example.com' })).status).toHaveBeenCalledWith(409);
    expect(fixture.update).not.toHaveBeenCalled();
  });
  it('returns a useful retryable error without credential details or local changes', async () => {
    fixture.fail = true;
    const res = await revoke();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json.mock.calls[0][0].error).toContain('credentials and permissions');
    expect(res.json.mock.calls[0][0].error).not.toContain('private credential detail');
    expect(fixture.save).not.toHaveBeenCalled();
  });
  it('supports older email-only clients and reports a missing Auth account precisely', async () => {
    expect((await revoke('root', { userEmail: 'delegate@example.com' })).status).toHaveBeenCalledWith(404);
    fixture.lookup.mockResolvedValue({ uid: 'delegate' });
    expect((await revoke('root', { userEmail: 'delegate@example.com' })).json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
