import { translations } from '../src/lib/translations';
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
it('renders readable comparison punctuation, short brand tabs and subset insights in both languages', () => {
  const catalog = seedCatalog();
  const [first, second] = catalog.brands;
  const channelIds = catalog.channels.slice(0, 3).map(channel => channel.id);
  catalog.packs = catalog.packs.slice(0, 2).map((pack, i) => ({ ...pack, brandId: i ? second.id : first.id, name: i ? 'Tamil Super Star HD - ONLY BOX' : 'Tamil Thalaiva HDs - FULL SET', channelIds: i ? channelIds : channelIds.slice(0, 1) }));
  const visible = visibleCatalog(catalog);
  const selection = visible.map(item => ({ id: item.pack.id, validity: 30 }));
  const render = (lang: 'en' | 'ta') => renderToStaticMarkup(<MemoryRouter initialEntries={[compareUrl(selection)]}><ComparePage data={catalog} items={visible} lang={lang} onSelection={() => {}} /></MemoryRouter>);
  const html = render('en');
  const text = html.replace(/<[^>]*>/g, '');
  expect(text).toContain('\u201cOnly in\u201d shows channels found in just that pack.');
  expect(text).toContain(`Only in ${second.name} (2 \u00b7`);
  expect(text).toContain(`${second.name} Super Star adds 2 channels, including`);
  expect(text).toContain(`Every channel in ${first.name} Thalaiva is also in the ${second.name} Super Star pack.`);
  expect(text).not.toContain(`Only in ${first.name} (0`);
  expect(html).toContain('role="tablist"');
  expect(html).toContain('aria-selected="true"');
  expect(html.slice(html.indexOf('<section class="connection-diff"'))).not.toContain('?');
  const tamil = render('ta');
  expect(tamil.slice(tamil.indexOf('<section class="connection-diff"'))).not.toContain('?');
});
it('summarizes identical hardware variants once without tabs or self-comparisons', () => {
  const catalog = seedCatalog();
  catalog.channels = Array.from({ length: 59 }, (_, i) => ({ ...catalog.channels[0], id: `same-${i}`, name: `Channel ${i}`, isHD: i < 4 }));
  catalog.packs = catalog.packs.slice(0, 2).map((pack, i) => ({ ...pack, brandId: catalog.brands[0].id, name: `Tamil Thalaiva HDs - ${i ? 'ONLY BOX' : 'FULL SET'}`, packageType: i ? 'only_box' as const : 'full_set' as const, channelIds: catalog.channels.map(channel => channel.id) }));
  const visible = visibleCatalog(catalog);
  const html = renderToStaticMarkup(<MemoryRouter initialEntries={[compareUrl(visible.map(item => ({ id: item.pack.id, validity: 30 })))]}><ComparePage data={catalog} items={visible} lang="en" onSelection={() => {}} /></MemoryRouter>);
  const section = html.slice(html.indexOf('<section class="connection-diff"'));
  expect((section.match(/connection-diff-insight/g) ?? []).length).toBe(1);
  expect(section).toContain('Both packs have the same 59 channels (4 HD). They differ only in hardware and price.');
  expect(section).not.toContain('role="tablist"');
  expect(section).not.toContain('role="tab"');
  expect(section).not.toContain('aria-labelledby="diff-tab-');
  expect(section).not.toContain('adds 0');
  expect(section).not.toContain('Only in');
  expect((section.match(/<li\b[^>]*>/g) ?? []).length).toBe(59);
  expect((section.match(/connection-channel-hd-badge/g) ?? []).length).toBe(4);
  // Two packs from one brand produce one operator badge per channel, not two.
  expect((section.match(/class="connection-brand-lcn"/g) ?? []).length).toBe(59);
});
it('keeps operator badges and LCN sort choices in comparison column order', () => {
  const catalog = seedCatalog();
  catalog.brands[0] = { ...catalog.brands[0], name: 'Tata Play', slug: 'tata-play' };
  catalog.brands[1] = { ...catalog.brands[1], name: 'Airtel', slug: 'airtel' };
  catalog.channels[0] = { ...catalog.channels[0], name: 'Sun TV HD', isHD: true };
  catalog.packs = catalog.packs.slice(0, 2).map((pack, i) => ({ ...pack, brandId: catalog.brands[i].id, channelIds: [catalog.channels[0].id] }));
  const visible = visibleCatalog(catalog);
  for (const ordered of [visible, [...visible].reverse()]) {
    const html = renderToStaticMarkup(<MemoryRouter initialEntries={[compareUrl(ordered.map(item => ({ id: item.pack.id, validity: 30 })))]}><ComparePage data={catalog} items={visible} lang="en" onSelection={() => {}} /></MemoryRouter>);
    const first = ordered[0].brand.name; const second = ordered[1].brand.name;
    expect(html.indexOf(`aria-label="${first} LCN`)).toBeLessThan(html.indexOf(`aria-label="${second} LCN`));
    expect(html.indexOf(`LCN by ${first}`)).toBeLessThan(html.indexOf(`LCN by ${second}`));
    expect(html).toContain('Tata Play <b>1503</b>');
    expect(html).toContain('Airtel <b>755</b>');
  }
});
it('uses hardware labels in a single subset insight for packs with the same name', () => {
  const catalog = seedCatalog();
  catalog.packs = catalog.packs.slice(0, 2).map((pack, i) => ({ ...pack, brandId: catalog.brands[0].id, name: 'Tamil Thalaiva HDs', packageType: i ? 'only_box' as const : 'full_set' as const, channelIds: catalog.channels.slice(0, i ? 2 : 1).map(channel => channel.id) }));
  const visible = visibleCatalog(catalog);
  const html = renderToStaticMarkup(<MemoryRouter initialEntries={[compareUrl(visible.map(item => ({ id: item.pack.id, validity: 30 })))]}><ComparePage data={catalog} items={visible} lang="en" onSelection={() => {}} /></MemoryRouter>);
  const section = html.slice(html.indexOf('<section class="connection-diff"'));
  const insight = section.match(/<p class="connection-diff-insight">([\s\S]*?)<\/p>/)?.[1] ?? '';
  expect((section.match(/connection-diff-insight/g) ?? []).length).toBe(1);
  expect(insight).toContain('Thalaiva (Box only (existing dish)) adds');
  expect(insight).toContain('Thalaiva (Full set with dish) doesn');
  expect((section.match(/role="tab"/g) ?? []).length).toBe(2);
});
it('disambiguates same-brand comparison tabs by pack and package type', () => {
  const catalog = seedCatalog();
  catalog.packs = catalog.packs.slice(0, 2).map((pack, i) => ({ ...pack, brandId: catalog.brands[0].id, name: i ? 'Tamil Super Star HD - ONLY BOX' : 'Tamil Thalaiva HDs - FULL SET', channelIds: [catalog.channels[i].id] }));
  const render = () => {
    const visible = visibleCatalog(catalog);
    return renderToStaticMarkup(<MemoryRouter initialEntries={[compareUrl(visible.map(item => ({ id: item.pack.id, validity: 30 })))]}><ComparePage data={catalog} items={visible} lang="en" onSelection={() => {}} /></MemoryRouter>);
  };
  expect(render()).toContain(`Only in ${catalog.brands[0].name} Thalaiva`);
  expect(render()).toContain(`Only in ${catalog.brands[0].name} Super Star`);
  catalog.packs.forEach((pack, i) => { pack.name = 'Tamil Super Star HD'; pack.packageType = i ? 'only_box' : 'full_set'; });
  const html = render();
  expect(html).toContain(`Only in ${catalog.brands[0].name} Super Star (Box only (existing dish))`);
  expect(html).toContain(`Only in ${catalog.brands[0].name} Super Star (Full set with dish)`);
});
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
  expect((html.match(/<li\b[^>]*>/g) ?? []).length).toBe(60);
  expect((html.match(/loading="lazy"/g) ?? []).length).toBe(60);
  expect(html).toContain('width="72" height="72"'); expect(html).toContain('650 channels');
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
  expect((html.match(/class="connection-channel-logo-slot"/g) ?? []).length).toBe(item.channels.length);
  expect((html.match(/class="connection-brand-lcn"/g) ?? []).length).toBe(item.channels.length);
  expect(html).not.toContain('class="connection-channel-lcn"');
  expect(html).not.toContain('class="connection-brand-dot"');
  expect(html).toContain('LCN <b>');
  expect(html).toContain('LCN by');
  expect(html).toContain('LCN may vary by region');
  expect(html).not.toContain('Tamil \u00b7 SD');
  expect(html).toContain('width:72px;height:72px');
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

it('compares distinct metrics without tied awards or duplicate box and validity rows', () => {
  const catalog = seedCatalog();
  catalog.packs = catalog.packs.slice(0, 2).map((pack, i) => ({ ...pack, packageType: 'only_box' as const, pricingOptions: [{ validityDays: 365, validityMonths: 12, price: 3100 }], channelIds: catalog.channels.slice(0, i === 0 ? 2 : 1).map(c => c.id) }));
  const visible = visibleCatalog(catalog);
  const selection = visible.map(item => ({ id: item.pack.id, validity: 365 }));
  const render = () => renderToStaticMarkup(<MemoryRouter initialEntries={[compareUrl(selection)]}><ComparePage data={catalog} items={visible} lang="en" onSelection={() => {}} /></MemoryRouter>);
  const html = render();
  const rows = html.match(/<tr[\s\S]*?<\/tr>/g) ?? [];
  const price = rows.find(row => row.includes(translations.en.ncChosenPrice))!;
  expect(price).not.toContain('connection-best');
  const total = rows.find(row => row.includes(translations.en.ncTotal))!;
  expect(total).toContain('Most channels');
  expect(total).not.toContain('Best value');
  expect(html).not.toContain('Package option');
  expect(html).not.toContain(`<th scope="row">${translations.en.ncType}</th>`);
  expect(html).not.toContain(translations.en.ncValidityOptions);
  expect((html.match(/Box only \(existing dish\)/g) ?? []).length).toBe(2);
  const validityRow = rows.find(row => row.includes(`<th scope="row">${translations.en.ncValidity}</th>`))!;
  expect(validityRow).not.toContain('<select');
  expect(validityRow).toContain('12 months');
  catalog.packs[0].pricingOptions.push({ validityDays: 30, price: 300 });
  const multi = visibleCatalog(catalog);
  const multiHtml = renderToStaticMarkup(<MemoryRouter initialEntries={[compareUrl(selection)]}><ComparePage data={catalog} items={multi} lang="en" onSelection={() => {}} /></MemoryRouter>);
  const multiValidity = (multiHtml.match(/<tr[\s\S]*?<\/tr>/g) ?? []).find(row => row.includes(`<th scope="row">${translations.en.ncValidity}</th>`))!;
  expect((multiValidity.match(/<select/g) ?? []).length).toBe(1);
});
