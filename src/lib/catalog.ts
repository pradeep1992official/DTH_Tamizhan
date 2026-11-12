import type { Language, PlanCatalogItem } from '../types';
import { translations } from './translations';

type PackFields = { plan_name?: string; name?: string; amount?: number; price?: number; duration_months: number;
  channel_count?: number; hd_channel_count?: number; channel_counts_unavailable?: boolean; channel_list?: string[]; pack_type?: string; type?: string };
export type CatalogIssue = { field: string; message: string };
export const VALID_DURATIONS = [1, 3, 6, 12] as const;

export function validateCatalogPack(pack: PackFields): CatalogIssue[] {
  if (!pack || typeof pack !== 'object') return [{ field: 'record', message: 'Pack must be an object.' }];
  const issues: CatalogIssue[] = [];
  const add = (field: string, message: string) => issues.push({ field, message });
  const total = pack.channel_count;
  const hd = pack.hd_channel_count;
  const amount = pack.amount ?? pack.price;
  const unavailable = pack.channel_counts_unavailable === true;
  if (unavailable && (total !== undefined || hd !== undefined)) add('channel_count', 'Unavailable channel counts must be omitted, not estimated.');
  if (!unavailable && (!Number.isInteger(total) || total! <= 0)) add('channel_count', 'Total channels must be a positive integer; highlights are not the total.');
  if (!unavailable && (!Number.isInteger(hd) || hd! < 0)) add('hd_channel_count', 'HD channels must be an explicit non-negative integer.');
  if (typeof hd === 'number' && typeof total === 'number' && hd > total) add('hd_channel_count', `HD channels (${hd}) exceed total channels (${total}).`);
  if (Array.isArray(pack.channel_list) && typeof total === 'number' && pack.channel_list.length > total) add('channel_count', 'Total channels cannot be smaller than the channel list.');
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) add('amount', 'Price must be a finite number greater than zero.');
  if (pack.price !== undefined && pack.amount !== undefined && pack.price !== pack.amount) add('price', 'Price must match amount.');
  if (!(VALID_DURATIONS as readonly number[]).includes(pack.duration_months)) add('duration_months', 'Duration must be 1, 3, 6 or 12 months.');
  const rawName = pack.plan_name ?? pack.name;
  const name = typeof rawName === 'string' ? rawName : '';
  if (!name.trim()) add('plan_name', 'Pack name is required.');
  // Validate numbers with explicit units, not brand/channel names such as D2H or Star 1.
  for (const match of name.matchAll(/\b(\d+)\s*HD\b/gi)) if (Number(match[1]) !== hd) add('plan_name', `Name claims ${match[1]} HD channels but hd_channel_count is ${hd ?? 'missing'}.`);
  for (const match of name.matchAll(/\b(\d+)\s*(?:total\s+)?channels?\b/gi)) if (Number(match[1]) !== total) add('plan_name', `Name claims ${match[1]} channels but channel_count is ${total ?? 'missing'}.`);
  for (const match of name.matchAll(/\b(\d+)\s*(months?|mos?|m|years?)\b/gi)) {
    const duration = Number(match[1]) * (/year/i.test(match[2]) ? 12 : 1);
    if (duration !== pack.duration_months) add('plan_name', `Name duration (${match[0]}) disagrees with duration_months (${pack.duration_months}).`);
  }
  for (const match of name.matchAll(/(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d+)*)/gi)) if (Number(match[1].replace(/,/g, '')) !== amount) add('plan_name', `Name price (${match[0]}) disagrees with amount (${amount}).`);
  const unlabeled = name.replace(/\b\d+\s*(?:HD|(?:total\s+)?channels?|months?|mos?|m|years?)\b/gi, '')
    .replace(/(?:₹|Rs\.?|INR)\s*[\d,]+(?:\.\d+)*/gi, '');
  if (/\b\d+\b/.test(unlabeled)) add('plan_name', 'Unlabelled number in pack name needs review; specify HD/channels, months/years or Rs. so it can be checked.');
  return issues;
}
export function assertValidCatalogPack(pack: PackFields): void {
  const issues = validateCatalogPack(pack);
  if (issues.length) throw new Error(issues.map(issue => `${issue.field}: ${issue.message}`).join(' '));
}
export function monthlyEquivalent(amount: number, duration: number): number {
  if (!Number.isFinite(amount) || amount <= 0 || !(VALID_DURATIONS as readonly number[]).includes(duration)) return NaN;
  return Math.round((amount / duration + Number.EPSILON) * 100) / 100;
}
export function formatPrice(amount: number, lang: Language = 'en'): string {
  return Number.isFinite(amount) && amount > 0 ? `Rs. ${new Intl.NumberFormat(lang === 'ta' ? 'ta-IN' : 'en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}` : translations[lang].uiPriceNeedsReview;
}
export function formatMonthlyEquivalent(amount: number, duration: number, lang: Language = 'en'): string {
  const value = monthlyEquivalent(amount, duration);
  return Number.isFinite(value) ? `${formatPrice(value, lang)} ${translations[lang].perMonth}` : translations[lang].uiMonthlyPriceNeedsReview;
}
export function formatDuration(duration: number, lang: Language = 'en'): string {
  return (VALID_DURATIONS as readonly number[]).includes(duration) ? `${duration} ${duration === 1 ? translations[lang].month : translations[lang].months}` : translations[lang].uiDurationNeedsReview;
}
export function formatStoredDuration(value: string, lang: Language = 'en'): string {
  const match = /^(\d+)\s*(?:m|months?)$/i.exec(value.trim());
  return match && (VALID_DURATIONS as readonly number[]).includes(Number(match[1])) ? formatDuration(Number(match[1]), lang) : value;
}
export function formatCatalogIssues(pack: PackFields, lang: Language = 'en'): string {
  const issues = validateCatalogPack(pack);
  if (lang === 'en') return issues.map(issue => issue.message).join(' ');
  const t = translations[lang];
  const messages: Record<string, string> = { channel_count: t.uiCatalogTotalError, hd_channel_count: t.uiCatalogHdError, plan_name: t.uiCatalogNameError, amount: t.uiCatalogPriceError, price: t.uiCatalogPriceError, duration_months: t.uiCatalogDurationError };
  return [...new Set(issues.map(issue => messages[issue.field] || t.uiCatalogReview))].join(' ');
}
export function formatChannelCounts(pack: PackFields, lang: Language = 'en'): string {
  const issues = validateCatalogPack(pack).filter(issue => ['channel_count', 'hd_channel_count', 'plan_name'].includes(issue.field));
  if (issues.length) return translations[lang].uiChannelDetailsNeedReview;
  if (pack.channel_counts_unavailable) return translations[lang].uiChannelDetailsNotProvided;
  return `${pack.channel_count} ${translations[lang].channels}${pack.hd_channel_count ? ` (${pack.hd_channel_count} HD)` : ''}`;
}
// Preserve the source fields; never manufacture totals, prices or durations on read.
export function normalizeCatalogRecord(data: PlanCatalogItem): PlanCatalogItem {
  return { ...data, channel_list: Array.isArray(data.channel_list) ? data.channel_list : [],
    amount: data.amount ?? data.price!, price: data.price ?? data.amount };
}
