import type { PlanCatalogItem } from '../../src/types';
import { assertValidCatalogPack } from '../../src/lib/catalog';

// User-provided Screenshot 2026-11-11 215245.png; requested service periods 1/6/12 months.
// The final column is 11 paid months + 1 free month. The user explicitly excluded
// the six-month 15-day promotion from descriptions. No channel counts supplied.
export const TATA_PLAY_TARIFFS = [
  { name: 'Tamil Thalaiva', tamilName: 'தமிழ் தலைவா', quality: 'SD', prices: [308, 1848, 3388], recommended: true },
  { name: 'Tamil Thalaiva HDs', tamilName: 'தமிழ் தலைவா HDs', quality: 'HD', prices: [329, 1974, 3619], recommended: true },
  { name: 'Tamil Thalaiva HD New', tamilName: 'தமிழ் தலைவா HD New', quality: 'HD', prices: [399, 2394, 4389], recommended: false },
  { name: 'Tamil Thalaiva Sports Kids English', tamilName: 'தமிழ் தலைவா ஸ்போர்ட்ஸ் கிட்ஸ் இங்கிலீஷ்', quality: 'SD', prices: [505, 3030, 5555], recommended: false },
  { name: 'Tamil Thalaiva Sports Kids English HD', tamilName: 'தமிழ் தலைவா ஸ்போர்ட்ஸ் கிட்ஸ் இங்கிலீஷ் HD', quality: 'HD', prices: [745, 4470, 8195], recommended: false },
] as const;

export function mergeTataPlayTariffs(existing: PlanCatalogItem[], deletedIds: string[] = []): PlanCatalogItem[] {
  const next = [...existing];
  for (const tariff of TATA_PLAY_TARIFFS) {
    tariff.prices.forEach((amount, index) => {
      const duration = ([1, 6, 12] as const)[index];
      const matches = next.filter(p => p.operator === 'tata_play' && p.pack_type === tariff.quality && p.duration_months === duration && p.plan_name.trim().toLowerCase() === tariff.name.toLowerCase());
      if (matches.length > 1) throw new Error(`Duplicate existing pack: ${tariff.name}, ${duration} months. Resolve before importing.`);
      const old = matches[0];
      const id = old?.id || `tataplay_${tariff.name.toLowerCase().replace(/\s+/g, '_')}_${duration}m`;
      if (deletedIds.includes(id)) throw new Error(`Pack ${id} was explicitly deleted; restore it manually before importing.`);
      const countsKnown = !!old && Number.isInteger(old.channel_count) && Number.isInteger(old.hd_channel_count);
      const pack: PlanCatalogItem = {
        ...old, id, operator: 'tata_play', pack_type: tariff.quality, plan_name: tariff.name, tamilName: tariff.tamilName,
        duration_months: duration, amount, price: amount, is_recommended: tariff.recommended,
        channel_list: old?.channel_list || [], channels: old?.channels || old?.channel_list || [],
        genre_tags: old?.genre_tags || (tariff.name.includes('Sports') ? ['tamil', 'sports', 'kids', 'english'] : ['tamil', 'entertainment']),
        description: `${duration}-month Tata Play ${tariff.quality} pack. Price transcribed from the user-provided tariff sheet.`,
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
