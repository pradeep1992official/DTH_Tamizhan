import { allowAiRequest } from '../middleware/aiRateLimiter';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { planModel } from '../models/planModel';
import { validateCatalogPack } from '../../src/lib/catalog';
import { verifyAuthToken } from '../middleware/auth';
import { freeTierRank, FreeAiUnavailable } from '../utils/freeTierAi';
import { customerMessages } from '../../src/lib/customerMessages';

const schema = z.object({ operator: z.enum(['any', 'sun_direct', 'airtel_dth', 'tata_play', 'dish_tv', 'd2h']).default('any'),
  monthlyBudget: z.number().finite().min(100).max(10000).default(300), quality: z.enum(['all', 'HD', 'SD']).default('all'),
  duration: z.union([z.literal(0), z.literal(1), z.literal(3), z.literal(6), z.literal(12)]).default(0),
  preferences: z.string().max(500).trim().default(''), preferredLanguage: z.enum(['en', 'ta']).default('en') });

export async function recommendPlans(req: Request, res: Response): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const account = await verifyAuthToken(req);
    if (!account) { res.status(401).json({ success: false, error: 'Sign in to get plan suggestions.' }); return; }
    if (!await allowAiRequest(account.uid, res)) return;
    const input = schema.safeParse(req.body);
    if (!input.success) { res.status(400).json({ success: false, error: 'Check your budget and plan preferences.' }); return; }
    const { operator, monthlyBudget, quality, duration, preferences, preferredLanguage } = input.data;
    const plans = (await planModel.getAll()).filter(plan => !validateCatalogPack(plan).length);
    if (!plans.length) { res.status(503).json({ success: false, error: customerMessages[preferredLanguage].uiAiUnavailable }); return; }
    const words = preferences.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    const score = (plan: typeof plans[number]) => words.filter(word => `${plan.plan_name} ${(plan.genre_tags || []).join(' ')}`.toLowerCase().includes(word)).length;
    const languageNames: Record<string, string[]> = { telugu: ['telugu', 'తెలుగు', 'தெலுங்கு'], tamil: ['tamil', 'தமிழ்'], hindi: ['hindi', 'हिन्दी', 'இந்தி'],
      malayalam: ['malayalam', 'മലയാളം', 'மலையாளம்'], kannada: ['kannada', 'ಕನ್ನಡ', 'கன்னடம்'], bengali: ['bengali', 'বাংলা'], marathi: ['marathi', 'मराठी'] };
    const requestedLanguages = Object.entries(languageNames).filter(([, names]) => names.some(name => preferences.toLowerCase().includes(name))).map(([name]) => name);
    const matches = plans.filter(plan => (operator === 'any' || plan.operator === operator) && (quality === 'all' || plan.pack_type === quality) &&
      (!duration || plan.duration_months === duration) && requestedLanguages.every(language => languageNames[language].some(name => `${plan.plan_name} ${plan.tamilName || ''} ${(plan.genre_tags || []).join(' ')}`.toLowerCase().includes(name))));
    const candidates = matches.filter(plan => plan.amount / plan.duration_months <= monthlyBudget)
      .sort((a, b) => score(b) - score(a) || a.amount / a.duration_months - b.amount / b.duration_months || a.id.localeCompare(b.id)).slice(0, 12);
    const summary = (plan: typeof plans[number]) => ({ id: plan.id, name: preferredLanguage === 'ta' ? plan.tamilName || plan.plan_name : plan.plan_name,
      operator: plan.operator, quality: plan.pack_type, amount: plan.amount, duration: plan.duration_months, monthlyRate: Math.round(plan.amount / plan.duration_months * 100) / 100 });
    if (!candidates.length) {
      // Explicit language preferences must not silently turn into unrelated packs.
      const alternatives = requestedLanguages.length ? [...matches].sort((a, b) => a.amount / a.duration_months - b.amount / b.duration_months || a.id.localeCompare(b.id)).slice(0, 3) : [];
      res.json({ success: true, source: 'catalog', plans: alternatives.map(summary), notice: alternatives.length ? 'over_budget' : 'no_matches', monthlyBudget }); return;
    }
    let selected = candidates.slice(0, 3); let source = 'catalog'; let notice = 'setup';
    try {
      const ids = await freeTierRank(account.uid, candidates.map(plan => ({ id: plan.id, name: plan.plan_name.slice(0, 100), tags: (plan.genre_tags || []).slice(0, 8).map(tag => tag.slice(0, 40)) })), preferences);
      selected = ids.map(id => candidates.find(plan => plan.id === id)!); source = 'ai'; notice = '';
    } catch (error) {
      notice = error instanceof FreeAiUnavailable ? error.limit || error.reason : 'provider';
      // Our diagnostics contain no key, prompt, personal data or raw provider payload.
      console.warn('[ai] Catalog fallback:', notice, error instanceof FreeAiUnavailable ? error.message : 'Recommendation service unavailable.');
    }
    // All prices, validity and names come from the catalog, never generated text.
    res.json({ success: true, source, notice, plans: selected.map(summary) });
  } catch { res.status(503).json({ success: false, error: 'Plan suggestions are unavailable. Please use the catalog filters.' }); }
}
