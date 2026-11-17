import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { seedCatalog } from './fixtures/newConnectionCatalog';
import { visibleCatalog, compareUrl } from '../src/lib/newConnectionBrowse';
import { PackChannels } from '../src/components/NewConnection/NewConnectionPages';
import { CatalogPage } from '../src/components/NewConnection/CatalogPage';
import { ChannelBrowser } from '../src/components/NewConnection/Shared';
import { ComparePage } from '../src/components/NewConnection/ComparePage';
const data = seedCatalog(); const items = visibleCatalog(data);
it('renders compact package cards with clear pricing, accessible comparison and balanced footer actions', () => {
  const catalog = seedCatalog();
  catalog.packs[0] = { ...catalog.packs[0], name: 'Tamil Super Star HD - ONLY BOX', packageType: 'only_box', boxType: 'Android', pricingOptions: [{ validityDays: 360, validityMonths: 12, price: 3100 }] };
  catalog.packs[1].packageType = 'full_set';
  const visible = visibleCatalog(catalog);
  const html = renderToStaticMarkup(<MemoryRouter><CatalogPage data={catalog} items={visible} lang="en" selected={[{ id: visible[0].pack.id, validity: 360 }]} limit={false} onToggle={() => {}} onRemove={() => {}} onValidity={() => {}} onClear={() => {}} /></MemoryRouter>);
  expect(html).toContain('Set-top box only');
  expect(html.replace(/<[^>]*>/g, '')).toContain('Android box');
  expect(html).toContain('≈ ₹258/month');
  expect(html).toContain('class="connection-price-line"');
  expect(html).toContain('class="connection-validity">12 months');
  expect(html).not.toContain('for 360 days');
  expect(html).toContain('Box only (existing dish)');
  expect(html).toContain('Free installation');
  expect(html).toContain('Dish + free installation');
  expect(html).not.toContain('HD box + dish included');
  expect(html).toContain('Remote control');
  expect(html).toContain('New dish. An existing dish is required.');
  expect(html).toContain('data-selected="true"');
  expect(html).toContain('Selected for comparison');
  expect(html).not.toContain('More filters');
  expect(html).not.toContain('aria-label="Sort by"');
  expect(html).toContain('aria-label="Package option"');
  expect(html).toContain('aria-label="Compare: Tamil Super Star HD - ONLY BOX"');
  expect(html).toContain('connection-package-info');
  expect(html).not.toContain('class="connection-badge"');
  expect(html).toContain('Compare packs and choose your connection.');
  expect(html).not.toContain('class="connection-filter-panel"');
  expect(html).not.toContain(catalog.brands[0].description);
  expect(html).not.toContain('₹3,100.00');
  const footer = html.match(/class="connection-card-actions">([\s\S]*?)<\/div>/)?.[1];
  expect(footer).toBeDefined();
  expect(footer).toContain('checkbox');
  expect((footer?.match(/<a /g) ?? []).length).toBe(2);
});
it('renders all available brands together in English and Tamil with booking links and visible counts', () => {
  for (const lang of ['en', 'ta'] as const) {
    const html = renderToStaticMarkup(<MemoryRouter><CatalogPage data={data} items={items} lang={lang} selected={[]} limit={false} onToggle={() => {}} onRemove={() => {}} onValidity={() => {}} onClear={() => {}} /></MemoryRouter>);
    expect((html.match(/class="connection-pack"/g) ?? []).length).toBe(items.length);
    expect(html).toContain('/new-connection/book?brand='); expect(html).toContain('validity=30');
    expect(html).toContain(lang === 'ta' ? 'சேனல்களைப் பார்க்க' : 'View channels');
    expect(html).toContain('SAMPLE');
    expect(html).not.toContain('Selected for comparison');
    expect(html).not.toContain('class="connection-brands"');
    expect(html).toContain('<option value="" selected="">');
    for (const item of items) expect(html).toContain(item.pack.name);
    for (const brand of data.brands) expect(html).toContain(brand.name);
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

it('keeps pack context, calendar pricing and booking action beside verifiable HD channels', () => {
  const catalog = seedCatalog();
  catalog.packs[0] = { ...catalog.packs[0], name: 'Tamil HD - ONLY BOX', packageType: 'only_box', pricingOptions: [{ validityDays: 360, validityMonths: 12, price: 3100 }, { validityDays: 30, price: 400 }] };
  const visible = visibleCatalog(catalog);
  const item = visible[0];
  const html = renderToStaticMarkup(<MemoryRouter initialEntries={[`/packs/${item.pack.id}?validity=360`]}><Routes><Route path="/packs/:packId" element={<PackChannels items={visible} lang="en" />} /></Routes></MemoryRouter>);
  expect(html).toContain('<h1>Tamil HD</h1>');
  expect(html).not.toContain('ONLY BOX');
  expect(html).toContain('Box only (existing dish)');
  expect(html).toContain('Free installation');
  expect(html).toContain('An existing dish is required.');
  expect(html).toContain('12 months');
  expect(html).toContain('connection-pack-select-bar');
  expect(html).toContain('Select pack');
  const header = html.match(/<header[\s\S]*?<\/header>/)?.[0] ?? '';
  expect(header).toContain('connection-detail-purchase');
  expect(header).toContain('Select pack');
  expect(header).toContain(`pack=${item.pack.id}&amp;validity=360`);
  expect(html).toContain(`pack=${item.pack.id}&amp;validity=360`);
  expect(html).toContain(`connection-channel-hd-count">${item.channels.filter(c => c.isHD).length} HD`);
  expect((html.match(/connection-channel-hd-badge/g) ?? []).length).toBe(item.channels.filter(c => c.isHD).length);
});

it('restores the primary catalog filters when returning to packs', () => {
  vi.stubGlobal('sessionStorage', { getItem: () => JSON.stringify({ brandId: data.brands[0].id, filters: { packageType: 'only_box', sort: 'channels' } }) });
  try {
    const html = renderToStaticMarkup(<MemoryRouter><CatalogPage data={data} items={items} lang="en" selected={[]} limit={false} onToggle={() => {}} onRemove={() => {}} onValidity={() => {}} onClear={() => {}} /></MemoryRouter>);
    expect(html).toContain('value="only_box" selected=""');
    expect(html).not.toContain('aria-label="Sort by"');
    expect(html).not.toContain('More filters');
    expect(html).not.toContain('Language: Tamil');
    expect(html).toContain(`value="${data.brands[0].id}" selected=""`);
  } finally { vi.unstubAllGlobals(); }
});

it('enforces comparison limits with consistent branded chips and selection overlays', () => {
  const catalog = seedCatalog();
  catalog.packs = Array.from({ length: 4 }, (_, i) => ({ ...catalog.packs[0], id: `comparison-${i}`, name: `Tamil Pack ${i} - ONLY BOX`, packageType: 'only_box' as const }));
  const visible = visibleCatalog(catalog);
  const render = (count: number) => renderToStaticMarkup(<MemoryRouter><CatalogPage data={catalog} items={visible} lang="en" selected={visible.slice(0, count).map(item => ({ id: item.pack.id, validity: 30 }))} limit={false} onToggle={() => {}} onRemove={() => {}} onValidity={() => {}} onClear={() => {}} /></MemoryRouter>);
  const one = render(1);
  const cleared = render(0);
  expect(cleared).not.toContain('Selected for comparison');
  expect(cleared).not.toContain('checked=""');
  expect(cleared).not.toContain('class="connection-compare-bar"');
  expect(one).toContain('1 of 3 packs selected');
  expect(one).toContain('Select at least 2 packs');
  expect(one).toMatch(/<button disabled="" aria-describedby="[^"]+">Compare<\/button>/);
  const bar = one.slice(one.indexOf('<aside'));
  expect(bar).toContain(`${visible[0].brand.name} \u00b7 Tamil Pack 0 \u00b7 Box only (existing dish)`);
  expect(bar).not.toContain('ONLY BOX');
  for (const count of [0, 1, 2, 3]) {
    const html = render(count);
    expect(html).not.toContain('connection-comparison-slot');
    expect((html.match(/class="connection-comparison-state"/g) ?? []).length).toBe(count);
  }
  expect(render(2)).toContain('class="connection-primary" href="/new-connection/compare?');
  const full = render(3);
  expect(full).toContain('Maximum 3 packs selected. Remove one to choose another.');
  const inputs = full.match(/<input[^>]*type="checkbox"[^>]*>/g) ?? [];
  expect(inputs).toHaveLength(4);
  expect(inputs.filter(input => input.includes('disabled=""'))).toHaveLength(1);
  expect(inputs.filter(input => input.includes('checked=""') && !input.includes('disabled=""'))).toHaveLength(3);
});
