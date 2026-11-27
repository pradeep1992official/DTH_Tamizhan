import { beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ generate: vi.fn(), reserve: vi.fn() }));
vi.mock('../server/utils/freeTierAi', () => ({ verifiedFreeKey: async () => 'fixture-key', reserveFreeRequest: f.reserve, FREE_RECOMMENDATION_MODEL: 'fixture-model' }));
vi.mock('@google/genai', () => ({ ThinkingLevel: { MINIMAL: 'MINIMAL' }, GoogleGenAI: class { models = { generateContent: f.generate }; } }));
import { understandingSchema, understandAssistantRequest } from '../server/utils/assistantUnderstanding';
import { resolveAssistantConversation } from '../src/lib/assistantConversation';
beforeEach(() => { vi.clearAllMocks(); });
it('extracts bounded language intent without generating identities or catalog prices', async () => {
  const current = resolveAssistantConversation(['check order_abc', '3012586589']);
  const parsed = { goal: 'compare', operator: null, months: 3, quality: 'HD', budget: 600, budgetPeriod: 'total', cheapest: true };
  f.generate.mockResolvedValue({ text: JSON.stringify(parsed) });
  expect(await understandAssistantRequest('owner', ['something economical for a quarter'], current)).toMatchObject({
    ...parsed, subscriberId: '3012586589', orderId: 'order_abc' });
  expect(f.reserve).toHaveBeenCalledWith('owner');
  expect(f.generate).toHaveBeenCalledTimes(1);
  expect(f.generate.mock.calls[0][0].config.responseJsonSchema.properties).not.toHaveProperty('price');
  expect(f.generate.mock.calls[0][0].config.responseJsonSchema.properties).not.toHaveProperty('orderId');
});
it('rejects model-generated prices, payment results, identities and invalid operators', () => {
  const base = { goal: 'compare', operator: null, months: null, quality: null, budget: null, budgetPeriod: 'total', cheapest: false };
  for (const extra of [{ price: 1 }, { uid: 'victim' }, { paid: true }, { orderId: 'order_fake' }, { operator: 'invented-provider' }]) {
    expect(understandingSchema.safeParse({ ...base, ...extra }).success).toBe(false);
  }
});
it('rejects an actual provider response containing invented prices', async () => {
  const current = resolveAssistantConversation(['cheapest packs']);
  const { subscriberId: _subscriber, orderId: _order, ...allowed } = current;
  f.generate.mockResolvedValue({ text: JSON.stringify({ ...allowed, price: 1 }) });
  await expect(understandAssistantRequest('owner', ['something economical'], current)).rejects.toThrow();
});
