import { planModel } from '../models/planModel';
import { validateCatalogPack } from '../../src/lib/catalog';
import { actionNotice, type AssistantAction } from '../../src/lib/assistantActions';
import { resolveAssistantLanguage, type AssistantLanguageChoice } from '../../src/lib/assistantLanguage';

// A narrow, read-only fallback for explicit catalog requests. Never prepares a
// recharge or guesses a saved box when the customer only asks about a pack.
export async function assistantCatalogFallback(message: string, languageChoice: AssistantLanguageChoice) {
  if (!/\b(?:pack|plans?)\b/i.test(message) || /\b(?:recharge|box|subscriber|top[ -]?up)\b|\d{8,11}/i.test(message)) return null;
  const operators = [
    ['airtel_dth', /\bairtel\b/i], ['sun_direct', /\bsun\s*direct\b/i], ['tata_play', /\btata\s*play\b/i],
    ['dish_tv', /\bdish\s*tv\b/i], ['d2h', /\bd2h\b/i],
  ] as const;
  const matches = operators.filter(([, pattern]) => pattern.test(message));
  if (matches.length !== 1) return null;
  const operator = matches[0][0];
  const duration = message.match(/\b(1|3|6|12)[ -]*months?\b/i)?.[1];
  const quality = message.match(/\b(HD|SD)\b/i)?.[1].toUpperCase();
  // Leave budget requests to Gemini/catalog filters rather than silently ignoring a price.
  const name = message.toLowerCase().replace(/\b(?:1|3|6|12)[ -]*months?\b/g, ' ')
    .replace(/\b(?:airtel(?:\s*digital\s*tv)?|sun\s*direct|tata\s*play|dish\s*tv|d2h|hd|sd|packs?|plans?|find|show|me|a|an|the|please|available)\b/g, ' ')
    .replace(/[^\p{L}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  if (/\b(?:under|below|budget|rs|inr|less|upto|up to)\b|[₹]|\d/.test(message.replace(/\b(?:1|3|6|12)[ -]*months?\b/gi, '').replace(/\bd2h\b/gi, ''))) return null;
  const plans = (await planModel.getForOperator(operator)).filter(plan => !validateCatalogPack(plan).length && plan.operator === operator &&
    (!duration || plan.duration_months === Number(duration)) && (!quality || plan.pack_type === quality) &&
    name.every(word => plan.plan_name.toLowerCase().includes(word)))
    .sort((a, b) => a.amount - b.amount || a.id.localeCompare(b.id)).slice(0, 20)
    .map(plan => ({ id: plan.id, name: plan.plan_name, operator: plan.operator, amount: plan.amount, duration: plan.duration_months }));
  const action: AssistantAction = { type: 'show_plans', plans };
  const language = resolveAssistantLanguage([message], languageChoice);
  return { success: true, source: 'catalog', state: 'tool_action', language, text: actionNotice(action, language), action };
}
