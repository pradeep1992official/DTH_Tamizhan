import { DthOperatorId, Language, resolveDishFamilyOperatorId } from '../types';

// Lengths preserve the operator contract in server/models/store.ts.
// Prefix hints for Sun Direct, Tata Play and Airtel are unconfirmed; do not enforce them.
export const SUBSCRIBER_RULES = {
  sun_direct: { lengths: [11], prefixes: [], label: 'Smart Card Number', placeholder: '41289456123' },
  tata_play: { lengths: [10], prefixes: [], label: 'Subscriber ID', placeholder: '1029384756' },
  airtel_dth: { lengths: [10], prefixes: [], label: 'Customer ID', placeholder: '3009482715' },
  dish_tv: { lengths: [11], prefixes: ['015', '025'], label: 'Viewing Card (VC)', placeholder: '02589412356' },
  d2h: { lengths: [8, 9, 10, 11], prefixes: [], label: 'Customer ID', placeholder: '89456123' },
} satisfies Record<DthOperatorId, { lengths: number[]; prefixes: string[]; label: string; placeholder: string }>;

export const filterSubscriberInput = (value: string) => value.replace(/[^0-9]/g, '');
// Server accepts formatting separators, but never silently drops letters/symbols.
export const normalizeSubscriberId = (value: string) => value.replace(/[\s-]/g, '');
export function subscriberRule(operator: DthOperatorId, combined = false) {
  if (combined && (operator === 'dish_tv' || operator === 'd2h')) {
    return { lengths: [...new Set([...SUBSCRIBER_RULES.dish_tv.lengths, ...SUBSCRIBER_RULES.d2h.lengths])].sort((a, b) => a - b), prefixes: [], label: 'Viewing Card / Customer ID', placeholder: SUBSCRIBER_RULES.dish_tv.placeholder };
  }
  return SUBSCRIBER_RULES[operator];
}
export function subscriberHelp(operator: DthOperatorId, combined = false, lang: Language = 'en'): string {
  if (combined && (operator === 'dish_tv' || operator === 'd2h')) return `Dish TV: ${subscriberHelp('dish_tv', false, lang)}; D2H: ${subscriberHelp('d2h', false, lang)}`;
  const rule = subscriberRule(operator, combined);
  if (lang === 'ta') {
    const labels = { sun_direct: 'ஸ்மார்ட் கார்டு எண்', tata_play: 'சந்தாதாரர் எண்', airtel_dth: 'வாடிக்கையாளர் எண்', dish_tv: 'வியூவிங் கார்டு எண்', d2h: 'வாடிக்கையாளர் எண்' };
    return `${labels[operator]}: ${rule.lengths.join(' / ')} இலக்கங்கள்${rule.prefixes.length ? `; ${rule.prefixes.join(' / ')} என்று தொடங்க வேண்டும்` : ''}`;
  }
  return `${rule.label}: ${rule.lengths.join(' / ')} digits${rule.prefixes.length ? `; starts with ${rule.prefixes.join(' / ')}` : ''}`;
}
export function subscriberError(operator: string, value: string, combined = false, lang: Language = 'en'): string | null {
  const id = normalizeSubscriberId(value);
  const resolved = combined && (operator === 'dish_tv' || operator === 'd2h') ? resolveDishFamilyOperatorId(id) : operator;
  const rule = SUBSCRIBER_RULES[resolved as DthOperatorId];
  if (rule && /^[0-9]+$/.test(id) && rule.lengths.includes(id.length) &&
      (!rule.prefixes.length || rule.prefixes.some(prefix => id.startsWith(prefix)))) return null;
  const help = rule ? subscriberHelp(resolved as DthOperatorId, false, lang) : lang === 'ta' ? 'ஆதரிக்கப்படும் ஆபரேட்டரைத் தேர்ந்தெடுக்கவும்' : 'Select a supported operator';
  return lang === 'ta' ? `\u0b87\u0ba8\u0bcd\u0ba4 \u0b8e\u0ba3\u0bcd\u0ba3\u0bc8\u0ba4\u0bcd \u0ba4\u0bbf\u0bb0\u0bc1\u0ba4\u0bcd\u0ba4\u0bb5\u0bc1\u0bae\u0bcd. ${help}.` : `Please update this ID. ${help}.`;
}
