import type { BookingInput } from './newConnectionOrders';
import type { Language } from '../types';

export function reviewAddress(customer: Pick<BookingInput['customer'], 'address' | 'addressLine2' | 'landmark' | 'city' | 'state' | 'pincode'> & { district: string }): string[] {
  const seen = new Set<string>();
  return [customer.address, customer.addressLine2, customer.landmark, customer.city, customer.district, customer.state, customer.pincode].filter((value): value is string => {
    const key = value?.trim().replace(/\s+/g, ' ').toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key); return true;
  }).map(value => value.trim());
}
export function reviewDate(value: string, lang: Language): string {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ta-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(date);
}

// Keep saved values intact; suppress complete repeated phrases in the receipt display.
export function confirmationAddress(customer: Parameters<typeof reviewAddress>[0]): string[] {
  const lines = reviewAddress(customer);
  const normalise = (value: string) => value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  return lines.filter((line, index) => {
    const key = ` ${normalise(line)} `;
    return !lines.slice(0, index).some(previous => ` ${normalise(previous)} `.includes(key));
  });
}
