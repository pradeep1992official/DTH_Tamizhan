import { newConnectionSamples } from '../../scripts/lib/newConnectionSamples';
import { catalogIdentity } from '../../server/models/newConnectionCatalog';
import { monthlyPrice, packCounts, settingsSchema, type CatalogData } from '../../src/lib/newConnectionCatalog';

export function seedCatalog(): CatalogData {
  const samples = newConnectionSamples();
  const rows = (kind: typeof samples[number]['kind']) => samples.filter(s => s.kind === kind).map(s => ({ ...s.data, id: catalogIdentity(s.kind, s.data), active: true }));
  const channels = rows('channels');
  return { brands: rows('brands'), channels, equipment: rows('equipment'), packs: rows('packs').map(p => ({ ...p, ...packCounts(p.channelIds, channels), monthlyPrice: monthlyPrice(p.pricingOptions), updatedAt: '2026-11-16T00:00:00Z', priceLastVerifiedAt: null })), settings: settingsSchema.parse({}) };
}
