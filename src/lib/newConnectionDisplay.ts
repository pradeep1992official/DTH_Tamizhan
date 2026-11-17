import type { Language } from '../types';

export function packageCardLabel(type: 'full_set' | 'only_box', lang: Language) {
  if (type === 'only_box') return lang === 'ta' ? 'பெட்டி மட்டும் (உள்ள டிஷ்)' : 'Box only (existing dish)';
  return lang === 'ta' ? 'டிஷ் உடன் முழு செட்' : 'Full set with dish';
}

export function validityLabel(days: number, lang: Language, months?: number) {
  if (months) return lang === 'ta' ? `${months} \u0bae\u0bbe\u0ba4\u0b99\u0bcd\u0b95\u0bb3\u0bcd` : `${months} ${months === 1 ? 'month' : 'months'}`;
  return lang === 'ta' ? `${days} \u0ba8\u0bbe\u0b9f\u0bcd\u0b95\u0bb3\u0bcd` : `${days} ${days === 1 ? 'day' : 'days'}`;
}

export function monthlyComparison(price: number, days: number, lang: Language, months?: number) {
  const amount = new Intl.NumberFormat(lang === 'ta' ? 'ta-IN' : 'en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(months ? price / months : price * 30 / days);
  return lang === 'ta' ? `\u2248 ${amount} / \u0bae\u0bbe\u0ba4\u0bae\u0bcd` : `\u2248 ${amount}/month`;
}

export function packDisplayName(name: string) {
  return name.replace(/\s*[-\u2014]\s*(ONLY\s*BOX|FULL\s*SET)$/i, '');
}
