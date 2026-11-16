import { collection, doc, getDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { z } from 'zod';
import { db } from './firebase';
import config from '../../firebase-applet-config.json';
import { brandSchema, channelSchema, equipmentSchema, packSchema, settingsSchema, type CatalogData } from './newConnectionCatalog';
import { visibleCatalog } from './newConnectionBrowse';

const TTL = 5 * 60 * 1000;
const KEY = `dth:new-connection:v1:${config.projectId}:${config.firestoreDatabaseId}`;
let memory: { expires: number; data: CatalogData } | null = null;
let pending: Promise<CatalogData> | null = null;
const count = z.number().int().nonnegative();
const publicPackSchema = packSchema.extend({ monthlyPrice: z.number().finite().nonnegative(), channelCount: count, payChannelCount: count, freeChannelCount: count, hdChannelCount: count, updatedAt: z.string(), priceLastVerifiedAt: z.string().nullable() });
const schemas = { brands: brandSchema, packs: publicPackSchema, channels: channelSchema, equipment: equipmentSchema };
const names = { brands: 'dthBrands', packs: 'dthPacks', channels: 'dthChannels', equipment: 'dthEquipmentOffers' } as const;
function normalize(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, val instanceof Timestamp ? val.toDate().toISOString() : val]));
}
function validate(data: CatalogData): CatalogData {
  const result = { settings: settingsSchema.parse(data.settings) } as CatalogData;
  for (const kind of Object.keys(schemas) as (keyof typeof schemas)[]) {
    (result[kind] as unknown[]) = data[kind].filter(row => row.active === true).map(row => ({ ...schemas[kind].parse(row), id: z.string().min(1).parse(row.id) }));
  }
  return result;
}
function reportCounts(data: CatalogData) {
  if (!import.meta.env?.DEV) return;
  for (const item of visibleCatalog(data)) if (Object.entries(item.counts).some(([key, value]) => item.pack[key as keyof typeof item.counts] !== value)) console.warn(`[New connection] Pack ${item.pack.id}: stored channel counts differ from active, visible channels. Showing visible counts.`);
}
export async function loadPublicCatalog(): Promise<CatalogData> {
  if (memory && memory.expires > Date.now()) return memory.data;
  if (pending) return pending;
  try {
    const cached = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (cached?.expires > Date.now() && cached.expires <= Date.now() + TTL) { const data = validate(cached.data); memory = { expires: cached.expires, data }; reportCounts(data); return data; }
  } catch { /* Storage may be disabled, full or contain an older schema. */ }
  pending = (async () => {
    if (!db) throw new Error('Catalog is unavailable');
    const result = { settings: settingsSchema.parse({}) } as CatalogData;
    // Standard client queries are intentional: public active-only reads against
    // the named database, following the site's existing SDK and Part 2 contract.
    await Promise.all((Object.keys(names) as (keyof typeof names)[]).map(async kind => {
      const snapshot = await getDocs(query(collection(db!, names[kind]), where('active', '==', true)));
      (result[kind] as unknown[]) = snapshot.docs.map(row => ({ ...schemas[kind].parse(normalize(row.data())), id: row.id }));
    }).concat([getDoc(doc(db, 'appSettings', 'newConnection')).then(snapshot => { result.settings = settingsSchema.parse(snapshot.data() ?? {}); })]));
    memory = { expires: Date.now() + TTL, data: result };
    try { sessionStorage.setItem(KEY, JSON.stringify(memory)); } catch { /* Memory cache remains available. */ }
    reportCounts(result); return result;
  })();
  try { return await pending; } finally { pending = null; }
}
