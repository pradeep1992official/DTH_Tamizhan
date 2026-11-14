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
export const assistantActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('navigate'), page: pageSchema }).strict(),
  z.object({ type: z.literal('show_plans'), plans: z.array(z.object({ id: z.string(), name: z.string(),
    operator: z.string(), amount: z.number().finite(), duration: z.number().finite() }).strict()).max(20) }).strict(),
]);
export type AssistantAction = z.infer<typeof assistantActionSchema>;
export function actionNotice(action: AssistantAction): string {
  return action.type === 'navigate' ? `Opening ${action.page.charAt(0).toUpperCase() + action.page.slice(1)} page?` :
    `Showing ${action.plans.length} matching plans.`;
}
