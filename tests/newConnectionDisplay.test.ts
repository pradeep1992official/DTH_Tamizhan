import { expect, it } from 'vitest';
import { monthlyComparison, packageCardLabel, validityLabel } from '../src/lib/newConnectionDisplay';
import { currency } from '../src/components/NewConnection/Shared';
import { monthlyPrice } from '../src/lib/newConnectionCatalog';

it('shows clean prices without losing meaningful decimals', () => {
  expect(currency(3100, 'en')).toBe('₹3,100');
  expect(currency(3100.5, 'en')).toBe('₹3,100.5');
  expect(currency(3100.75, 'en')).toBe('₹3,100.75');
});

it('makes the dish inclusion clear for both package options', () => {
  expect(packageCardLabel('only_box', 'en')).toBe('Box only (existing dish)');
  expect(packageCardLabel('full_set', 'en')).toBe('Full set with dish');
});

it('uses 30-day month estimates and keeps non-month durations exact', () => {
  expect(monthlyComparison(3100, 360, 'en')).toBe('≈ ₹258/month');
  expect(monthlyComparison(3600, 360, 'en')).toBe('≈ ₹300/month');
  expect(validityLabel(360, 'en')).toBe('360 days');
  expect(validityLabel(360, 'en', 12)).toBe('12 months');
  expect(monthlyComparison(3100, 360, 'en', 12)).toBe('\u2248 \u20b9258/month');
  expect(validityLabel(365, 'en')).toBe('365 days');
  expect(validityLabel(365, 'en', 12)).toBe('12 months');
  expect(monthlyPrice([{ validityDays: 365, validityMonths: 12, price: 3600 }])).toBe(300);
  expect(validityLabel(45, 'en')).toBe('45 days');
});
