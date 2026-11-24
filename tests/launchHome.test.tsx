import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { LaunchHomeContent, homeConnection } from '../src/components/NewConnection/LaunchHome';
import { CatalogPage } from '../src/components/NewConnection/CatalogPage';
import { seedCatalog } from './fixtures/newConnectionCatalog';
import { visibleCatalog } from '../src/lib/newConnectionBrowse';
import { HomeDetails, serviceAreaText } from '../src/components/NewConnection/HomeDetails';
import { NEW_CONNECTION_RENTAL } from '../src/lib/newConnectionPolicy';

it('keeps live pricing and installation details inside New connection', () => {
  const catalog = seedCatalog(); const brand = catalog.brands[0]; brand.name = 'Airtel';
  catalog.packs = [{ ...catalog.packs[0], active: true, brandId: brand.id, packageType: 'only_box', pricingOptions: [{ validityDays: 360, validityMonths: 12, price: 3100 }] }];
  catalog.settings.serviceableDistricts = ['Kallakurichi'];
  const html = renderToStaticMarkup(<MemoryRouter><LaunchHomeContent currentLang="en" recharge catalog={catalog} rechargeOperators={[{ id: 'airtel_dth', name: 'Airtel', isEnabled: true }, { id: 'tata_play', name: 'Tata Play', isEnabled: true }] as any} /></MemoryRouter>);
  expect(html).toContain('Packs from'); expect(html).toContain('12 months'); expect(html).toContain('Free installation');
  const cards = [...html.matchAll(/<article class="home-task-card">([\s\S]*?)<\/article>/g)].map(match => match[1]);
  expect(cards).toHaveLength(3); expect(cards[1]).toContain('3,100'); expect(cards[1]).toContain('Kallakurichi');
  expect(html).toContain('class="home-installation-area"'); expect(html).toContain('Kallakurichi');
  expect(cards[0]).not.toContain('Packs from'); expect(cards[2]).not.toContain('Free installation');
  expect(html).not.toContain('home-recharge-operators');
  expect(html).not.toContain('/new-connection?brand=');
});

it('keeps a catalog destination without invented prices when the catalog is unavailable', () => {
  const html = renderToStaticMarkup(<MemoryRouter><LaunchHomeContent currentLang="en" catalog={null} /></MemoryRouter>);
  expect(html).toContain('View current packs and prices');
  expect(html).not.toContain('Packs from');
  expect(html).not.toContain('Free installation');
  expect(html).not.toContain('Pay online');
});

it.each([false, true])('shows the three tasks without My Bookings in the hero for signed-in state %s', isSignedIn => {
  const html = renderToStaticMarkup(<MemoryRouter><LaunchHomeContent currentLang="en" catalog={null} isSignedIn={isSignedIn} /></MemoryRouter>);
  const hero = html.split('id="home-details"')[0];
  expect(hero).not.toContain('My Bookings');
  expect(hero).toContain('href="/recharge"'); expect(hero).toContain('href="/new-connection"'); expect(hero).toContain('href="/service-request"');
  expect(hero.includes('>Sign in')).toBe(!isSignedIn);
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
  expect(html).toContain('href="tel:+919677156157"');
  expect(html).toContain('href="https://wa.me/919677156157"');
});

it('uses configured service areas and the same custom refund policy as booking', () => {
  const catalog = seedCatalog();
  catalog.settings.serviceableDistricts = ['Kallakurichi', 'Viluppuram'];
  catalog.settings.serviceablePincodes = ['605757'];
  catalog.settings.refundPolicy = 'Configured booking refund policy.';
  const html = renderToStaticMarkup(<MemoryRouter><LaunchHomeContent currentLang="en" catalog={catalog} /></MemoryRouter>);
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

it('offers a hero landing page with a separate recharge destination when recharge is enabled', () => {
  const html = renderToStaticMarkup(<MemoryRouter><LaunchHomeContent currentLang="en" catalog={null} recharge /></MemoryRouter>);
  expect(html).toContain('Vanakkam! Let&#x27;s get your TV sorted.');
  expect(html).toContain('href="/recharge"');
  expect(html).toContain('href="/new-connection"');
  expect(html).not.toContain('name="smartCardNumber"');
});

const customer = { uid: 'owner' } as any;
const connection = { id: 'box', user_id: 'owner', operator: 'tata_play', operatorName: 'Tata Play', smartCardNumber: '1234567890', packName: 'Family HD', createdAt: '2026-11-20T00:00:00Z', expiryDate: '2026-11-29T12:00:00Z' } as any;
const now = Date.parse('2026-11-24T12:00:00Z');
function nodes(tree: any): any[] { return Array.isArray(tree) ? tree.flatMap(nodes) : React.isValidElement(tree) ? [tree, ...nodes((tree.props as any).children)] : []; }
it('reuses the saved-connection action in one tap and never prints the full subscriber ID', () => {
  const onRecharge = vi.fn();
  const tree = LaunchHomeContent({ currentLang: 'en', catalog: null, recharge: true, user: customer, connections: [connection], now, onRechargeConnection: onRecharge });
  const strip = nodes(tree).find(node => node.props.className === 'home-task-card');
  nodes(strip).find(node => node.type === 'button').props.onClick();
  expect(onRecharge).toHaveBeenCalledWith(connection);
  const html = renderToStaticMarkup(<MemoryRouter>{tree}</MemoryRouter>);
  expect(html).toContain('Your Tata Play'); expect(html).not.toContain('Family HD'); expect(html).toContain('7890'); expect(html).not.toContain('1234567890');
  expect(html).toContain('expires in 5 days');
});
it('hides personalised details when signed out and ignores another account?s connection', () => {
  expect(homeConnection([connection], 'different-owner', now)).toBeUndefined();
  expect(homeConnection([{ ...connection, expiryDate: '2026-11-01' }], 'owner', now)?.id).toBe('box');
  const html = renderToStaticMarkup(<MemoryRouter><LaunchHomeContent currentLang="en" catalog={null} user={null} connections={[connection]} openBooking={{ id: 'private', status: 'booked' }} now={now} /></MemoryRouter>);
  expect(html).not.toContain('Your connection'); expect(html).not.toContain('Family HD'); expect(html).not.toContain('order=private'); expect(html).toContain('>Sign in');
});
it('shows friendly owner updates and suppresses the expiry banner outside the seven-day window', () => {
  const html = renderToStaticMarkup(<MemoryRouter><LaunchHomeContent currentLang="en" catalog={null} user={customer} connections={[{ ...connection, expiryDate: '2026-12-20' }]} openBooking={{ id: 'booking-1', status: 'booked' }} openService={{ id: 'service-1', status: 'in_progress' }} now={now} /></MemoryRouter>);
  expect(html).toContain('href="/account/bookings?order=booking-1"'); expect(html).toContain('href="/my-tickets?ticket=service-1"'); expect(html).not.toContain('home-expiry-notice');
});
it('renders Tamil task cards and all three action destinations', () => {
  const html = renderToStaticMarkup(<MemoryRouter><LaunchHomeContent currentLang="ta" catalog={seedCatalog()} /></MemoryRouter>);
  expect(html.match(/class="home-task-card"/g)).toHaveLength(3); expect(html).toMatch(/[\u0B80-\u0BFF]/); expect(html).toContain('href="/service-request"');
});
it.each(['en', 'ta'] as const)('welcomes a customer by title-cased first name in %s', lang => {
  const html = renderToStaticMarkup(<MemoryRouter><LaunchHomeContent currentLang={lang} catalog={null} user={{ ...customer, displayName: '  pRADEEP Kumar ' }} /></MemoryRouter>);
  expect(html).toContain(lang === 'ta' ? 'Vanakkam, Pradeep' : 'Welcome back, Pradeep');
  expect(html).not.toContain('Kumar');
  expect(html).not.toContain('home-saved-connection');
  expect(html.match(/class="home-task-action is-primary"/g)).toHaveLength(1);
});
it('shows real saved recharge details without placeholder packs or missing fields', () => {
  const html = renderToStaticMarkup(<MemoryRouter><LaunchHomeContent currentLang="en" catalog={null} user={customer} connections={[{ ...connection, packName: 'Custom top-up', expiryDate: '', lastRechargeDate: '2026-11-20' }]} now={now} /></MemoryRouter>);
  expect(html).toContain('last recharged on'); expect(html).toContain('20 Nov 2026');
  expect(html).not.toContain('Custom top-up'); expect(html).not.toContain('Not available');
  expect(html).not.toContain('home-connection-strip'); expect(html).not.toContain('home-recharge-operators');
  expect(html.match(/class="home-task-action is-primary"/g)).toHaveLength(1);
  expect(html).toContain('Talk to us on WhatsApp');
});
