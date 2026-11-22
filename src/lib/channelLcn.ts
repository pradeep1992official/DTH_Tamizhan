import { airtelSuperStarChannelNumbers } from './airtelChannelNumbers';
import { catalogSlug, type Brand, type Channel } from './newConnectionCatalog';
import tataPlay from './tataPlayChannelNumbers.json';

export interface BrandChannelNumbers {
  id: string;
  label: string;
  operator?: string;
  numbers: Readonly<Record<string, number>>;
}

// Operator -> canonical channel name -> LCN. HD and SD remain distinct.
// This is a separate operator/channel registry, never a property of a shared channel.
// Airtel values were transcribed from the Tamil Superstar flyer; no region was specified.
// Tata Play uses the user-supplied TATA315.jpeg flyer as the authoritative source.
// Only printed LCNs are included; web lists do not fill or override this map.
// Source and transcription date are retained. Aliases are explicit SD/HD-safe names.
const tataPlayAliases: Readonly<Record<string, string>> = {
  'star-vijay-super': 'vijay-super',
  'star-vijay-takkar': 'vijay-takkar',
  'j-movie': 'j-movies',
  'news18-tamil': 'news18-tamil-nadu',
  'seithigal-24x7': 'seithigal-tv',
  'raj-news': 'raj-news-tamil',
  'malai-murasu': 'malaimurasu-seithigal',
  'svbc-2-tamil': 'svbc-2',
  'discovery-world-hd': 'discovery-hd-world',
  'history-tv': 'history-tv18',
  'unite8-sports-2-hd': 'unite-8-sports-2-hd',
};
export const channelLcnByBrand: Readonly<Record<string, { source: string; numbers: Readonly<Record<string, number>> }>> = {
  airtel: {
    source: 'https://assets.airtel.in/static-assets/cms/dth-images/Leaflets-for-All-packs-retailers.pdf',
    numbers: Object.fromEntries(Object.entries(airtelSuperStarChannelNumbers).map(([name, number]) => [catalogSlug(name), number])),
  },
  tataplay: { source: tataPlay.sources.join('\n'), numbers: Object.fromEntries(Object.entries(tataPlay.numbers).map(([name, number]) => [catalogSlug(name), number])) },
};

export function brandChannelNumbers(brand: Pick<Brand, 'id' | 'slug' | 'name'>, channels: Channel[]): BrandChannelNumbers {
  const key = `${brand.slug} ${brand.name}`.toLowerCase().replace(/[^a-z0-9]/g, '');
  const operator = key.includes('airtel') ? 'airtel' : key.includes('tataplay') ? 'tataplay' : '';
  const registry = channelLcnByBrand[operator]?.numbers ?? {};
  const lookup = (name: string) => {
    const key = catalogSlug(name);
    return registry[operator === 'tataplay' ? tataPlayAliases[key] ?? key : key];
  };
  return {
    id: brand.id,
    operator,
    label: operator === 'airtel' ? 'Airtel' : operator === 'tataplay' ? 'Tata Play' : brand.name,
    numbers: Object.fromEntries(channels.flatMap(channel => lookup(channel.name) === undefined ? [] : [[channel.name, lookup(channel.name)]])),
  };
}
