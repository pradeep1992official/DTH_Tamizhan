import { z } from 'zod';

export const conversationGoal = z.enum(['general', 'compare', 'recharge', 'payment_status', 'support']);
export const assistantConversationSchema = z.object({
  goal: conversationGoal,
  operator: z.enum(['sun_direct', 'airtel_dth', 'tata_play', 'dish_tv', 'd2h']).nullable(),
  subscriberId: z.string().regex(/^\d{8,11}$/).nullable(),
  months: z.number().int().min(1).max(120).nullable(), quality: z.enum(['HD', 'SD']).nullable(),
  budget: z.number().finite().min(0).max(100000).nullable(), budgetPeriod: z.enum(['total', 'monthly']),
  cheapest: z.boolean(), orderId: z.string().regex(/^order_[a-zA-Z0-9_-]{1,120}$/).nullable(),
}).strict();
export type AssistantConversation = z.infer<typeof assistantConversationSchema>;

// Shared normalization for catalog questions and recharge field extraction.
// Values are still validated against the operator and catalog on the server.
export function normalizeAssistantMessage(input: string) {
  let text = input.toLowerCase().normalize('NFKC');
  const replacements: [RegExp, string][] = [
    [/ஏர்டெல்/gu, ' airtel '], [/சன்\s*டைரக்ட்/gu, ' sun direct '], [/டாடா\s*பிளே/gu, ' tata play '], [/டிஷ்\s*டிவி/gu, ' dish tv '],
    [/ரீசார்ஜ்/gu, ' recharge '], [/மாதங்களுக்கு|மாதங்கள்|மாதத்திற்கு|மாதம்/gu, ' month '],
    [/ஒரு/gu, '1'], [/இரண்டு/gu, '2'], [/மூன்று/gu, '3'], [/ஆறு/gu, '6'],
    [/குறைந்த\s*விலை|மலிவான/gu, ' cheapest '], [/பேக்குகள்|பேக்|திட்டங்கள்|திட்டம்/gu, ' pack '],
    [/பட்ஜெட்/gu, ' budget '], [/ரூபாய்|ரூபா/gu, ' rupees '], [/க்குள்|கீழ்/gu, ' below '],
    [/கட்டண\s*நிலை|பணம்\s*செலுத்திய\s*நிலை/gu, ' payment status '], [/உதவி/gu, ' support '],
    [/\b(?:oru|one)\b/g, '1'], [/\b(?:rendu|irandu|two)\b/g, '2'], [/\b(?:moonu|three)\b/g, '3'],
    [/\b(?:aaru|six)\b/g, '6'], [/\b(?:maasam|masam|maatham|matham|maadham)\b/g, 'month'],
    [/\b(?:cheap|cheapest|low[ -]cost|lowest[ -](?:price|priced|cost)|least expensive)\b/g, 'cheapest'],
    [/\b(?:kulla|keezha|below)\b/g, 'below'],
  ];
  for (const [pattern, value] of replacements) text = text.replace(pattern, value);
  return text.replace(/\s+/g, ' ').trim();
}

export function detectConversationGoal(input: string): AssistantConversation['goal'] | null {
  const text = normalizeAssistantMessage(input);
  if (/\b(?:refund|ticket|complaint)\b/.test(text)) return 'support';
  if (/\b(?:history|status|check.*payment|check.*order)\b/.test(text)) return 'payment_status';
  if (/\b(?:support|help|refund|complaint|payment failed|payment deducted|recharge failed|contact)\b/.test(text)) return 'support';
  if (/^(?:please\s+)?(?:recharge|top[ -]?up)\b/.test(text) || /\b(?:recharge|top[ -]?up)\b.*\b(?:box|subscriber|id)\b/.test(text)) return 'recharge';
  if (/\b(?:packs?|plans?|cheapest|compare|economical|affordable)\b/.test(text) && !/\b(?:box|subscriber|recharge)\b/.test(text)) return 'compare';
  if (/\b(?:price|cost|rate|how much)\b/.test(text) && /\b(?:airtel|sun direct|tata play|dish tv|d2h)\b/.test(text)) return 'compare';
  if (/\b(?:recharge|top[ -]?up)\b/.test(text)) return 'recharge';
  return null;
}

// Replay bounded user messages rather than trusting client-provided state or a
// process-local session. This works across Cloud Run instances and restarts.
export function resolveAssistantConversation(messages: string[]): AssistantConversation {
  const state: AssistantConversation = { goal: 'general', operator: null, subscriberId: null, months: null,
    quality: null, budget: null, budgetPeriod: 'total', cheapest: false, orderId: null };
  for (const message of messages) {
    const text = normalizeAssistantMessage(message);
    const goal = detectConversationGoal(message);
    if (goal && !(goal === 'compare' && state.goal === 'recharge' && !/\b(?:find|show|compare|cheapest|which|what)\b/.test(text))) state.goal = goal;
    if (/\b(?:new|another|different)\s+(?:customer|subscriber|box|id)\b/.test(text)) {
      state.subscriberId = null; state.operator = null;
    }
    const operators = [
      ['airtel_dth', /\bairtel\b/], ['sun_direct', /\bsun\s*direct\b/], ['tata_play', /\btata\s*play\b/],
      ['dish_tv', /\bdish\s*tv\b/], ['d2h', /\bd2h\b/],
    ] as const;
    const matches = operators.filter(([, pattern]) => pattern.test(text));
    if (matches.length) state.operator = matches.length === 1 ? matches[0][0] : null;
    const subscriber = [...text.matchAll(/\b\d{8,11}\b/g)].at(-1)?.[0];
    if (subscriber) state.subscriberId = subscriber;
    const duration = [...text.matchAll(/\b(\d+)[ -]*(?:months?|m)\b/g)].at(-1)?.[1];
    if (duration && Number(duration) > 0 && Number(duration) <= 120) state.months = Number(duration);
    const quality = [...text.matchAll(/\b(hd|sd)\b/g)].at(-1)?.[1];
    if (quality) state.quality = quality.toUpperCase() as 'HD' | 'SD';
    if (/\b(?:any|all|either)\s*(?:quality|hd|sd)\b/.test(text)) state.quality = null;
    const budget = text.match(/\b(?:under|below|budget|upto|up to|maximum|max)\s*(?:is\s*)?(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d{1,2})?)/)?.[1]
      || text.match(/\b(\d+(?:\.\d{1,2})?)\s*(?:rupees\s*)?(?:below|budget)\b/)?.[1];
    if (budget !== undefined && Number(budget) <= 100000) {
      state.budget = Number(budget);
      state.budgetPeriod = /\b(?:per month|monthly|each month)\b/.test(text) ? 'monthly' : 'total';
    }
    if (state.budget !== null && /^(?:monthly|per month|each month)$/.test(text)) state.budgetPeriod = 'monthly';
    if (state.budget !== null && /^(?:total|total budget)$/.test(text)) state.budgetPeriod = 'total';
    if (/\b(?:no budget|any budget|remove.*budget)\b/.test(text)) state.budget = null;
    if (/\b(?:cheapest|economical|affordable)\b/.test(text)) state.cheapest = true;
    else if (/\b(?:compare|all packs|all plans)\b/.test(text)) state.cheapest = false;
    const order = message.match(/\border_[a-zA-Z0-9_-]{1,120}\b/)?.[0];
    if (order) state.orderId = order;
  }
  return assistantConversationSchema.parse(state);
}
