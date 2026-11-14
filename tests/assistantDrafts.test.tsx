import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ query: vi.fn(), writes: vi.fn() }));
vi.mock('../server/queries', () => ({ queryRecords: f.query }));
vi.mock('../server/persistence', async importOriginal => ({ ...await importOriginal<typeof import('../server/persistence')>(), mutateRecord: f.writes, setRecord: f.writes }));
import { executeAssistantTool } from '../server/utils/assistantTools';
import { draftRefund } from '../server/models/assistantDrafts';
import { contactDraftArgs, refundDraftArgs, type ContactDraft } from '../src/lib/assistantDrafts';
import { draftSupportEmail, supportEmailHref } from '../src/lib/supportEmail';
import { AssistantDraftCard } from '../src/components/AssistantDraftCard';
import { BUSINESS_DETAILS } from '../src/lib/trustContent';
const order = { user_id: 'owner', orderId: 'order_1', rechargeStatus: 'failed', paymentStatus: 'paid', amount: 299, paymentId: 'pay_1',
  packName: 'Tamil HD', createdAt: '2026-11-14T00:00:00Z' };
const contact: ContactDraft = { type: 'contact_draft', draft: { category: 'recharge_failed', subject: 'Recharge failed', message: 'Please check my order.' } };
beforeEach(() => { f.query.mockReset(); f.writes.mockClear(); f.query.mockImplementation(async (collection: string) => collection === 'server_recharges' ? [order] : [{ id: 'pay_1', customerUid: 'owner', orderId: 'order_1', amount: 299, currency: 'INR', status: 'paid', providerStatus: 'captured', testMode: false }]); });
it('creates a contact draft without a database read or business write', async () => {
  expect(await executeAssistantTool('draft_contact_message', contact.draft, 'owner')).toEqual(contact);
  expect(f.query).not.toHaveBeenCalled(); expect(f.writes).not.toHaveBeenCalled();
});
it('strictly validates categories and draft lengths and rejects identity or eligibility injection', async () => {
  expect(contactDraftArgs.safeParse({ ...contact.draft, category: 'admin' }).success).toBe(false);
  expect(contactDraftArgs.safeParse({ ...contact.draft, uid: 'victim' }).success).toBe(false);
  expect(contactDraftArgs.safeParse({ ...contact.draft, message: 'x'.repeat(501) }).success).toBe(false);
  expect(contactDraftArgs.safeParse({ ...contact.draft, subject: 'x'.repeat(121) }).success).toBe(false);
  expect(refundDraftArgs.safeParse({ order_id: 'order_1', reason: 'failed', eligible: true }).success).toBe(false);
  await expect(executeAssistantTool('draft_refund_request', { order_id: 'order_1', reason: 'failed', uid: 'victim' }, 'owner')).rejects.toThrow();
  expect(f.query).not.toHaveBeenCalled();
});
it('checks refund ownership using the verified UID and creates no persistent record', async () => {
  const draft = await draftRefund('owner', { order_id: 'order_1', reason: 'Recharge failed' });
  expect(f.query.mock.calls[0][1]).toContainEqual({ field: 'user_id', op: 'eq', value: 'owner' });
  expect(draft.order?.orderId).toBe('order_1');
  expect(draft.eligibility.status).toBe('eligible');
  expect(f.writes).not.toHaveBeenCalled();
});
it('blocks other-account, missing and test orders', async () => {
  for (const rows of [[], [{ ...order, user_id: 'other' }], [{ ...order, testMode: true }]]) {
    f.query.mockResolvedValue(rows);
    const draft = await draftRefund('owner', { order_id: 'order_1', reason: 'failed' });
    expect(['unavailable', 'ineligible']).toContain(draft.eligibility.status);
    expect(() => draftSupportEmail(draft)).toThrow();
  }
});
it('uses the existing support destination and safely encodes edited fields without sending', () => {
  const href = draftSupportEmail({ ...contact, draft: { ...contact.draft, subject: 'Updated & checked', message: 'Line 1\nLine 2? cc=other@example.com' } });
  const [destination, query] = href.split('?'); const fields = new URLSearchParams(query);
  expect(destination).toBe(`mailto:${BUSINESS_DETAILS.email}`);
  expect(fields.get('subject')).toBe('Updated & checked');
  expect(fields.get('body')).toContain('Line 1\nLine 2? cc=other@example.com');
  expect(fields.has('cc')).toBe(false);
  expect(supportEmailHref()).toBe(`mailto:${BUSINESS_DETAILS.email}`);
});
it('renders confirmation, Edit and Submit, and blocks refund submission before eligibility is established', async () => {
  const submit = vi.fn();
  const html = renderToStaticMarkup(<AssistantDraftCard action={contact} onSubmit={submit} />);
  expect(html).toContain('DRAFT'); expect(html).toContain('Edit'); expect(html).toContain('Submit');
  expect(html).toContain('you must send the email there');
  f.query.mockResolvedValue([{ ...order, rechargeStatus: 'completed' }]);
  const draft = await draftRefund('owner', { order_id: 'order_1', reason: 'failed' });
  const refundHtml = renderToStaticMarkup(<AssistantDraftCard action={draft} onSubmit={submit} />);
  expect(refundHtml).toContain('Eligibility:'); expect(refundHtml).toMatch(/disabled=""[^>]*>Submit/);
  expect(submit).not.toHaveBeenCalled();
});

it('allows pending/processing/failed recharges before completion and rejects completed even after a payment failure', async () => {
  const payment = { id: 'pay_1', customerUid: 'owner', orderId: 'order_1', amount: 299, currency: 'INR', status: 'paid', providerStatus: 'captured', testMode: false };
  for (const status of ['pending', 'processing', 'failed', 'completed']) {
    f.query.mockImplementation(async (collection: string) => collection === 'server_recharges' ? [{ ...order, rechargeStatus: status }] : [payment]);
    const draft = await draftRefund('owner', { order_id: 'order_1', reason: 'please cancel' });
    expect(draft.eligibility.status).toBe(status === 'completed' ? 'ineligible' : 'eligible');
    if (status !== 'completed') expect(draftSupportEmail(draft)).toContain('mailto:');
  }
});
it('blocks already-refunded, uncaptured, foreign-owner and unmatched payments', async () => {
  const payment = { id: 'pay_1', customerUid: 'owner', orderId: 'order_1', amount: 299, currency: 'INR', status: 'paid', providerStatus: 'captured', testMode: false };
  for (const variant of [{ ...payment, status: 'refunded' }, { ...payment, providerStatus: 'refunded' }, { ...payment, providerStatus: 'authorized' },
    { ...payment, customerUid: 'victim' }, { ...payment, amount: 1 }, { ...payment, testMode: true }]) {
    f.query.mockImplementation(async (collection: string) => collection === 'server_recharges' ? [order] : [variant]);
    const draft = await draftRefund('owner', { order_id: 'order_1', reason: 'failed' });
    expect(draft.eligibility.status).not.toBe('eligible');
    expect(() => draftSupportEmail(draft)).toThrow();
  }
});
