import { beforeEach, expect, it, vi } from 'vitest';
import fs from 'node:fs';
const f = vi.hoisted(() => ({ plans: vi.fn(), generate: vi.fn() }));
vi.mock('../server/models/planModel', () => ({ planModel: { getForOperator: f.plans } }));
vi.mock('../server/utils/freeTierAi', () => ({ verifiedFreeKey: async () => 'server-secret', reserveFreeRequest: async () => {}, FREE_RECOMMENDATION_MODEL: 'test', FreeAiUnavailable: class extends Error {} }));
vi.mock('@google/genai', () => ({ FunctionCallingConfigMode: { AUTO: 'AUTO' }, ThinkingLevel: { MINIMAL: 'MINIMAL' },
  GoogleGenAI: class { models = { generateContent: f.generate }; } }));
import { executeAssistantTool as dispatchTool, toolDefinitions } from '../server/utils/assistantTools';
import { assistantToolTurn } from '../server/utils/assistantTurn';
import { assistantActionSchema, assistantPages } from '../src/lib/assistantActions';
import { POLICY_ROUTES } from '../src/lib/trustContent';
const executeAssistantTool = (name: unknown, args: unknown) => dispatchTool(name, args, 'owner');
beforeEach(() => { f.plans.mockReset(); f.generate.mockReset(); });
it('declares strict schemas and only real public routes', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  for (const path of Object.values(assistantPages)) expect(app.includes(`path="${path}"`) || POLICY_ROUTES.some(route => route.path === path)).toBe(true);
  expect(toolDefinitions.map(tool => tool.name)).toEqual(['get_recharge_status', 'get_my_history', 'navigate', 'get_plans']);
  for (const tool of toolDefinitions) expect(tool.parametersJsonSchema).toMatchObject({ additionalProperties: false });
});
it('rejects unknown tools, URLs, extra properties, missing arguments, and invalid numbers before catalog access', async () => {
  for (const [name, args] of [['pay', {}], ['__proto__', {}], ['constructor', {}], ['navigate', { page: 'https://evil.test' }],
    ['navigate', { page: 'refund', url: '/admin' }], ['navigate', { page: '/refund-policy' }],
    ['get_plans', { operator: 'unknown', max_price: 300 }], ['get_plans', { operator: 'airtel_dth', max_price: -1 }],
    ['get_plans', { operator: 'airtel_dth', max_price: '300' }], ['get_plans', { operator: 'airtel_dth' }]]) {
    await expect(executeAssistantTool(name, args)).rejects.toThrow();
  }
  expect(f.plans).not.toHaveBeenCalled();
  expect(assistantActionSchema.safeParse({ type: 'navigate', page: 'admin' }).success).toBe(false);
});
it('returns whitelisted navigation and catalog facts filtered by operator and total price', async () => {
  expect(await executeAssistantTool('navigate', { page: 'refund' })).toEqual({ type: 'navigate', page: 'refund' });
  const base = { id: 'real', operator: 'airtel_dth', pack_type: 'HD', duration_months: 1, plan_name: 'Tamil HD', amount: 250, channel_list: [], channel_counts_unavailable: true, is_recommended: false };
  f.plans.mockResolvedValue([base, { ...base, id: 'expensive', amount: 500 }, { ...base, id: 'wrong', operator: 'sun_direct' }]);
  expect(await executeAssistantTool('get_plans', { operator: 'airtel_dth', max_price: 300 })).toEqual({ type: 'show_plans', plans: [{ id: 'real', name: 'Tamil HD', operator: 'airtel_dth', amount: 250, duration: 1 }] });
});
it('passes tools to Gemini and returns text plus a validated structured action', async () => {
  f.generate.mockResolvedValue({ functionCalls: [{ name: 'navigate', args: { page: 'refund' } }], text: 'Here is our refund policy.' });
  expect(await assistantToolTurn('owner', ['Open refund page'])).toMatchObject({ state: 'tool_action', text: 'Here is our refund policy.', action: { type: 'navigate', page: 'refund' } });
  expect(f.generate.mock.calls[0][0].config.tools[0].functionDeclarations).toEqual(toolDefinitions);
});
it('rejects malicious or multiple model calls and preserves recharge handoff', async () => {
  f.generate.mockResolvedValue({ functionCalls: [{ name: 'pay', args: {} }] });
  await expect(assistantToolTurn('owner', ['pay'])).rejects.toThrow();
  f.generate.mockResolvedValue({ functionCalls: [{ name: 'navigate', args: { page: 'home' } }, { name: 'pay', args: {} }] });
  await expect(assistantToolTurn('owner', ['home'])).rejects.toThrow();
  f.generate.mockResolvedValue({ text: 'RECHARGE_FLOW' });
  expect(await assistantToolTurn('owner', ['recharge my hall box'])).toBeNull();
  f.generate.mockResolvedValue({ text: 'Which operator and budget?' });
  expect(await assistantToolTurn('owner', ['show plans'])).toMatchObject({ state: 'assistant_text', text: 'Which operator and budget?' });
});

it('passes the verified server identity into history tools and uses factual status text', async () => {
  // The model can supply only limit/order_id, never the account identity.
  f.generate.mockResolvedValue({ functionCalls: [{ name: 'get_my_history', args: { limit: 5, uid: 'victim' } }] });
  await expect(assistantToolTurn('owner', ['my history'])).rejects.toThrow('Invalid assistant tool arguments');
});
