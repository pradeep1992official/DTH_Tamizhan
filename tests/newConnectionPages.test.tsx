import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';
import { seedCatalog } from './fixtures/newConnectionCatalog';
import { visibleCatalog, compareUrl } from '../src/lib/newConnectionBrowse';
import { CatalogPage } from '../src/components/NewConnection/CatalogPage';
import { ChannelBrowser } from '../src/components/NewConnection/Shared';
import { ComparePage } from '../src/components/NewConnection/ComparePage';
const data = seedCatalog(); const items = visibleCatalog(data);
it('renders the Part 1 sample packs in English and Tamil with booking links and visible counts', () => {
  for (const lang of ['en', 'ta'] as const) {
    const html = renderToStaticMarkup(<MemoryRouter><CatalogPage data={data} items={items} lang={lang} selected={[]} limit={false} onToggle={() => {}} onRemove={() => {}} onValidity={() => {}} onClear={() => {}} /></MemoryRouter>);
    expect((html.match(/class="connection-pack"/g) ?? []).length).toBe(3);
    expect(html).toContain('/new-connection/book?brand='); expect(html).toContain('validity=30');
    expect(html).toContain(lang === 'ta' ? 'சேனல்களைப் பார்க்க' : 'View channels');
    expect(html).toContain('SAMPLE');
  }
});
it('renders shared comparisons with an inactive column and keeps it out of cost estimates', () => {
  const selection = [{ id: items[0].pack.id, validity: 90 }, { id: 'inactive-pack', validity: 30 }];
  const html = renderToStaticMarkup(<MemoryRouter initialEntries={[compareUrl(selection)]}><ComparePage data={data} items={items} lang="en" onSelection={() => {}} /></MemoryRouter>);
  expect(html).toContain('No longer available'); expect(html).toContain('90 days');
  expect(html).not.toContain('Common to all');
  expect((html.match(/class="connection-primary"/g) ?? []).length).toBe(1);
});
it('paginates a 650-channel list to 60 fixed-size, lazy-loading rows', () => {
  const channels = Array.from({ length: 650 }, (_, i) => ({ ...data.channels[0], id: `channel-${i}`, name: `Channel ${i}`, logoUrl: 'https://example.com/channel.png' }));
  const html = renderToStaticMarkup(<ChannelBrowser channels={channels} lang="en" />);
  expect((html.match(/<li>/g) ?? []).length).toBe(60);
  expect((html.match(/loading="lazy"/g) ?? []).length).toBe(60);
  expect(html).toContain('width="32" height="32"'); expect(html).toContain('650 channels');
});
