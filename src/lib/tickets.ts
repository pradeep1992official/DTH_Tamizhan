import { z } from 'zod';
export function stripTicketHtml(value: string) { return value.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '').replace(/<[^>]*>/g, '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim(); }
export const fullAddressSchema = z.string().max(500).transform(stripTicketHtml).pipe(z.string().min(15, 'Enter your full address, including locality, city and PIN code.').max(500));

export const supportCategories = ['recharge_failed', 'payment_deducted', 'refund', 'account', 'website_issue', 'other'] as const;
export const serviceCategories = ['no_signal', 'wrong_pack', 'missing_channels', 'box_issue', 'company_billing', 'other'] as const;
export const phoneSchema = z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number.');
export const ticketInputSchema = z.object({
  type: z.enum(['support', 'dth_service', 'service_request']), name: z.string().transform(stripTicketHtml).pipe(z.string().min(1).max(100)),
  helpRoute: z.enum(['free', 'dth_service']).optional(),
  fullAddress: z.string().max(500).transform(stripTicketHtml).default(''),
  phone: phoneSchema, state: z.string().trim().min(1).max(60).default('Tamil Nadu'),
  brand: z.string().trim().max(50).default(''), subscriberId: z.string().trim().max(25).default(''),
  issueCategory: z.string().max(40), description: z.string().transform(stripTicketHtml).pipe(z.string().min(5).max(1000)),
  orderId: z.string().regex(/^[\w-]{1,128}$/).optional(),
}).strict().superRefine((value, context) => {
  const categories: readonly string[] = value.type === 'support' ? supportCategories : serviceCategories;
  if (!categories.includes(value.issueCategory)) context.addIssue({ code: 'custom', path: ['issueCategory'], message: 'Choose a valid issue category.' });
  if (value.type === 'service_request' && (!value.brand || !value.subscriberId)) context.addIssue({ code: 'custom', message: 'Brand and subscriber ID are required.' });
});
export const ticketStatusSchema = z.enum(['open', 'in_progress', 'pending_payment', 'paid', 'placed_with_company', 'resolved', 'closed', 'auto_refunded', 'expired']);
export type TicketStatus = z.infer<typeof ticketStatusSchema>;
export type TicketInput = z.input<typeof ticketInputSchema>;
export const ticketSchema = z.object({
  id: z.string(), ticketNo: z.string().regex(/^(SUP|SRQ)-\d{4,}$/), type: z.enum(['support', 'dth_service', 'service_request']), helpRoute: z.enum(['free', 'dth_service']).optional(),
  uid: z.string().min(1), name: z.string(), phone: phoneSchema, state: z.string(), brand: z.string(), subscriberId: z.string(),
  fullAddress: z.string().max(500).optional(),
  issueCategory: z.string(), description: z.string().max(1000), orderId: z.string().optional(),
  status: ticketStatusSchema, statusHistory: z.array(z.object({ status: ticketStatusSchema, timestamp: z.string().datetime(), by: z.string(), type: z.enum(['support', 'dth_service', 'service_request']).optional(), event: z.string().max(100).optional() }).strict()),
  companyRefNo: z.string().max(120), adminNotes: z.string().max(3000),
  payment: z.object({ required: z.boolean(), amount: z.number(), status: z.enum(['not_required', 'pending', 'paid', 'refunding', 'refunded', 'failed']),
    gatewayOrderId: z.string().nullable(), paymentId: z.string().nullable(), paidAt: z.string().datetime().nullable(),
    refundId: z.string().nullable(), refundedAt: z.string().datetime().nullable() }).strict(),
  receipt: z.object({ number: z.string().nullable(), path: z.string().nullable(), generatedAt: z.string().datetime().nullable() }).strict(),
  createdAt: z.string().datetime(), updatedAt: z.string().datetime(), checkoutStartedAt: z.string().datetime().optional(),
}).strict().superRefine((ticket, context) => {
  const statuses = ticket.type !== 'service_request' ? ['open', 'in_progress', 'resolved', 'closed'] : ['pending_payment', 'paid', 'placed_with_company', 'resolved', 'closed', 'auto_refunded', 'expired'];
  if (!statuses.includes(ticket.status) || ticket.payment.required !== (ticket.type === 'service_request') || ticket.payment.amount !== (ticket.type === 'service_request' ? 50 : 0)) context.addIssue({ code: 'custom', message: 'Invalid ticket lifecycle or amount.' });
});
export type Ticket = z.infer<typeof ticketSchema>;
