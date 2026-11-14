import { z } from 'zod';
export const orderIdSchema = z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/);
export const rechargeSummarySchema = z.object({ orderId: z.string(), status: z.enum(['success', 'pending', 'failed', 'unknown']),
  amount: z.number().finite(), packName: z.string(), createdAt: z.string(), testMode: z.boolean() }).strict();
export type RechargeSummary = z.infer<typeof rechargeSummarySchema>;
