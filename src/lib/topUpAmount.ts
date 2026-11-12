import type { Language } from '../types';

// Preserve the existing input's INR 10–20,000 limits and server's paise precision.
// This is the single configuration used by the form and payment API.
export const TOP_UP_LIMITS = { min: 10, max: 20_000, decimalPlaces: 2 } as const;

export function validateTopUpAmount(value: unknown, lang: Language = 'en'): string | null {
  const raw = typeof value === 'number' || typeof value === 'string' ? String(value).trim() : '';
  const amount = Number(raw);
  const syntax = new RegExp(`^[0-9]+(?:\\.[0-9]{1,${TOP_UP_LIMITS.decimalPlaces}})?$`);
  if (syntax.test(raw) && Number.isFinite(amount) && amount >= TOP_UP_LIMITS.min && amount <= TOP_UP_LIMITS.max && Number.isSafeInteger(Math.round(amount * 100))) return null;
  return lang === 'ta'
    ? `₹${TOP_UP_LIMITS.min} முதல் ₹${TOP_UP_LIMITS.max.toLocaleString('en-IN')} வரை, அதிகபட்சம் ${TOP_UP_LIMITS.decimalPlaces} தசம இடங்களுடன் தொகையை உள்ளிடவும்.`
    : `Enter an amount from ₹${TOP_UP_LIMITS.min} to ₹${TOP_UP_LIMITS.max.toLocaleString('en-IN')} with no more than ${TOP_UP_LIMITS.decimalPlaces} decimal places.`;
}

export function parseTopUpAmount(value: unknown): number | null {
  return validateTopUpAmount(value) ? null : Number(String(value).trim());
}
