import { calculateNewConnectionPrice } from './newConnectionPricing';
import type { Brand, CatalogData, Channel, EquipmentOffer, Pack } from './newConnectionCatalog';

export type ChannelCounts = Pick<Pack, 'channelCount' | 'payChannelCount' | 'freeChannelCount' | 'hdChannelCount'>;
export interface VisiblePack { pack: Pack; brand: Brand; channels: Channel[]; counts: ChannelCounts; genres: Record<string, number> }
export interface PackSelection { id: string; validity: number }
export interface BrowseFilters { language: string; region: string; type: string; minPrice: string; maxPrice: string; validity: string; genre: string; sort: 'price' | 'channels' | 'perChannel' }
export const defaultBrowseFilters: BrowseFilters = { language: '', region: '', type: '', minPrice: '', maxPrice: '', validity: '', genre: '', sort: 'price' };
export function channelCounts(channels: Channel[]): ChannelCounts {
  return { channelCount: channels.length, payChannelCount: channels.filter(c => c.isPay).length, freeChannelCount: channels.filter(c => !c.isPay).length, hdChannelCount: channels.filter(c => c.isHD).length };
}
export function genreCounts(channels: Channel[]) { return channels.reduce<Record<string, number>>((totals, c) => { totals[c.genre] = (totals[c.genre] ?? 0) + 1; return totals; }, {}); }
export function visibleCatalog(data: CatalogData): VisiblePack[] {
  const brands = new Map(data.brands.filter(b => b.active).map(b => [b.id, b]));
  const channels = new Map(data.channels.filter(c => c.active).map(c => [c.id, c]));
  return data.packs.filter(p => p.active && brands.has(p.brandId)).map(pack => {
    const visible = [...new Set(pack.channelIds)].flatMap(id => channels.has(id) ? [channels.get(id)!] : []);
    return { pack, brand: brands.get(pack.brandId)!, channels: visible, counts: channelCounts(visible), genres: genreCounts(visible) };
  });
}
export function pricing(pack: Pack, validity?: number) { return pack.pricingOptions.find(p => p.validityDays === validity) ?? pack.pricingOptions.find(p => p.validityDays === 30) ?? [...pack.pricingOptions].sort((a, b) => a.validityDays - b.validityDays)[0]; }
export function pricePerChannel(item: VisiblePack) { return item.counts.channelCount ? item.pack.monthlyPrice / item.counts.channelCount : Infinity; }
// Filter/sort amounts consistently use the stored 30-day comparison price.
// Card selectors affect purchase quotes, never the ordering or price-range units.
export function filterSortPacks(items: VisiblePack[], filters: BrowseFilters, brandId?: string) {
  return items.filter(({ pack, genres }) => (!brandId || pack.brandId === brandId) && (!filters.language || pack.language === filters.language) && (!filters.region || pack.region === filters.region) && (!filters.type || pack.type === filters.type) && (!filters.validity || pack.pricingOptions.some(o => o.validityDays === Number(filters.validity))) && (!filters.genre || (genres[filters.genre] ?? 0) > 0) && (!filters.minPrice || pack.monthlyPrice >= Number(filters.minPrice)) && (!filters.maxPrice || pack.monthlyPrice <= Number(filters.maxPrice)))
    .sort((a, b) => (filters.sort === 'channels' ? b.counts.channelCount - a.counts.channelCount : filters.sort === 'perChannel' ? pricePerChannel(a) - pricePerChannel(b) : a.pack.monthlyPrice - b.pack.monthlyPrice) || a.pack.sortOrder - b.pack.sortOrder || a.pack.name.localeCompare(b.pack.name));
}
export interface ChannelFilters { search: string; genre: string; language: string; hd: string; pay: string }
export const defaultChannelFilters: ChannelFilters = { search: '', genre: '', language: '', hd: '', pay: '' };
export function filterChannels(channels: Channel[], filters: ChannelFilters) {
  const needle = filters.search.trim().toLocaleLowerCase();
  return channels.filter(c => (!needle || `${c.name} ${c.language} ${c.genre}`.toLocaleLowerCase().includes(needle)) && (!filters.genre || c.genre === filters.genre) && (!filters.language || c.language === filters.language) && (!filters.hd || String(c.isHD) === filters.hd) && (!filters.pay || String(c.isPay) === filters.pay)).sort((a, b) => a.genre.localeCompare(b.genre) || a.name.localeCompare(b.name));
}
export function channelDiff(items: VisiblePack[]) {
  if (items.length < 2) return { common: [] as Channel[], unique: items.map(() => [] as Channel[]) };
  const sets = items.map(item => new Set(item.channels.map(c => c.id)));
  return { common: items[0].channels.filter(c => sets.every(set => set.has(c.id))), unique: items.map((item, i) => item.channels.filter(c => sets.every((set, j) => j === i || !set.has(c.id)))) };
}
export function compatibleEquipment(item: VisiblePack, offers: EquipmentOffer[]) {
  // Regional/add-on packs have no box capability contract; show all brand offers.
  const rank = { SD: 0, HD: 1, '4K': 2 };
  return offers.filter(o => o.active && o.brandId === item.brand.id && (!(item.pack.type in rank) || rank[o.boxType] >= rank[item.pack.type as keyof typeof rank])).sort((a, b) => a.hardwarePrice + a.installationCharge - b.hardwarePrice - b.installationCharge || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}
export function connectionQuote(item: VisiblePack, offers: EquipmentOffer[], validity?: number) {
  const option = pricing(item.pack, validity); const offer = compatibleEquipment(item, offers)[0];
  return { option, offer, total: offer ? calculateNewConnectionPrice(option.price, offer, 1).total : null };
}
export function parseCompare(search: string): PackSelection[] {
  const params = new URLSearchParams(search); const ids = (params.get('packs') ?? '').split(','); const days = (params.get('validities') ?? '').split(','); const seen = new Set<string>();
  return ids.flatMap((id, i) => {
    if (!/^[\p{L}\p{N}_-]{1,128}$/u.test(id) || seen.has(id) || seen.size >= 3) return [];
    seen.add(id); const value = Number(days[i]); return [{ id, validity: Number.isInteger(value) && value > 0 && value <= 3650 ? value : 30 }];
  });
}
export function compareUrl(selection: PackSelection[]) { const params = new URLSearchParams({ packs: selection.map(s => s.id).join(','), validities: selection.map(s => s.validity).join(',') }); return `/new-connection/compare?${params}`; }
export function bookingUrl(pack: Pack, validity: number) { return `/new-connection/book?${new URLSearchParams({ brand: pack.brandId, pack: pack.id, validity: String(validity) })}`; }
export function bestValue(values: (number | null)[], highest = false) {
  const finite = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (!finite.length) return values.map(() => false);
  const best = highest ? Math.max(...finite) : Math.min(...finite); return values.map(value => value !== null && Number.isFinite(value) && value === best);
}
