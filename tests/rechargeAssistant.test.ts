const toolTurn = vi.hoisted(() => vi.fn());
vi.mock('../server/utils/assistantTurn', () => ({ assistantToolTurn: toolTurn }));
vi.mock('../server/middleware/aiRateLimiter', () => ({ allowAiRequest: async () => true }));
import { beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ account: { uid: 'owner' } as any, extract: vi.fn(), boxes: [] as any[], plans: [] as any[], storageError: null as any, boxReads: 0 }));
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
import { parseRechargeCommand } from '../server/utils/rechargeIntent';
beforeEach(() => {
  toolTurn.mockReset(); toolTurn.mockResolvedValue(null);
  clearAssistantReadCache();
  f.boxReads = 0;
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
it('supports the example command without provider credentials and labels the fallback', async () => {
  f.extract.mockRejectedValue(new Error('Disabled'));
  expect((await request()).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'awaiting_payment', source: 'command' }));
  expect(parseRechargeCommand(['Recharge 18 months HD for hall box']).months).toBeNull();
  expect(parseRechargeCommand(['Recharge 6 months HD for hall box', '3 months SD'])).toMatchObject({ boxName: 'hall', packName: null, months: 3, quality: 'SD' });
});
it('matches the exact named pack without offering Plus as a match', async () => {
  f.plans = [{ ...f.plans[0], plan_name: 'Tamil Super Star HD Pack', duration_months: 1, amount: 279 },
    { ...f.plans[0], id: 'plus', plan_name: 'Tamil Super Star Plus HD Pack (29 HD)', duration_months: 1, amount: 309 }];
  f.extract.mockResolvedValue({ boxName: null, packName: 'Tamil Super Star HD', months: 1, quality: 'HD' });
  expect((await request()).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'awaiting_payment', plans: [expect.objectContaining({ id: 'hd6', amount: 279 })] }));
});
it('labels alternatives when the requested name is unavailable', async () => {
  f.extract.mockResolvedValue({ boxName: 'hall', packName: 'Unavailable HD', months: 6, quality: 'HD' });
  expect((await request()).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'alternatives' }));
});
it('automatically uses one saved box but never overrides an explicit different name', async () => {
  f.extract.mockResolvedValue({ boxName: null, packName: null, months: 6, quality: 'HD' });
  expect((await request()).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'awaiting_payment' }));
  f.extract.mockResolvedValue({ boxName: 'bedroom', packName: null, months: 6, quality: 'HD' });
  expect((await request()).json).toHaveBeenCalledWith(expect.objectContaining({ state: 'choose_box' }));
});
it('extracts exact named packs and the available-box phrasing without AI', async () => {
  const message = 'Recharge Tamil Super Star HD for 1 month in the available box';
  expect(parseRechargeCommand([message])).toMatchObject({ boxName: null, packName: 'Tamil Super Star HD', months: 1, quality: 'HD' });
  f.extract.mockRejectedValue(new Error('Disabled'));
  f.plans = [{ ...f.plans[0], plan_name: 'Tamil Super Star HD Pack', duration_months: 1 },
    { ...f.plans[0], id: 'plus', plan_name: 'Tamil Super Star Plus HD Pack', duration_months: 1 }];
  expect((await request({ messages: [message] })).json).toHaveBeenCalledWith(expect.objectContaining({ source: 'command', state: 'awaiting_payment', plans: [expect.objectContaining({ id: 'hd6' })] }));
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

it('does not silently drop budgets or treat an explicit recharge as catalog-only', async () => {
  const { assistantCatalogFallback } = await import('../server/utils/assistantCatalog');
  for (const message of ['Airtel HD packs under 500', 'Recharge my hall box for 6-month HD pack', 'Airtel or Sun Direct HD packs']) {
    expect(await assistantCatalogFallback(message, 'en')).toBeNull();
  }
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
