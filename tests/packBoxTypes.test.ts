import { expect, it } from 'vitest';
import { seedCatalog } from './fixtures/newConnectionCatalog';
import { packBoxType, packSchema } from '../src/lib/newConnectionCatalog';
import { defaultBrowseFilters, filterSortPacks, visibleCatalog } from '../src/lib/newConnectionBrowse';

it('keeps box type separate from picture quality and package option', () => {
  const pack = packSchema.parse({ ...seedCatalog().packs[0], type: 'HD', boxType: 'Android', packageType: 'only_box' });
  expect(pack).toMatchObject({ type: 'HD', boxType: 'Android', packageType: 'only_box' });
  expect(packBoxType(pack)).toBe('Android');
  expect(packBoxType({})).toBe('HD');
  expect(packSchema.safeParse({ ...pack, boxType: 'invalid' }).success).toBe(false);
});

it('filters HD and Android boxes while including legacy HD packs', () => {
  const data = seedCatalog();
  data.packs[0].boxType = 'Android';
  const items = visibleCatalog(data);
  expect(filterSortPacks(items, { ...defaultBrowseFilters, boxType: 'Android' }).map(i => i.pack.id)).toEqual([data.packs[0].id]);
  expect(filterSortPacks(items, { ...defaultBrowseFilters, boxType: 'HD' })).toHaveLength(items.length - 1);
});

it('distinguishes calendar-month validity from an equal legacy day key', () => {
  const data = seedCatalog();
  data.packs[0].pricingOptions = [{ validityDays: 360, validityMonths: 12, price: 3100 }];
  data.packs[1].pricingOptions = [{ validityDays: 360, price: 3000 }];
  const items = visibleCatalog(data);
  expect(filterSortPacks(items, { ...defaultBrowseFilters, validity: 'months:12' }).map(i => i.pack.id)).toEqual([data.packs[0].id]);
  expect(filterSortPacks(items, { ...defaultBrowseFilters, validity: '360' }).map(i => i.pack.id)).toEqual([data.packs[1].id]);
});
