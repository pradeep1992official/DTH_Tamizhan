import { canonicalizeDthOperatorId, isSameDthOperatorGroup, type DthOperatorId, type Language } from '../types';
import { TOP_UP_LIMITS } from './topUpAmount';
const names: Record<DthOperatorId, string> = { sun_direct: 'Sun Direct', tata_play: 'Tata Play', airtel_dth: 'Airtel DTH', dish_tv: 'Dish TV and D2H', d2h: 'Dish TV and D2H' };
export function missingCatalogOperators(plans: { operator: DthOperatorId }[], selected: DthOperatorId[]): DthOperatorId[] {
  return [...new Set(selected.map(canonicalizeDthOperatorId))].filter(operator => !plans.some(plan => isSameDthOperatorGroup(plan.operator, operator)));
}
export function operatorCatalogMessage(operator: DthOperatorId, lang: Language): string {
  const range = `Rs. ${TOP_UP_LIMITS.min}–Rs. ${TOP_UP_LIMITS.max.toLocaleString('en-IN')}`;
  return lang === 'ta' ? `${names[operator]} பேக்குகள் இங்கு இல்லை. ${range} வரம்பில் விருப்பத் தொகையைத் தேர்ந்தெடுக்கலாம்.` : `${names[operator]} ${operator === 'dish_tv' || operator === 'd2h' ? "don't" : "doesn't"} have catalog packs here. You can choose a custom top-up from ${range} instead.`;
}
export function customTopUpUrl(operator: DthOperatorId): string { return `/recharge?operator=${canonicalizeDthOperatorId(operator)}&topup=1#custom-recharge-card`; }
