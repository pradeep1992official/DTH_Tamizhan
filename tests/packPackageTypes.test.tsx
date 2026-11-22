import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';
import { seedCatalog } from './fixtures/newConnectionCatalog';
import { packPackageType, packSchema } from '../src/lib/newConnectionCatalog';
import { compatibleEquipment, compareUrl, connectionQuote, visibleCatalog } from '../src/lib/newConnectionBrowse';
import { calculateNewConnectionPrice, selectedBookingItem } from '../src/lib/newConnectionOrders';
import { ComparePage } from '../src/components/NewConnection/ComparePage';

it.each(['full_set', 'only_box'] as const)('books %s at its saved price without equipment charges', packageType => {
  const data = seedCatalog();
  data.packs[0] = { ...data.packs[0], packageType, pricingOptions: [{ validityDays: 360, price: 3100 }] };
  const item = visibleCatalog(data)[0];
  // Existing expensive equipment must never be added to an inclusive package.
  const offer = compatibleEquipment(item, data.equipment)[0];
  expect(connectionQuote(item, data.equipment, 360).total).toBe(3100);
  data.equipment = [];
  const selection = selectedBookingItem(data, item.brand.id, item.pack.id, offer.id, 360);
  expect(selection.offer.name).toBe(packageType === 'full_set' ? 'Full set with dish' : 'Box only (existing dish)');
  expect(calculateNewConnectionPrice(selection.option.price, selection.offer, 2)).toMatchObject({ hardware: 0, installation: 0, perConnectionTotal: 3100, total: 6200 });
  expect(() => selectedBookingItem(data, item.brand.id, item.pack.id, 'arbitrary-offer', 360)).toThrow('SELECTION_UNAVAILABLE');
});

it('prefers the explicit package choice over legacy names and validates choices', () => {
  expect(packPackageType({ name: 'Pack - ONLY BOX' })).toBe('only_box');
  expect(packPackageType({ name: 'Pack - FULL SET' })).toBe('full_set');
  expect(packPackageType({ name: 'Pack - ONLY BOX', packageType: 'full_set' })).toBe('full_set');
  expect(packSchema.safeParse({ ...seedCatalog().packs[0], packageType: 'invalid' }).success).toBe(false);
});

it('compares package options and saved prices without separate equipment rows', () => {
  const data = seedCatalog();
  data.packs[0].packageType = 'full_set';
  data.packs[1].packageType = 'only_box';
  data.equipment = [];
  const items = visibleCatalog(data);
  const selection = items.slice(0, 2).map(i => ({ id: i.pack.id, validity: 30 }));
  const html = renderToStaticMarkup(<MemoryRouter initialEntries={[compareUrl(selection)]}><ComparePage data={data} items={items} lang="en" onSelection={() => {}} /></MemoryRouter>);
  expect(html).toContain('Box type');
  expect(html).toContain('Full set with dish');
  expect(html).toContain('Box only (existing dish)');
  expect(html).not.toContain('Equipment offer used for estimate');
  expect(html).not.toContain('30-day comparison price');
  expect(html).not.toContain('Box price');
});
