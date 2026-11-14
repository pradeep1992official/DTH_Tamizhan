import type { AdminAnalyticsResult } from './adminAnalytics';
import { z } from 'zod';
export const ticketIdSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
export const importedTicketSchema = z.object({
  kind: z.enum(['contact', 'refund']), status: z.enum(['open', 'closed']),
  category: z.enum(['recharge_failed', 'wrong_operator', 'refund', 'account', 'other']),
  subject: z.string().trim().min(1).max(120), message: z.string().trim().min(1).max(2000),
  replyEmail: z.email().max(254), createdAt: z.iso.datetime(),
  orderId: ticketIdSchema.optional(),
}).strict();
export type SupportTicket = z.infer<typeof importedTicketSchema> & { id: string };
export type TicketView = Omit<SupportTicket, 'replyEmail'>;
export const openTicketsArgs = z.object({ kind: z.enum(['all', 'contact', 'refund']), limit: z.number().int().min(1).max(50) }).strict();
export const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00Z`); return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'Use a real YYYY-MM-DD date.');
export const rechargeQueryArgs = z.object({ status: z.enum(['failed', 'pending', 'processing', 'completed']),
  start_date: calendarDateSchema, end_date: calendarDateSchema, limit: z.number().int().min(1).max(100) }).strict();
export const pendingRechargeArgs = z.object({ limit: z.number().int().min(1).max(100),
  cursor: z.object({ time: z.iso.datetime(), id: ticketIdSchema }).strict().optional() }).strict();
export const adminConversationSchema = z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(2000).trim().min(1) }).strict()).max(12);
export const queryMessageSchema = z.object({ message: z.string().max(500).trim().min(1), history: adminConversationSchema.default([]) }).strict();
export const ticketSummaryRequest = z.object({ limit: z.number().int().min(1).max(20).default(20) }).strict();
export const replyDraftRequest = z.object({ instruction: z.string().max(500).trim().default('') }).strict();
export const replyContentSchema = z.object({ subject: z.string().max(120).trim().min(1).regex(/^[^\r\n]*$/), body: z.string().max(3000).trim().min(1) }).strict();
export const replyApprovalSchema = replyContentSchema.extend({ approved: z.literal(true) }).strict();
export const ticketAnalysisSchema = z.object({ entries: z.array(z.object({ ticketId: ticketIdSchema,
  summary: z.string().min(1).max(500), priority: z.enum(['high', 'normal', 'low']), reason: z.string().min(1).max(300),
}).strict()).max(20) }).strict();
export type TicketAnalysis = z.infer<typeof ticketAnalysisSchema>['entries'][number];
export interface AdminRechargeRow { testMode: boolean; orderId: string; operator: string; amount: number; status: string; createdAt: string }
export interface RechargeCounts { total: number; completed: number; pending: number; failed: number; other: number }
export type AdminQueryResult = AdminAnalyticsResult | { type: 'revenue_totals'; live: number; test: number; currency: 'INR'; through_date: string; timezone: 'Asia/Kolkata' } | { type: 'recharge_totals'; live: RechargeCounts; test: RechargeCounts; through_date: string; timezone: 'Asia/Kolkata' } | { type: 'recharges'; rows: AdminRechargeRow[]; parameters: z.infer<typeof rechargeQueryArgs>; timezone: 'Asia/Kolkata'; limited: boolean } |
  { type: 'pending_recharges'; rows: AdminRechargeRow[]; through_date: string; timezone: 'Asia/Kolkata'; nextCursor: { time: string; id: string } | null } |
  { type: 'tickets'; tickets: TicketView[]; limited: boolean };
