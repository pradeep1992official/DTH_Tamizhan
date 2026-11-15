import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ writes: vi.fn(), fetch: vi.fn(), items: new Map<string, string>() }));
vi.mock('../src/lib/firebase', () => ({ db: {}, isFirebaseConfigured: true, sanitizePayload: (data: unknown) => data,
  auth: { currentUser: { getIdToken: async () => 'fixture-token' } } }));
vi.mock('firebase/firestore', () => ({ collection: vi.fn(), doc: vi.fn(), getDocs: vi.fn(), getDoc: vi.fn(),
  setDoc: f.writes, deleteDoc: f.writes, query: vi.fn(), orderBy: vi.fn(), limit: vi.fn(), onSnapshot: vi.fn(), writeBatch: f.writes }));
import { PlanCatalogService } from '../src/lib/planCatalogService';
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('fetch', f.fetch); vi.stubGlobal('localStorage', { getItem: (key: string) => f.items.get(key) || null, setItem: (key: string, value: string) => f.items.set(key, value) });
  f.items.clear(); f.items.set('dth_plan_catalog_cache_v2', JSON.stringify([{ id: 'tata', operator: 'tata_play' }])); });
afterEach(() => vi.unstubAllGlobals());
it.each([403, 500])('surfaces HTTP %s and performs no client deletion or success audit', async status => {
  f.fetch.mockResolvedValue(new Response(JSON.stringify({ success: false, error: 'Deletion failed' }), { status }));
  const before = [...f.items];
  await expect(PlanCatalogService.deletePlan('tata', 'admin')).rejects.toThrow('Deletion failed');
  expect([...f.items]).toEqual(before); expect(f.writes).not.toHaveBeenCalled();
});
it('surfaces network failure instead of reporting success', async () => {
  f.fetch.mockRejectedValue(new Error('network'));
  await expect(PlanCatalogService.deletePlan('tata', 'admin')).rejects.toThrow('network');
  expect(f.writes).not.toHaveBeenCalled();
});
it('uses the authoritative server operation once and never writes an invented Firestore audit', async () => {
  f.fetch.mockResolvedValue(new Response(JSON.stringify({ success: true, deletedPlanId: 'tata', audit: { id: 'audit', operator: 'tata_play', plan_name: 'Tamil pack' } })));
  expect(await PlanCatalogService.deletePlan('tata', 'admin')).toBe(true);
  expect(f.fetch).toHaveBeenCalledWith('/api/admin/plans/delete', expect.objectContaining({ body: JSON.stringify({ planId: 'tata' }) }));
  expect(f.writes).not.toHaveBeenCalled();
});
