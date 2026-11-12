import { beforeEach, describe, expect, it, vi } from 'vitest';
const harness = vi.hoisted(() => ({ states: [] as any[], index: 0, effects: [] as (() => unknown)[],
  currentUser: null as any, write: vi.fn(), read: vi.fn() }));
vi.mock('react', () => ({
  useState: (initial: any) => {
    const index = harness.index++;
    if (!(index in harness.states)) harness.states[index] = initial;
    return [harness.states[index], (value: any) => { harness.states[index] = typeof value === 'function' ? value(harness.states[index]) : value; }];
  },
  useCallback: (fn: any) => fn,
  useEffect: (fn: any) => { harness.effects.push(fn); },
}));
vi.mock('../src/lib/firebase', () => ({ auth: { get currentUser() { return harness.currentUser; } } }));
vi.mock('firebase/firestore', () => ({ setDoc: harness.write, writeBatch: harness.write, runTransaction: harness.write, getDocs: harness.read, onSnapshot: harness.read }));
import { useAdminData } from '../src/components/Admin/hooks/useAdminData';
import type { UserProfile } from '../src/types';
const user = { uid: 'admin', email: 'admin@example.com' } as UserProfile;
const render = (profile: UserProfile | null) => { harness.index = 0; harness.effects = []; return useAdminData(profile, vi.fn()); };
const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const functions = (data: ReturnType<typeof useAdminData>) => [data.fetchCustomers, data.fetchOrders, data.fetchPacks,
  data.fetchPayments, data.fetchReports, data.fetchOperators, data.fetchAccessList];

beforeEach(() => {
  vi.restoreAllMocks(); vi.unstubAllGlobals(); harness.states = []; harness.index = 0; harness.effects = [];
  harness.write.mockClear(); harness.read.mockClear();
  harness.currentUser = { uid: 'admin', getIdToken: async () => 'fixture-token' };
});
describe('admin section navigation (QA-05 / QA-06)', () => {
  it('uses only authenticated GET APIs across every section, with no Firestore reads, writes or console spam', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetcher = vi.fn(async (url: string, options?: any) => {
      expect(options.headers.Authorization).toBe('Bearer fixture-token');
      expect(options.method || 'GET').toBe('GET');
      return new Response(JSON.stringify({ success: true, uid: 'admin', isApprovedAdmin: true,
        customers: [], orders: [], plans: [], payments: [], logs: [], operators: [], admins: [], requests: [] }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetcher);
    render(user); harness.effects.forEach(effect => effect()); await flush();
    let data = render(user); expect(data.adminAuthorized).toBe(true);
    for (let visit = 0; visit < 2; visit++) for (const read of functions(data)) await read();
    expect(fetcher.mock.calls.map(call => call[0])).toContain('/api/admin/orders');
    expect(fetcher.mock.calls.map(call => call[0])).toContain('/api/admin/audit-logs');
    expect(harness.write).not.toHaveBeenCalled(); expect(harness.read).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled(); expect(warn).not.toHaveBeenCalled();
  });
  it('non-admin cannot fetch section data even with forged profile role flags', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ uid: 'admin', isApprovedAdmin: false }), { status: 200 })));
    const forged = { ...user, role: 'admin', is_plan_admin: true } as UserProfile;
    render(forged); harness.effects.forEach(effect => effect()); await flush();
    const data = render(forged); expect(data.adminAuthorized).toBe(false);
    for (const read of functions(data)) await read();
    expect(fetch).toHaveBeenCalledTimes(1); // Verification only.
  });
  it('logged-out users make no admin requests and retained data is cleared', async () => {
    harness.currentUser = null; vi.stubGlobal('fetch', vi.fn());
    render(null); harness.effects.forEach(effect => effect());
    const data = render(null);
    for (const read of functions(data)) await read();
    expect(data.adminAuthorized).toBe(false); expect(data.orders).toEqual([]); expect(fetch).not.toHaveBeenCalled();
  });
});
