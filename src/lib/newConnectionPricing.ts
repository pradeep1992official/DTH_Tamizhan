import { z } from 'zod';
import type { EquipmentOffer, NewConnectionSettings } from './newConnectionCatalog';
const money = z.number().finite().min(0).max(10000000).refine(n => /^\d+(?:\.\d{1,2})?$/.test(String(n)), 'Use at most two decimal places');
export const priceBreakdownSchema = z.object({ hardware: money, installation: money, pack: money, perConnectionTotal: money, total: money, currency: z.literal('INR') });
export const bookingQuoteSchema = z.object({ priceBreakdown: priceBreakdownSchema, advanceMode: z.enum(['full', 'partial', 'none']), amountDueNow: money, balanceAtInstallation: money });
export type BookingQuote = z.infer<typeof bookingQuoteSchema>;
export function moneyUnits(value: number): number {
  money.parse(value); const [whole, fraction = ''] = String(value).split('.'); const units = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(units)) throw new Error('Invalid money amount'); return units;
}
// V1 price rule: each connection is a full pack + box + installation. An included
// starter pack is informational only; NO discount is applied. Change this one rule later.
export function calculateNewConnectionPrice(packPrice: number, offer: Pick<EquipmentOffer, 'hardwarePrice' | 'installationCharge'>, count: number) {
  if (!Number.isInteger(count) || count < 1 || count > 3) throw new Error('Invalid connection count');
  const hardware = moneyUnits(offer.hardwarePrice), installation = moneyUnits(offer.installationCharge), pack = moneyUnits(packPrice); const sum = hardware + installation + pack;
  return priceBreakdownSchema.parse({ hardware: hardware / 100, installation: installation / 100, pack: pack / 100, perConnectionTotal: sum / 100, total: sum * count / 100, currency: 'INR' });
}
export function advanceQuote(priceBreakdown: z.infer<typeof priceBreakdownSchema>, settings: Pick<NewConnectionSettings, 'advanceMode' | 'partialAmount'>): BookingQuote {
  const due = settings.advanceMode === 'none' ? 0 : settings.advanceMode === 'full' ? priceBreakdown.total : Math.min(settings.partialAmount, priceBreakdown.total);
  return { priceBreakdown, advanceMode: settings.advanceMode, amountDueNow: due, balanceAtInstallation: (moneyUnits(priceBreakdown.total) - moneyUnits(due)) / 100 };
}
export function sameBookingQuote(a: BookingQuote, b: BookingQuote) { return a.advanceMode === b.advanceMode && a.amountDueNow === b.amountDueNow && a.balanceAtInstallation === b.balanceAtInstallation && (Object.keys(a.priceBreakdown) as (keyof BookingQuote['priceBreakdown'])[]).every(k => a.priceBreakdown[k] === b.priceBreakdown[k]); }
