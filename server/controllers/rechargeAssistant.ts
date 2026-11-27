import { AiToolAccessDenied } from '../utils/aiToolSecurity';
import { rechargeTarget } from '../../src/lib/rechargeTarget';
import { assistantCatalogFallback, isCatalogFollowup } from '../utils/assistantCatalog';
import { assistantToolTurn } from '../utils/assistantTurn';
import { executeAssistantTool, InvalidAssistantTool } from '../utils/assistantTools';
import { detectConversationGoal, normalizeAssistantMessage, resolveAssistantConversation } from '../../src/lib/assistantConversation';
import { languageText, resolveAssistantLanguage } from '../../src/lib/assistantLanguage';
import { actionNotice } from '../../src/lib/assistantActions';
import { understandAssistantRequest } from '../utils/assistantUnderstanding';
import { allowAiRequest } from '../middleware/aiRateLimiter';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { getAdminFirestore, verifyAuthToken } from '../middleware/auth';
import { planModel } from '../models/planModel';
import { readOperators } from '../models/sharedStore';
import { validateCatalogPack } from '../../src/lib/catalog';
import { subscriberError } from '../../src/lib/subscriberValidation';
import { validateTopUpAmount } from '../../src/lib/topUpAmount';
import type { DthConnection } from '../../src/types';
import { extractRechargeIntent, isStandardRechargeMessage, parseRechargeCommand } from '../utils/rechargeIntent';
import { ReadCache } from '../utils/readCache';
const boxCache = new ReadCache<DthConnection[]>(60_000, 200);
const conversations = new Map<string, { intent: ReturnType<typeof parseRechargeCommand>; expires: number }>();
export function clearAssistantReadCache() { boxCache.clear(); conversations.clear(); }

const schema = z.object({ language: z.enum(['auto', 'en', 'ta', 'tanglish']).default('auto'), messages: z.array(z.string().max(500).trim().min(1)).min(1).max(12),
  connectionId: z.string().max(200).optional(), operatorId: z.enum(['sun_direct', 'tata_play', 'airtel_dth', 'dish_tv', 'd2h']).optional() }).strict();
export async function prepareAssistantRecharge(req: Request, res: Response): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  let stage = 'authentication';
  try {
    const account = await verifyAuthToken(req);
    if (!account) { res.status(401).json({ success: false, error: 'Please sign in to use the recharge assistant.' }); return; }
    if (!await allowAiRequest(account.uid, res)) return;
    const input = schema.safeParse(req.body);
    if (!input.success) { res.status(400).json({ success: false, error: 'Send up to 12 messages, each under 500 characters. Start a new request for a longer conversation.' }); return; }
    const target = rechargeTarget(input.data.messages);
    const messages = target.messages;
    const latestMessage = messages.at(-1)!;
    let conversation = resolveAssistantConversation(messages);
    const normalizedLatest = normalizeAssistantMessage(latestMessage);
    const needsUnderstanding = !['support', 'payment_status', 'recharge'].includes(conversation.goal) && !/^(?:open|go to|navigate)\b/i.test(normalizedLatest) && messages.some((message, index) => {
      const normalized = normalizeAssistantMessage(message);
      if (isStandardRechargeMessage(message) || /^(?:open|go to|navigate)\b/i.test(normalized)) return false;
      return /\b(?:economical|affordable|quarter|recommend.*pack|suggest.*pack)\b|பரிந்துரை/u.test(normalized)
        || !detectConversationGoal(message) && (resolveAssistantConversation([message]).operator !== null ||
          resolveAssistantConversation(messages.slice(0, index)).goal === 'compare' && !isCatalogFollowup(message));
    });
    if (needsUnderstanding) {
      try {
        conversation = await understandAssistantRequest(account.uid, messages, conversation);
        const explicit = resolveAssistantConversation([latestMessage]);
        for (const field of ['operator', 'months', 'quality', 'budget'] as const) {
          if (explicit[field] !== null) Object.assign(conversation, { [field]: explicit[field] });
        }
        if (explicit.budget !== null) conversation.budgetPeriod = explicit.budgetPeriod;
      }
      catch { /* Keep deterministic constraints when optional language extraction fails. */ }
    }
    const language = resolveAssistantLanguage(messages, input.data.language);
    const say = (en: string, ta: string, tanglish: string) => languageText(language, en, ta, tanglish);
    const generalQuestion = conversation.goal === 'support' || conversation.goal === 'payment_status' || /\b(?:policy|privacy|terms|hours)\b|^(?:open|go to|navigate)\b/i.test(normalizedLatest);
    const command = parseRechargeCommand(messages);
    const standardMessage = isStandardRechargeMessage(latestMessage);
    const key = (messages: string[]) => `${account.uid}:${JSON.stringify(messages)}`;
    const cachedPrior = conversations.get(key(messages.slice(0, -1)));
    const prior = cachedPrior && cachedPrior.expires > Date.now() ? cachedPrior : undefined;
    const subscriberId = [...messages.join(' ').matchAll(/\b\d{8,11}\b/g)].at(-1)?.[0];
    // Typed subscriber IDs and explicit new requests override stale saved-box hints.
    const connectionId = target.newCustomer || subscriberId ? undefined : input.data.connectionId;
    if (target.newCustomer && !subscriberId && !generalQuestion && conversation.goal !== 'compare') {
      res.json({ success: true, source: 'context', state: 'enter_subscriber' }); return;
    }
    stage = 'catalog';
    const catalogReply = target.newCustomer && conversation.goal !== 'compare' ? null : await assistantCatalogFallback(messages, input.data.language, input.data.operatorId,
      conversation.goal === 'compare' && needsUnderstanding ? conversation : undefined);
    if (catalogReply) { res.json({ ...catalogReply, conversation }); return; }
    if (/\b(?:recharge\s+history|payment\s+history|transaction\s+history|past\s+recharges|previous\s+recharges|my\s+history)\b|ரீசார்ஜ்\s*வரலாறு|கட்டண\s*வரலாறு/i.test(latestMessage)) {
      res.json({ success: true, state: 'history' }); return;
    }
    if (conversation.goal === 'payment_status') {
      if (!conversation.orderId) {
        res.json({ success: true, source: 'context', state: 'enter_order', language, conversation,
          text: say('What is your order ID? I will check its recorded payment and recharge status.', 'உங்கள் ஆர்டர் எண் என்ன? பதிவிலுள்ள கட்டண மற்றும் ரீசார்ஜ் நிலையைச் சரிபார்க்கிறேன்.', 'Unga order ID enna? Recorded payment, recharge status check pannuren.') }); return;
      }
      const action = await executeAssistantTool('get_recharge_status', { order_id: conversation.orderId }, account.uid);
      res.json({ success: true, source: 'context', state: 'tool_action', language, conversation, action, text: actionNotice(action, language) }); return;
    }
    stage = 'assistant_tools';
    const guidedRecharge = !generalQuestion && (target.newCustomer || subscriberId || connectionId || command.quality && command.months && command.company || /^(?:please\s+)?(?:recharge|top[ -]?up)\b/i.test(latestMessage) || standardMessage &&
      (prior || /\b(?:recharge|box|top[ -]?up)\b/i.test(latestMessage) || command.amount !== null || command.months || command.quality || command.company));
    // Structured recharge steps take priority; AI handles general questions and
    // language the command parser cannot understand, never the payment action.
    const toolReply = guidedRecharge ? null : await assistantToolTurn(account.uid, messages, input.data.language);
    if (toolReply) { res.json(toolReply); return; }
    if (conversation.goal === 'support') {
      res.json({ success: true, source: 'context', state: 'support_help', language, conversation,
        text: say('Open Get Help to describe the issue and review a support request. Nothing has been submitted.', 'சிக்கலை விவரிக்க உதவி பக்கத்தைத் திறக்கவும். கோரிக்கை எதுவும் சமர்ப்பிக்கப்படவில்லை.', 'Get Help-la issue solli request review pannalaam. Innum submit pannala.') }); return;
    }
    if (conversation.goal === 'general' && !guidedRecharge) {
      res.json({ success: true, source: 'context', state: 'clarify_goal', language, conversation,
        text: say('Would you like to compare packs, prepare a recharge, check a payment, or get support?', 'பேக்குகளை ஒப்பிடவா, ரீசார்ஜ் தயாரிக்கவா, கட்டண நிலை பார்க்கவா அல்லது உதவி பெறவா?', 'Packs compare pannanuma, recharge prepare pannanuma, payment status paakanuma illa support venuma?'),
        suggestions: ['Compare packs', 'Recharge a new customer ID', 'Check payment status', 'Get support'] }); return;
    }
    // Query ownership on the server; client-provided box details are never trusted.
    stage = 'saved_boxes';
    const boxes = target.newCustomer ? [] : await boxCache.get(account.uid, async () => {
      const snapshot = await getAdminFirestore().collection('dth_connections').where('user_id', '==', account.uid).get();
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as DthConnection)).filter(box => box.user_id === account.uid);
    });
    let source = 'ai'; let intent;
    try {
      const updates = { ...parseRechargeCommand([latestMessage]), priceMode: command.priceMode };
      intent = standardMessage && prior ? { ...prior.intent, ...Object.fromEntries(Object.entries(updates).filter(([, value]) => value !== null)) } :
        standardMessage ? command : await extractRechargeIntent(account.uid, messages);
      if (standardMessage) source = 'context';
    }
    catch { intent = parseRechargeCommand(messages); source = 'command'; }
    intent = { ...command, ...Object.fromEntries(Object.entries(intent).filter(([, value]) => value !== null && value !== undefined)) } as typeof command;
    // Explicit, replayed filters take precedence over an AI interpretation.
    intent.company = conversation.operator ?? intent.company;
    intent.months = conversation.months && [1, 3, 6, 12].includes(conversation.months) ? conversation.months as typeof intent.months : intent.months;
    intent.quality = conversation.quality ?? intent.quality;
    if (conversation.budget !== null && command.amount === null) { intent.amount = null; intent.priceMode = 'derived'; }
    if (target.newCustomer) {
      // Keep an already requested duration/quality, but never carry over a
      // subscriber ID, operator, amount, box name or saved-box selection.
      const earlierPreferences = parseRechargeCommand(target.priorMessages);
      intent.months ??= earlierPreferences.months;
      intent.quality ??= earlierPreferences.quality;
    }
    if (conversations.size >= 200) conversations.delete(conversations.keys().next().value!);
    conversations.set(key(messages), { intent, expires: Date.now() + 15 * 60_000 });
    stage = 'operators';
    const operators = await readOperators();
    let newBox: DthConnection | undefined;
    if (subscriberId && !connectionId) {
      const operatorWords = [...messages.join(' ').toLowerCase().matchAll(/\b(sun\s*direct|tata\s*play|airtel(?:\s*digital\s*tv)?|dish\s*tv|d2h)\b/g)].at(-1)?.[1]?.replace(/\s/g, '');
      const ids = { sundirect: 'sun_direct', tataplay: 'tata_play', airtel: 'airtel_dth', airteldigitaltv: 'airtel_dth', dishtv: 'dish_tv', d2h: 'd2h' } as const;
      const selectedId = input.data.operatorId || intent.company || ids[operatorWords as keyof typeof ids];
      // An explicitly typed subscriber ID must never silently recharge the only saved box.
      const saved = boxes.filter(box => box.smartCardNumber === subscriberId && (!selectedId || box.operator === selectedId));
      if (saved.length === 1) newBox = saved[0];
      else if (!selectedId) {
        res.json({ success: true, source, state: 'choose_operator', subscriberLastFour: subscriberId.slice(-4), intent,
          operators: operators.filter(op => op.isEnabled !== false && op.isActive !== false).map(op => ({ id: op.id, name: op.name })) }); return;
      } else {
        const op = operators.find(op => op.id === selectedId);
        if (!op) { res.json({ success: true, state: 'operator_unavailable' }); return; }
        const validationError = subscriberError(selectedId, subscriberId);
        if (validationError) { res.json({ success: true, state: 'invalid_subscriber', intent }); return; }
        newBox = { id: `new-${selectedId}-${subscriberId}`, user_id: account.uid, operator: selectedId,
          operatorName: op.name, smartCardNumber: subscriberId, nickname: 'New box', createdAt: new Date().toISOString() };
      }
    }
    if (!newBox && !boxes.length) { res.json({ success: true, source, state: 'enter_subscriber', intent }); return; }
    const amount = intent.priceMode === 'derived' ? undefined : intent.amount ?? undefined;
    if (amount !== undefined && validateTopUpAmount(amount)) { res.json({ success: true, source, state: 'invalid_amount' }); return; }
    const normalized = (value: string) => value.toLowerCase().trim().replace(/\b(?:my|the)\b/g, '').replace(/\b(?:set[ -]?top|setup)\b/g, '').replace(/\bbox\b/g, '').trim().replace(/\s+/g, ' ');
    const commandBox = parseRechargeCommand(messages).boxName;
    const boxName = intent.boxName || commandBox;
    const matches = newBox ? [newBox] : connectionId ? boxes.filter(box => box.id === connectionId) :
      boxName ? boxes.filter(box => normalized(box.nickname) === normalized(boxName)) : boxes.length === 1 ? boxes : [];
    const choices = (list: DthConnection[]) => list.map(box => ({ id: box.id, nickname: box.nickname, operatorName: box.operatorName, lastFour: box.smartCardNumber.slice(-4) }));
    if (matches.length !== 1) { res.json({ success: true, source, state: 'choose_box', boxes: choices(matches.length ? matches : boxes), intent }); return; }
    const box = matches[0];
    if (intent.company && intent.company !== box.operator) { res.json({ success: true, source, state: 'operator_mismatch', intent, box: choices([box])[0] }); return; }
    if (subscriberError(box.operator, box.smartCardNumber)) { res.json({ success: true, state: 'invalid_box' }); return; }
    const operator = operators.find(op => op.id === box.operator);
    if (!operator || operator.isEnabled === false || operator.isActive === false) { res.json({ success: true, state: 'operator_unavailable' }); return; }
    if (amount !== undefined) {
      res.json({ success: true, source, state: 'awaiting_topup_payment', box, operator, topUpAmount: amount }); return;
    }
    if (!intent.months || !intent.quality) { res.json({ success: true, source, state: !intent.months && !intent.quality ? 'price' : 'preferences', intent, box: choices([box])[0] }); return; }
    stage = 'catalog';
    const catalog = (await planModel.getForOperator(box.operator)).filter(plan => plan.operator === box.operator && !validateCatalogPack(plan).length);
    const withinBudget = (plan: typeof catalog[number]) => conversation.budget === null ||
      (conversation.budgetPeriod === 'monthly' ? plan.amount / plan.duration_months : plan.amount) <= conversation.budget;
    let plans = catalog.filter(plan => plan.duration_months === intent.months && plan.pack_type === intent.quality &&
      (amount === undefined || plan.amount === amount) && withinBudget(plan)).sort((a, b) => a.amount - b.amount || a.id.localeCompare(b.id));
    const normalizePack = (value: string) => value.normalize('NFKC').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\bpack\b/g, '').trim().replace(/\s+/g, '');
    let alternatives = false;
    if (intent.packName) {
      const exact = plans.filter(plan => [plan.plan_name, plan.tamilName].some(name => name && normalizePack(name) === normalizePack(intent.packName!)));
      if (exact.length) plans = exact;
      else alternatives = plans.length > 0;
    }
    res.json({ success: true, source, state: alternatives ? 'alternatives' : plans.length ? 'awaiting_payment' : 'no_plans', intent,
      box, operator, plans, conversation,
      ...(!plans.length && conversation.budget !== null ? { text: say('No packs match this duration, quality and budget. You can change the budget or quality.', 'இந்த காலம், HD/SD மற்றும் பட்ஜெட்டில் பொருந்தும் பேக் இல்லை. பட்ஜெட் அல்லது HD/SD விருப்பத்தை மாற்றலாம்.', 'Indha duration, quality, budget-ku pack illa. Budget illa quality maathalaam.'),
        suggestions: [...new Set(catalog.filter(plan => plan.duration_months === intent.months && withinBudget(plan)).map(plan => plan.pack_type))] } : {}) });
  } catch (error) {
    if (error instanceof AiToolAccessDenied) { res.status(error.status).json({ success: false, error: error.message }); return; }
    if (error instanceof InvalidAssistantTool) { res.status(502).json({ success: false, error: 'The assistant returned an invalid action. Please try again.' }); return; }
    const code = (error as { code?: unknown })?.code;
    const quota = code === 8 || code === 'resource-exhausted' || code === 'RESOURCE_EXHAUSTED';
    // Log only the stage and code, never credentials, customer text or subscriber IDs.
    console.warn('[recharge-assistant]', { stage, code: typeof code === 'string' || typeof code === 'number' ? code : 'unknown' });
    res.status(quota ? 429 : 503).json({ success: false, code: quota ? 'storage_quota_exceeded' : 'assistant_unavailable',
      error: quota ? 'Recharge data is temporarily unavailable because the database quota has been reached. Please try again once service is restored. Your conversation is kept; no payment has been started.' :
        'Recharge details could not be loaded. Your conversation is kept. Please try again.' });
  }
}
