import { runAiTool } from './aiToolSecurity';
import { planModel } from '../models/planModel';
import { readOperators } from '../models/sharedStore';
import { validateCatalogPack } from '../../src/lib/catalog';
import { type AssistantAction } from '../../src/lib/assistantActions';
import { languageText, resolveAssistantLanguage, type AssistantLanguageChoice } from '../../src/lib/assistantLanguage';
import { normalizeAssistantMessage, resolveAssistantConversation, type AssistantConversation } from '../../src/lib/assistantConversation';
import type { DthOperatorId } from '../../src/types';
import { isStandardRechargeMessage } from './rechargeIntent';

export function isCatalogFollowup(message: string) {
  const text = normalizeAssistantMessage(message);
  return /^(?:airtel(?: digital tv)?|sun\s*direct|tata\s*play|dish\s*tv|d2h|hd|sd|\d+[ -]*(?:months?|m))$/.test(text)
    || isStandardRechargeMessage(message) && /\b(?:months?|m|hd|sd)\b/.test(text)
    || /\b(?:budget|under|below|maximum|monthly|per month|total|cheapest|instead|any quality)\b/.test(text);
}

// Read-only catalog answers. State contains customer constraints, never prices
// or generated plan IDs. Every displayed value is projected from current rows.
export async function assistantCatalogFallback(input: string | string[], choice: AssistantLanguageChoice, operatorId?: DthOperatorId,
  understood?: AssistantConversation) {
  const messages = typeof input === 'string' ? [input] : input;
  const latest = normalizeAssistantMessage(messages.at(-1) || '');
  if (/^(?:open|go to|navigate)\b/i.test(latest)) return null;
  const state = understood || resolveAssistantConversation(messages);
  if (state.goal !== 'compare') return null;
  const catalogQuestion = (value: string) => /\b(?:packs?|plans?|cheapest|compare|price|cost|rate|how much)\b/.test(value) && !/\b(?:recharge|box|subscriber|top[ -]?up)\b|\d{8,11}/.test(value);
  const normalized = messages.map(normalizeAssistantMessage);
  if (!understood && !catalogQuestion(latest) && !isCatalogFollowup(latest)) return null;
  const operator = state.operator || operatorId;
  const language = resolveAssistantLanguage(messages, choice);
  const say = (en: string, ta: string, tanglish: string) => languageText(language, en, ta, tanglish);
  if (!operator) return { success: true, source: 'catalog', state: 'choose_catalog_operator', language,
    text: say('Which DTH operator should I compare packs for?', 'எந்த DTH நிறுவனத்தின் பேக்குகளை ஒப்பிட வேண்டும்?', 'Endha DTH operator-oda packs compare pannanum?'),
    operators: (await readOperators()).filter(op => op.isEnabled !== false && op.isActive !== false).map(op => ({ id: op.id, name: op.name })) };
  const availableOperator = (await readOperators()).find(op => op.id === operator && op.isEnabled !== false && op.isActive !== false);
  if (!availableOperator) return { success: true, source: 'catalog', state: 'operator_unavailable', language,
    text: say('This operator is currently unavailable. Choose another operator.', 'இந்த நிறுவனம் தற்போது கிடைக்கவில்லை. வேறு நிறுவனத்தைத் தேர்ந்தெடுக்கவும்.', 'Indha operator ippo available illa. Vera operator choose pannunga.') };
  let query = '';
  for (const message of normalized) if (catalogQuestion(message)) query = message;
  const name = query.replace(/\b(?:under|below|budget|upto|up to|maximum|max)\s*(?:is\s*)?(?:₹|rs\.?|inr)?\s*\d+(?:\.\d+)?/g, ' ')
    .replace(/\b\d+(?:\.\d+)?\s*(?:rupees\s*)?(?:below|budget)\b/g, ' ')
    .replace(/\b\d+[ -]*(?:months?|m)\b/g, ' ')
    .replace(/\b(?:airtel(?:\s*digital\s*tv)?|sun\s*direct|tata\s*play|dish\s*tv|d2h|hd|sd|packs?|plans?|find|show|me|a|an|the|please|available|which|what|is|are|cheapest|compare|for|of|price|cost|rate|how|much|ku|venum|vendum|kudunga|kaatunga|budget|rupees|monthly|per|each|month|rs|inr)\b/g, ' ')
    .replace(/எந்த|என்ன|வேண்டும்|காட்டவும்|காட்டு|எனக்கு|உள்ள|க்கு/gu, ' ')
    .replace(/[^\p{L}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  return runAiTool('customer', 'catalog_lookup', { operator, months: state.months, quality: state.quality, budget: state.budget, budgetPeriod: state.budgetPeriod }, async () => {
    const all = (await planModel.getForOperator(operator)).filter(plan => plan.operator === operator && !validateCatalogPack(plan).length);
    if (!all.length) return { success: true, source: 'catalog', state: 'tool_action', language,
      action: { type: 'show_plans' as const, plans: [] }, text: say('No valid catalog packs are currently available for this operator. Try again later or choose another operator.', 'இந்த நிறுவனத்திற்கான பேக்குகள் தற்போது இல்லை. பிறகு முயற்சிக்கவும் அல்லது வேறு நிறுவனத்தைத் தேர்ந்தெடுக்கவும்.', 'Indha operator-ku catalog packs ippo illa. Later try pannunga illa vera operator choose pannunga.') };
    if (state.cheapest && !state.months) return { success: true, source: 'catalog', state: 'choose_catalog_duration', language,
      text: say('How many months should the cheapest pack cover?', 'குறைந்த விலை பேக் எத்தனை மாதங்களுக்கு வேண்டும்?', 'Cheapest pack ethana months-ku venum?'),
      suggestions: [...new Set(all.map(plan => plan.duration_months))].sort((a, b) => a - b).slice(0, 6).map(months => `${months} months`) };
    const eligible = all.filter(plan => (!state.months || plan.duration_months === state.months) && (!state.quality || plan.pack_type === state.quality)
      && name.every(word => `${plan.plan_name} ${plan.tamilName || ''}`.toLowerCase().includes(word)));
    const cost = (plan: typeof all[number]) => state.budgetPeriod === 'monthly' ? plan.amount / plan.duration_months : plan.amount;
    const matching = eligible.filter(plan => state.budget === null || cost(plan) <= state.budget).sort((a, b) => cost(a) - cost(b) || a.id.localeCompare(b.id));
    const overBudget = !matching.length && eligible.length > 0 && state.budget !== null;
    const selected = overBudget ? [...eligible].sort((a, b) => cost(a) - cost(b) || a.id.localeCompare(b.id)).slice(0, 1) : matching.slice(0, state.cheapest ? 1 : 20);
    const plans = selected.map(plan => ({ id: plan.id, name: language === 'ta' ? plan.tamilName || plan.plan_name : plan.plan_name,
      operator: plan.operator, amount: plan.amount, duration: plan.duration_months }));
    const action: AssistantAction = { type: 'show_plans', plans };
    let text = overBudget ? say('No matching pack fits your budget. This is the lowest-priced matching option, but it is above your budget.', 'உங்கள் பட்ஜெட்டில் பொருந்தும் பேக் இல்லை. காட்டப்பட்ட குறைந்த விலை பேக் உங்கள் பட்ஜெட்டைவிட அதிகம்.', 'Unga budget-kulla matching pack illa. Indha lowest-price option budget-ai vida adhigam.')
      : !plans.length ? say('No catalog packs match those filters. Try changing the duration, quality or pack name.', 'இந்த விருப்பங்களுக்கு பொருந்தும் பேக் இல்லை. காலம், HD/SD அல்லது பேக் பெயரை மாற்றலாம்.', 'Indha filters-ku matching pack illa. Duration, HD/SD illa pack name maathalaam.')
      : state.cheapest ? say('This is the cheapest matching catalog pack.', 'பொருந்தும் பேக்குகளில் இதுதான் குறைந்த விலை பேக்.', 'Matching packs-la idhudhaan cheapest pack.')
      : say(`Showing ${plans.length} matching catalog packs, lowest ${state.budgetPeriod === 'monthly' ? 'monthly rate' : 'total price'} first.`, `${plans.length} பொருந்தும் பேக்குகள் குறைந்த விலை வரிசையில் காட்டப்படுகின்றன.`, `${plans.length} matching packs, lowest ${state.budgetPeriod === 'monthly' ? 'monthly rate' : 'total price'} first.`);
    if (state.budget !== null && state.budgetPeriod === 'monthly') text += ' ' + say('Your budget is checked per month; displayed prices cover the full pack duration.', 'பட்ஜெட் மாத அடிப்படையில் சரிபார்க்கப்படுகிறது; காட்டப்பட்ட விலை முழு காலத்திற்கானது.', 'Budget monthly-aa check pannirukkom; kaattura price full pack duration-kku.');
    const suggestions = !plans.length ? [...new Set([
      ...all.filter(plan => !state.months || plan.duration_months === state.months).map(plan => plan.pack_type).filter(quality => quality !== state.quality),
      ...all.filter(plan => (!state.quality || plan.pack_type === state.quality) && plan.duration_months !== state.months).map(plan => `${plan.duration_months} months`),
    ])].slice(0, 6) : [];
    return { success: true, source: 'catalog', state: 'tool_action', language, text, action, suggestions,
      ...(overBudget ? { notice: 'over_budget' } : {}) };
  });
}
