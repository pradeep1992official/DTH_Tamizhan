import React, { useState } from 'react';
import { contactCategorySchema, contactDraftArgs, refundDraftArgs, type SupportDraft } from '../lib/assistantDrafts';

export function AssistantDraftCard({ action, onSubmit }: {
  action: SupportDraft; onSubmit: (draft: SupportDraft) => Promise<SupportDraft | void>;
}) {
  const [draft, setDraft] = useState(action);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const fields = draft.draft;
  const eligible = draft.type === 'contact_draft' || draft.eligibility.status === 'eligible';
  async function submit() {
    if (busy || editing || !eligible) return;
    const valid = draft.type === 'contact_draft' ? contactDraftArgs.safeParse(fields) : refundDraftArgs.safeParse(fields);
    if (!valid.success) { setNotice('Check the draft fields and try again.'); return; }
    setBusy(true); setNotice('');
    try {
      const updated = await onSubmit(draft);
      if (updated) {
        setDraft(updated);
        setNotice('Eligibility changed. Review the updated details. No email was opened.');
        return;
      }
      setNotice('Email draft opened. Review it and press Send in your email app. Delivery is not confirmed here.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not open the email draft.'); }
    finally { setBusy(false); }
  }
  return <section aria-label="Draft confirmation" className="border border-rule rounded-lg p-3 space-y-3">
    <h3 className="font-semibold">DRAFT - {draft.type === 'contact_draft' ? 'Contact message' : 'Refund request'}</h3>
    <p>Review this draft. Nothing has been sent or saved. Submit opens your email app; you must send the email there.</p>
    {draft.type === 'contact_draft' ? <>
      <label className="block">Category <select disabled={!editing || busy} value={draft.draft.category} onChange={event => setDraft({ ...draft, draft: { ...draft.draft, category: contactCategorySchema.parse(event.target.value) } })}>{contactCategorySchema.options.map(category => <option key={category} value={category}>{category.replaceAll('_', ' ')}</option>)}</select></label>
      <label className="block">Subject <input readOnly={!editing} disabled={busy} maxLength={120} value={draft.draft.subject} onChange={event => setDraft({ ...draft, draft: { ...draft.draft, subject: event.target.value } })} /></label>
      <label className="block">Message <textarea readOnly={!editing} disabled={busy} maxLength={500} value={draft.draft.message} onChange={event => setDraft({ ...draft, draft: { ...draft.draft, message: event.target.value } })} /></label>
    </> : <>
      <p>Order: {draft.draft.order_id}</p>
      {draft.order && <p>Status: {draft.order.status}. Order date: {draft.order.createdAt}.</p>}
      <p role="status">Eligibility: {draft.eligibility.status.replaceAll('_', ' ')}. {draft.eligibility.explanation}</p>
      <label className="block">Reason <textarea readOnly={!editing} disabled={busy} maxLength={500} value={draft.draft.reason} onChange={event => setDraft({ ...draft, draft: { ...draft.draft, reason: event.target.value } })} /></label>
    </>}
    <button type="button" className="recharge-chat-suggestion" disabled={busy} onClick={() => { setEditing(value => !value); setNotice(''); }}>{editing ? 'Done editing' : 'Edit'}</button>
    <button type="button" className="recharge-chat-suggestion" disabled={busy || editing || !eligible} onClick={() => void submit()}>{busy ? 'Checking...' : 'Submit'}</button>
    {notice && <p role="status">{notice}</p>}
  </section>;
}
