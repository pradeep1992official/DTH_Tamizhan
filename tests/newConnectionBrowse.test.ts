import { seedCatalog } from './fixtures/newConnectionCatalog';
import { describe, expect, it } from 'vitest';
import { newConnectionSamples, isSampleCatalogRow } from '../scripts/lib/newConnectionSamples';
import { monthlyPrice, packCounts, settingsSchema, type CatalogData, type Channel, type Pack } from '../src/lib/newConnectionCatalog';
import { catalogIdentity } from '../server/models/newConnectionCatalog';
import { bestValue, bookingUrl, channelDiff, channelCounts, compareUrl, connectionQuote, defaultBrowseFilters, defaultChannelFilters, filterChannels, filterSortPacks, parseCompare, pricing, visibleCatalog } from '../src/lib/newConnectionBrowse';
import { pageMetadata } from '../src/lib/pageMetadata';
import { newConnectionCopy } from '../src/lib/newConnectionCopy';

describe('Part 1 sample catalog in the public browser', () => {
  it('materializes all seed brands, packs, channels and equipment without database writes', () => {
    const data = seedCatalog();
    expect(data.brands).toHaveLength(3); expect(data.packs).toHaveLength(9); expect(data.channels).toHaveLength(40); expect(data.equipment).toHaveLength(3);
    const items = visibleCatalog(data); expect(items).toHaveLength(9);
    expect(items.every(i => i.pack.name.includes('SAMPLE') && i.counts.channelCount === i.pack.channelCount)).toBe(true);
    expect(newConnectionSamples().every(s => s.data.active === false)).toBe(true);
  });
  it('uses visible counts for totals, genres, per-channel values and filtering', () => {
    const data = seedCatalog(); const original = data.packs[0];
    const hidden = data.channels.find(c => original.channelIds.includes(c.id))!; hidden.active = false;
    const item = visibleCatalog(data)[0];
    expect(item.counts.channelCount).toBe(original.channelCount - 1);
    expect(Object.values(item.genres).reduce((a, b) => a + b, 0)).toBe(item.counts.channelCount);
    expect(item.channels.some(c => c.id === hidden.id)).toBe(false);
    original.channelIds.push('missing-id', original.channelIds[0]);
    expect(visibleCatalog(data)[0].counts.channelCount).toBe(item.counts.channelCount);
    data.brands[0].active = false;
    expect(visibleCatalog(data).some(i => i.pack.brandId === data.brands[0].id)).toBe(false);
    data.packs[4].active = false;
    expect(visibleCatalog(data).some(i => i.pack.id === data.packs[4].id)).toBe(false);
  });
  it('filters language, region, type, validity, genre and monthly price together', () => {
    const items = visibleCatalog(seedCatalog()); const base = items[0];
    const filters = { ...defaultBrowseFilters, language: 'Tamil', region: 'SAMPLE region', type: 'SD', validity: '90', genre: 'News', minPrice: '100', maxPrice: '115' };
    const result = filterSortPacks(items, filters, base.brand.id);
    expect(result.map(i => i.pack.id)).toEqual([base.pack.id]);
    expect(filterSortPacks(items, { ...filters, validity: '365' })).toEqual([]);
    expect(filterSortPacks(items, { ...filters, minPrice: '999' })).toEqual([]);
    expect(filterSortPacks(items, { ...filters, genre: 'Unknown' })).toEqual([]);
  });
  it('sorts price and channel value in consistent 30-day units without mutating input', () => {
    const items = visibleCatalog(seedCatalog()); const original = items.map(i => i.pack.id);
    for (const sort of ['price', 'channels', 'perChannel'] as const) {
      const sorted = filterSortPacks(items, { ...defaultBrowseFilters, sort });
      const values = sorted.map(i => sort === 'price' ? i.pack.monthlyPrice : sort === 'channels' ? -i.counts.channelCount : i.pack.monthlyPrice / i.counts.channelCount);
      expect(values).toEqual([...values].sort((a, b) => a - b));
    }
    expect(items.map(i => i.pack.id)).toEqual(original);
  });
  it('quotes compatible equipment and never presents missing equipment as zero cost', () => {
    const data = seedCatalog(); const item = visibleCatalog(data)[0];
    const quote = connectionQuote(item, data.equipment, 90);
    expect(quote.total).toBe(quote.option.price + quote.offer!.hardwarePrice + quote.offer!.installationCharge);
    expect(quote.offer!.brandId).toBe(item.brand.id);
    expect(connectionQuote(item, [], 90).total).toBeNull();
    const fourK = { ...item, pack: { ...item.pack, type: '4K' as const } };
    expect(connectionQuote(fourK, data.equipment).total).toBeNull();
    expect(pricing(item.pack, 999).validityDays).toBe(30);
  });
});
describe('channel filters and differences', () => {
  const channel = (id: string, overrides: Partial<Channel> = {}): Channel => ({ id, name: `Channel ${id}`, active: true, language: 'Tamil', genre: 'News', isHD: false, isPay: false, logoUrl: '', sortOrder: 0, ...overrides });
  it('handles 600+ channels, all filters and exact counts', () => {
    const channels = Array.from({ length: 650 }, (_, i) => channel(String(i), { isHD: i % 2 === 0, isPay: i % 3 === 0, genre: i % 5 === 0 ? 'Sports' : 'News' }));
    const filtered = filterChannels(channels, { search: 'CHANNEL', language: 'Tamil', genre: 'Sports', hd: 'true', pay: 'true' });
    expect(filtered).toHaveLength(22);
    expect(channelCounts(filtered)).toMatchObject({ channelCount: 22, hdChannelCount: 22, payChannelCount: 22, freeChannelCount: 0 });
    expect(filterChannels(channels, { ...defaultChannelFilters, search: 'not found' })).toEqual([]);
  });
  it('computes two-pack common/only and three-pack exclusive differences by ID, not name', () => {
    const template = visibleCatalog(seedCatalog())[0];
    const items = [['common', 'ab', 'a'], ['common', 'ab', 'b'], ['common', 'c']].map(ids => ({ ...template, channels: ids.map(id => channel(id, { name: 'Same display name' })) }));
    const pair = channelDiff(items.slice(0, 2)); expect(pair.common.map(c => c.id)).toEqual(['common', 'ab']); expect(pair.unique.map(group => group.map(c => c.id))).toEqual([['a'], ['b']]);
    const triple = channelDiff(items); expect(triple.common.map(c => c.id)).toEqual(['common']); expect(triple.unique.map(group => group.map(c => c.id))).toEqual([['a'], ['b'], ['c']]);
    expect(channelDiff(items.slice(0, 1)).common).toEqual([]);
  });
});
describe('share links, unavailable packs and sample-only operations', () => {
  it('round-trips cross-brand selections and validities; preserves missing slots', () => {
    const items = visibleCatalog(seedCatalog()); const selected = [{ id: items[0].pack.id, validity: 90 }, { id: items[5].pack.id, validity: 30 }, { id: 'inactive-pack', validity: 90 }];
    const url = compareUrl(selected); expect(parseCompare(url.split('?')[1])).toEqual(selected);
    expect(selected.map(s => items.find(i => i.pack.id === s.id) ?? null)[2]).toBeNull();
    expect(bookingUrl(items[0].pack, 90)).toContain('validity=90');
  });
  it('deduplicates, validates IDs and days, and limits shared comparisons to three', () => {
    expect(parseCompare('?packs=a,a,b,c,d&validities=30,90,bad,0,365')).toEqual([{ id: 'a', validity: 30 }, { id: 'b', validity: 30 }, { id: 'c', validity: 30 }]);
    expect(parseCompare('?packs=../users')).toEqual([]);
    expect(bestValue([null, 0, 2, 0])).toEqual([false, true, false, true]);
    expect(bestValue([0, 3, 2], true)).toEqual([false, true, false]);
    expect(bestValue([null, Infinity])).toEqual([false, false]);
  });
  it('requires both a sample marker and a SAMPLE name for activation/deactivation', () => {
    expect(isSampleCatalogRow({ name: 'SAMPLE Brand', sampleData: true })).toBe(true);
    expect(isSampleCatalogRow({ name: 'SAMPLE Brand' })).toBe(false);
    expect(isSampleCatalogRow({ name: 'Real brand', sampleData: true })).toBe(false);
  });
  it('registers direct routes and bilingual metadata without admitting unknown routes', () => {
    for (const path of ['/new-connection', '/new-connection/compare?packs=a,b', '/new-connection/book', '/new-connection/packs/abc']) {
      expect(pageMetadata(path).status).toBe(200); expect(pageMetadata(path, 'ta').title).toMatch(/[\u0b80-\u0bff]/);
    }
    expect(pageMetadata('/new-connection/unknown').status).toBe(404);
    expect(Object.keys(newConnectionCopy.en)).toEqual(Object.keys(newConnectionCopy.ta));
  });
});
