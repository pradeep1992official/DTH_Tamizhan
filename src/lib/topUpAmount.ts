import type { Language } from '../types';
import { customerMessages, formatMessage } from './customerMessages';

// Preserve the existing input's INR 10–20,000 limits and server's paise precision.
// This is the single configuration used by the form and payment API.
export const TOP_UP_LIMITS = { min: 10, max: 20_000, decimalPlaces: 2 } as const;

export function validateTopUpAmount(value: unknown, lang: Language = 'en'): string | null {
  const raw = typeof value === 'number' || typeof value === 'string' ? String(value).trim() : '';
  const amount = Number(raw);
  const syntax = new RegExp(`^[0-9]+(?:\\.[0-9]{1,${TOP_UP_LIMITS.decimalPlaces}})?$`);
  if (syntax.test(raw) && Number.isFinite(amount) && amount >= TOP_UP_LIMITS.min && amount <= TOP_UP_LIMITS.max && Number.isSafeInteger(Math.round(amount * 100))) return null;
  return formatMessage(customerMessages[lang].uiAmountBounds, { min: TOP_UP_LIMITS.min, max: TOP_UP_LIMITS.max.toLocaleString('en-IN'), decimals: TOP_UP_LIMITS.decimalPlaces });
}

export function parseTopUpAmount(value: unknown): number | null {
  return validateTopUpAmount(value) ? null : Number(String(value).trim());
}
