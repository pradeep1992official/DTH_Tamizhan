import { beforeEach, describe, expect, it, vi } from 'vitest';
const fixtures = vi.hoisted(() => ({ write: vi.fn(), read: vi.fn(async () => ({ empty: true })), unsubscribe: vi.fn() }));
vi.mock('../src/lib/firebase', () => ({ db: {}, auth: null, isFirebaseConfigured: true, sanitizePayload: (value: any) => value }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(), doc: vi.fn(), getDocs: fixtures.read, getDoc: fixtures.read,
  setDoc: fixtures.write, deleteDoc: fixtures.write, writeBatch: fixtures.write,
  query: vi.fn(), orderBy: vi.fn(), limit: vi.fn(),
  onSnapshot: (_ref: any, callback: any) => { callback({ empty: true }); return fixtures.unsubscribe; },
}));
import { PlanCatalogService } from '../src/lib/planCatalogService';
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: true, plans: [] }), { status: 200 }))); });
describe('empty catalogs never trigger automatic fixtures', () => {
  it('subscriptions emit an empty API catalog without any writes', async () => {
    const callback = vi.fn();
    const unsubscribe = PlanCatalogService.subscribeToPlans(callback);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(callback).toHaveBeenCalledWith([]);
    expect(fetch).toHaveBeenCalledWith('/api/catalog');
    expect(fixtures.write).not.toHaveBeenCalled();
    expect(fixtures.read).not.toHaveBeenCalled();
    unsubscribe();
  });
  it('normal reads return empty and never seed or migrate documents', async () => {
    expect(await PlanCatalogService.getAllPlans()).toEqual([]);
    expect(fixtures.write).not.toHaveBeenCalled();
  });
});
