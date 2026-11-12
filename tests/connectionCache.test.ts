import { describe, expect, it } from 'vitest';
import { connectionCacheKey, ownedConnections, readConnectionCache } from '../src/lib/connectionCache';
const box = (user_id: string) => ({ user_id, id: user_id }) as any;
function storage() {
  const data = new Map<string, string>();
  return { get length() { return data.size; }, clear: () => data.clear(), key: (index: number) => [...data.keys()][index] ?? null,
    getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); }, removeItem: (key: string) => { data.delete(key); } } satisfies Storage;
}
describe('saved box account isolation', () => {
  it('migrates each owner separately and excludes guest boxes', () => {
    const cache = storage();
    cache.setItem('dth_tamizhan_connections', JSON.stringify([box('alice'), box('bob'), box('guest_user')]));
    expect(readConnectionCache(cache, 'alice')).toEqual([box('alice')]);
    expect(readConnectionCache(cache, 'bob')).toEqual([box('bob')]);
    expect(cache.getItem('dth_tamizhan_connections')).toBeNull();
    expect(readConnectionCache(cache)).toEqual([]);
  });
  it('filters another owner even if the scoped cache contains mixed records', () => {
    const cache = storage();
    cache.setItem(connectionCacheKey('alice'), JSON.stringify([box('alice'), box('bob')]));
    expect(readConnectionCache(cache, 'alice')).toEqual([box('alice')]);
    expect(ownedConnections([box('alice')], 'bob')).toEqual([]);
    expect(ownedConnections([box('alice')], null)).toEqual([]);
  });
  it('keeps an existing scoped cache during migration', () => {
    const cache = storage();
    cache.setItem(connectionCacheKey('alice'), '[]');
    cache.setItem('dth_tamizhan_connections', JSON.stringify([box('alice')]));
    expect(readConnectionCache(cache, 'alice')).toEqual([]);
  });
  it('handles corrupt cache data without showing boxes', () => {
    const cache = storage(); cache.setItem(connectionCacheKey('alice'), '{');
    expect(readConnectionCache(cache, 'alice')).toEqual([]);
  });
});
