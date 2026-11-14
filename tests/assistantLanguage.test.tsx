import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { detectAssistantLanguage, resolveAssistantLanguage, assistantLanguageTag } from '../src/lib/assistantLanguage';
import { actionNotice, rechargeExplanation } from '../src/lib/assistantActions';
import { AssistantVoiceControls } from '../src/components/AssistantVoiceControls';
import { AssistantDraftCard } from '../src/components/AssistantDraftCard';
it('detects Tamil script, conversational Tanglish and English', () => {
  expect(detectAssistantLanguage(['எனக்கு recharge வேண்டும்'])).toBe('ta');
  for (const input of ['enakku refund venum', 'ennoda recharge aagala', 'history kaatunga', 'refund eppo varum', 'vanakkam']) expect(detectAssistantLanguage([input])).toBe('tanglish');
  expect(detectAssistantLanguage(['Please show my recharge history'])).toBe('en');
});
it('retains language for short followups, supports explicit switches and manual override', () => {
  expect(detectAssistantLanguage(['enakku recharge venum', 'HD', '3 months', 'order_123'])).toBe('tanglish');
  expect(detectAssistantLanguage(['enakku recharge venum', 'Please answer in English'])).toBe('en');
  expect(detectAssistantLanguage(['Hello', 'Reply in Tamil'])).toBe('ta');
  expect(resolveAssistantLanguage(['Hello'], 'tanglish')).toBe('tanglish');
  expect(resolveAssistantLanguage([], 'auto', 'ta')).toBe('ta');
  expect(assistantLanguageTag('tanglish')).toBe('ta-Latn-IN');
});
it('localizes factual statuses and whitelisted actions without changing their data', () => {
  const order = { orderId: 'order_123', status: 'failed' as const, amount: 299, packName: 'Tamil', createdAt: '', testMode: false };
  expect(rechargeExplanation(order, 'ta')).toMatch(/[\u0B80-\u0BFF]/);
  expect(rechargeExplanation(order, 'tanglish')).toContain('fail aagiduchu');
  expect(actionNotice({ type: 'navigate', page: 'refund' }, 'tanglish')).toContain('thirakkuren');
  expect(actionNotice({ type: 'show_history', orders: [order] }, 'ta')).toContain('1');
});
it('renders one labeled language selector with accessible disabled states', () => {
  const html = renderToStaticMarkup(<AssistantVoiceControls language="en" choice="auto" disabled={false} onChoice={vi.fn()} />);
  expect(html).toContain('Language'); expect(html).not.toContain('Microphone language');
  expect(html).toContain('Tanglish');
  expect(html.match(/<label/g)).toHaveLength(1);
  const busy = renderToStaticMarkup(<AssistantVoiceControls language="ta" choice="ta" disabled onChoice={vi.fn()} />);
  expect(busy.match(/disabled=""/g)).toHaveLength(1);
});
it('localizes draft controls without automatically invoking Submit', () => {
  const submit = vi.fn();
  const html = renderToStaticMarkup(<AssistantDraftCard language="ta" action={{ type: 'contact_draft', draft: { category: 'account', subject: 'Help', message: 'Please help' } }} onSubmit={submit} />);
  expect(html).toContain('lang="ta-IN"'); expect(html).toMatch(/[\u0B80-\u0BFF]/);
  expect(html).not.toContain('>Edit</button>'); expect(submit).not.toHaveBeenCalled();
});
