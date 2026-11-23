import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { LaunchHomeContent } from '../src/components/NewConnection/LaunchHome';
import { CatalogPage } from '../src/components/NewConnection/CatalogPage';
import { seedCatalog } from './fixtures/newConnectionCatalog';
import { visibleCatalog } from '../src/lib/newConnectionBrowse';
import { HomeDetails, serviceAreaText } from '../src/components/NewConnection/HomeDetails';
import { NEW_CONNECTION_RENTAL } from '../src/lib/newConnectionPolicy';

it('links active operators, labels upcoming operators and derives the entry price and term from the catalog', () => {
  const catalog = seedCatalog();
  const brand = catalog.brands[0];
  catalog.packs = [{ ...catalog.packs[0], active: true, brandId: brand.id, packageType: 'only_box', pricingOptions: [{ validityDays: 360, validityMonths: 12, price: 3100 }] }];
  const html = renderToStaticMarkup(<MemoryRouter><LaunchHomeContent currentLang="en" catalog={catalog} /></MemoryRouter>);
  expect(html).toContain('₹3,100');
  expect(html).not.toContain('₹3,100.00');
  expect(html).toContain('12 months');
  expect(html).toContain('Free installation');
  expect(html).toContain(`/new-connection?brand=${encodeURIComponent(brand.id)}`);
  expect(html).not.toContain(`/new-connection?brand=${encodeURIComponent(catalog.brands[1].id)}`);
  expect(html).toContain('href="#home-details"');
  expect(html).toContain('id="home-details"');
  expect(html).toContain('Frequently asked questions');
  expect(html).toContain('Coming soon');
  expect(html).toContain('alt="Dish TV"');
  expect(html).toContain('src="/d2h_logo.png"');
  expect(html).toContain('aria-disabled="true"');
  const upcoming = [...html.matchAll(/<div class="launch-operator-preview"[\s\S]*?<\/div>/g)];
  expect(upcoming.length).toBeGreaterThan(0);
  expect(upcoming.every(tile => !tile[0].includes('<a ') && !tile[0].includes('tabindex='))).toBe(true);
});

it('keeps a catalog destination without invented prices when the catalog is unavailable', () => {
  const html = renderToStaticMarkup(<MemoryRouter><LaunchHomeContent currentLang="en" catalog={null} /></MemoryRouter>);
  expect(html).toContain('View current packs and prices');
  expect(html).not.toContain('Packs from');
  expect(html).not.toContain('Free installation');
  expect(html).not.toContain('Pay online');
});

it.each([false, true])('uses the booking button label for signed-in state %s', isSignedIn => {
  const html = renderToStaticMarkup(<MemoryRouter><LaunchHomeContent currentLang="en" catalog={null} isSignedIn={isSignedIn} /></MemoryRouter>);
  const label = isSignedIn ? 'My Bookings' : 'Sign in to see bookings';
  const actions = html.match(/class="launch-actions[^]*?<\/div>/)?.[0];
  expect(actions).toContain('href="/account/bookings"');
  expect(actions).toContain(`>${label}</a>`);
  expect(html.includes('Sign in to see bookings')).toBe(!isSignedIn);
});

it('honors a linked brand and ignores conflicting saved filters', () => {
  const catalog = seedCatalog();
  const brand = catalog.brands[0];
  vi.stubGlobal('sessionStorage', { getItem: () => JSON.stringify({ brandId: catalog.brands[1].id, filters: { maxPrice: '1', language: 'unavailable' } }) });
  try {
  const html = renderToStaticMarkup(<MemoryRouter><CatalogPage initialBrandId={brand.id} data={catalog} items={visibleCatalog(catalog)} lang="en" selected={[]} limit={false} onToggle={() => {}} onRemove={() => {}} onValidity={() => {}} onClear={() => {}} /></MemoryRouter>);
  expect(html).toContain(`value="${brand.id}" selected`);
  expect(html).toContain(`href="/new-connection/packs/${catalog.packs.find(pack => pack.brandId === brand.id)?.id}?`);
  expect(html).not.toContain(`href="/new-connection/packs/${catalog.packs.find(pack => pack.brandId !== brand.id)?.id}?`);
  } finally { vi.unstubAllGlobals(); }
});

it.each(['en', 'ta'] as const)('shares rental and refund wording and exposes expandable answers in %s', currentLang => {
  const catalog = seedCatalog(); catalog.settings.refundPolicy = ''; catalog.settings.serviceableDistricts = ['Kallakurichi'];
  const html = renderToStaticMarkup(<MemoryRouter><HomeDetails currentLang={currentLang} catalog={catalog} /></MemoryRouter>);
  expect(html).toContain(NEW_CONNECTION_RENTAL[currentLang]);
  expect(html.match(/<details>/g)).toHaveLength(3);
  expect(html).toContain('aria-expanded="false"');
  expect(html).not.toContain('How do I recharge later?');
  expect(html).toContain('href="tel:+918144404504"');
  expect(html).toContain('href="https://wa.me/918144404504"');
});

it('uses configured service areas and the same custom refund policy as booking', () => {
  const catalog = seedCatalog();
  catalog.settings.serviceableDistricts = ['Kallakurichi', 'Viluppuram'];
  catalog.settings.serviceablePincodes = ['605757'];
  catalog.settings.refundPolicy = 'Configured booking refund policy.';
  const html = renderToStaticMarkup(<MemoryRouter><HomeDetails currentLang="en" catalog={catalog} /></MemoryRouter>);
  expect(html).toContain('Kallakurichi, Viluppuram'); expect(html).toContain('605757');
  catalog.settings.serviceableDistricts = []; catalog.settings.serviceablePincodes = [];
  expect(serviceAreaText(catalog, 'en')).toBe('');
});

it('explains full, partial and payment-free booking amounts', () => {
  const catalog = seedCatalog();
  catalog.settings.enabledProviders = ['razorpay']; catalog.settings.defaultProvider = 'razorpay'; catalog.settings.advanceMode = 'full';
  const render = () => renderToStaticMarkup(<MemoryRouter><HomeDetails currentLang="en" catalog={catalog} /></MemoryRouter>);
  expect(render()).toContain('Enter details and pay online');
  expect(render()).toContain('Pay the full amount online when booking.');
  expect(render()).not.toContain('Pay at installation: ₹0.');
  catalog.settings.advanceMode = 'partial';
  expect(render()).toContain('remaining Pay at installation balance');
  expect(render()).not.toContain('Pay at installation: ₹0.');
  catalog.settings.advanceMode = 'none';
  expect(render()).not.toContain('Enter details and pay online');
  expect(render()).toContain('No online payment is required');
});
