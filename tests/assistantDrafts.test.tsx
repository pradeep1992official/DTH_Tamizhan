vi.mock('../server/utils/aiToolSecurity', () => ({ runAiTool: async (_scope: string, _name: unknown, _args: unknown, execute: (uid: string) => Promise<unknown>, uid = 'admin-test') => execute(uid) }));
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ query: vi.fn(), writes: vi.fn(), backed: vi.fn() }));
vi.mock('../server/queries', () => ({ queryRecords: f.query }));
vi.mock('../server/models/paymentPages', () => ({ ordersForPayments: f.backed }));
vi.mock('../server/persistence', async importOriginal => ({ ...await importOriginal<typeof import('../server/persistence')>(), mutateRecord: f.writes, setRecord: f.writes }));
import { executeAssistantTool } from '../server/utils/assistantTools';
import { draftRefund } from '../server/models/assistantDrafts';
import { contactDraftArgs, refundDraftArgs, type ContactDraft } from '../src/lib/assistantDrafts';
import { draftSupportEmail, supportEmailHref } from '../src/lib/supportEmail';
import { refundSupportTicketPrefill } from '../src/lib/supportRouting';
import { AssistantDraftCard } from '../src/components/AssistantDraftCard';
import { BUSINESS_DETAILS } from '../src/lib/trustContent';
const order = { user_id: 'owner', orderId: 'order_1', rechargeStatus: 'failed', paymentStatus: 'paid', amount: 299, paymentId: 'pay_1',
  packName: 'Tamil HD', createdAt: '2026-11-14T00:00:00Z' };
const contact: ContactDraft = { type: 'contact_draft', draft: { category: 'recharge_failed', subject: 'Recharge failed', message: 'Please check my order.' } };
beforeEach(() => { f.query.mockReset(); f.writes.mockClear(); f.backed.mockReset(); f.backed.mockResolvedValue([]); f.query.mockImplementation(async (collection: string) => collection === 'server_recharges' ? [order] : [{ id: 'pay_1', customerUid: 'owner', orderId: 'order_1', amount: 299, currency: 'INR', status: 'paid', providerStatus: 'captured', testMode: false }]); });
it('recognizes a ledger-backed test order and explains why it cannot receive a real refund', async () => {
  f.query.mockImplementation(async (collection: string) => collection === 'server_recharges' ? [] : [{ id: 'pay_1', customerUid: 'owner', orderId: 'order_1', testMode: true }]);
  f.backed.mockResolvedValue([{ ...order, testMode: true }]);
  const draft = await draftRefund('owner', { order_id: 'order_1', reason: 'cancel test' });
  expect(draft.order).toMatchObject({ orderId: 'order_1', testMode: true });
  expect(draft.eligibility).toEqual({ status: 'ineligible', explanation: 'This is a test order. No real payment refund can be requested.' });
  expect(() => refundSupportTicketPrefill(draft)).toThrow();
  expect(f.writes).not.toHaveBeenCalled();
});
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
  expect(refundSupportTicketPrefill(draft)).toEqual({
    issueCategory: 'refund',
    orderId: 'order_1',
    description: 'Refund request for order order_1. Reason: Recharge failed',
  });
  expect(f.writes).not.toHaveBeenCalled();
});
it('allows Support to review an owned order when the captured payment is not in the ledger', async () => {
  f.query.mockImplementation(async (collection: string) => collection === 'server_recharges' ? [order] : []);
  const draft = await draftRefund('owner', { order_id: 'order_1', reason: 'Payment was deducted' });
  expect(draft.eligibility.status).toBe('manual_review_required');
  expect(refundSupportTicketPrefill(draft)).toMatchObject({
    orderId: 'order_1',
    description: 'Refund request for order order_1. Reason: Payment was deducted',
  });
});
it('blocks other-account, missing and test orders', async () => {
  for (const rows of [[], [{ ...order, user_id: 'other' }], [{ ...order, testMode: true }]]) {
    f.query.mockResolvedValue(rows);
    const draft = await draftRefund('owner', { order_id: 'order_1', reason: 'failed' });
    expect(['unavailable', 'ineligible']).toContain(draft.eligibility.status);
    expect(() => refundSupportTicketPrefill(draft)).toThrow();
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
  expect(html).toContain('DRAFT'); expect(html).toContain('Edit'); expect(html).toContain('Continue to Get Help');
  expect(html).toContain('Nothing has been submitted or paid');
  f.query.mockResolvedValue([{ ...order, rechargeStatus: 'completed' }]);
  const draft = await draftRefund('owner', { order_id: 'order_1', reason: 'failed' });
  const refundHtml = renderToStaticMarkup(<AssistantDraftCard action={draft} onSubmit={submit} />);
  expect(refundHtml).toContain('Eligibility:'); expect(refundHtml).toContain('Continue to Get Help');
  expect(refundHtml).not.toMatch(/disabled=""[^>]*>Continue to Get Help/);
  const blockedRefundHtml = renderToStaticMarkup(<AssistantDraftCard action={{ ...draft, eligibility: { status: 'ineligible', explanation: 'Already refunded.' } }} onSubmit={submit} />);
  expect(blockedRefundHtml).toMatch(/disabled=""[^>]*>Continue to Get Help/);
  expect(submit).not.toHaveBeenCalled();
});

it('allows pending/processing/failed recharges before completion and rejects completed even after a payment failure', async () => {
  const payment = { id: 'pay_1', customerUid: 'owner', orderId: 'order_1', amount: 299, currency: 'INR', status: 'paid', providerStatus: 'captured', testMode: false };
  for (const status of ['pending', 'processing', 'failed', 'completed']) {
    f.query.mockImplementation(async (collection: string) => collection === 'server_recharges' ? [{ ...order, rechargeStatus: status }] : [payment]);
    const draft = await draftRefund('owner', { order_id: 'order_1', reason: 'please cancel' });
    expect(draft.eligibility.status).toBe(status === 'completed' ? 'manual_review_required' : 'eligible');
    expect(refundSupportTicketPrefill(draft)).toMatchObject({ issueCategory: 'refund', orderId: 'order_1' });
  }
});
it('blocks repeat/test refunds and routes unverified payments for manual review', async () => {
  const payment = { id: 'pay_1', customerUid: 'owner', orderId: 'order_1', amount: 299, currency: 'INR', status: 'paid', providerStatus: 'captured', testMode: false };
  for (const [variant, expected] of [
    [{ ...payment, status: 'refunded' }, 'ineligible'],
    [{ ...payment, providerStatus: 'refunded' }, 'ineligible'],
    [{ ...payment, providerStatus: 'authorized' }, 'manual_review_required'],
    [{ ...payment, customerUid: 'victim' }, 'manual_review_required'],
    [{ ...payment, amount: 1 }, 'manual_review_required'],
    [{ ...payment, testMode: true }, 'ineligible'],
  ] as const) {
    f.query.mockImplementation(async (collection: string) => collection === 'server_recharges' ? [order] : [variant]);
    const draft = await draftRefund('owner', { order_id: 'order_1', reason: 'failed' });
    expect(draft.eligibility.status).toBe(expected);
    if (expected === 'manual_review_required') expect(refundSupportTicketPrefill(draft).orderId).toBe('order_1');
    else expect(() => refundSupportTicketPrefill(draft)).toThrow();
  }
});
