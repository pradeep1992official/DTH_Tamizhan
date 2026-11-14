import { contactDraftSchema, refundDraftSchema } from './assistantDrafts';
import { orderIdSchema, rechargeSummarySchema, type RechargeSummary } from './assistantOrderSchemas';
export { rechargeSummarySchema, type RechargeSummary } from './assistantOrderSchemas';
import { z } from 'zod';
import { languageText, type AssistantLanguage } from './assistantLanguage';
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
export const rechargeStatusArgs = z.object({ order_id: orderIdSchema }).strict();
export const historyArgs = z.object({ limit: z.number().int().min(1).max(20) }).strict();
export function rechargeExplanation(order: RechargeSummary, language: AssistantLanguage = 'en'): string {
  if (language !== 'en') {
    const prefix = order.testMode ? languageText(language, '', 'சோதனை ஆர்டர்: ', 'Test order: ') : '';
    const messages = {
      success: ['உங்கள் ரீசார்ஜ் வெற்றிகரமாக முடிந்தது.', 'Unga recharge vettrikarama mudinjiduchu.'],
      pending: ['உங்கள் ரீசார்ஜ் இன்னும் நிலுவையில் உள்ளது. முடிந்ததாக உறுதி செய்யப்படவில்லை.', 'Unga recharge innum pending-la irukku. Complete aanadhu innum confirm aagala.'],
      failed: ['உங்கள் ரீசார்ஜ் தோல்வியடைந்தது. பணத்திருப்பல் கோரிக்கையைத் தொடங்கலாம்; உதவிக்குழு தகுதியைச் சரிபார்க்கும்.', 'Unga recharge fail aagiduchu. Refund request aarambikkalaam; support eligibility check pannuvaanga.'],
      unknown: ['ரீசார்ஜ் நிலையை உறுதி செய்ய முடியவில்லை. உதவிக்குழுவைத் தொடர்புகொள்ளவும்.', 'Recharge status confirm panna mudiyala. Support-ai contact pannunga.'],
    };
    return prefix + messages[order.status][language === 'ta' ? 0 : 1];
  }
  const prefix = order.testMode ? 'Test order: ' : '';
  if (order.status === 'success') return prefix + 'Your recharge was completed successfully.';
  if (order.status === 'pending') return prefix + 'Your recharge is still pending. It has not been confirmed as completed.';
  if (order.status === 'failed') return prefix + 'Your recharge failed. You can start a refund request with support; eligibility will be reviewed.';
  return prefix + 'The recharge status could not be confirmed. Please contact support.';
}
export const assistantActionSchema = z.discriminatedUnion('type', [
  contactDraftSchema, refundDraftSchema,
  z.object({ type: z.literal('show_recharge_status'), order: rechargeSummarySchema.nullable() }).strict(),
  z.object({ type: z.literal('show_history'), orders: z.array(rechargeSummarySchema).max(20) }).strict(),
  z.object({ type: z.literal('navigate'), page: pageSchema }).strict(),
  z.object({ type: z.literal('show_plans'), plans: z.array(z.object({ id: z.string(), name: z.string(),
    operator: z.string(), amount: z.number().finite(), duration: z.number().finite() }).strict()).max(20) }).strict(),
]);
export type AssistantAction = z.infer<typeof assistantActionSchema>;
export function actionNotice(action: AssistantAction, language: AssistantLanguage = 'en'): string {
  if (language !== 'en') {
    const say = (ta: string, tanglish: string) => languageText(language, '', ta, tanglish);
    if (action.type === 'contact_draft') return say('தொடர்பு வரைவு தயார். திருத்தி சரிபார்த்த பிறகு சமர்ப்பிக்கவும். இன்னும் எதுவும் அனுப்பப்படவில்லை.', 'Contact draft ready. Edit panni check pannitu Submit pannunga. Innum edhuvum anuppala.');
    if (action.type === 'refund_draft') return say('பணத்திருப்பல் வரைவு தயார். கீழே தகுதியைச் சரிபார்த்து திருத்தவும். இன்னும் எதுவும் அனுப்பப்படவில்லை.', 'Refund draft ready. Keezha eligibility check panni edit pannunga. Innum edhuvum anuppala.');
    if (action.type === 'show_recharge_status') return action.order ? rechargeExplanation(action.order, language) : say('உங்கள் கணக்கில் இந்த ஆர்டர் கிடைக்கவில்லை.', 'Unga account-la indha order kidaikkala.');
    if (action.type === 'show_history') return action.orders.length ? say(`உங்கள் சமீபத்திய ${action.orders.length} ரீசார்ஜ்களைக் காட்டுகிறேன்.`, `Unga latest ${action.orders.length} recharges-ai kaatturen.`) : say('உங்கள் கணக்கில் ரீசார்ஜ் வரலாறு இல்லை.', 'Unga account-la recharge history illa.');
    if (action.type === 'show_plans') return say(`${action.plans.length} பொருத்தமான திட்டங்களைக் காட்டுகிறேன்.`, `${action.plans.length} matching plans-ai kaatturen.`);
    const pages = {
      home: ['முகப்பு', 'Home'], recharge: ['ரீசார்ஜ்', 'Recharge'], plans: ['திட்டங்கள்', 'Plans'], connections: ['சேமித்த பாக்ஸ்கள்', 'Saved boxes'],
      contact: ['தொடர்பு', 'Contact'], refund: ['பணத்திருப்பல் கொள்கை', 'Refund policy'], privacy: ['தனியுரிமைக் கொள்கை', 'Privacy policy'], terms: ['விதிமுறைகள்', 'Terms'], account: ['கணக்கு', 'Account'], history: ['வரலாறு', 'History'],
    };
    return say(`${pages[action.page][0]} பக்கத்தைத் திறக்கிறேன்…`, `${pages[action.page][1]} page-ai thirakkuren…`);
  }
  if (action.type === 'contact_draft') return 'Contact draft ready. Review and edit it before submitting. Nothing has been sent.';
  if (action.type === 'refund_draft') return `Refund draft ready. ${action.eligibility.explanation} Nothing has been sent.`;
  if (action.type === 'show_recharge_status') return action.order ? rechargeExplanation(action.order) : 'No matching order was found in your account.';
  if (action.type === 'show_history') return action.orders.length ? `Showing your ${action.orders.length} most recent recharges.` : 'No recharge history was found in your account.';
  return action.type === 'navigate' ? `Opening ${action.page.charAt(0).toUpperCase() + action.page.slice(1)} page?` :
    `Showing ${action.plans.length} matching plans.`;
}
