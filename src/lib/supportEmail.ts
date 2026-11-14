import { BUSINESS_DETAILS } from './trustContent';
import { contactDraftArgs, type ContactDraft } from './assistantDrafts';
// Same destination and mailto flow as the site's existing SupportDetails links.
export function supportEmailHref(subject?: string, body?: string): string {
  const query: string[] = [];
  if (subject) query.push(`subject=${encodeURIComponent(subject)}`);
  if (body) query.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${BUSINESS_DETAILS.email}${query.length ? `?${query.join('&')}` : ''}`;
}
export function draftSupportEmail(draft: ContactDraft): string {
  const fields = contactDraftArgs.parse(draft.draft);
  return supportEmailHref(fields.subject, `Category: ${fields.category}\n\n${fields.message}`);
}
