import { packageCardLabel } from './newConnectionDisplay';
import { z } from 'zod';

export const catalogKinds = ['brands', 'packs', 'channels', 'equipment'] as const;
export type CatalogKind = typeof catalogKinds[number];
export const catalogCollections = { brands: 'dthBrands', packs: 'dthPacks', channels: 'dthChannels', equipment: 'dthEquipmentOffers' } as const;
const text = z.string().trim().max(4000);
const name = text.min(1).max(200);
const money = z.number().finite().min(0).max(1000000).refine(n => /^\d+(?:\.\d{1,2})?$/.test(String(n)), 'Use at most two decimal places');
const order = z.number().int().min(0).max(100000).default(0);
const id = z.string().regex(/^[\p{L}\p{N}_-]{1,128}$/u);
const url = z.union([z.literal(''), z.url().refine(v => v.startsWith('https://'), 'Use an HTTPS URL')]).default('');
const common = { name, active: z.boolean().default(false), sortOrder: order };
export const brandSchema = z.object({ ...common, slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(128), logoUrl: url, description: text.default(''), supportsSD: z.boolean().default(true), supportsHD: z.boolean().default(true), serviceNote: text.default('') });
export const channelSchema = z.object({ ...common, language: text.default(''), genre: name, isHD: z.boolean().default(false), isPay: z.boolean().default(false), logoUrl: url });
// For calendar plans, validityMonths is the promised term. validityDays remains
// a stable option key for existing booking/compare URLs, not a calendar duration.
export const packSchema = z.object({ ...common, brandId: id, boxType: z.enum(['HD', 'Android']).optional(), packageType: z.enum(['full_set', 'only_box']).optional(), type: z.enum(['SD', 'HD', '4K', 'Regional', 'Add-on']), language: text.default(''), region: text.default(''), pricingOptions: z.array(z.object({ validityDays: z.number().int().min(1).max(3650), validityMonths: z.number().int().min(1).max(120).optional(), price: money })).min(1).max(30).refine(a => new Set(a.map(p => p.validityDays)).size === a.length, 'Validity days must be unique'), channelIds: z.array(id).max(2000).transform(a => [...new Set(a)]), highlights: z.array(name).max(30).default([]) });
export const equipmentSchema = z.object({ ...common, brandId: id, boxType: z.enum(['SD', 'HD', '4K']), hardwarePrice: money, installationCharge: money, includedFirstPackId: z.union([id, z.literal('')]).default(''), warrantyNote: text.default('') });
export const settingsSchema = z.preprocess(value => {
  if (value && typeof value === 'object' && !Array.isArray(value) && !('enabledProviders' in value)) {
    const input = value as Record<string, unknown>;
    if (input.advanceMode === 'full') return { ...input, advanceMode: 'none' };
  }
  return value;
}, z.object({ terms: text.default(''), refundPolicy: text.default(''), serviceablePincodes: z.array(z.string().regex(/^[1-9][0-9]{5}$/)).max(10000).default([]), serviceableDistricts: z.array(name).max(1000).default([]), enabledProviders: z.array(z.enum(['razorpay', 'youpi'])).max(2).transform(a => [...new Set(a)]).default([]), defaultProvider: z.enum(['razorpay', 'youpi', 'none']).default('none'), advanceMode: z.enum(['full', 'partial', 'none']).default('none'), partialAmount: money.default(0), priceDisclaimer: text.default('') }).refine(s => s.advanceMode !== 'partial' || s.partialAmount > 0, 'Partial mode requires a positive partial amount').refine(s => s.defaultProvider === 'none' || s.enabledProviders.includes(s.defaultProvider), 'Default provider must be enabled').transform(s => {
  // Payment-free booking is the safe fallback when no gateway remains enabled.
  // Normalize legacy advance settings as well as values parsed again.
  const enabledProviders = s.enabledProviders.filter(p => p === 'razorpay');
  return { ...s, enabledProviders, defaultProvider: s.defaultProvider === 'youpi' ? enabledProviders[0] || 'none' as const : s.defaultProvider } as typeof s;
}));
export const catalogSchemas = { brands: brandSchema, channels: channelSchema, packs: packSchema, equipment: equipmentSchema };
export type Brand = z.infer<typeof brandSchema> & { id: string };
export type Channel = z.infer<typeof channelSchema> & { id: string };
export type Pack = z.infer<typeof packSchema> & { id: string; monthlyPrice: number; channelCount: number; payChannelCount: number; freeChannelCount: number; hdChannelCount: number; updatedAt: string; priceLastVerifiedAt: string | null };
export type EquipmentOffer = z.infer<typeof equipmentSchema> & { id: string };
export type NewConnectionSettings = z.infer<typeof settingsSchema>;
export interface CatalogData { brands: Brand[]; packs: Pack[]; channels: Channel[]; equipment: EquipmentOffer[]; settings: NewConnectionSettings }
export function catalogSlug(value: string) { return value.normalize('NFKC').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, ''); }
export function packCounts(ids: string[], channels: Pick<Channel, 'id' | 'isHD' | 'isPay'>[]) {
  const byId = new Map(channels.map(c => [c.id, c]));
  const selected = [...new Set(ids)].map(id => { const channel = byId.get(id); if (!channel) throw new Error(`Unknown channel: ${id}`); return channel; });
  return { channelCount: selected.length, payChannelCount: selected.filter(c => c.isPay).length, freeChannelCount: selected.filter(c => !c.isPay).length, hdChannelCount: selected.filter(c => c.isHD).length };
}
export function monthlyPrice(options: { validityDays: number; validityMonths?: number; price: number }[]) {
  const option = options.find(p => p.validityMonths === 1 || (!p.validityMonths && p.validityDays === 30)) ?? [...options].sort((a, b) => (a.validityMonths ? a.validityMonths * 30 : a.validityDays) - (b.validityMonths ? b.validityMonths * 30 : b.validityDays))[0];
  return Math.round((option.validityMonths ? option.price / option.validityMonths : option.price * 30 / option.validityDays) * 100) / 100;
}
export function pricesStale(date: string | null, now = Date.now()) { return !date || !Number.isFinite(Date.parse(date)) || now - Date.parse(date) > 30 * 86400000; }

// RFC 4180 parser: quoted commas, escaped quotes, CRLF, BOM and multiline fields.
export function parseCsv(input: string): Record<string, string>[] {
  const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false, closed = false;
  const source = input.replace(/^\uFEFF/, '');
  for (let i = 0; i <= source.length; i++) {
    const c = source[i];
    if (quoted) { if (c === undefined) throw new Error('Unclosed CSV quote'); if (c === '"') { if (source[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; closed = true; } } else cell += c; }
    else if (c === '"' && !cell && !closed) quoted = true;
    else if (c === ',' || c === '\n' || c === '\r' || c === undefined) {
      row.push(cell); cell = ''; closed = false;
      if (c !== ',') { if (row.some(v => v !== '')) rows.push(row); row = []; if (c === '\r' && source[i + 1] === '\n') i++; }
    } else { if (closed || c === '"') throw new Error('Invalid CSV quoting'); cell += c; }
  }
  const headers = rows.shift()?.map(s => s.trim());
  if (!headers?.length || headers.some(h => !h) || new Set(headers).size !== headers.length) throw new Error('CSV needs unique non-empty headers');
  if (rows.length > 2000) throw new Error('Import at most 2000 rows at a time');
  return rows.map((r, i) => { if (r.length !== headers.length) throw new Error(`CSV row ${i + 2}: incorrect column count`); return Object.fromEntries(headers.map((h, i) => [h, r[i]])); });
}
export function csvEncode(rows: unknown[][]) { return rows.map(r => r.map(v => { const s = String(v ?? ''); return `"${s.replace(/"/g, '""')}"`; }).join(',')).join('\r\n'); }
export function csvRecord(kind: 'channels' | 'packs', row: Record<string, string>) {
  const boolean = (key: string, fallback: boolean) => { const v = row[key]?.trim().toLowerCase(); if (!v) return fallback; if (!['true', 'false'].includes(v)) throw new Error(`${key} must be true or false`); return v === 'true'; };
  const base = { ...row, active: boolean('active', false), sortOrder: row.sortOrder ? Number(row.sortOrder) : 0 };
  return kind === 'channels' ? channelSchema.parse({ ...base, isHD: boolean('isHD', false), isPay: boolean('isPay', false) }) : packSchema.parse({ ...base, pricingOptions: JSON.parse(row.pricingOptions || '[]'), channelIds: (row.channelIds || '').split('|').map(s => s.trim()).filter(Boolean), highlights: (row.highlights || '').split('|').filter(Boolean) });
}

export function packPackageType(pack: Pick<Pack, 'name' | 'packageType'>): 'full_set' | 'only_box' | undefined {
  return pack.packageType ?? (/only[\s_-]*box/i.test(pack.name) ? 'only_box' : /full[\s_-]*set/i.test(pack.name) ? 'full_set' : undefined);
}
export function packageTypeLabel(type: 'full_set' | 'only_box' | undefined, lang = 'en') {
  if (!type) return '';
  return packageCardLabel(type, lang === 'ta' ? 'ta' : 'en');
}

export function packBoxType(pack: Pick<Pack, 'boxType'>): 'HD' | 'Android' { return pack.boxType ?? 'HD'; }
