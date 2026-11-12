import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mergeSunDirectTariffs } from '../scripts/lib/sunDirectTariffs';
import { validateCatalogPack, formatChannelCounts } from '../src/lib/catalog';
import { SavePlanSchema } from '../server/middleware/validation';
import { catalogItemToBrowsePlan, computePlanMetrics, filterAndSortPlans } from '../src/lib/browsePlansData';
import type { PlanCatalogItem, PlanFilters } from '../src/types';

const filters: PlanFilters = { operators: ['sun_direct'], type: 'all', durations: [], priceRange: [0, 5000], channelRange: [0, 500], genreTags: [], sortBy: 'price_asc', searchQuery: '' };
describe('explicit Sun Direct tariff import', () => {
  it.each([
    ['production', ['--confirm=SEED_LOCAL_SUN_DIRECT']], ['development', []],
  ] as const)('refuses CLI writes in %s without both required guards', (mode, args) => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', fileURLToPath(new URL('../scripts/seed-local-sun-direct.ts', import.meta.url)), ...args], {
      env: { ...process.env, NODE_ENV: mode }, encoding: 'utf8',
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Requires NODE_ENV=development');
  });
  it('creates 32 SD and 10 HD duration records, excluding every dash', () => {
    const rows = mergeSunDirectTariffs([]);
    expect(rows).toHaveLength(42);
    expect(rows.filter(p => p.pack_type === 'HD')).toHaveLength(10);
    expect(rows.filter(p => p.duration_months === 12).map(p => p.plan_name)).toEqual(['Joy', 'Joy Plus', 'Basic', 'Silver', 'Gold', 'Economy HD']);
    expect(new Set(rows.map(p => p.id)).size).toBe(42);
    for (const p of rows) {
      expect(p.channel_count).toBeUndefined(); expect(p.hd_channel_count).toBeUndefined();
      expect(p.channel_counts_unavailable).toBe(true);
      expect(validateCatalogPack(p)).toEqual([]);
      expect(SavePlanSchema.safeParse({ plan: p }).success).toBe(true);
    }
  });
  it.each([
    ['Economy HD', [259, 739, 1399, 2689]], ['Value HD', [289, 829, 1569]],
    ['Super Value HD', [340, 969, 1839]], ['Joy Plus', [229, 669, 1209, 2279]],
    ['Tamil Kannada Jodi', [339, 1019, 1869]],
  ])('transcribes %s prices exactly', (name, amounts) => {
    expect(mergeSunDirectTariffs([]).filter(p => p.plan_name === name).map(p => p.amount)).toEqual(amounts);
  });
  it('preserves existing IDs, known counts and unrelated records; rerunning does not duplicate', () => {
    const existing: PlanCatalogItem[] = [
      { id: 'existing-basic', operator: 'sun_direct', pack_type: 'SD', duration_months: 1, plan_name: 'Basic', amount: 249, channel_count: 145, hd_channel_count: 0, is_recommended: true, channel_list: [] },
      { id: 'unrelated', operator: 'airtel_dth', pack_type: 'SD', duration_months: 1, plan_name: 'Other', amount: 200, channel_count: 140, hd_channel_count: 0, is_recommended: false, channel_list: [] },
    ];
    const result = mergeSunDirectTariffs(existing);
    expect(result).toHaveLength(43);
    expect(result.find(p => p.id === 'existing-basic')).toMatchObject({ channel_count: 145, hd_channel_count: 0 });
    expect(result.find(p => p.id === 'unrelated')).toEqual(existing[1]);
    expect(mergeSunDirectTariffs(result)).toEqual(result);
    expect(existing).toHaveLength(2);
  });
  it('refuses duplicate matches and explicitly deleted target IDs', () => {
    const pack = mergeSunDirectTariffs([])[0];
    expect(() => mergeSunDirectTariffs([pack, { ...pack, id: 'duplicate' }])).toThrow('Duplicate');
    expect(() => mergeSunDirectTariffs([], [pack.id])).toThrow('explicitly deleted');
  });
  it('requires an explicit unavailable flag and still rejects false counts and name claims', () => {
    const pack = mergeSunDirectTariffs([])[0];
    expect(SavePlanSchema.safeParse({ plan: { ...pack, channel_counts_unavailable: false } }).success).toBe(false);
    expect(SavePlanSchema.safeParse({ plan: { ...pack, channel_count: 0 } }).success).toBe(false);
    expect(SavePlanSchema.safeParse({ plan: { ...pack, plan_name: 'Joy (29 HD)' } }).success).toBe(false);
    expect(formatChannelCounts(pack)).toBe('Channel details not provided');
    expect(formatChannelCounts(pack, 'ta')).toBe('சேனல் விவரங்கள் வழங்கப்படவில்லை');
  });
  it('displays unknown counts without fabricated channel metrics or best-value badges', () => {
    const plans = mergeSunDirectTariffs([]).map(catalogItemToBrowsePlan);
    const enriched = computePlanMetrics(plans);
    expect(enriched.every(p => p.price_per_channel === undefined && !p.is_best_value)).toBe(true);
    expect(formatChannelCounts(plans[0])).toBe('Channel details not provided');
    expect(filterAndSortPlans(plans, filters)).toHaveLength(42);
    expect(filterAndSortPlans(plans, { ...filters, type: 'HD' })).toHaveLength(10);
    expect(filterAndSortPlans(plans, { ...filters, channelRange: [100, 500] })).toHaveLength(0);
  });
});
