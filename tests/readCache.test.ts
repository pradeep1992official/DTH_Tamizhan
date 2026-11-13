import { afterEach, expect, it, vi } from 'vitest';
import { ReadCache } from '../server/utils/readCache';
afterEach(() => vi.useRealTimers());
it('shares concurrent reads, expires entries, and isolates cached objects', async () => {
  vi.useFakeTimers();
  const cache = new ReadCache<{ amount: number }>(1000);
  const load = vi.fn(async () => ({ amount: 279 }));
  const [first] = await Promise.all([cache.get('pack', load), cache.get('pack', load)]);
  expect(load).toHaveBeenCalledOnce(); first.amount = 1;
  expect((await cache.get('pack', load)).amount).toBe(279);
  await cache.get('pack', load, true); expect(load).toHaveBeenCalledTimes(2);
  vi.advanceTimersByTime(1001); await cache.get('pack', load); expect(load).toHaveBeenCalledTimes(3);
});
it('never lets a slow pre-update read repopulate an invalidated cache', async () => {
  const cache = new ReadCache<number>(); let finish!: (value: number) => void;
  const old = cache.get('pack', () => new Promise(resolve => { finish = resolve; }));
  cache.clear(); expect(await cache.get('pack', async () => 309)).toBe(309);
  finish(279); await old;
  expect(await cache.get('pack', async () => 1)).toBe(309);
});
it('does not cache storage failures', async () => {
  const cache = new ReadCache();
  await expect(cache.get('pack', async () => { throw new Error('Quota'); })).rejects.toThrow('Quota');
  expect(await cache.get('pack', async () => 'restored')).toBe('restored');
});
