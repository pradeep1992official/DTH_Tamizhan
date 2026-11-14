import { z } from 'zod';
// Public destinations from App.tsx and trustContent.ts. No arbitrary URLs or admin routes.
export const assistantPages = {
  home: '/', recharge: '/recharge', plans: '/plans', connections: '/connections',
  contact: '/contact', refund: '/refund-policy', privacy: '/privacy-policy', terms: '/terms',
  account: '/account', history: '/history',
} as const;
export const pageSchema = z.enum(Object.keys(assistantPages) as [keyof typeof assistantPages, ...(keyof typeof assistantPages)[]]);
export const navigateArgs = z.object({ page: pageSchema }).strict();
export const plansArgs = z.object({ operator: z.enum(['sun_direct', 'airtel_dth', 'tata_play', 'dish_tv', 'd2h']),
  max_price: z.number().finite().min(0).max(100000) }).strict();
export const rechargeStatusArgs = z.object({ order_id: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/) }).strict();
export const historyArgs = z.object({ limit: z.number().int().min(1).max(20) }).strict();
export const rechargeSummarySchema = z.object({ orderId: z.string(), status: z.enum(['success', 'pending', 'failed', 'unknown']),
  amount: z.number().finite(), packName: z.string(), createdAt: z.string(), testMode: z.boolean() }).strict();
export type RechargeSummary = z.infer<typeof rechargeSummarySchema>;
export function rechargeExplanation(order: RechargeSummary): string {
  const prefix = order.testMode ? 'Test order: ' : '';
  if (order.status === 'success') return prefix + 'Your recharge was completed successfully.';
  if (order.status === 'pending') return prefix + 'Your recharge is still pending. It has not been confirmed as completed.';
  if (order.status === 'failed') return prefix + 'Your recharge failed. You can start a refund request with support; eligibility will be reviewed.';
  return prefix + 'The recharge status could not be confirmed. Please contact support.';
}
export const assistantActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('show_recharge_status'), order: rechargeSummarySchema.nullable() }).strict(),
  z.object({ type: z.literal('show_history'), orders: z.array(rechargeSummarySchema).max(20) }).strict(),
  z.object({ type: z.literal('navigate'), page: pageSchema }).strict(),
  z.object({ type: z.literal('show_plans'), plans: z.array(z.object({ id: z.string(), name: z.string(),
    operator: z.string(), amount: z.number().finite(), duration: z.number().finite() }).strict()).max(20) }).strict(),
]);
export type AssistantAction = z.infer<typeof assistantActionSchema>;
export function actionNotice(action: AssistantAction): string {
  if (action.type === 'show_recharge_status') return action.order ? rechargeExplanation(action.order) : 'No matching order was found in your account.';
  if (action.type === 'show_history') return action.orders.length ? `Showing your ${action.orders.length} most recent recharges.` : 'No recharge history was found in your account.';
  return action.type === 'navigate' ? `Opening ${action.page.charAt(0).toUpperCase() + action.page.slice(1)} page?` :
    `Showing ${action.plans.length} matching plans.`;
}
