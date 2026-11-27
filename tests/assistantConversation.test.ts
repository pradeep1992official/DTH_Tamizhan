import { expect, it } from 'vitest';
import { assistantConversationSchema, normalizeAssistantMessage, resolveAssistantConversation } from '../src/lib/assistantConversation';
import { resolveAssistantLanguage } from '../src/lib/assistantLanguage';

it('retains comparison constraints across replies and applies corrections', () => {
  expect(resolveAssistantConversation(['cheapest pack for one month under 350', 'Airtel', 'HD', '3 months', 'SD instead']))
    .toMatchObject({ goal: 'compare', operator: 'airtel_dth', months: 3, quality: 'SD', budget: 350, budgetPeriod: 'total', cheapest: true });
});
it.each(['oru month ku cheap pack', 'ஒரு மாதத்திற்கு குறைந்த விலை பேக்'])('understands %s without AI', message => {
  expect(resolveAssistantConversation([message, 'ஏர்டெல்'])).toMatchObject({ goal: 'compare', months: 1, operator: 'airtel_dth', cheapest: true });
});
it('preserves a monthly budget separately from the total pack price', () => {
  expect(resolveAssistantConversation(['Compare Airtel packs under 300 per month', '6 months', 'HD']))
    .toMatchObject({ budget: 300, budgetPeriod: 'monthly', months: 6, quality: 'HD' });
  expect(resolveAssistantConversation(['Compare Airtel packs under 300 per month', 'budget 1000 total']))
    .toMatchObject({ budget: 1000, budgetPeriod: 'total' });
  expect(resolveAssistantConversation(['Compare Airtel packs under 300', 'per month'])).toMatchObject({ budget: 300, budgetPeriod: 'monthly' });
});
it('distinguishes support and payment status from a pending recharge', () => {
  expect(resolveAssistantConversation(['Recharge a new customer ID', '3012586589', 'Airtel', 'check my payment', 'order_abc123']))
    .toMatchObject({ goal: 'payment_status', subscriberId: '3012586589', operator: 'airtel_dth', orderId: 'order_abc123' });
  expect(resolveAssistantConversation(['Recharge Hall box', 'my payment failed, get support']).goal).toBe('support');
  expect(resolveAssistantConversation(['Recharge Hall box', '279 pack']).goal).toBe('recharge');
  expect(resolveAssistantConversation(['refund status']).goal).toBe('support');
});
it('clears the old subscriber and operator when starting another customer request', () => {
  expect(resolveAssistantConversation(['Recharge 3012345678 Airtel HD 6 months', 'Recharge another customer ID']))
    .toMatchObject({ subscriberId: null, operator: null, months: 6, quality: 'HD' });
});
it('does not guess an operator from an ID or ambiguous comparison', () => {
  expect(resolveAssistantConversation(['3012586589']).operator).toBeNull();
  expect(resolveAssistantConversation(['compare Airtel or Sun Direct packs']).operator).toBeNull();
});
it('supports clearing previously set filters', () => {
  expect(resolveAssistantConversation(['compare Airtel HD packs under 500', 'any quality', 'no budget']))
    .toMatchObject({ quality: null, budget: null });
});
it('rejects state fields that could forge identities or payment results', () => {
  const state = resolveAssistantConversation(['Airtel HD packs']);
  for (const authority of [{ uid: 'victim' }, { paid: true }, { price: 1 }]) expect(assistantConversationSchema.safeParse({ ...state, ...authority }).success).toBe(false);
});
it('retains Tanglish reply language on operator-only follow-ups', () => {
  expect(normalizeAssistantMessage('oru month ku cheap pack')).toContain('1 month');
  expect(resolveAssistantLanguage(['oru month ku cheap pack', 'Airtel'], 'auto')).toBe('tanglish');
});
