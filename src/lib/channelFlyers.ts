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
