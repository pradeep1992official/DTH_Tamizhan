import { expect, it } from 'vitest';
import { deduplicateBrowsePlans } from '../src/lib/browsePlansData';
import type { BrowsePlan } from '../src/types';
const pack = { id: 'original', operator: 'sun_direct', name: 'Economy HD', type: 'HD', duration_months: 1, price: 259,
  channel_count: 100, hd_channel_count: 10, channels: ['Sun TV', 'KTV'], genre_tags: ['tamil'] } as BrowsePlan;
it('collapses equivalent records with different IDs and channel ordering', () => {
  expect(deduplicateBrowsePlans([pack, { ...pack, id: 'duplicate', channels: ['KTV', 'Sun TV'] }])).toEqual([pack]);
});
it('retains meaningful price, operator, duration and channel variants', () => {
  const variants: BrowsePlan[] = [pack, { ...pack, id: 'price', price: 260 }, { ...pack, id: 'duration', duration_months: 3 },
    { ...pack, id: 'operator', operator: 'tata_play' as const }, { ...pack, id: 'channels', channels: ['Sun TV', 'Vijay'] }];
  expect(deduplicateBrowsePlans(variants)).toHaveLength(5);
});
