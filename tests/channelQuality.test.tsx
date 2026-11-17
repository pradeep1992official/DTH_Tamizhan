import { airtelSuperStarChannelNumbers, channelNumbersForPack } from '../src/lib/airtelChannelNumbers';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ChannelQuality, ChannelBrowser } from '../src/components/NewConnection/Shared';

it('highlights HD channel counts with a gold badge', () => {
  const html = renderToStaticMarkup(<ChannelQuality type="HD" hdCount={19} lang="en" />);
  expect(html).toContain('is-hd');
  expect(html).toContain('19 HD channels');
  expect(html).toContain('aria-hidden="true">HD');
});

it('uses a silver SD badge without revealing the total channel count', () => {
  const html = renderToStaticMarkup(<ChannelQuality type="SD" hdCount={0} lang="en" />);
  expect(html).toContain('is-sd');
  expect(html).toContain('SD channels');
  expect(html).not.toContain('0 HD');
});

it('keeps real logos, removes initials and hides repetitive free pricing', () => {
  const channels = [
    { id: 'star-one', name: 'Star One', active: true, sortOrder: 0, language: 'Tamil', genre: 'Entertainment', isHD: true, isPay: false, logoUrl: 'https://example.com/star.png' },
    { id: 'star-two', name: 'Star Two', active: true, sortOrder: 1, language: 'Tamil', genre: 'Entertainment', isHD: false, isPay: false, logoUrl: '' },
  ];
  const html = renderToStaticMarkup(<ChannelBrowser channels={channels} lang="en" />);
  expect(html).toContain('https://example.com/star.png');
  expect((html.match(/class="connection-logo"/g) ?? []).length).toBe(1);
  expect(html).not.toContain('>ST<');
  expect(html).not.toContain('Channel pricing');
  expect(html).not.toContain('connection-channel-paid');
  expect(html).not.toContain('Free');
  const mixed = renderToStaticMarkup(<ChannelBrowser channels={[channels[0], { ...channels[1], isPay: true }]} lang="en" />);
  expect(mixed).toContain('Channel pricing');
  expect((mixed.match(/connection-channel-paid/g) ?? []).length).toBe(1);
  expect(mixed).toContain('Pay');
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
  expect(html).toContain('Last updated');
  expect(html).toContain('18 Nov 2026');
  expect(html).toContain('dateTime="2026-11-18T00:00:00Z"');
  const invalid = renderToStaticMarkup(<ChannelBrowser channels={[]} lang="en" catalogUpdatedAt="invalid" />);
  expect(invalid).not.toContain('Last updated');
});
