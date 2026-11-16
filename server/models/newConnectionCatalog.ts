import { createHash } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from '../middleware/auth';
import { readCollection } from '../persistence';
import { catalogCollections, catalogKinds, catalogSchemas, catalogSlug, monthlyPrice, packCounts, settingsSchema, type CatalogData, type CatalogKind, type Channel } from '../../src/lib/newConnectionCatalog';

const lockPath = 'server_runtime/newConnectionCatalog';
function wire(value: any): any {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(wire);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, wire(v)]));
  return value;
}
export async function readNewConnectionCatalog(): Promise<CatalogData> {
  const [brands, packs, channels, equipment, settings] = await Promise.all([
    ...catalogKinds.map(k => readCollection(catalogCollections[k])),
    getAdminFirestore().doc('appSettings/newConnection').get(),
  ]);
  return wire({ brands, packs, channels, equipment, settings: (settings as FirebaseFirestore.DocumentSnapshot).data() ?? settingsSchema.parse({}) });
}
export function catalogIdentity(kind: CatalogKind, data: any) {
  const key = kind === 'brands' ? data.slug : `${kind === 'channels' ? '' : `${data.brandId}:`}${catalogSlug(data.name)}`;
  return createHash('sha256').update(`${kind}:${key}`).digest('hex').slice(0, 40);
}
function sameIdentity(kind: CatalogKind, a: any, b: any) {
  return kind === 'brands' ? a.slug === b.slug : catalogSlug(a.name) === catalogSlug(b.name) && (kind === 'channels' || a.brandId === b.brandId);
}
// All catalog mutations share this transaction fence. A concurrent reference edit,
// delete, seed or import forces a retry, preventing dangling references and duplicates.
// Pipeline reads happen AFTER reading the fence and before writing it. The SDK
// transaction's document read supplies the conflict check; no standard queries.
export async function mutateCatalog(kind: CatalogKind | 'settings', input: unknown, options: { id?: string; action?: 'save' | 'delete' | 'verify'; sample?: boolean; upsert?: boolean } = {}) {
  const db = getAdminFirestore();
  return db.runTransaction(async tx => {
    let currentOptions = { ...options };
    const fence = db.doc(lockPath); await tx.get(fence);
    const data = await readNewConnectionCatalog();
    if (kind === 'settings') {
      const value = settingsSchema.parse(input); tx.set(db.doc('appSettings/newConnection'), value); tx.set(fence, { updatedAt: Timestamp.now() }); return { item: value, softDeleted: false };
    }
    const list = data[kind] as any[];
    const previous = currentOptions.id ? list.find(r => r.id === currentOptions.id) : undefined;
    if (currentOptions.id && !previous) throw new Error('Catalog record no longer exists. Refresh and retry.');
    const now = Timestamp.now();
    let value: any;
    let softDeleted = false;
    if (currentOptions.action === 'delete') {
      if (!previous) throw new Error('Record required');
      softDeleted = kind === 'brands' ? [...data.packs, ...data.equipment].some(p => p.brandId === previous.id) : kind === 'channels' ? data.packs.some(p => p.channelIds.includes(previous.id)) : kind === 'packs' ? data.equipment.some(e => e.includedFirstPackId === previous.id) : false;
      if (softDeleted) { value = { ...previous, active: false }; if (kind === 'packs') value.updatedAt = now; delete value.id; tx.set(db.collection(catalogCollections[kind]).doc(previous.id), restoreDates(value)); }
      else tx.delete(db.collection(catalogCollections[kind]).doc(previous.id));
    } else {
      if (currentOptions.action === 'verify') {
        if (kind !== 'packs' || !previous) throw new Error('Pack required');
        value = { ...previous, priceLastVerifiedAt: now, updatedAt: now }; delete value.id;
      } else {
        value = catalogSchemas[kind].parse(input);
        if (kind !== 'brands' && !catalogSlug(value.name)) throw new Error('Name must contain at least one letter or number');
        const existing = list.find(r => sameIdentity(kind, r, value));
        if (existing && !currentOptions.id && !currentOptions.upsert) throw new Error('A record with this name/brand or slug already exists');
        if (existing && currentOptions.id && existing.id !== currentOptions.id) throw new Error('A record with this name/brand or slug already exists');
        currentOptions = { ...currentOptions, id: currentOptions.id ?? existing?.id ?? catalogIdentity(kind, value) };
        const old = list.find(r => r.id === currentOptions.id);
        if (old?.sampleData === true) value.sampleData = true;
        if (currentOptions.sample && old && old.sampleData !== true) throw new Error('Refusing to overwrite a non-sample record with sample data');
        if (currentOptions.sample || old?.sampleData === true) { value.sampleData = true; value.samplePriceLabel = 'SAMPLE — fictional demonstration prices only'; }
        if (value.sampleData && !value.name.includes('SAMPLE')) throw new Error('Sample records must keep SAMPLE in their name');
        if (kind === 'packs' || kind === 'equipment') {
          if (!data.brands.some(b => b.id === value.brandId)) throw new Error('Unknown brandId');
        }
        if (kind === 'packs') {
          value = { ...value, ...packCounts(value.channelIds, data.channels), monthlyPrice: monthlyPrice(value.pricingOptions), updatedAt: now, priceLastVerifiedAt: old?.priceLastVerifiedAt ? Timestamp.fromDate(new Date(old.priceLastVerifiedAt)) : null };
          // Changing a price invalidates verification. Duplicated packs start unverified.
          if (!old || JSON.stringify(old.pricingOptions) !== JSON.stringify(value.pricingOptions)) value.priceLastVerifiedAt = null;
        }
        if (kind === 'equipment' && value.includedFirstPackId && !data.packs.some(p => p.id === value.includedFirstPackId && p.brandId === value.brandId)) throw new Error('Included pack must belong to the selected brand');
        if (kind === 'packs' && data.equipment.some(e => e.includedFirstPackId === currentOptions.id && e.brandId !== value.brandId)) throw new Error('Remove this pack from equipment offers before changing its brand');
      }
      tx.set(db.collection(catalogCollections[kind]).doc(currentOptions.id!), restoreDates(value));
      if (kind === 'channels') {
        const channels = [...data.channels.filter(c => c.id !== currentOptions.id), { ...value, id: currentOptions.id } as Channel];
        for (const pack of data.packs.filter(p => p.channelIds.includes(currentOptions.id!))) tx.update(db.collection(catalogCollections.packs).doc(pack.id), { ...packCounts(pack.channelIds, channels), updatedAt: now });
      }
    }
    tx.set(fence, { updatedAt: now });
    return { item: value ? wire({ ...value, id: currentOptions.id }) : null, softDeleted };
  });
}
function restoreDates(value: any) {
  for (const key of ['updatedAt', 'priceLastVerifiedAt']) if (typeof value[key] === 'string') value[key] = Timestamp.fromDate(new Date(value[key]));
  return value;
}

export async function wipeSampleCatalog() {
  const db = getAdminFirestore();
  return db.runTransaction(async tx => {
    const fence = db.doc(lockPath); await tx.get(fence);
    const data = await readNewConnectionCatalog();
    const sample = (kind: CatalogKind) => (data[kind] as any[]).filter(r => r.sampleData === true);
    const ids = Object.fromEntries(catalogKinds.map(k => [k, new Set(sample(k).map(r => r.id))]));
    if (data.packs.some(p => !ids.packs.has(p.id) && (ids.brands.has(p.brandId) || p.channelIds.some(id => ids.channels.has(id)))) || data.equipment.some(e => !ids.equipment.has(e.id) && (ids.brands.has(e.brandId) || ids.packs.has(e.includedFirstPackId)))) throw new Error('Real records reference sample data. Remove those references before wiping.');
    const count = catalogKinds.reduce((n, k) => n + sample(k).length, 0);
    if (count > 450) throw new Error('Too many sample records for one atomic wipe; review the sample records manually.');
    for (const kind of catalogKinds) for (const row of sample(kind)) tx.delete(db.collection(catalogCollections[kind]).doc(row.id));
    tx.set(fence, { updatedAt: Timestamp.now() }); return count;
  });
}
