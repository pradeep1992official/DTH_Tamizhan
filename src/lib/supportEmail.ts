import { BUSINESS_DETAILS } from './trustContent';
import { contactDraftArgs, refundDraftArgs, type SupportDraft } from './assistantDrafts';
// Same destination and mailto flow as the site's existing SupportDetails links.
export function supportEmailHref(subject?: string, body?: string): string {
  const query: string[] = [];
  if (subject) query.push(`subject=${encodeURIComponent(subject)}`);
  if (body) query.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${BUSINESS_DETAILS.email}${query.length ? `?${query.join('&')}` : ''}`;
}
export function draftSupportEmail(draft: SupportDraft): string {
  if (draft.type === 'contact_draft') {
    const fields = contactDraftArgs.parse(draft.draft);
    return supportEmailHref(fields.subject, `Category: ${fields.category}\n\n${fields.message}`);
  }
  const fields = refundDraftArgs.parse(draft.draft);
  if (draft.eligibility.status !== 'eligible' || !draft.order || draft.order.orderId !== fields.order_id || draft.order.testMode) throw new Error(draft.eligibility.explanation);
  return supportEmailHref(`Refund request: ${fields.order_id}`, `Order: ${fields.order_id}\nReason: ${fields.reason}\n\n${draft.eligibility.explanation}\n\nThis is a request for review, not confirmation of a refund.`);
}
