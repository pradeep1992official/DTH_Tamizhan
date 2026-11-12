import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mergeTataPlayTariffs } from '../scripts/lib/tataPlayTariffs';
import { SavePlanSchema } from '../server/middleware/validation';
import { catalogItemToBrowsePlan, catalogPriceMaximum, filterAndSortPlans } from '../src/lib/browsePlansData';

describe('explicit Tata Play tariff import', () => {
  it('includes both annual sports packs above 5000 in unrestricted browsing', () => {
    const plans = mergeTataPlayTariffs([]).map(catalogItemToBrowsePlan);
    expect(catalogPriceMaximum(plans)).toBe(8200);
    const filters = { operators: ['tata_play' as const], type: 'all' as const, durations: [], priceRange: [100, Infinity] as [number, number], channelRange: [0, 500] as [number, number], genreTags: [], sortBy: 'recommended' as const, searchQuery: '' };
    expect(filterAndSortPlans(plans, filters)).toHaveLength(15);
    expect(filterAndSortPlans(plans, { ...filters, priceRange: [100, 5000] })).toHaveLength(13);
  });
  it.each([
    ['Tamil Thalaiva', [308, 1848, 3388]], ['Tamil Thalaiva HDs', [329, 1974, 3619]],
    ['Tamil Thalaiva HD New', [399, 2394, 4389]], ['Tamil Thalaiva Sports Kids English', [505, 3030, 5555]],
    ['Tamil Thalaiva Sports Kids English HD', [745, 4470, 8195]],
  ])('transcribes %s prices for 1, 6 and 12 months', (name, prices) => {
    const rows = mergeTataPlayTariffs([]).filter(p => p.plan_name === name);
    expect(rows.map(p => p.duration_months)).toEqual([1, 6, 12]);
    expect(rows.map(p => p.amount)).toEqual(prices);
  });
  it('creates 15 valid distinct records with only the two requested recommended families', () => {
    const rows = mergeTataPlayTariffs([]);
    expect(rows).toHaveLength(15); expect(new Set(rows.map(p => p.id)).size).toBe(15);
    expect(rows.filter(p => p.pack_type === 'HD')).toHaveLength(9);
    expect(rows.filter(p => p.is_recommended).map(p => p.plan_name)).toEqual([
      'Tamil Thalaiva', 'Tamil Thalaiva', 'Tamil Thalaiva', 'Tamil Thalaiva HDs', 'Tamil Thalaiva HDs', 'Tamil Thalaiva HDs',
    ]);
    for (const p of rows) {
      expect(p.tamilName).toContain('தமிழ் தலைவா');
      expect(p.channel_counts_unavailable).toBe(true);
      expect(p.channel_count).toBeUndefined(); expect(p.hd_channel_count).toBeUndefined();
      expect(SavePlanSchema.safeParse({ plan: p }).success).toBe(true);
      expect(p.description).not.toMatch(/15|free|bonus|இலவச/i);
    }
  });
  it('preserves existing IDs, counts and other operators; repeat import has no duplicates', () => {
    const original = { ...mergeTataPlayTariffs([])[0], id: 'original-id', channel_counts_unavailable: undefined, channel_count: 140, hd_channel_count: 0 };
    const unrelated = { ...original, id: 'other-operator', operator: 'sun_direct' as const };
    const before = [original, unrelated];
    const result = mergeTataPlayTariffs(before);
    expect(result).toHaveLength(16);
    expect(result.find(p => p.id === original.id)).toMatchObject({ channel_count: 140, hd_channel_count: 0 });
    expect(result.find(p => p.id === unrelated.id)).toEqual(unrelated);
    expect(mergeTataPlayTariffs(result)).toEqual(result); expect(before).toHaveLength(2);
  });
  it('does not revive deleted IDs or silently merge duplicate records', () => {
    const p = mergeTataPlayTariffs([])[0];
    expect(() => mergeTataPlayTariffs([], [p.id])).toThrow('explicitly deleted');
    expect(() => mergeTataPlayTariffs([p, { ...p, id: 'duplicate' }])).toThrow('Duplicate');
  });
  it.each([
    ['production', ['--confirm=SEED_LOCAL_TATA_PLAY']], ['development', []],
  ] as const)('blocks execution in %s without both explicit guards', (mode, args) => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', fileURLToPath(new URL('../scripts/seed-local-tata-play.ts', import.meta.url)), ...args], { env: { ...process.env, NODE_ENV: mode }, encoding: 'utf8' });
    expect(result.status).not.toBe(0); expect(result.stderr).toContain('Requires NODE_ENV=development');
  });
});
