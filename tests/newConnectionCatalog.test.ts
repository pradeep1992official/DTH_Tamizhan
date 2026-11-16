import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Timestamp } from 'firebase-admin/firestore';
import { brandSchema, packSchema, channelSchema, settingsSchema, packCounts, monthlyPrice, pricesStale, parseCsv, csvRecord, csvEncode, catalogCollections } from '../src/lib/newConnectionCatalog';

const store = vi.hoisted(() => new Map<string, any>());
const mockDb = vi.hoisted(() => ({
  doc: (path: string) => ({ path, get: async () => ({ data: () => store.get(path) }) }),
  collection: (path: string) => ({ doc: (id: string) => ({ path: `${path}/${id}` }) }),
  runTransaction: async (callback: any) => {
    const writes: (() => void)[] = [];
    const result = await callback({ get: async () => ({}), set: (ref: any, value: any) => writes.push(() => store.set(ref.path, value)), update: (ref: any, value: any) => writes.push(() => store.set(ref.path, { ...store.get(ref.path), ...value })), delete: (ref: any) => writes.push(() => store.delete(ref.path)) });
    writes.forEach(write => write()); return result;
  },
}));
vi.mock('../server/middleware/auth', () => ({ getAdminFirestore: () => mockDb }));
vi.mock('../server/persistence', () => ({ readCollection: async (path: string) => [...store].filter(([key]) => key.startsWith(`${path}/`)).map(([key, value]) => ({ id: key.split('/')[1], ...value })) }));
import { catalogIdentity, mutateCatalog, readNewConnectionCatalog, wipeSampleCatalog } from '../server/models/newConnectionCatalog';

beforeEach(() => store.clear());
const channel = (name: string, isHD = false, isPay = false) => channelSchema.parse({ name, language: 'Tamil', genre: 'News', isHD, isPay });
async function setup() {
  const brand = (await mutateCatalog('brands', { name: 'Brand', slug: 'brand' })).item;
  const a = (await mutateCatalog('channels', channel('One', true, true))).item;
  const b = (await mutateCatalog('channels', channel('Two'))).item;
  const pack = (await mutateCatalog('packs', { name: 'Pack', brandId: brand.id, type: 'HD', pricingOptions: [{ validityDays: 30, price: 100 }], channelIds: [a.id, b.id], channelCount: 999 })).item;
  return { brand, a, b, pack };
}
describe('catalog validation and CSV', () => {
  it('rejects duplicate validities, invalid amounts, pincodes, booleans and malformed CSV', () => {
    expect(() => packSchema.parse({ name: 'P', brandId: 'b', type: 'HD', channelIds: [], pricingOptions: [{ validityDays: 30, price: 10 }, { validityDays: 30, price: 20 }] })).toThrow();
    expect(() => csvRecord('channels', { name: 'N', language: 'Tamil', genre: 'News', isPay: 'yes' })).toThrow();
    expect(() => settingsSchema.parse({ advanceMode: 'partial', partialAmount: 0 })).toThrow();
    expect(() => settingsSchema.parse({ serviceablePincodes: ['000000'] })).toThrow();
    expect(() => parseCsv('a,a\n1,2')).toThrow();
    expect(() => parseCsv('a,b\n1')).toThrow();
    expect(() => parseCsv('a\n"bad')).toThrow();
  });
  it('round-trips quoted, multiline, BOM and escaped CSV fields', () => {
    const csv = '\uFEFF' + csvEncode([['name', 'note'], ['SAMPLE, "HD"', 'line 1\nline 2']]);
    expect(parseCsv(csv)).toEqual([{ name: 'SAMPLE, "HD"', note: 'line 1\nline 2' }]);
  });
  it('normalizes thirty-day equivalent prices and flags stale/never-verified prices', () => {
    expect(monthlyPrice([{ validityDays: 90, price: 300 }])).toBe(100);
    expect(monthlyPrice([{ validityDays: 30, price: 120 }, { validityDays: 90, price: 300 }])).toBe(120);
    expect(pricesStale(null)).toBe(true); expect(pricesStale('bad')).toBe(true);
    expect(pricesStale(new Date(0).toISOString(), 30 * 86400000 + 1)).toBe(true);
    expect(pricesStale(new Date(0).toISOString(), 30 * 86400000)).toBe(false);
    expect(settingsSchema.parse({}).advanceMode).toBe('none');
  });
  it('deduplicates channel membership and rejects missing channel references', () => {
    expect(packCounts(['one', 'one', 'two'], [{ id: 'one', isHD: true, isPay: true }, { id: 'two', isHD: false, isPay: false }])).toEqual({ channelCount: 2, hdChannelCount: 1, payChannelCount: 1, freeChannelCount: 1 });
    expect(() => packCounts(['missing'], [])).toThrow();
  });
});
describe('catalog mutation integrity (mocked persistence)', () => {
  it('derives counts, stores timestamps and repairs counts after channel edits', async () => {
    const { a, pack } = await setup();
    expect(pack).toMatchObject({ channelCount: 2, hdChannelCount: 1, payChannelCount: 1, freeChannelCount: 1, monthlyPrice: 100 });
    expect(store.get(`dthPacks/${pack.id}`).updatedAt).toBeInstanceOf(Timestamp);
    await mutateCatalog('channels', { ...a, isHD: false, isPay: false }, { id: a.id });
    expect((await readNewConnectionCatalog()).packs[0]).toMatchObject({ hdChannelCount: 0, payChannelCount: 0, freeChannelCount: 2 });
  });
  it('upserts the same normalized name/brand and rejects explicit name collisions', async () => {
    const { pack } = await setup();
    const updated = (await mutateCatalog('packs', { ...pack, name: ' PACK ', pricingOptions: [{ validityDays: 30, price: 200 }] }, { upsert: true })).item;
    expect(updated.id).toBe(pack.id); expect((await readNewConnectionCatalog()).packs).toHaveLength(1);
    await expect(mutateCatalog('packs', pack)).rejects.toThrow('already exists');
    const other = (await mutateCatalog('channels', channel('Other'))).item;
    await expect(mutateCatalog('channels', channel('One'), { id: other.id })).rejects.toThrow('already exists');
  });
  it('soft-deletes referenced brands/channels/packs and deletes unreferenced offers', async () => {
    const { brand, a, pack } = await setup();
    expect((await mutateCatalog('brands', {}, { id: brand.id, action: 'delete' })).softDeleted).toBe(true);
    expect((await mutateCatalog('channels', {}, { id: a.id, action: 'delete' })).softDeleted).toBe(true);
    const offer = (await mutateCatalog('equipment', { brandId: brand.id, name: 'Offer', boxType: 'HD', hardwarePrice: 1000, installationCharge: 100, includedFirstPackId: pack.id })).item;
    expect((await mutateCatalog('packs', {}, { id: pack.id, action: 'delete' })).softDeleted).toBe(true);
    await mutateCatalog('equipment', {}, { id: offer.id, action: 'delete' });
    expect((await readNewConnectionCatalog()).equipment).toHaveLength(0);
  });
  it('rejects unknown brands/channels and cross-brand included packs', async () => {
    const { pack } = await setup();
    await expect(mutateCatalog('packs', { ...pack, brandId: 'missing' })).rejects.toThrow('Unknown brand');
    await expect(mutateCatalog('packs', { ...pack, channelIds: ['missing'] }, { id: pack.id })).rejects.toThrow('Unknown channel');
    const brand = (await mutateCatalog('brands', { name: 'Other', slug: 'other' })).item;
    await expect(mutateCatalog('equipment', { brandId: brand.id, name: 'O', boxType: 'HD', hardwarePrice: 1, installationCharge: 0, includedFirstPackId: pack.id })).rejects.toThrow('selected brand');
  });
  it('resets verification after price changes; duplicates start unverified', async () => {
    const { pack } = await setup();
    const verified = (await mutateCatalog('packs', {}, { id: pack.id, action: 'verify' })).item;
    expect(verified.priceLastVerifiedAt).toBeTruthy();
    const saved = (await mutateCatalog('packs', verified, { id: pack.id })).item;
    expect(saved.priceLastVerifiedAt).toBe(verified.priceLastVerifiedAt);
    const copy = (await mutateCatalog('packs', { ...saved, name: 'Pack copy' })).item;
    expect(copy.priceLastVerifiedAt).toBeNull();
    const changed = (await mutateCatalog('packs', { ...saved, pricingOptions: [{ validityDays: 30, price: 200 }] }, { id: pack.id })).item;
    expect(changed.priceLastVerifiedAt).toBeNull();
  });
  it('protects real data during seeding and wiping', async () => {
    const brand = brandSchema.parse({ name: 'SAMPLE Brand', slug: 'sample-brand' });
    const id = catalogIdentity('brands', brand);
    await mutateCatalog('brands', brand);
    await expect(mutateCatalog('brands', brand, { sample: true, upsert: true })).rejects.toThrow('non-sample');
    store.delete(`${catalogCollections.brands}/${id}`);
    await mutateCatalog('brands', brand, { sample: true });
    await mutateCatalog('packs', { name: 'Real pack', brandId: id, type: 'SD', channelIds: [], pricingOptions: [{ validityDays: 30, price: 1 }] });
    await expect(wipeSampleCatalog()).rejects.toThrow('Real records');
    store.delete(`dthPacks/${(await readNewConnectionCatalog()).packs[0].id}`);
    expect(await wipeSampleCatalog()).toBe(1);
  });
});
