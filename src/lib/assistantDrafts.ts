import { z } from 'zod';
import { orderIdSchema, rechargeSummarySchema } from './assistantOrderSchemas';
export const contactCategorySchema = z.enum(['recharge_failed', 'wrong_operator', 'refund', 'account', 'other']);
export const contactDraftArgs = z.object({ category: contactCategorySchema,
  subject: z.string().max(120).trim().min(1), message: z.string().max(500).trim().min(1) }).strict();
export const refundDraftArgs = z.object({ order_id: orderIdSchema,
  reason: z.string().max(500).trim().min(1) }).strict();
export const refundEligibilitySchema = z.object({
  status: z.enum(['eligible', 'ineligible', 'manual_review_required', 'unavailable']), explanation: z.string(),
}).strict();
export const contactDraftSchema = z.object({ type: z.literal('contact_draft'), draft: contactDraftArgs }).strict();
export const refundDraftSchema = z.object({ type: z.literal('refund_draft'), draft: refundDraftArgs,
  order: rechargeSummarySchema.nullable(), eligibility: refundEligibilitySchema }).strict();
export type ContactDraft = z.infer<typeof contactDraftSchema>;
export type RefundDraft = z.infer<typeof refundDraftSchema>;
export type SupportDraft = ContactDraft | RefundDraft;
