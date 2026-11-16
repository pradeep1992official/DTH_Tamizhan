import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ getDocs: vi.fn(), getDoc: vi.fn(), getItem: vi.fn(), setItem: vi.fn() }));
vi.mock('../src/lib/firebase', () => ({ db: { databaseId: 'named-db' } }));
vi.mock('firebase/firestore', () => ({ collection: (_db: unknown, name: string) => name, doc: (_db: unknown, collection: string, id: string) => `${collection}/${id}`, where: (...parts: unknown[]) => parts, query: (...parts: unknown[]) => parts, getDocs: f.getDocs, getDoc: f.getDoc, Timestamp: class {} }));
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-16T00:00:00Z'));
  vi.stubGlobal('sessionStorage', { getItem: f.getItem, setItem: f.setItem });
  f.getItem.mockReturnValue(null); f.getDocs.mockResolvedValue({ docs: [] }); f.getDoc.mockResolvedValue({ data: () => undefined });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
it('deduplicates concurrent reads and uses active-only queries for all four collections', async () => {
  const { loadPublicCatalog } = await import('../src/lib/newConnectionPublicCatalog');
  const [a, b] = await Promise.all([loadPublicCatalog(), loadPublicCatalog()]);
  expect(a).toBe(b); expect(f.getDocs).toHaveBeenCalledTimes(4); expect(f.getDoc).toHaveBeenCalledTimes(1);
  for (const name of ['dthBrands', 'dthPacks', 'dthChannels', 'dthEquipmentOffers']) expect(f.getDocs).toHaveBeenCalledWith([name, ['active', '==', true]]);
  await loadPublicCatalog(); expect(f.getDocs).toHaveBeenCalledTimes(4); expect(f.setItem).toHaveBeenCalledTimes(1);
});
it('reuses validated session data after module reload, then expires it after five minutes', async () => {
  await (await import('../src/lib/newConnectionPublicCatalog')).loadPublicCatalog();
  const stored = f.setItem.mock.calls[0][1]; f.getItem.mockReturnValue(stored); vi.resetModules();
  await (await import('../src/lib/newConnectionPublicCatalog')).loadPublicCatalog(); expect(f.getDocs).toHaveBeenCalledTimes(4);
  vi.advanceTimersByTime(5 * 60 * 1000 + 1);
  await (await import('../src/lib/newConnectionPublicCatalog')).loadPublicCatalog(); expect(f.getDocs).toHaveBeenCalledTimes(8);
});
it('recovers from failed requests and blocked storage without logging console errors', async () => {
  f.getItem.mockImplementation(() => { throw new Error('Storage blocked'); }); f.setItem.mockImplementation(() => { throw new Error('Storage blocked'); });
  const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
  const { loadPublicCatalog } = await import('../src/lib/newConnectionPublicCatalog');
  f.getDocs.mockRejectedValueOnce(new Error('Network down'));
  await expect(loadPublicCatalog()).rejects.toThrow();
  expect((await loadPublicCatalog()).brands).toEqual([]); expect(errorLog).not.toHaveBeenCalled(); errorLog.mockRestore();
});
it('rejects malformed session data and loads a fresh catalog', async () => {
  f.getItem.mockReturnValue(JSON.stringify({ expires: Date.now() + 60000, data: { brands: [{ active: true }], channels: [], equipment: [], packs: [], settings: {} } }));
  const data = await (await import('../src/lib/newConnectionPublicCatalog')).loadPublicCatalog();
  expect(data.brands).toEqual([]); expect(f.getDocs).toHaveBeenCalledTimes(4);
});
