import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ generate: vi.fn(), owned: vi.fn(), brands: vi.fn() }));
vi.mock('../server/utils/aiToolSecurity', () => ({ runAiTool: async (_scope: string, _name: unknown, _args: unknown, execute: any) => execute('owner') }));
vi.mock('../server/models/planModel', () => ({ planModel: {} }));
vi.mock('../server/models/assistantHistory', () => ({ ownedAssistantOrders: f.owned }));
vi.mock('../server/models/serviceBrands', () => ({ readServiceBrands: f.brands }));
vi.mock('../server/utils/freeTierAi', () => ({ verifiedFreeKey: async () => 'test', reserveFreeRequest: async () => {}, FREE_RECOMMENDATION_MODEL: 'test' }));
vi.mock('@google/genai', () => ({ ThinkingLevel: { MINIMAL: 'MINIMAL' }, GoogleGenAI: class { models = { generateContent: f.generate }; } }));
import { executeAssistantTool } from '../server/utils/assistantTools';
import { assistantActionSchema, actionNotice } from '../src/lib/assistantActions';
import { AssistantSupportCard } from '../src/components/AssistantSupportCard';
import { defaultServiceBrands } from '../src/lib/serviceBrands';
beforeEach(() => { vi.clearAllMocks(); f.brands.mockResolvedValue(defaultServiceBrands); f.owned.mockResolvedValue([]); });
it('uses constrained Gemini classification and returns a suggestion without a business write', async () => {
  f.generate.mockResolvedValue({ text: JSON.stringify({ route: 'dth_service', confident: true, category: 'no_signal', summary: 'My DTH box has no signal.' }) });
  const action = await executeAssistantTool('recommend_support_option', { problem_text: 'No signal on my DTH box.' }, 'owner');
  expect(action.type).toBe('support_recommendation');
  expect(actionNotice(action)).toContain('Get Help');
  const html = renderToStaticMarkup(<MemoryRouter><AssistantSupportCard action={action as any} /></MemoryRouter>);
  expect(html).toContain('Get Help'); expect(html).not.toContain('Use free support instead'); expect(html).not.toContain('<form');
});
it('rejects forged classifications, authority, submissions and amounts', async () => {
  f.generate.mockResolvedValue({ text: JSON.stringify({ route: 'dth_service', confident: true, category: 'refund', summary: 'Refund my payment.' }) });
  expect(await executeAssistantTool('recommend_support_option', { problem_text: 'Refund my payment.' }, 'owner')).toMatchObject({ recommendation: { route: 'free' } });
  const fields = { description: 'There is no signal.', issueCategory: 'no_signal' };
  for (const extra of [{ uid: 'other' }, { amount: 1 }, { acceptedTerms: true }, { status: 'paid' }]) await expect(executeAssistantTool('prefill_service_request', { ...fields, ...extra }, 'owner')).rejects.toThrow();
  expect(assistantActionSchema.safeParse({ type: 'prefill_service_request', fields: { ...fields, url: '/admin' } }).success).toBe(false);
});
it('checks linked order ownership and current dynamic brand settings before prefilling', async () => {
  await expect(executeAssistantTool('prefill_support_form', { description: 'Please review my payment.', issueCategory: 'refund', orderId: 'order_other' }, 'owner')).rejects.toThrow();
  expect(f.owned).toHaveBeenCalledWith('owner', 1, 'order_other');
  f.brands.mockResolvedValue([{ ...defaultServiceBrands[0], enabled: false }]);
  await expect(executeAssistantTool('prefill_service_request', { description: 'There is no signal.', issueCategory: 'no_signal', brand: 'tata_play', subscriberId: '1234567890' }, 'owner')).rejects.toThrow();
  f.brands.mockResolvedValue(defaultServiceBrands);
  const action = await executeAssistantTool('prefill_service_request', { description: 'There is no signal.', issueCategory: 'no_signal', brand: 'tata_play', subscriberId: '1234567890' }, 'owner');
  expect(action.type).toBe('prefill_service_request'); expect(assistantActionSchema.safeParse(action).success).toBe(true);
});
it('defaults to free with a cleaned summary when Gemini fails or is uncertain', async () => {
  f.generate.mockRejectedValueOnce(new Error('provider unavailable'));
  expect(await executeAssistantTool('recommend_support_option', { problem_text: '<b>Please review this issue.</b>' }, 'owner')).toMatchObject({ recommendation: { route: 'free', confident: false, summary: 'Please review this issue.' } });
  f.generate.mockResolvedValueOnce({ text: JSON.stringify({ route: 'dth_service', confident: false, category: 'no_signal', summary: 'An unclear problem.' }) });
  expect(await executeAssistantTool('recommend_support_option', { problem_text: 'There is some problem.' }, 'owner')).toMatchObject({ recommendation: { route: 'free', category: 'other' } });
});
