import { expect, it } from 'vitest';
import { calculateNewConnectionPrice, advanceQuote, sameBookingQuote, moneyUnits, installationDateBounds, bookingServiceable, customerDetailsSchema, bookingInputSchema } from '../src/lib/newConnectionOrders';
import { settingsSchema } from '../src/lib/newConnectionCatalog';
import { compatibleEquipment, connectionQuote, visibleCatalog } from '../src/lib/newConnectionBrowse';
import { seedCatalog } from './fixtures/newConnectionCatalog';

it('charges a full pack, box and installation for every connection, without starter-pack discount', () => {
  expect(calculateNewConnectionPrice(111, { hardwarePrice: 1001, installationCharge: 101 }, 3)).toEqual({ hardware: 1001, installation: 101, pack: 111, perConnectionTotal: 1213, total: 3639, currency: 'INR' });
  expect(calculateNewConnectionPrice(.1, { hardwarePrice: .2, installationCharge: .3 }, 3).total).toBe(1.8);
  expect(moneyUnits(123.45)).toBe(12345);
  for (const invalid of [-1, NaN, Infinity, .001]) expect(() => moneyUnits(invalid)).toThrow();
  for (const count of [0, 4, 1.5]) expect(() => calculateNewConnectionPrice(100, { hardwarePrice: 1, installationCharge: 1 }, count)).toThrow();
});
it('shares exactly the same price and compatibility rule with Part 2', () => {
  const data = seedCatalog(); const item = visibleCatalog(data)[0]; const offer = compatibleEquipment(item, data.equipment)[0]; const quote = connectionQuote(item, data.equipment, 90);
  expect(quote.total).toBe(calculateNewConnectionPrice(quote.option.price, offer, 1).total);
  expect(connectionQuote({ ...item, pack: { ...item.pack, type: '4K' } }, data.equipment).offer).toBeUndefined();
});
it('defaults to payment-free booking and computes full/partial/none balances without rounding drift', () => {
  const defaults = settingsSchema.parse({}); expect(defaults.advanceMode).toBe('none'); expect(defaults.enabledProviders).toEqual([]); expect(defaults.defaultProvider).toBe('none');
  expect(settingsSchema.parse({ advanceMode: 'full' }).advanceMode).toBe('none'); // Legacy config without gateways migrates safely on read.
  const price = calculateNewConnectionPrice(100, { hardwarePrice: 1000, installationCharge: 100 }, 2);
  expect(advanceQuote(price, { advanceMode: 'none', partialAmount: 0 })).toMatchObject({ amountDueNow: 0, balanceAtInstallation: 2400 });
  expect(advanceQuote(price, { advanceMode: 'full', partialAmount: 0 })).toMatchObject({ amountDueNow: 2400, balanceAtInstallation: 0 });
  expect(advanceQuote(price, { advanceMode: 'partial', partialAmount: 500 })).toMatchObject({ amountDueNow: 500, balanceAtInstallation: 1900 });
  expect(advanceQuote(price, { advanceMode: 'partial', partialAmount: 5000 }).amountDueNow).toBe(2400);
  const quote = advanceQuote(price, defaults); expect(sameBookingQuote(quote, { ...quote, amountDueNow: 1 })).toBe(false);
});
it('computes tomorrow to fourteen days using IST across UTC midnight', () => {
  expect(installationDateBounds(Date.parse('2026-11-16T19:00:00Z'))).toEqual({ today: '2026-11-17', min: '2026-11-18', max: '2026-12-01' });
});
it('enforces both configured service-area lists and validates bounded customer fields', () => {
  expect(bookingServiceable({ pincode: '600001', district: 'Chennai' }, { serviceablePincodes: [], serviceableDistricts: [] })).toBe(true);
  expect(bookingServiceable({ pincode: '600002', district: 'Chennai' }, { serviceablePincodes: ['600001'], serviceableDistricts: ['Chennai'] })).toBe(false);
  expect(bookingServiceable({ pincode: '600001', district: 'Chennai' }, { serviceablePincodes: ['600001'], serviceableDistricts: ['Salem'] })).toBe(false);
  const customer = { name: ' Sample Customer ', phone: '9876543210', address: '12 Example Road, Chennai', district: 'Chennai', pincode: '600001', preferredDate: '2026-11-17', preferredSlot: 'Any' };
  expect(customerDetailsSchema.parse(customer).name).toBe('Sample Customer');
  for (const invalid of [{ phone: '1234567890' }, { altPhone: '123' }, { email: 'bad' }, { name: 'x'.repeat(101) }, { pincode: '000000' }, { district: 'Mumbai' }]) expect(customerDetailsSchema.safeParse({ ...customer, ...invalid }).success).toBe(false);
  expect(bookingInputSchema.safeParse({ ...customer, status: 'paid' }).success).toBe(false);
});
