import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ save: vi.fn(), registry: {} as Record<string, any> }));
vi.mock('firebase-admin/app', () => ({ getApps: () => [{}] }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({
  verifyIdToken: vi.fn(async (token: string) => {
    if (token === 'bad') throw new Error('Invalid token');
    return { uid: token, email: token === 'root' || token === 'unverified' ? 'professorpradeeps@gmail.com' : `${token}@example.com`, email_verified: token !== 'unverified' };
  }),
}) }));
vi.mock('firebase-admin/firestore', () => ({ getFirestore: () => ({ collection: () => ({
  doc: (uid: string) => ({ get: async () => ({ data: () => mocks.registry[uid] }) }),
  get: async () => ({ docs: Object.entries(mocks.registry).map(([id, record]) => ({ id, data: () => record })) }),
  orderBy() { return this; }, limit() { return this; },
}) }) }));
vi.mock('../server/models/store', () => ({
  APPROVED_ADMIN_EMAILS: new Set(['customer@example.com']),
  MEMORY_CUSTOMERS: [], MEMORY_RECHARGE_ORDERS: [], MEMORY_ADMINS: [], MEMORY_ADMIN_REQUESTS: [], OPERATORS: [],
  refreshApprovedAdminEmails: vi.fn(), saveAdminsToDisk: mocks.save, saveCustomersToDisk: mocks.save,
  saveOperatorSettingsToDisk: mocks.save, saveOrdersToDisk: mocks.save,
}));
vi.mock('../server/models/planModel', () => ({ planModel: { getAll: () => [], getDeletedIds: () => [] } }));
import { isCallerAdminAuthorized } from '../server/middleware/auth';
import { adminController } from '../server/controllers/adminController';
import { ordersController } from '../server/controllers/ordersController';
import { plansController } from '../server/controllers/plansController';

const request = (token?: string) => ({ headers: token ? { authorization: `Bearer ${token}` } : {}, query: {}, body: {} } as any);
const response = () => { const res = { status: vi.fn(), json: vi.fn(), setHeader: vi.fn() }; res.status.mockReturnValue(res); return res; };
const readers = [ordersController.listAdmin, adminController.listCustomers, adminController.payments, adminController.reports,
  adminController.operators, adminController.accessList, adminController.auditLogs, plansController.listAdmin, plansController.listDeleted];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.registry = { approved: { email: 'approved@example.com', status: 'approved' }, revoked: { email: 'revoked@example.com', status: 'revoked' },
    mismatch: { email: 'someone@example.com', status: 'approved' } };
});
describe('canonical admin permission policy and API read path', () => {
  it('shows the root once, preferring its verified UID over legacy email records without writing', async () => {
    mocks.registry = {
      legacy: { email: 'professorpradeeps@gmail.com', status: 'approved', displayName: 'Old name' },
      root: { email: 'professorpradeeps@gmail.com', status: 'approved', displayName: 'PRADEEP' },
      delegate: { email: 'delegate@example.com', status: 'approved' },
    };
    const res = response();
    await adminController.accessList(request('root'), res as any);
    const admins = res.json.mock.calls[0][0].admins;
    expect(admins).toHaveLength(2);
    expect(admins.find((admin: any) => admin.email === 'professorpradeeps@gmail.com')).toMatchObject({ uid: 'root', displayName: 'PRADEEP' });
    expect(mocks.registry.legacy).toBeDefined();
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('keeps one legacy root display entry when its canonical document is absent', async () => {
    mocks.registry = {
      old1: { email: 'ProfessorPradeeps@gmail.com', status: 'approved' },
      old2: { email: 'professorpradeeps@gmail.com', status: 'approved' },
    };
    const res = response();
    await adminController.accessList(request('root'), res as any);
    expect(res.json.mock.calls[0][0].admins).toHaveLength(1);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('delegates can only see their own UID record, never a duplicate with matching email', async () => {
    mocks.registry.other = { email: 'approved@example.com', status: 'approved' };
    const res = response();
    await adminController.accessList(request('approved'), res as any);
    expect(res.json.mock.calls[0][0].admins.map((record: any) => record.uid)).toEqual(['approved']);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it.each(['root', 'approved'])('%s can read every admin section without writing anything', async token => {
    for (const read of readers) {
      const res = response();
      await read(request(token), res as any);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json.mock.calls[0][0].success).toBe(true);
    }
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it.each([undefined, 'customer', 'revoked', 'mismatch', 'unverified', 'bad'])('denies every admin read for %s', async token => {
    for (const read of readers) {
      const res = response();
      await read(request(token), res as any);
      expect([401, 403]).toContain(res.status.mock.calls[0][0]);
      expect(res.json.mock.calls[0][0].success).toBe(false);
    }
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('never trusts a cached email list or forged client role', async () => {
    const req = request('customer'); req.body = { role: 'admin', is_plan_admin: true };
    expect((await isCallerAdminAuthorized(req, new Set(['customer@example.com']))).authorized).toBe(false);
  });
  it('rejects invalid fulfillment updates without writing', async () => {
    const res = response();
    await ordersController.updateStatus(request('root'), res as any);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('does not fabricate subscriber/customer data when lookup has no record', () => {
    const req = request(); req.body = { operator: 'sun_direct', smartCardNumber: '41289456123' };
    const res = response();
    ordersController.verifySubscriber(req, res as any);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json.mock.calls[0][0]).not.toHaveProperty('subscriber');
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
