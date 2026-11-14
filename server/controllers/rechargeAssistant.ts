import { assistantToolTurn } from '../utils/assistantTurn';
import { InvalidAssistantTool } from '../utils/assistantTools';
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
import { extractRechargeIntent, parseRechargeCommand } from '../utils/rechargeIntent';
import { ReadCache } from '../utils/readCache';
const boxCache = new ReadCache<DthConnection[]>(60_000, 200);
const conversations = new Map<string, { intent: ReturnType<typeof parseRechargeCommand>; expires: number }>();
export function clearAssistantReadCache() { boxCache.clear(); conversations.clear(); }

const schema = z.object({ messages: z.array(z.string().max(500).trim().min(1)).min(1).max(12),
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
    const toolReply = await assistantToolTurn(account.uid, input.data.messages);
    if (toolReply) { res.json(toolReply); return; }
    const latestMessage = input.data.messages.at(-1)!;
    if (/\b(?:recharge\s+history|payment\s+history|transaction\s+history|past\s+recharges|previous\s+recharges|my\s+history)\b|ரீசார்ஜ்\s*வரலாறு|கட்டண\s*வரலாறு/i.test(latestMessage)) {
      res.json({ success: true, state: 'history' }); return;
    }
    // Query ownership on the server; client-provided box details are never trusted.
    stage = 'saved_boxes';
    const boxes = await boxCache.get(account.uid, async () => {
      const snapshot = await getAdminFirestore().collection('dth_connections').where('user_id', '==', account.uid).get();
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as DthConnection)).filter(box => box.user_id === account.uid);
    });
    const subscriberId = [...input.data.messages.join(' ').matchAll(/\b\d{8,11}\b/g)].at(-1)?.[0];
    let source = 'ai'; let intent;
    const key = (messages: string[]) => `${account.uid}:${JSON.stringify(messages)}`;
    const prior = conversations.get(key(input.data.messages.slice(0, -1)));
    try {
      // Short, explicit answers need no model request or AI quota-counter write.
      const command = parseRechargeCommand(input.data.messages);
      const simpleFollowUp = input.data.messages.length > 1 && /^(?:(?:make it\s+)?\d+\s*months?|hd|sd|\d{1,5}(?:\.\d{1,2})?|sun\s*direct|airtel(?: digital tv)?|tata\s*play|dish\s*tv|d2h)$/i.test(latestMessage.trim());
      intent = simpleFollowUp && prior && prior.expires > Date.now() ? { ...prior.intent, ...Object.fromEntries(Object.entries(command).filter(([, value]) => value !== null)) } :
        simpleFollowUp ? command : await extractRechargeIntent(account.uid, input.data.messages);
      if (simpleFollowUp) source = 'context';
    }
    catch { intent = parseRechargeCommand(input.data.messages); source = 'command'; }
    const command = parseRechargeCommand(input.data.messages);
    intent = { ...command, ...Object.fromEntries(Object.entries(intent).filter(([, value]) => value !== null && value !== undefined)) } as typeof command;
    if (conversations.size >= 200) conversations.delete(conversations.keys().next().value!);
    conversations.set(key(input.data.messages), { intent, expires: Date.now() + 15 * 60_000 });
    stage = 'operators';
    const operators = await readOperators();
    let newBox: DthConnection | undefined;
    if (subscriberId && !input.data.connectionId) {
      const operatorWords = [...input.data.messages.join(' ').toLowerCase().matchAll(/\b(sun\s*direct|tata\s*play|airtel(?:\s*digital\s*tv)?|dish\s*tv|d2h)\b/g)].at(-1)?.[1]?.replace(/\s/g, '');
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
    const commandBox = parseRechargeCommand(input.data.messages).boxName;
    const boxName = intent.boxName || commandBox;
    const matches = newBox ? [newBox] : input.data.connectionId ? boxes.filter(box => box.id === input.data.connectionId) :
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
    let plans = (await planModel.getForOperator(box.operator)).filter(plan => plan.operator === box.operator && plan.duration_months === intent.months &&
      plan.pack_type === intent.quality && (amount === undefined || plan.amount === amount) && !validateCatalogPack(plan).length).sort((a, b) => a.amount - b.amount || a.id.localeCompare(b.id));
    const normalizePack = (value: string) => value.normalize('NFKC').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\bpack\b/g, '').trim().replace(/\s+/g, ' ');
    let alternatives = false;
    if (intent.packName) {
      const exact = plans.filter(plan => [plan.plan_name, plan.tamilName].some(name => name && normalizePack(name) === normalizePack(intent.packName!)));
      if (exact.length) plans = exact;
      else alternatives = plans.length > 0;
    }
    res.json({ success: true, source, state: alternatives ? 'alternatives' : plans.length ? 'awaiting_payment' : 'no_plans', intent,
      box, operator, plans });
  } catch (error) {
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
