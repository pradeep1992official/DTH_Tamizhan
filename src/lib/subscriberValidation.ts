import { DthOperatorId, Language, resolveDishFamilyOperatorId } from '../types';
import { translations } from './translations';
import { formatMessage } from './customerMessages';

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
export function subscriberLabel(operator: DthOperatorId, combined = false, lang: Language = 'en'): string {
  const t = translations[lang];
  if (combined && (operator === 'dish_tv' || operator === 'd2h')) return t.combinedIdLabel;
  return { sun_direct: t.sunIdLabel, tata_play: t.tataIdLabel, airtel_dth: t.customerIdLabel, dish_tv: t.dishIdLabel, d2h: t.customerIdLabel }[operator];
}
export function subscriberPlaceholder(operator: DthOperatorId, combined = false, lang: Language = 'en'): string {
  return formatMessage(translations[lang].uiEnterOperatorId, { label: subscriberLabel(operator, combined, lang) });
}
export function subscriberHelp(operator: DthOperatorId, combined = false, lang: Language = 'en'): string {
  if (combined && (operator === 'dish_tv' || operator === 'd2h')) return `Dish TV: ${subscriberHelp('dish_tv', false, lang)}; D2H: ${subscriberHelp('d2h', false, lang)}`;
  const rule = subscriberRule(operator, combined);
  return formatMessage(translations[lang].uiIdHelp, { label: subscriberLabel(operator, combined, lang), lengths: rule.lengths.join(' / '), prefix: rule.prefixes.length ? formatMessage(translations[lang].uiIdPrefix, { prefixes: rule.prefixes.join(' / ') }) : '' });
}
export function subscriberError(operator: string, value: string, combined = false, lang: Language = 'en'): string | null {
  const id = normalizeSubscriberId(value);
  const resolved = combined && (operator === 'dish_tv' || operator === 'd2h') ? resolveDishFamilyOperatorId(id) : operator;
  const rule = SUBSCRIBER_RULES[resolved as DthOperatorId];
  if (rule && /^[0-9]+$/.test(id) && rule.lengths.includes(id.length) &&
      (!rule.prefixes.length || rule.prefixes.some(prefix => id.startsWith(prefix)))) return null;
  const help = rule ? subscriberHelp(resolved as DthOperatorId, false, lang) : translations[lang].uiSupportedOperator;
  return formatMessage(translations[lang].uiUpdateId, { help });
}
