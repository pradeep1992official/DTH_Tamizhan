import { z } from 'zod';
import { calendarDateSchema, adminConversationSchema } from './adminAi';
export const analyticsRangeSchema = z.object({ from: calendarDateSchema.nullable(), to: calendarDateSchema }).strict();
export const totalOrdersArgs = analyticsRangeSchema.extend({ status: z.enum(['all', 'pending', 'processing', 'completed', 'failed']) }).strict();
export const topPlansArgs = z.object({ limit: z.number().int().min(1).max(20) }).strict();
export const adminHistorySchema = adminConversationSchema;
export type AdminHistory = z.infer<typeof adminHistorySchema>;
export type AnalyticsRange = z.infer<typeof analyticsRangeSchema>;
export const ADMIN_DATA_TOOLS = ['get_total_orders', 'get_total_revenue', 'get_failed_recharges', 'get_top_plans', 'get_orders_by_operator', 'get_pending_refunds'] as const;
export type AdminDataTool = typeof ADMIN_DATA_TOOLS[number];
export interface AdminAnalyticsResult { type: 'analytics'; tool: AdminDataTool; parameters: Record<string, unknown>; timezone: 'Asia/Kolkata'; data: Record<string, unknown> }
