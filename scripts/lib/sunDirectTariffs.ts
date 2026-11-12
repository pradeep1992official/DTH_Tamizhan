import type { PlanCatalogItem } from '../../src/types';
import { assertValidCatalogPack } from '../../src/lib/catalog';

// User-provided Screenshot 2026-11-11 003027.png. No channel counts or effective date stated.
export const SUN_DIRECT_TARIFFS = [
  ['SD', 'Joy', [199, 659, 1199, 1899]],
  ['SD', 'Joy Plus', [229, 669, 1209, 2279]],
  ['SD', 'Basic', [249, 749, 1439, 2749]],
  ['SD', 'Silver', [279, 839, 1559, 2969]],
  ['SD', 'Gold', [309, 929, 1709, 3249]],
  ['SD', 'Tamil Malayalam Jodi', [327, 987, 1797, null]],
  ['SD', 'Tamil Kannada Jodi', [339, 1019, 1869, null]],
  ['SD', 'Tamil Telugu Jodi', [329, 989, 1809, null]],
  ['SD', 'Premium', [389, 1169, 2139, null]],
  ['HD', 'Economy HD', [259, 739, 1399, 2689]],
  ['HD', 'Value HD', [289, 829, 1569, null]],
  ['HD', 'Super Value HD', [340, 969, 1839, null]],
] as const;

export function mergeSunDirectTariffs(existing: PlanCatalogItem[], deletedIds: string[] = []): PlanCatalogItem[] {
  const next = [...existing];
  for (const [quality, name, prices] of SUN_DIRECT_TARIFFS) {
    prices.forEach((amount, index) => {
      if (amount === null) return; // A dash is unavailable, never a zero-price pack.
      const duration = ([1, 3, 6, 12] as const)[index];
      const matches = next.filter(p => p.operator === 'sun_direct' && p.pack_type === quality && p.duration_months === duration && p.plan_name.trim().toLowerCase() === name.toLowerCase());
      if (matches.length > 1) throw new Error(`Duplicate existing pack: ${name}, ${duration} months. Resolve before importing.`);
      const old = matches[0];
      const id = old?.id || `sundirect_${quality.toLowerCase()}_${name.toLowerCase().replace(/\s+/g, '_')}_${duration}m`;
      if (deletedIds.includes(id)) throw new Error(`Pack ${id} was explicitly deleted; restore it manually before importing.`);
      const countsKnown = !!old && Number.isInteger(old.channel_count) && Number.isInteger(old.hd_channel_count);
      const pack: PlanCatalogItem = {
        ...old, id, operator: 'sun_direct', pack_type: quality, plan_name: name, duration_months: duration,
        amount, price: amount, is_recommended: old?.is_recommended ?? (name === 'Economy HD'),
        channel_list: old?.channel_list || [], channels: old?.channels || old?.channel_list || [],
        genre_tags: old?.genre_tags || ['tamil', 'entertainment'],
        description: old?.description || 'Tariff transcribed from the user-provided Sun Direct tariff sheet; channel counts and effective date not supplied.',
        ...(countsKnown ? {} : { channel_counts_unavailable: true }),
      };
      if (!countsKnown) { delete pack.channel_count; delete pack.hd_channel_count; }
      else delete pack.channel_counts_unavailable;
      assertValidCatalogPack(pack);
      const position = next.findIndex(p => p.id === id);
      if (position < 0) next.push(pack); else next[position] = pack;
    });
  }
  return next;
}
