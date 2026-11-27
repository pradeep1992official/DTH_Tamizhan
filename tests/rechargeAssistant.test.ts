vi.mock('../server/utils/aiToolSecurity', async importOriginal => ({ ...await importOriginal<typeof import('../server/utils/aiToolSecurity')>(), runAiTool: async (_scope: string, _name: unknown, _args: unknown, execute: (uid: string) => Promise<unknown>) => execute('owner') }));
const toolTurn = vi.hoisted(() => vi.fn());
vi.mock('../server/utils/assistantTurn', () => ({ assistantToolTurn: toolTurn }));
vi.mock('../server/middleware/aiRateLimiter', () => ({ allowAiRequest: async () => true }));
import { beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ account: { uid: 'owner' } as any, extract: vi.fn(), understand: vi.fn(), history: vi.fn(), boxes: [] as any[], plans: [] as any[], storageError: null as any, boxReads: 0 }));
vi.mock('../server/utils/assistantUnderstanding', () => ({ understandAssistantRequest: f.understand }));
vi.mock('../server/models/assistantHistory', () => ({ assistantHistory: f.history }));
vi.mock('../server/middleware/auth', () => ({ verifyAuthToken: async () => f.account,
  getAdminFirestore: () => ({ collection: () => ({ where: (_field: string, _op: string, uid: string) => {
    expect(uid).toBe('owner'); return { get: async () => { f.boxReads++; if (f.storageError) throw f.storageError; return { docs: f.boxes.map(box => ({ id: box.id, data: () => box })) }; } };
  } }) }) }));
vi.mock('../server/models/planModel', () => ({ planModel: { getAll: async () => f.plans, getForOperator: async (operator: string) => f.plans.filter(plan => plan.operator === operator) } }));
vi.mock('../server/models/sharedStore', () => ({ readOperators: async () => [{ id: 'airtel_dth', name: 'Airtel Digital TV', isEnabled: true }] }));
vi.mock('../server/utils/rechargeIntent', async importOriginal => {
  const actual = await importOriginal<typeof import('../server/utils/rechargeIntent')>();
  return { ...actual, extractRechargeIntent: f.extract };
});
import { prepareAssistantRecharge, clearAssistantReadCache } from '../server/controllers/rechargeAssistant';
import { isStandardRechargeMessage, parseRechargeCommand } from '../server/utils/rechargeIntent';
import { resolveAssistantConversation } from '../src/lib/assistantConversation';
beforeEach(() => {
  toolTurn.mockReset(); toolTurn.mockResolvedValue(null);
  clearAssistantReadCache();
  f.boxReads = 0;
  f.understand.mockReset(); f.understand.mockRejectedValue(new Error('Optional AI unavailable'));
  f.history.mockReset(); f.history.mockResolvedValue([]);
  f.storageError = null;
  f.account = { uid: 'owner' };
  f.boxes = [{ id: 'hall', user_id: 'owner', nickname: 'Hall Box', operator: 'airtel_dth', smartCardNumber: '3012345678' }];
  f.plans = [{ id: 'hd6', operator: 'airtel_dth', pack_type: 'HD', duration_months: 6, plan_name: 'Tamil HD', amount: 1396,
    channel_list: [], is_recommended: false, channel_counts_unavailable: true }];
  f.extract.mockReset(); f.extract.mockResolvedValue({ boxName: 'hall', months: 6, quality: 'HD' });
});
it('retains extracted preferences and avoids repeated saved-box and model reads on short replies', async () => {
  f.boxes[0].nickname = 'வரவேற்பறை';
  f.extract.mockResolvedValue({ boxName: 'வரவேற்பறை', months: null, quality: null, packName: null });
  const messages = ['என் வரவேற்பறை பாக்ஸை ரீசார்ஜ் செய்யவும்'];
  await request({ messages });
  await request({ messages: [...messages, 'HD'] });
  expect((await request({ messages: [...messages, 'HD', '6 months'] })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'awaiting_payment' }));
  expect(f.boxReads).toBe(1); expect(f.extract).toHaveBeenCalledOnce();
});
it('reports database quota exhaustion accurately instead of blaming AI', async () => {
  f.storageError = Object.assign(new Error('Quota exceeded'), { code: 8 });
  const res = await request();
  expect(res.status).toHaveBeenCalledWith(429);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, code: 'storage_quota_exceeded' }));
  expect(f.extract).not.toHaveBeenCalled();
});
async function request(body: object = { messages: ['Recharge 6 month HD for hall box'] }) {
  const res = { status: vi.fn(), json: vi.fn(), setHeader: vi.fn() }; res.status.mockReturnValue(res);
  await prepareAssistantRecharge({ body } as any, res as any); return res;
}
it('routes history requests to account history instead of asking for a box or calling AI', async () => {
  for (const message of ['get my recharge history', 'show payment history', 'ரீசார்ஜ் வரலாறு']) {
    expect((await request({ messages: [message] })).json).toHaveBeenCalledWith({ success: true, state: 'history' });
  }
  expect(f.extract).not.toHaveBeenCalled();
  f.account = null;
  expect((await request({ messages: ['get my recharge history'] })).status).toHaveBeenCalledWith(401);
});
it('requires authentication and validates messages before calling AI', async () => {
  f.account = null; expect((await request()).status).toHaveBeenCalledWith(401);
  f.account = { uid: 'owner' }; expect((await request({ messages: ['x'.repeat(501)] })).status).toHaveBeenCalledWith(400);
  expect(f.extract).not.toHaveBeenCalled();
});
it('prepares only real matching catalog packs and waits for payment', async () => {
  f.plans.push({ ...f.plans[0], id: 'sd', pack_type: 'SD' }, { ...f.plans[0], id: 'bad', amount: -1 });
  const res = await request(); expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ state: 'awaiting_payment',
    box: expect.objectContaining({ id: 'hall' }), plans: [expect.objectContaining({ id: 'hd6', amount: 1396 })] }));
});
it('never resolves another customer’s box even with an explicit ID', async () => {
  f.boxes.push({ ...f.boxes[0], id: 'other', user_id: 'other' });
  expect((await request({ messages: ['Recharge'], connectionId: 'other' })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'choose_box', boxes: [expect.objectContaining({ id: 'hall' })] }));
});
it('asks for clarification on duplicate nicknames or missing preferences', async () => {
  f.boxes.push({ ...f.boxes[0], id: 'hall2' });
  expect((await request()).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'choose_box' }));
  f.boxes.pop(); clearAssistantReadCache(); f.extract.mockResolvedValue({ boxName: 'hall', months: null, quality: 'HD' });
  expect((await request({ messages: ['Recharge HD for hall box'] })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'preferences' }));
});
it('does not replace unavailable plans with a different duration', async () => {
  f.plans[0].duration_months = 3;
  expect((await request()).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'no_plans', plans: [] }));
});
it('handles the example command directly without trying AI or reporting an AI outage', async () => {
  f.extract.mockRejectedValue(new Error('Disabled'));
  expect((await request()).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'awaiting_payment', source: 'context' }));
  expect(f.extract).not.toHaveBeenCalled(); expect(toolTurn).not.toHaveBeenCalled();
  expect(parseRechargeCommand(['Recharge 18 months HD for hall box']).months).toBeNull();
  expect(parseRechargeCommand(['Recharge 6 months HD for hall box', '3 months SD'])).toMatchObject({ boxName: 'hall', packName: null, months: 3, quality: 'SD' });
});
it('matches the exact named pack without offering Plus as a match', async () => {
  f.plans = [{ ...f.plans[0], plan_name: 'Tamil Super Star HD Pack', duration_months: 1, amount: 279 },
    { ...f.plans[0], id: 'plus', plan_name: 'Tamil Super Star Plus HD Pack (29 HD)', duration_months: 1, amount: 309 }];
  f.extract.mockResolvedValue({ boxName: null, packName: 'Tamil Super Star HD', months: 1, quality: 'HD' });
  expect((await request({ messages: ['Recharge Tamil Super Star HD for 1 month'] })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'awaiting_payment', plans: [expect.objectContaining({ id: 'hd6', amount: 279 })] }));
});
it('labels alternatives when the requested name is unavailable', async () => {
  f.extract.mockResolvedValue({ boxName: 'hall', packName: 'Unavailable HD', months: 6, quality: 'HD' });
  expect((await request({ messages: ['Recharge Unavailable HD for 6 months in hall box'] })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'alternatives' }));
});
it('automatically uses one saved box but never overrides an explicit different name', async () => {
  f.extract.mockResolvedValue({ boxName: null, packName: null, months: 6, quality: 'HD' });
  expect((await request({ messages: ['Recharge HD for 6 months'] })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'awaiting_payment' }));
  f.extract.mockResolvedValue({ boxName: 'bedroom', packName: null, months: 6, quality: 'HD' });
  expect((await request({ messages: ['Recharge 6 months HD for bedroom box'] })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'choose_box' }));
});
it('extracts exact named packs and the available-box phrasing without AI', async () => {
  const message = 'Recharge Tamil Super Star HD for 1 month in the available box';
  expect(parseRechargeCommand([message])).toMatchObject({ boxName: null, packName: 'tamil super star hd', months: 1, quality: 'HD' });
  f.extract.mockRejectedValue(new Error('Disabled'));
  f.plans = [{ ...f.plans[0], plan_name: 'Tamil Super Star HD Pack', duration_months: 1 },
    { ...f.plans[0], id: 'plus', plan_name: 'Tamil Super Star Plus HD Pack', duration_months: 1 }];
  expect((await request({ messages: [message] })).json).toHaveBeenCalledWith(expect.objectContaining({ source: 'context', state: 'awaiting_payment', plans: [expect.objectContaining({ id: 'hd6' })] }));
});
it('asks for the operator for a new subscriber instead of substituting the saved hall box', async () => {
  f.extract.mockRejectedValue(new Error('Disabled'));
  const messages = ['3012586589', 'HD - 1 month', 'new box - 3012586589'];
  expect((await request({ messages })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'choose_operator', subscriberLastFour: '6589',
    intent: expect.objectContaining({ months: 1, quality: 'HD' }) }));
  f.plans[0].duration_months = 1;
  expect((await request({ messages: [...messages, 'Airtel Digital TV'], operatorId: 'airtel_dth' })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'awaiting_payment',
    box: expect.objectContaining({ smartCardNumber: '3012586589', operator: 'airtel_dth', user_id: 'owner' }) }));
});
it('supports customers without saved boxes and validates new subscriber formats', async () => {
  f.boxes = []; f.extract.mockRejectedValue(new Error('Disabled'));
  expect((await request({ messages: ['Recharge HD for 1 month'] })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'enter_subscriber' }));
  expect((await request({ messages: ['12345678 HD 1 month Airtel'] })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'invalid_subscriber' }));
});
it('resolves setup-box wording and prepares the exact requested rupee top-up', async () => {
  f.extract.mockRejectedValue(new Error('Disabled')); f.boxes[0].nickname = 'Hall TV';
  expect((await request({ messages: ['recharge my hall TV setup box for 279 rupees'] })).json).toHaveBeenCalledWith(expect.objectContaining({
    state: 'awaiting_topup_payment', topUpAmount: 279, box: expect.objectContaining({ id: 'hall' }) }));
});
it('matches set-top-box wording with AI and rejects amounts outside checkout limits', async () => {
  f.boxes[0].nickname = 'Hall TV';
  f.extract.mockResolvedValue({ boxName: 'Hall TV set-top box', packName: null, months: null, quality: null });
  expect((await request({ messages: ['Recharge my Hall TV set-top box for ₹279'] })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'awaiting_topup_payment', topUpAmount: 279 }));
  expect((await request({ messages: ['Recharge my Hall TV set-top box for 20001 rupees'] })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'invalid_amount' }));
});
it('never substitutes a different price for an explicit pack amount', async () => {
  expect((await request({ messages: ['Recharge Hall box HD 6 months for 279 rupees'] })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'awaiting_topup_payment', topUpAmount: 279 }));
});
it('understands the screenshot wording and keeps its direct price across short follow-ups', async () => {
  f.extract.mockRejectedValue(new Error('Disabled')); f.boxes[0].nickname = 'Hall TV';
  const messages = ['recharge my hall TV for 279 pack', 'For Hall TV box', 'HD'];
  expect((await request({ messages, connectionId: 'hall' })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'awaiting_topup_payment', topUpAmount: 279 }));
  expect(parseRechargeCommand([messages[0]])).toMatchObject({ boxName: 'hall tv', amount: 279, priceMode: 'direct' });
});
it('converses through box, quality, duration and corrections without losing confirmed fields', async () => {
  f.extract.mockRejectedValue(new Error('Disabled'));
  expect((await request({ messages: ['For Hall box'], connectionId: 'hall' })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'price' }));
  expect((await request({ messages: ['For Hall box', 'HD'], connectionId: 'hall' })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'preferences', intent: expect.objectContaining({ quality: 'HD', months: null }) }));
  expect((await request({ messages: ['For Hall box', 'HD', '6 months'], connectionId: 'hall' })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'awaiting_payment', plans: [expect.objectContaining({ amount: 1396, operator: 'airtel_dth' })] }));
  expect((await request({ messages: ['For Hall box', 'HD', '6 months', 'make it 3 months'], connectionId: 'hall' })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'no_plans', intent: expect.objectContaining({ quality: 'HD', months: 3 }) }));
});
it('rejects a Sun Direct request for an Airtel box, including direct amounts', async () => {
  f.extract.mockRejectedValue(new Error('Disabled'));
  for (const details of ['Sun Direct HD 6 months', 'Sun Direct 279 rupees']) {
    expect((await request({ messages: ['For Hall box', details], connectionId: 'hall' })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'operator_mismatch' }));
  }
  expect((await request({ messages: ['For Hall box', 'Sun Direct HD 6 months', 'use Airtel instead'], connectionId: 'hall' })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'awaiting_payment' }));
});
it('accepts a bare amount as an answer and supports switching back to derived pricing', async () => {
  f.extract.mockRejectedValue(new Error('Disabled'));
  expect((await request({ messages: ['For Hall box', '279'], connectionId: 'hall' })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'awaiting_topup_payment', topUpAmount: 279 }));
  expect((await request({ messages: ['For Hall box', '279', 'instead HD for 6 months'], connectionId: 'hall' })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'awaiting_payment' }));
});

it('returns tool actions before reading saved boxes or preparing a recharge', async () => {
  const action = { success: true, state: 'tool_action', text: 'Here is the refund policy.', action: { type: 'navigate', page: 'refund' } };
  toolTurn.mockResolvedValue(action);
  const res = await request({ messages: ['Open refund page'] });
  expect(res.json).toHaveBeenCalledWith(action);
  expect(f.boxReads).toBe(0); expect(f.extract).not.toHaveBeenCalled();
});
it('does not invoke Gemini for unauthenticated or oversized requests', async () => {
  f.account = null; await request(); expect(toolTurn).not.toHaveBeenCalled();
  f.account = { uid: 'owner' }; await request({ messages: ['x'.repeat(501)] });
  expect(toolTurn).not.toHaveBeenCalled();
});

it('rejects client-supplied UID before invoking Gemini', async () => {
  const res = await request({ messages: ['my history'], uid: 'victim' });
  expect(res.status).toHaveBeenCalledWith(400);
  expect(toolTurn).not.toHaveBeenCalled();
});

it('accepts supported reply-language preferences and rejects unsupported values before model use', async () => {
  toolTurn.mockResolvedValue({ success: true, state: 'assistant_text', language: 'tanglish', text: 'Vanakkam' });
  const res = await request({ messages: ['Hello'], language: 'tanglish' });
  expect(toolTurn).toHaveBeenCalledWith('owner', ['Hello'], 'tanglish');
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ language: 'tanglish' }));
  toolTurn.mockClear();
  expect((await request({ messages: ['Hello'], language: 'fr' })).status).toHaveBeenCalledWith(400);
  expect(toolTurn).not.toHaveBeenCalled();
});

it('looks up the screenshot pack directly without loading saved boxes or extracting recharge intent', async () => {
  f.storageError = new Error('Saved boxes unavailable');
  f.plans = [{ ...f.plans[0], plan_name: 'Tamil Super Star HD Pack' }, { ...f.plans[0], id: 'sd', plan_name: 'Tamil Super Star Pack', pack_type: 'SD' }, { ...f.plans[0], id: 'monthly', plan_name: 'Tamil Super Star HD Pack', duration_months: 1 }];
  const res = await request({ messages: ['6-month HD pack Airtel Tamil Super star HD'] });
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ source: 'catalog', action: { type: 'show_plans', plans: [expect.objectContaining({ id: 'hd6', amount: 1396, duration: 6 })] } }));
  expect(f.boxReads).toBe(0); expect(f.extract).not.toHaveBeenCalled();
});
it('recognizes hyphenated duration in the standard recharge fallback', () => {
  expect(parseRechargeCommand(['Recharge my hall box for 6-month HD pack'])).toMatchObject({ months: 6, quality: 'HD' });
});

it('reports over-budget options explicitly and does not treat a recharge as catalog-only', async () => {
  const { assistantCatalogFallback } = await import('../server/utils/assistantCatalog');
  expect(await assistantCatalogFallback('Airtel HD packs under 500', 'en')).toMatchObject({ notice: 'over_budget' });
  expect(await assistantCatalogFallback('Recharge my hall box for 6-month HD pack', 'en')).toBeNull();
  expect(await assistantCatalogFallback('Airtel or Sun Direct HD packs', 'en')).toMatchObject({ state: 'choose_catalog_operator' });
});

it('matches the screenshot Superstar Plus request to Super Star Plus with its HD-count suffix', async () => {
  f.plans = [{ ...f.plans[0], plan_name: 'Tamil Super Star HD Pack', amount: 1396 },
    { ...f.plans[0], id: 'plus', plan_name: 'Tamil Super Star Plus HD Pack (29 HD)', channel_counts_unavailable: false, channel_count: 200, hd_channel_count: 29, amount: 1546 }];
  f.extract.mockResolvedValue({ boxName: null, packName: 'Tamil Superstar Plus HD', months: 6, quality: 'HD', company: 'airtel_dth' });
  const res = await request({ messages: ['HD - Airtel - 6m - Tamil Superstar Plus HD'] });
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ state: 'awaiting_payment', plans: [expect.objectContaining({ id: 'plus', amount: 1546 })] }));
});
it('recognizes 6m shorthand without mistaking a subscriber ID for duration', () => {
  expect(parseRechargeCommand(['HD - Airtel - 6m - Tamil Superstar Plus HD'])).toMatchObject({ months: 6, quality: 'HD' });
  expect(parseRechargeCommand(['3012345678'])).toMatchObject({ months: null });
});

it('asks for a new subscriber ID before using a saved box or calling Gemini', async () => {
  const res = await request({ messages: ['Recharge a new customer ID'], connectionId: 'hall' });
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ state: 'enter_subscriber' }));
  expect(f.boxReads).toBe(0); expect(toolTurn).not.toHaveBeenCalled(); expect(f.extract).not.toHaveBeenCalled();
});
it('keeps new-customer mode across plan followups and refuses stale saved-box selection', async () => {
  const messages = ['Recharge a new customer ID', 'HD - Airtel - 6m - Tamil Superstar Plus HD'];
  expect((await request({ messages, connectionId: 'hall' })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'enter_subscriber' }));
  expect(f.boxReads).toBe(0); expect(f.extract).not.toHaveBeenCalled();
});
it('discards earlier subscriber IDs and requires the new customer?s ID', async () => {
  const res = await request({ messages: ['Recharge 3012345678 Airtel', 'Recharge a new customer ID', 'HD 6 months'], connectionId: 'hall' });
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ state: 'enter_subscriber' }));
});
it('uses the typed new ID and operator even with stale saved connection and model box hints', async () => {
  f.extract.mockResolvedValue({ boxName: 'Hall Box', months: 6, quality: 'HD', company: 'airtel_dth' });
  const res = await request({ messages: ['Recharge a new customer ID', 'HD Airtel 6 months', '3012586589'], connectionId: 'hall' });
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ state: 'awaiting_payment', box: expect.objectContaining({ id: 'new-airtel_dth-3012586589', smartCardNumber: '3012586589' }) }));
  expect(f.boxReads).toBe(0);
});
it('still asks for the operator when a new ID is supplied without one', async () => {
  f.extract.mockRejectedValue(new Error('unavailable'));
  expect((await request({ messages: ['Recharge a new customer ID', '3012586589'], connectionId: 'hall' })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'choose_operator' }));
});
it('keeps the screenshot conversation in recharge flow even when the general AI would navigate away', async () => {
  toolTurn.mockResolvedValue({ success: true, state: 'tool_action', text: 'Opening Recharge page?', action: { type: 'navigate', page: 'recharge' } });
  f.extract.mockRejectedValue(new Error('unavailable'));
  const messages = ['Recharge a new customer ID'];
  expect((await request({ messages })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'enter_subscriber' }));
  messages.push('3012586589');
  expect((await request({ messages, connectionId: 'hall' })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'choose_operator', subscriberLastFour: '6589' }));
  expect(f.extract).not.toHaveBeenCalled();
  for (const followup of ['you recharge', 'ok']) {
    messages.push(followup);
    expect((await request({ messages })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'choose_operator' }));
  }
  messages.push('Airtel Digital TV');
  expect((await request({ messages, operatorId: 'airtel_dth' })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'price' }));
  messages.push('279');
  expect((await request({ messages })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'awaiting_topup_payment', topUpAmount: 279,
    box: expect.objectContaining({ smartCardNumber: '3012586589', operator: 'airtel_dth', user_id: 'owner' }) }));
  expect(toolTurn).not.toHaveBeenCalled();
  expect(f.extract).not.toHaveBeenCalled();
  expect(f.boxReads).toBe(0);
});
it('handles a bare subscriber ID without letting the general AI navigate or guess recharge preferences', async () => {
  toolTurn.mockResolvedValue({ success: true, state: 'text', text: 'Opening Recharge page?' });
  expect((await request({ messages: ['3012586589'] })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'choose_operator',
    intent: expect.objectContaining({ company: null, months: null, quality: null }) }));
  expect(toolTurn).not.toHaveBeenCalled();
  expect(f.extract).not.toHaveBeenCalled();
});

it('guides a new subscriber through operator, quality and duration without any model calls', async () => {
  toolTurn.mockRejectedValue(new Error('AI must not be needed'));
  f.extract.mockRejectedValue(new Error('AI must not be needed'));
  const messages = ['Recharge a new customer ID'];
  for (const [answer, state] of [['3012586589', 'choose_operator'], ['Airtel Digital TV', 'price'], ['HD', 'preferences'], ['6 months', 'awaiting_payment']]) {
    messages.push(answer);
    expect((await request({ messages })).json).toHaveBeenCalledWith(expect.objectContaining({ state, source: 'context' }));
  }
  expect(f.extract).not.toHaveBeenCalled();
  expect(toolTurn).not.toHaveBeenCalled();
});

it('uses AI extraction for unclear recharge wording, then continues with deterministic replies', async () => {
  f.extract.mockResolvedValue({ boxName: 'hall', packName: null, months: null, quality: null });
  const messages = ['Recharge the television I watch in the lounge'];
  expect((await request({ messages })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'price', source: 'ai' }));
  messages.push('279');
  expect((await request({ messages })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'awaiting_topup_payment', source: 'context', topUpAmount: 279 }));
  expect(f.extract).toHaveBeenCalledTimes(1);
  expect(toolTurn).not.toHaveBeenCalled();
});

it('keeps AI replies available for general questions without starting a recharge', async () => {
  const answer = { success: true, state: 'text', text: 'You can contact support using the Help menu.' };
  toolTurn.mockResolvedValue(answer);
  expect((await request({ messages: ['How can I contact support?'] })).json).toHaveBeenCalledWith(answer);
  expect((await request({ messages: ['How can I contact support?'], connectionId: 'hall' })).json).toHaveBeenCalledWith(answer);
  expect((await request({ messages: ['Recharge a new customer ID', 'How can I contact support?'] })).json).toHaveBeenCalledWith(answer);
  expect(toolTurn).toHaveBeenCalledTimes(3);
  expect(f.extract).not.toHaveBeenCalled();
  expect(f.boxReads).toBe(0);
});

it('asks for the operator for the screenshot cheapest-pack question, then answers from the one-month catalog', async () => {
  toolTurn.mockResolvedValue({ success: true, state: 'tool_action', action: { type: 'navigate', page: 'plans' }, text: 'Opening Plans page?' });
  f.plans = [
    { ...f.plans[0], id: 'costly', duration_months: 1, amount: 399 },
    { ...f.plans[0], id: 'cheapest', plan_name: 'Tamil Basic SD', duration_months: 1, pack_type: 'SD', amount: 199 },
    { ...f.plans[0], id: 'other-duration', duration_months: 6, amount: 99 },
    { ...f.plans[0], id: 'invalid', duration_months: 1, amount: -1 },
  ];
  const messages = ['which is cheapest pack for 1 month?'];
  expect((await request({ messages })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'choose_catalog_operator', source: 'catalog',
    operators: [{ id: 'airtel_dth', name: 'Airtel Digital TV' }] }));
  messages.push('Airtel Digital TV');
  const response = await request({ messages, operatorId: 'airtel_dth' });
  expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ source: 'catalog', state: 'tool_action',
    action: { type: 'show_plans', plans: [expect.objectContaining({ id: 'cheapest', amount: 199, duration: 1, operator: 'airtel_dth' })] } }));
  expect(toolTurn).not.toHaveBeenCalled();
  expect(f.extract).not.toHaveBeenCalled();
  expect(f.boxReads).toBe(0);
});

it('respects HD and operator filters when selecting the cheapest pack directly', async () => {
  f.plans = [
    { ...f.plans[0], id: 'hd', duration_months: 1, amount: 299 },
    { ...f.plans[0], id: 'sd', duration_months: 1, pack_type: 'SD', amount: 199 },
    { ...f.plans[0], id: 'foreign', operator: 'sun_direct', duration_months: 1, amount: 99 },
  ];
  expect((await request({ messages: ['Which is the cheapest Airtel HD pack for 1 month?'] })).json).toHaveBeenCalledWith(expect.objectContaining({
    action: { type: 'show_plans', plans: [expect.objectContaining({ id: 'hd', amount: 299 })] } }));
  expect(toolTurn).not.toHaveBeenCalled();
});

it('does not substitute a different duration when no one-month packs are available', async () => {
  expect((await request({ messages: ['cheapest Airtel pack for 1 month'] })).json).toHaveBeenCalledWith(expect.objectContaining({ action: { type: 'show_plans', plans: [] }, suggestions: ['6 months'] }));
  expect(toolTurn).not.toHaveBeenCalled();
});

it('still allows an explicit request to open Plans after a cheapest-pack question', async () => {
  const answer = { success: true, state: 'tool_action', action: { type: 'navigate', page: 'plans' }, text: 'Opening Plans page.' };
  toolTurn.mockResolvedValue(answer);
  expect((await request({ messages: ['which is cheapest pack for 1 month?', 'Open Plans page'] })).json).toHaveBeenCalledWith(answer);
  expect(toolTurn).toHaveBeenCalledTimes(1);
});

it('remembers catalog filters across workers and applies budget and quality corrections without AI', async () => {
  f.plans = [{ ...f.plans[0], id: 'hd', duration_months: 1, amount: 299 },
    { ...f.plans[0], id: 'sd', duration_months: 1, pack_type: 'SD', amount: 199 }];
  const messages = ['cheapest pack for one month under 350', 'Airtel', 'HD'];
  clearAssistantReadCache();
  expect((await request({ messages })).json).toHaveBeenCalledWith(expect.objectContaining({
    conversation: expect.objectContaining({ goal: 'compare', operator: 'airtel_dth', months: 1, quality: 'HD', budget: 350 }),
    action: { type: 'show_plans', plans: [expect.objectContaining({ id: 'hd', amount: 299 })] } }));
  messages.push('budget 200', 'SD instead'); clearAssistantReadCache();
  expect((await request({ messages })).json).toHaveBeenCalledWith(expect.objectContaining({
    conversation: expect.objectContaining({ quality: 'SD', budget: 200 }), action: { type: 'show_plans', plans: [expect.objectContaining({ id: 'sd', amount: 199 })] } }));
  expect(toolTurn).not.toHaveBeenCalled(); expect(f.extract).not.toHaveBeenCalled(); expect(f.understand).not.toHaveBeenCalled();
});

it.each(['oru month ku cheap pack', 'ஒரு மாதத்திற்கு குறைந்த விலை பேக்'])('answers the localized catalog request %s without guessing prices', async question => {
  f.plans = [{ ...f.plans[0], duration_months: 1, amount: 279 }];
  expect((await request({ messages: [question] })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'choose_catalog_operator' }));
  expect((await request({ messages: [question, 'Airtel'] })).json).toHaveBeenCalledWith(expect.objectContaining({
    action: { type: 'show_plans', plans: [expect.objectContaining({ amount: 279, duration: 1 })] } }));
  expect(toolTurn).not.toHaveBeenCalled(); expect(f.understand).not.toHaveBeenCalled();
});

it('checks monthly budgets without changing the displayed total pack price', async () => {
  expect((await request({ messages: ['Compare Airtel HD packs under 300 per month', 'for 6 months'] })).json).toHaveBeenCalledWith(expect.objectContaining({
    text: expect.stringContaining('displayed prices cover the full pack duration'),
    action: { type: 'show_plans', plans: [expect.objectContaining({ amount: 1396, duration: 6 })] } }));
});
it('asks for missing filters when optional understanding fails rather than opening checkout', async () => {
  const messages = ['something economical that lasts a quarter'];
  expect((await request({ messages })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'choose_catalog_operator' }));
  messages.push('Airtel');
  expect((await request({ messages })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'choose_catalog_duration' }));
  expect(f.extract).not.toHaveBeenCalled(); expect(f.boxReads).toBe(0);
});

it('treats a recharge budget as a constraint, never as a top-up instruction', async () => {
  f.extract.mockResolvedValue({ boxName: 'hall', months: 6, quality: 'HD', amount: 500, priceMode: 'direct' });
  const messages = ['Recharge my hall box HD for 6 months under Rs 500'];
  expect(parseRechargeCommand(messages).amount).toBeNull();
  expect((await request({ messages })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'no_plans',
    conversation: expect.objectContaining({ budget: 500 }), plans: [] }));
});

it('asks only for the order ID, then reads the authenticated owners recorded status', async () => {
  const order = { orderId: 'order_recorded', status: 'pending', amount: 279, packName: 'Tamil HD', createdAt: '2026-11-27T10:00:00Z', testMode: false };
  f.history.mockResolvedValue([order]);
  const messages = ['check my payment'];
  expect((await request({ messages })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'enter_order' }));
  messages.push('order_recorded');
  expect((await request({ messages })).json).toHaveBeenCalledWith(expect.objectContaining({ action: { type: 'show_recharge_status', order } }));
  expect(f.history).toHaveBeenCalledWith('owner', 1, 'order_recorded');
  expect(toolTurn).not.toHaveBeenCalled(); expect(f.boxReads).toBe(0);
});

it('gives a support recovery path when AI is unavailable without preparing a recharge', async () => {
  expect((await request({ messages: ['my payment failed, get support'] })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'support_help' }));
  expect(f.extract).not.toHaveBeenCalled(); expect(f.boxReads).toBe(0);
});
it('asks which task an unclear request means rather than defaulting to a recharge during an AI outage', async () => {
  expect((await request({ messages: ['Can you do something for me?'] })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'clarify_goal',
    suggestions: expect.arrayContaining(['Compare packs', 'Check payment status']) }));
  expect(f.extract).not.toHaveBeenCalled(); expect(f.boxReads).toBe(0);
});

it('uses optional AI only to interpret a flexible comparison, and keeps later explicit corrections', async () => {
  f.plans = [{ ...f.plans[0], id: 'quarter', duration_months: 3, amount: 600 }];
  f.understand.mockImplementation(async (_uid, _messages, current) => ({ ...current, goal: 'compare', months: 3, cheapest: true }));
  const messages = ['something economical that lasts a quarter'];
  expect((await request({ messages })).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'choose_catalog_operator' }));
  messages.push('Airtel'); clearAssistantReadCache();
  expect((await request({ messages })).json).toHaveBeenCalledWith(expect.objectContaining({
    action: { type: 'show_plans', plans: [expect.objectContaining({ id: 'quarter', amount: 600, duration: 3 })] } }));
  expect(f.understand).toHaveBeenLastCalledWith('owner', messages, expect.objectContaining({ operator: 'airtel_dth' }));
  expect(toolTurn).not.toHaveBeenCalled(); expect(f.extract).not.toHaveBeenCalled();
});

it('rejects forged client conversation state instead of trusting identity or budget claims', async () => {
  expect((await request({ messages: ['cheapest Airtel pack'], conversation: { ...resolveAssistantConversation([]), uid: 'victim' } })).status).toHaveBeenCalledWith(400);
  expect(f.understand).not.toHaveBeenCalled(); expect(toolTurn).not.toHaveBeenCalled();
});

it.each(['3012586589', '279', 'HD', '6 months', '6m', 'HD - Airtel - 6m', 'Airtel Digital TV', 'ok', 'Recharge 6 months HD for hall box', 'Recharge my hall TV for 279 rupees'])(
  'recognizes the guided recharge input %s', message => {
    expect(isStandardRechargeMessage(message)).toBe(true);
  },
);
it.each(['How can I contact support?', 'Recharge the television I watch in the lounge', 'என் வரவேற்பறை பாக்ஸை ரீசார்ஜ் செய்யவும்'])(
  'leaves flexible wording available for AI: %s', message => {
    expect(isStandardRechargeMessage(message)).toBe(false);
  },
);
