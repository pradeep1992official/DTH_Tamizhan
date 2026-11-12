import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formatChannelCounts, formatDuration, formatMonthlyEquivalent, formatPrice, monthlyEquivalent, validateCatalogPack, normalizeCatalogRecord } from '../src/lib/catalog';
import { catalogItemToBrowsePlan, computePlanMetrics } from '../src/lib/browsePlansData';
import { SavePlanSchema, SyncPlansSchema, validateBody } from '../server/middleware/validation';
import type { PlanCatalogItem } from '../src/types';
import { PlanCatalogService } from '../src/lib/planCatalogService';

vi.mock('../src/lib/firebase', () => ({ db: null, auth: null, isFirebaseConfigured: false, sanitizePayload: (value: unknown) => value }));
const pack: PlanCatalogItem = { id: 'fixture', operator: 'sun_direct', pack_type: 'HD', duration_months: 6,
  plan_name: 'Economy HD', amount: 1399, price: 1399, channel_count: 140, hd_channel_count: 29,
  channel_list: ['Sun TV HD', 'KTV HD'], is_recommended: true };
beforeEach(() => { vi.unstubAllGlobals(); });
describe('shared catalog formatting (QA-08 / QA-09)', () => {
  it('uses two decimal monthly equivalents, never whole-rupee ceil or floor', () => {
    expect(monthlyEquivalent(1399, 6)).toBe(233.17);
    expect(formatMonthlyEquivalent(1399, 6)).toContain('233.17');
    expect(formatMonthlyEquivalent(1289, 6)).toContain('214.83');
    expect(formatMonthlyEquivalent(3091, 12)).toContain('257.58');
    expect(formatMonthlyEquivalent(299, 1)).toContain('299.00');
  });
  it('uses the same declared totals, duration and monthly price after browse conversion/metrics', () => {
    const browse = computePlanMetrics([catalogItemToBrowsePlan(pack)])[0];
    expect(browse.id).toBe(pack.id);
    expect(browse.monthly_equivalent_rate).toBe(233.17);
    expect(formatChannelCounts(browse)).toBe(formatChannelCounts(pack));
    expect(formatMonthlyEquivalent(browse.price, browse.duration_months)).toBe(formatMonthlyEquivalent(pack.amount, pack.duration_months));
    expect(formatDuration(6)).toBe('6 Months');
    expect(formatPrice(browse.price)).toBe(formatPrice(pack.amount));
  });
  it('treats highlights as a subset, not as a source for channel totals', () => {
    expect(formatChannelCounts(pack)).toBe('140 Channels (29 HD)');
    const sd = { ...pack, plan_name: 'Tamil Super Star Pack', pack_type: 'SD' as const, amount: 1289, price: 1289, channel_count: 10, hd_channel_count: 0 };
    expect(formatChannelCounts(catalogItemToBrowsePlan(sd))).toBe('10 Channels');
    expect(formatChannelCounts(sd)).toBe('10 Channels');
  });
  it('never invents counts when fields are missing and flags invalid existing records', () => {
    const missing = normalizeCatalogRecord({ ...pack, channel_count: undefined, hd_channel_count: undefined });
    expect(catalogItemToBrowsePlan(missing).channel_count).toBeNaN();
    expect(catalogItemToBrowsePlan(missing).hd_channel_count).toBeNaN();
    expect(formatChannelCounts(missing)).toBe('Channel details need review');
    expect(formatMonthlyEquivalent(1, 0)).toBe('Monthly price needs review');
  });
});

describe('shared pack validation (QA-04)', () => {
  it('accepts declared totals with a shorter highlight list', () => expect(validateCatalogPack(pack)).toEqual([]));
  it.each([
    { channel_count: 0 }, { channel_count: -1 }, { channel_count: 1.5 }, { channel_count: undefined },
    { hd_channel_count: -1 }, { hd_channel_count: 141 }, { hd_channel_count: undefined },
    { amount: 0, price: 0 }, { amount: Infinity }, { amount: NaN }, { duration_months: 0 }, { duration_months: 5 },
    { price: 1400 }, { channel_count: 1, hd_channel_count: 0 },
  ])('rejects inconsistent fields: %j', patch => expect(validateCatalogPack({ ...pack, ...patch })).not.toEqual([]));
  it('reports both the count contradiction and name mismatch for the reported Airtel pack', () => {
    const issues = validateCatalogPack({ ...pack, plan_name: 'Tamil Super Star Plus HD Pack (29 HD)', channel_count: 9, hd_channel_count: 32 });
    expect(issues.some(issue => issue.message.includes('exceed total'))).toBe(true);
    expect(issues.some(issue => issue.message.includes('Name claims 29'))).toBe(true);
  });
  it('validates labeled channel, HD, duration and price claims in names', () => {
    expect(validateCatalogPack({ ...pack, plan_name: 'Economy (140 Channels, 29 HD), 6 Months, INR 1399' })).toEqual([]);
    for (const plan_name of ['Economy (20 HD)', 'Economy (150 Channels)', 'Economy 12 Months', 'Economy 1 Year', 'Economy INR 1000', 'Economy 42']) {
      expect(validateCatalogPack({ ...pack, plan_name }).some(issue => issue.field === 'plan_name')).toBe(true);
    }
    expect(validateCatalogPack({ ...pack, plan_name: 'D2H Economy' })).toEqual([]);
  });
  it('server save and batch import reject invalid records before the route handler runs', () => {
    expect(SavePlanSchema.safeParse({ plan: pack }).success).toBe(true);
    const invalid = { ...pack, hd_channel_count: 141 };
    expect(SyncPlansSchema.safeParse({ plans: [pack, invalid] }).success).toBe(false);
    const json = vi.fn(); const status = vi.fn(() => ({ json })); const next = vi.fn();
    validateBody(SavePlanSchema)({ body: { plan: invalid } } as any, { status } as any, next);
    expect(status).toHaveBeenCalledWith(400); expect(next).not.toHaveBeenCalled();
  });
  it('client save rejects invalid packs before any network or database operation', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    await expect(PlanCatalogService.savePlan({ ...pack, hd_channel_count: 141 }, 'fixture-admin')).rejects.toThrow('exceed total');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('all reads use the same authoritative API record without metadata guesses', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ success: true, plans: [pack] }), { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    expect(await PlanCatalogService.getAllPlans()).toEqual([pack]);
    expect(fetcher).toHaveBeenCalledWith('/api/catalog');
  });
});
