import { expect, it } from 'vitest';
import { channelFlyer, channelListLink, safeChannelListUrl } from '../src/lib/channelFlyers';

it('keeps existing bundled flyers as defaults', () => {
  expect(channelListLink('airtel_dth', 'Tamil Super Star HD Pack')).toBe(channelFlyer('airtel_dth', 'Tamil Super Star HD Pack'));
});
it('lets an uploaded channel list override a bundled flyer', () => {
  const file = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/catalog-channel-lists%2Ffile.pdf?alt=media&token=fixture';
  expect(channelListLink('airtel_dth', 'Tamil Super Star HD Pack', file)).toBe(file);
  expect(channelListLink('airtel_dth', 'Tamil Super Star Plus HD Pack', file)).toBe(file);
});
it('supports a bundled project file for any other pack', () => {
  expect(channelListLink('sun_direct', 'Tamil pack', '/channel-flyers/tamil.pdf')).toBe('/channel-flyers/tamil.pdf');
  expect(channelListLink('sun_direct', 'Tamil pack')).toBeNull();
});
it.each(['javascript:alert(1)', 'file:///logo.png', 'data:text/html,<script/>', 'ftp://example.com/file.pdf', '//example.com/file.pdf', '/\\example.com/file.pdf', 'https://user:password@example.com/file.pdf'])(
  'rejects an unsafe channel-list link %s', value => { expect(safeChannelListUrl(value)).toBeNull(); },
);
