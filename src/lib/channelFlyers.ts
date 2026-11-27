export function safeChannelListUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes('\\')) return null;
  try {
    const url = new URL(trimmed, 'https://dthtamizhan.in');
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
    return /^https?:\/\//i.test(trimmed) ? url.href : null;
  } catch { return null; }
}

export function channelListLink(brand: string, pack: string, configured?: string): string | null {
  return (configured ? safeChannelListUrl(configured) : null) || channelFlyer(brand, pack);
}

export function channelFlyer(brand: string, pack: string): string | null {
  const normalizedBrand = brand.toLowerCase();
  const normalizedPack = pack.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalizedBrand.replace(/[^a-z0-9]/g, '').includes('tataplay') && normalizedPack.startsWith('tamilthalaivahds')) {
    return '/channel-flyers/tata-play-tamil-thalaiva-hds.jpeg';
  }
  return normalizedBrand.includes('airtel') && normalizedPack.startsWith('tamilsuperstarhd')
    ? '/channel-flyers/airtel-tamil-super-star-hd.jpg'
    : null;
}
