import { z } from 'zod';
import { phoneSchema, supportCategories, serviceCategories, stripTicketHtml } from './tickets';
const summary = z.string().transform(stripTicketHtml).pipe(z.string().min(5).max(160));
export const supportRecommendationArgs = z.object({ problem_text: z.string().trim().min(5).max(500) }).strict();
export const supportClassificationSchema = z.object({ option: z.enum(['free_ticket', 'service_request']), category: z.enum([...supportCategories, ...serviceCategories]), summary }).strict().refine(value => (value.option === 'free_ticket' ? [...supportCategories] as string[] : [...serviceCategories] as string[]).includes(value.category), 'Invalid category for recommendation.');
export const supportPrefillArgs = z.object({ description: summary, issueCategory: z.enum(supportCategories),
  name: z.string().trim().min(1).max(100).optional(), phone: phoneSchema.optional(), orderId: z.string().regex(/^[\w-]{1,128}$/).optional() }).strict();
export const servicePrefillArgs = z.object({ description: summary, issueCategory: z.enum(serviceCategories),
  name: z.string().trim().min(1).max(100).optional(), phone: phoneSchema.optional(), state: z.string().trim().min(1).max(60).optional(),
  brand: z.string().regex(/^[a-z][a-z0-9_]{1,49}$/).optional(), subscriberId: z.string().regex(/^\d{1,25}$/).optional() }).strict();
export const supportRecommendationAction = z.object({ type: z.literal('support_recommendation'), recommendation: supportClassificationSchema }).strict();
export const supportPrefillAction = z.object({ type: z.literal('prefill_support'), fields: supportPrefillArgs }).strict();
export const servicePrefillAction = z.object({ type: z.literal('prefill_service_request'), fields: servicePrefillArgs }).strict();
export function supportOptionExplanation(option: string, language = 'en') {
  if (language === 'ta') return option === 'free_ticket' ? 'இணையதளம், ரீசார்ஜ், கட்டணம் அல்லது கணக்கு பிரச்சனைக்கு உதவி கோரிக்கை இலவசம். படிவத்தை சரிபார்த்த பிறகு சமர்ப்பிக்கவும்.' : 'DTH நிறுவன வாடிக்கையாளர் சேவையை இலவசமாக அழைக்கலாம். உங்கள் சார்பில் புகார் பதிவு செய்து எண்ணைப் பகிரும் வசதிக்கு ரூ.50 கட்டணம். கட்டணம் உறுதியான 24 மணிநேரத்திற்குள் பதிவு செய்யாவிட்டால் திருப்பித் தரப்படும். இப்போது சோதனை கட்டணம் மட்டுமே. படிவத்தை சரிபார்த்து நீங்களே கட்டணம் செலுத்த வேண்டும்.';
  if (language === 'tanglish') return option === 'free_ticket' ? 'Website, recharge, payment illa account prachanai-ku support ticket ilavasam. Form-ai check pannitu submit pannunga.' : 'DTH company customer care-ku free-aa call pannalaam. Unga saarba complaint register panni number share panna Rs.50 convenience fee. Payment confirm aana 24 hours-kulla register pannalena refund. Ippo test checkout mattum. Form check panni neengale pay pannanum.';
  return option === 'free_ticket' ? 'This looks like a website, recharge, payment or account issue. A support ticket is free. Review the form before submitting.' :
    "You can call your DTH company's customer care for free. Our Rs. 50 convenience service registers the complaint for you and shares the reference. If it is not placed within 24 hours of verified payment, the fee is refunded. Review the form before paying yourself. Checkout is currently test-only.";
}
