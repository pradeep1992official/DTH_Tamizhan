import { z } from 'zod';

export const supportCategories = ['recharge_failed', 'payment_deducted', 'refund', 'account', 'website_issue', 'other'] as const;
export const serviceCategories = ['no_signal', 'wrong_pack', 'missing_channels', 'box_issue', 'other'] as const;
export const phoneSchema = z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number.');
export const ticketInputSchema = z.object({
  type: z.enum(['support', 'service_request']), name: z.string().trim().min(1).max(100),
  phone: phoneSchema, state: z.string().trim().min(1).max(60).default('Tamil Nadu'),
  brand: z.string().trim().max(50).default(''), subscriberId: z.string().trim().max(25).default(''),
  issueCategory: z.string().max(40), description: z.string().trim().min(5).max(1000),
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
  id: z.string(), ticketNo: z.string().regex(/^(SUP|SRQ)-\d{4,}$/), type: z.enum(['support', 'service_request']),
  uid: z.string().min(1), name: z.string(), phone: phoneSchema, state: z.string(), brand: z.string(), subscriberId: z.string(),
  issueCategory: z.string(), description: z.string().max(1000), orderId: z.string().optional(),
  status: ticketStatusSchema, statusHistory: z.array(z.object({ status: ticketStatusSchema, timestamp: z.string().datetime(), by: z.string() }).strict()),
  companyRefNo: z.string().max(120), adminNotes: z.string().max(3000),
  payment: z.object({ required: z.boolean(), amount: z.number(), status: z.enum(['not_required', 'pending', 'paid', 'refunding', 'refunded', 'failed']),
    gatewayOrderId: z.string().nullable(), paymentId: z.string().nullable(), paidAt: z.string().datetime().nullable(),
    refundId: z.string().nullable(), refundedAt: z.string().datetime().nullable() }).strict(),
  receipt: z.object({ number: z.string().nullable(), path: z.string().nullable(), generatedAt: z.string().datetime().nullable() }).strict(),
  createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
}).strict().superRefine((ticket, context) => {
  const statuses = ticket.type === 'support' ? ['open', 'in_progress', 'resolved', 'closed'] : ['pending_payment', 'paid', 'placed_with_company', 'resolved', 'closed', 'auto_refunded', 'expired'];
  if (!statuses.includes(ticket.status) || ticket.payment.required !== (ticket.type === 'service_request') || ticket.payment.amount !== (ticket.type === 'service_request' ? 50 : 0)) context.addIssue({ code: 'custom', message: 'Invalid ticket lifecycle or amount.' });
});
export type Ticket = z.infer<typeof ticketSchema>;
