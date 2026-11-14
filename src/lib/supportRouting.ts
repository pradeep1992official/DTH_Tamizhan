import { z } from 'zod';
import { phoneSchema, supportCategories, serviceCategories, stripTicketHtml } from './tickets';
import { refundDraftSchema, type RefundDraft } from './assistantDrafts';
const summary = z.string().transform(value => stripTicketHtml(value).replace(/\s+/g, ' ')).pipe(z.string().min(5).max(160));
export const supportRecommendationArgs = z.object({ problem_text: z.string().trim().min(5).max(1000) }).strict();
export const supportClassificationSchema = z.object({ route: z.enum(['free', 'dth_service']), confident: z.boolean().default(false), category: z.enum([...supportCategories, ...serviceCategories]), summary }).strict().refine(value => (value.route === 'free' ? [...supportCategories] as string[] : [...serviceCategories] as string[]).includes(value.category), 'Invalid category for recommendation.');
export const supportPrefillArgs = z.object({ description: summary, issueCategory: z.enum(supportCategories),
  name: z.string().trim().min(1).max(100).optional(), phone: phoneSchema.optional(), orderId: z.string().regex(/^[\w-]{1,128}$/).optional() }).strict();
export const supportTicketPrefillSchema = z.object({ description: z.string().transform(stripTicketHtml).pipe(z.string().min(5).max(1000)),
  issueCategory: z.enum(supportCategories), name: z.string().trim().min(1).max(100).optional(), phone: phoneSchema.optional(),
  orderId: z.string().regex(/^[\w-]{1,128}$/).optional() }).strict();
export function refundSupportTicketPrefill(value: RefundDraft) {
  const draft = refundDraftSchema.parse(value);
  if (!['eligible', 'manual_review_required'].includes(draft.eligibility.status) || !draft.order ||
      draft.order.orderId !== draft.draft.order_id || draft.order.testMode) {
    throw new Error('This refund request is not ready for Support review.');
  }
  return supportTicketPrefillSchema.parse({
    issueCategory: 'refund',
    orderId: draft.draft.order_id,
    description: `Refund request for order ${draft.draft.order_id}. Reason: ${draft.draft.reason}`,
  });
}
export const servicePrefillArgs = z.object({ description: summary, issueCategory: z.enum(serviceCategories),
  name: z.string().trim().min(1).max(100).optional(), phone: phoneSchema.optional(), state: z.string().trim().min(1).max(60).optional(),
  brand: z.string().regex(/^[a-z][a-z0-9_]{1,49}$/).optional(), subscriberId: z.string().regex(/^\d{1,25}$/).optional() }).strict();
export const supportRecommendationAction = z.object({ type: z.literal('support_recommendation'), recommendation: supportClassificationSchema }).strict();
export const supportPrefillAction = z.object({ type: z.literal('prefill_support'), fields: supportPrefillArgs }).strict();
export const servicePrefillAction = z.object({ type: z.literal('prefill_service_request'), fields: servicePrefillArgs }).strict();
export function supportOptionExplanation(_route: string, language = 'en') {
  if (language === 'ta') return '\u0b89\u0ba4\u0bb5\u0bbf \u0baa\u0bc6\u0bb1\u0bc1\u0b99\u0bcd\u0b95\u0bb3\u0bcd. \u0baa\u0b9f\u0bbf\u0bb5\u0ba4\u0bcd\u0ba4\u0bc8 \u0b9a\u0bb0\u0bbf\u0baa\u0bbe\u0bb0\u0bcd\u0ba4\u0bcd\u0ba4\u0bc1 \u0ba4\u0bca\u0b9f\u0bb0\u0bb5\u0bc1\u0bae\u0bcd.';
  if (language === 'tanglish') return 'Get Help form-ai check pannitu thodarunga. Innum anuppala, panamum seluthala.';
  return 'Open Get Help and review your details. Nothing has been submitted or paid.';
}
