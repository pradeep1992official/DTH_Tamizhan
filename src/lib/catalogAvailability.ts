import { customerMessages, formatMessage } from './customerMessages';
import { canonicalizeDthOperatorId, isSameDthOperatorGroup, type DthOperatorId, type Language } from '../types';
const names: Record<DthOperatorId, string> = { sun_direct: 'Sun Direct', tata_play: 'Tata Play', airtel_dth: 'Airtel DTH', dish_tv: 'Dish TV', d2h: 'D2H' };
export function missingCatalogOperators(plans: { operator: DthOperatorId }[], selected: DthOperatorId[]): DthOperatorId[] {
  return [...new Set(selected.map(canonicalizeDthOperatorId))].filter(operator => !plans.some(plan => isSameDthOperatorGroup(plan.operator, operator)));
}
export function operatorCatalogMessage(operator: DthOperatorId, lang: Language): string {
  return formatMessage(customerMessages[lang].uiNoCatalogPacks, { operator: names[operator] });
}
export function customTopUpUrl(operator: DthOperatorId): string { return `/recharge?operator=${canonicalizeDthOperatorId(operator)}&topup=1#custom-recharge-card`; }
