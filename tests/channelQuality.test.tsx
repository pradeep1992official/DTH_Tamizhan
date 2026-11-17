import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ChannelQuality } from '../src/components/NewConnection/Shared';

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
