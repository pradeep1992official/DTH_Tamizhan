import { packBoxType, packPackageType, packageTypeLabel } from './newConnectionCatalog';
import { calculateNewConnectionPrice } from './newConnectionPricing';
import type { Brand, CatalogData, Channel, EquipmentOffer, Pack } from './newConnectionCatalog';

export type ChannelCounts = Pick<Pack, 'channelCount' | 'payChannelCount' | 'freeChannelCount' | 'hdChannelCount'>;
export interface VisiblePack { pack: Pack; brand: Brand; channels: Channel[]; counts: ChannelCounts; genres: Record<string, number> }
export interface PackSelection { id: string; validity: number }
export interface BrowseFilters { boxType: string; packageType: '' | 'only_box' | 'full_set'; language: string; region: string; type: string; minPrice: string; maxPrice: string; validity: string; genre: string; sort: 'price' | 'channels' | 'perChannel' }
export const defaultBrowseFilters: BrowseFilters = { boxType: '', packageType: '', language: '', region: '', type: '', minPrice: '', maxPrice: '', validity: '', genre: '', sort: 'price' };
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
type PricingOption = Pack['pricingOptions'][number];
export function matchesPricingValidity(option: PricingOption, validity: string) {
  return validity.startsWith('months:') ? option.validityMonths === Number(validity.slice(7)) : !option.validityMonths && option.validityDays === Number(validity);
}
export function pricingForFilter(pack: Pack, validity: string, selected?: number) {
  return selected ? pricing(pack, selected) : pack.pricingOptions.find(o => matchesPricingValidity(o, validity)) ?? pricing(pack);
}
export function pricePerChannel(item: VisiblePack) { return item.counts.channelCount ? item.pack.monthlyPrice / item.counts.channelCount : Infinity; }
// Match price filtering and sorting to the actual amount shown on each card.
export function filterSortPacks(items: VisiblePack[], filters: BrowseFilters, brandId?: string, validities: Record<string, number> = {}) {
  const total = (pack: Pack) => pricingForFilter(pack, filters.validity, validities[pack.id]).price;
  return items.filter(({ pack, genres }) => (!brandId || pack.brandId === brandId) && (!filters.boxType || packBoxType(pack) === filters.boxType) && (!filters.packageType || packPackageType(pack) === filters.packageType) && (!filters.language || pack.language === filters.language) && (!filters.region || pack.region === filters.region) && (!filters.type || pack.type === filters.type) && (!filters.validity || pack.pricingOptions.some(o => matchesPricingValidity(o, filters.validity))) && (!filters.genre || (genres[filters.genre] ?? 0) > 0) && (!filters.minPrice || total(pack) >= Number(filters.minPrice)) && (!filters.maxPrice || total(pack) <= Number(filters.maxPrice)))
    .sort((a, b) => (filters.sort === 'channels' ? b.counts.channelCount - a.counts.channelCount : filters.sort === 'perChannel' ? (a.counts.channelCount ? total(a.pack) / a.counts.channelCount : Infinity) - (b.counts.channelCount ? total(b.pack) / b.counts.channelCount : Infinity) : total(a.pack) - total(b.pack)) || a.pack.sortOrder - b.pack.sortOrder || a.pack.name.localeCompare(b.pack.name));
}
export interface ChannelFilters { search: string; genre: string; language: string; hd: string; pay: string }
export const defaultChannelFilters: ChannelFilters = { search: '', genre: '', language: '', hd: '', pay: '' };
export function sortChannels(channels: Channel[], sort: 'name' | 'lcn', numbers?: Readonly<Record<string, number>>) {
  return [...channels].sort((a, b) => a.genre.localeCompare(b.genre) || (sort === 'lcn' ? (numbers?.[a.name] ?? Infinity) - (numbers?.[b.name] ?? Infinity) : 0) || a.name.localeCompare(b.name));
}
export function filterChannels(channels: Channel[], filters: ChannelFilters) {
  const needle = filters.search.trim().toLocaleLowerCase();
  return channels.filter(c => (!needle || `${c.name} ${c.language} ${c.genre}`.toLocaleLowerCase().includes(needle)) && (!filters.genre || c.genre === filters.genre) && (!filters.language || c.language === filters.language) && (!filters.hd || String(c.isHD) === filters.hd) && (!filters.pay || String(c.isPay) === filters.pay)).sort((a, b) => a.genre.localeCompare(b.genre) || a.name.localeCompare(b.name));
}
export function channelDiff(items: VisiblePack[]) {
  if (items.length < 2) return { sharedByTwo: [] as Channel[], common: [] as Channel[], unique: items.map(() => [] as Channel[]) };
  const sets = items.map(item => new Set(item.channels.map(c => c.id)));
  const all = [...new Map(items.flatMap(item => item.channels).map(channel => [channel.id, channel])).values()];
  return { sharedByTwo: items.length === 3 ? all.filter(c => sets.filter(set => set.has(c.id)).length === 2) : [], common: items[0].channels.filter(c => sets.every(set => set.has(c.id))), unique: items.map((item, i) => item.channels.filter(c => sets.every((set, j) => j === i || !set.has(c.id)))) };
}
export function compatibleEquipment(item: VisiblePack, offers: EquipmentOffer[]): EquipmentOffer[] {
  const packageType = packPackageType(item.pack);
  // Pack packages already include their quoted costs. Adapt to the legacy order
  // snapshot shape without selecting or charging a separate equipment offer.
  if (packageType) return [{ id: `package_${packageType}`, brandId: item.brand.id, name: packageTypeLabel(packageType), boxType: item.pack.type === 'SD' ? 'SD' : item.pack.type === '4K' ? '4K' : 'HD', hardwarePrice: 0, installationCharge: 0, includedFirstPackId: '', warrantyNote: '', active: true, sortOrder: 0 }];
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
  if (finite.length < 2) return values.map(() => false);
  const best = highest ? Math.max(...finite) : Math.min(...finite);
  if (finite.filter(value => value === best).length !== 1) return values.map(() => false);
  return values.map(value => value !== null && Number.isFinite(value) && value === best);
}
