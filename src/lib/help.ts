import { z } from 'zod';
import { phoneSchema, stripTicketHtml } from './tickets';
export const helpProblems = {
  recharge_failed: { route: 'free', category: 'recharge_failed', en: 'Recharge failed', ta: 'ரீசார்ஜ் தோல்வி' },
  payment_deducted: { route: 'free', category: 'payment_deducted', en: 'Money deducted', ta: 'பணம் பிடிக்கப்பட்டது' },
  refund: { route: 'free', category: 'refund', en: 'Refund', ta: 'பணத்திருப்பல்' },
  website_issue: { route: 'free', category: 'website_issue', en: 'Website / app problem', ta: 'இணையதளப் பிரச்சனை' },
  account: { route: 'free', category: 'account', en: 'Account / login', ta: 'கணக்கு / உள்நுழைவு' },
  no_signal: { route: 'dth_service', category: 'no_signal', en: 'No signal / box not working', ta: 'சிக்னல் இல்லை / பெட்டி இயங்கவில்லை' },
  wrong_pack: { route: 'dth_service', category: 'wrong_pack', en: 'Wrong pack activated', ta: 'தவறான திட்டம்' },
  missing_channels: { route: 'dth_service', category: 'missing_channels', en: 'Channels missing', ta: 'சேனல்கள் இல்லை' },
  company_billing: { route: 'dth_service', category: 'company_billing', en: 'Company billing / balance', ta: 'நிறுவனக் கட்டணம் / இருப்பு' },
} as const;
export const helpProblemSchema = z.enum(['other', ...Object.keys(helpProblems)]);
export const helpInputSchema = z.object({ requestKey: z.string().uuid(), phone: phoneSchema, brand: z.string().max(50).default(''),
  subscriberId: z.string().regex(/^\d{0,25}$/).default(''), problem: helpProblemSchema,
  fullAddress: z.string().max(500).transform(stripTicketHtml).default(''),
  description: z.string().max(1000).transform(stripTicketHtml).default(''), orderId: z.string().regex(/^[\w-]{1,128}$/).optional(),
  language: z.enum(['en', 'ta']).default('en'),
}).strict().refine(value => value.problem !== 'other' || value.description.length >= 5, 'Describe the problem in at least 5 characters.');
export const helpPrefillSchema = z.object({ phone: phoneSchema.optional(), brand: z.string().max(50).optional(), subscriberId: z.string().regex(/^\d{1,25}$/).optional(),
  fullAddress: z.string().max(500).transform(stripTicketHtml).optional(),
  description: z.string().max(1000).transform(stripTicketHtml).optional(), issueCategory: z.string().max(40).optional(),
  orderId: z.string().regex(/^[\w-]{1,128}$/).optional(), name: z.string().max(100).optional(), state: z.string().max(60).optional(),
}).strict();
