import { airtelSuperStarChannelNumbers, channelNumbersForPack } from '../src/lib/airtelChannelNumbers';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { CatalogLogo, ChannelQuality, ChannelBrowser } from '../src/components/NewConnection/Shared';
import { filterChannels, sortChannels, defaultChannelFilters, genreCounts } from '../src/lib/newConnectionBrowse';
import { brandChannelNumbers } from '../src/lib/channelLcn';

it('highlights HD channel counts with a gold badge', () => {
  const html = renderToStaticMarkup(<ChannelQuality type="HD" hdCount={19} lang="en" />);
  expect(html).toContain('is-hd');
  expect(html).toContain('19 HD channels');
  expect(html).toContain('aria-hidden="true">HD');
});

it('keeps operator LCNs separate and renders labelled missing values without copying another brand', () => {
  const channels = [{ id: 'sun', name: 'Sun TV HD', active: true, sortOrder: 0, language: 'Tamil', genre: 'Entertainment', isHD: true, isPay: false, logoUrl: '' }];
  const airtel = brandChannelNumbers({ id: 'airtel', slug: 'airtel', name: 'Airtel Digital TV' }, channels);
  const tata = brandChannelNumbers({ id: 'tata', slug: 'tata-play', name: 'Tata Play' }, channels);
  expect(airtel.numbers['Sun TV HD']).toBe(755);
  expect(tata.numbers['Sun TV HD']).toBe(1503);
  const html = renderToStaticMarkup(<ChannelBrowser channels={channels} lcnBrands={[airtel, { ...tata, numbers: {} }]} lang="en" />);
  expect(html).toContain('aria-label="Airtel LCN 755"');
  expect(html).toContain('aria-label="Tata Play LCN not available"');
  expect(html).toContain('Tata Play <b>\u2014</b>');
  expect(html).not.toContain('aria-label="LCN 755"');
  expect(html).toContain('LCN by Airtel');
  expect(html).toContain('LCN by Tata Play');
  expect(html).toContain('value="lcn:tata" disabled=""');
  expect(html).toContain('LCN may vary by region');
  expect(html).toContain('data-missing="true"');
  expect(html).toContain('data-operator="tataplay"');
  const bothKnown = renderToStaticMarkup(<ChannelBrowser channels={channels} lcnBrands={[airtel, { ...tata, numbers: { 'Sun TV HD': 1503 } }]} lang="en" />);
  expect(bothKnown).toContain('aria-label="Tata Play LCN 1503"');
  expect(bothKnown).not.toContain('value="lcn:tata" disabled');
  const canonical = brandChannelNumbers({ id: 'airtel', slug: 'airtel', name: 'Airtel' }, [{ ...channels[0], name: ' STAR VIJAY HD ' }, { ...channels[0], name: 'Star Vijay' }]);
  expect(canonical.numbers[' STAR VIJAY HD ']).toBe(759);
  expect(canonical.numbers['Star Vijay']).toBeUndefined();
});

it('resolves Tata Play flyer names without confusing HD with SD and sorts by the chosen operator', () => {
  const base = { active: true, sortOrder: 0, language: 'Tamil', genre: 'Entertainment', isHD: false, isPay: false, logoUrl: '' };
  const channels = ['Sun TV HD', 'Raj TV', 'Star Vijay Super', 'J Movie', 'News18 Tamil', 'Seithigal 24x7', 'SVBC 2 Tamil', 'Raj Digital Plus', 'Unverified Channel'].map((name, i) => ({ ...base, id: String(i), name, isHD: name.endsWith('HD') }));
  const tata = brandChannelNumbers({ id: 'tata', slug: 'tata-play', name: 'Tata Play' }, channels);
  const airtel = brandChannelNumbers({ id: 'airtel', slug: 'airtel', name: 'Airtel' }, channels);
  expect(tata.numbers).toMatchObject({ 'Sun TV HD': 1503, 'Raj TV': 1520, 'Star Vijay Super': 1513, 'J Movie': 1544, 'News18 Tamil': 1562, 'Seithigal 24x7': 1563, 'SVBC 2 Tamil': 1599 });
  expect(tata.numbers['Unverified Channel']).toBeUndefined();
  const pair = channels.filter(channel => ['Raj TV', 'Raj Digital Plus'].includes(channel.name));
  expect(sortChannels(pair, 'lcn', tata.numbers).map(c => c.name)).toEqual(['Raj TV', 'Raj Digital Plus']);
  expect(sortChannels(pair, 'lcn', airtel.numbers).map(c => c.name)).toEqual(['Raj Digital Plus', 'Raj TV']);
  expect(sortChannels(channels, 'lcn', tata.numbers).at(-1)?.name).toBe('Unverified Channel');
});

it('uses TATA315 flyer LCNs rather than the superseded website numbers or inferred entries', () => {
  const channels = ['Eurosport HD', 'Unite 8 Sports 2 HD', 'DD Sports', 'Sun TV HD', 'Raj TV', 'BBC News', 'Eurosport'].map((name, i) => ({ id: String(i), name, active: true, sortOrder: i, language: 'English', genre: 'Sports', isHD: name.endsWith('HD'), isPay: false, logoUrl: '' }));
  const tata = brandChannelNumbers({ id: 'tata', slug: 'tata-play', name: 'Tata Play' }, channels);
  expect(tata.numbers).toMatchObject({ 'Eurosport HD': 495, 'Unite 8 Sports 2 HD': 493, 'DD Sports': 453, 'Sun TV HD': 1503, 'Raj TV': 1520 });
  // The flyer gives a heading for English news but no individual channel numbers.
  expect(tata.numbers['BBC News']).toBeUndefined();
  expect(tata.numbers['Eurosport']).toBeUndefined();
});

it('uses a silver SD badge without revealing the total channel count', () => {
  const html = renderToStaticMarkup(<ChannelQuality type="SD" hdCount={0} lang="en" />);
  expect(html).toContain('is-sd');
  expect(html).toContain('SD channels');
  expect(html).not.toContain('0 HD');
});

it('keeps real logos and neutral placeholder tiles without repetitive free pricing', () => {
  const channels = [
    { id: 'star-one', name: 'Star One', active: true, sortOrder: 0, language: 'Tamil', genre: 'Entertainment', isHD: true, isPay: false, logoUrl: 'https://example.com/star.png' },
    { id: 'star-two', name: 'Star Two', active: true, sortOrder: 1, language: 'Tamil', genre: 'Entertainment', isHD: false, isPay: false, logoUrl: '' },
  ];
  const html = renderToStaticMarkup(<ChannelBrowser channels={channels} lang="en" />);
  expect(html).toContain('https://example.com/star.png');
  expect((html.match(/class="connection-logo"/g) ?? []).length).toBe(2);
  expect((html.match(/class="connection-channel-logo-slot"/g) ?? []).length).toBe(2);
  expect(html).toContain('connection-channel-logo-placeholder');
  expect(html).not.toContain('>ST<');
  expect(html).not.toContain('Channel pricing');
  expect(html).not.toContain('connection-channel-paid');
  expect(html).not.toContain('Free');
  const mixed = renderToStaticMarkup(<ChannelBrowser channels={[channels[0], { ...channels[1], isPay: true }]} lang="en" />);
  expect(mixed).toContain('Channel pricing');
  expect((mixed.match(/connection-channel-paid/g) ?? []).length).toBe(1);
  expect(mixed).toContain('Pay');
});

it('reserves a fixed decorative logo tile for missing images and lazy loads sized images', () => {
  const missing = renderToStaticMarkup(<CatalogLogo url="" name="Missing channel" size={32} showInitials={false} keepSpace />);
  expect(missing).toContain('width:32px;height:32px');
  expect(missing).toContain('connection-channel-logo-placeholder');
  expect(missing).not.toContain('>MI<');
  const logo = renderToStaticMarkup(<CatalogLogo url="/channel-logos/sun-tv-hd.webp" name="Sun TV HD" size={32} showInitials={false} keepSpace />);
  expect(logo).toContain('alt=""');
  expect(logo).toContain('loading="lazy"');
  expect(logo).toContain('decoding="async"');
  expect(logo).toContain('width="32" height="32"');
});

it('shows flyer LCNs only in the matching Airtel pack context', () => {
  const numbers = channelNumbersForPack('Airtel Digital TV', 'Tamil Super Star HD - ONLY BOX');
  expect(numbers).toBe(airtelSuperStarChannelNumbers);
  expect(channelNumbersForPack('Tata Play', 'Tamil Super Star HD')).toBeUndefined();
  expect(channelNumbersForPack('Airtel', 'Another pack')).toBeUndefined();
  expect(numbers?.['Sun TV HD']).toBe(755);
  expect(numbers?.['Chutti TV']).toBe(474);
  const html = renderToStaticMarkup(<ChannelBrowser channels={[{ id: 'sun', name: 'Sun TV HD', active: true, sortOrder: 0, language: 'Tamil', genre: 'Entertainment', isHD: true, isPay: false, logoUrl: '' }]} channelNumbers={numbers} lang="en" />);
  expect(html).toContain('aria-label="LCN 755"');
  expect(html).toContain('<strong>Sun TV HD</strong><span class="is-hd connection-channel-quality-tag">');
  expect(html).not.toContain('Tamil \u00b7 HD');
  expect(html).not.toContain('Tamil \u00b7 SD');
  expect(html).toContain('LCN may vary by region');
  expect(html).toContain('<option value="lcn">LCN</option>');
});

it('sorts numerically within genres, leaves missing LCNs last, and searches Tamil and partial English names', () => {
  const base = { active: true, sortOrder: 0, language: 'Tamil', genre: 'Music', isHD: false, isPay: false, logoUrl: '' };
  const channels = [
    { ...base, id: 'a', name: 'Alpha' }, { ...base, id: 'b', name: 'Beta HD', isHD: true },
    { ...base, id: 't', name: '\u0b9a\u0bc1\u0ba9\u0bcd \u0bae\u0bbf\u0baf\u0bc2\u0b9a\u0bbf\u0b95\u0bcd' },
    { ...base, id: 'n', name: 'News', genre: 'News' },
  ];
  const numbers = { Alpha: 100, 'Beta HD': 9, News: 1 };
  expect(sortChannels(channels, 'lcn', numbers).map(c => c.id)).toEqual(['b', 'a', 't', 'n']);
  expect(sortChannels(channels, 'name', numbers).map(c => c.id)).toEqual(['a', 'b', 't', 'n']);
  expect(filterChannels(channels, { ...defaultChannelFilters, search: '\u0bae\u0bbf\u0baf\u0bc2' }).map(c => c.id)).toEqual(['t']);
  expect(filterChannels(channels, { ...defaultChannelFilters, search: 'ETA' }).map(c => c.id)).toEqual(['b']);
  expect(genreCounts(sortChannels(channels, 'lcn', numbers))).toEqual({ Music: 3, News: 1 });
});

it('offers collapsible genres, a sticky toolbar, clear filters and totals without hiding later channels', () => {
  const channels = Array.from({ length: 86 }, (_, i) => ({ id: `channel-${i}`, name: `Channel ${i}`, active: true, sortOrder: i, language: 'Tamil', genre: i < 60 ? 'Comedy' : 'Devotional', isHD: i < 19, isPay: false, logoUrl: '' }));
  const html = renderToStaticMarkup(<ChannelBrowser channels={channels} lang="en" />);
  expect(html).toContain('connection-channel-toolbar');
  expect(html).toContain('Showing 86 of 86 channels');
  expect(html).toContain('Clear filters');
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*class="connection-clear-channel-filters"/);
  expect((html.match(/<details/g) ?? []).length).toBe(2);
  expect(html).toContain('<summary>Comedy');
  expect(html).toContain('<summary>Devotional');
  expect(html).toContain('Channel 85');
});

it('shows the stored catalog update date without claiming channel verification', () => {
  const html = renderToStaticMarkup(<ChannelBrowser channels={[]} lang="en" catalogUpdatedAt="2026-11-18T00:00:00Z" />);
  expect(html).toContain('Updated');
  expect(html).toContain('18 Nov 2026');
  expect(html).toContain('dateTime="2026-11-18T00:00:00Z"');
  const invalid = renderToStaticMarkup(<ChannelBrowser channels={[]} lang="en" catalogUpdatedAt="invalid" />);
  expect(invalid).not.toContain('Updated');
});
