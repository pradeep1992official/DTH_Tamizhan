import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { generateContentWithFallback } from '../utils/aiFallback';
import { customerMessages } from '../../src/lib/customerMessages';
import { planModel } from '../models/planModel';
import { validateCatalogPack } from '../../src/lib/catalog';

let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({});
  } catch (error) {
    console.warn('[AI Setup] Failed to initialize GoogleGenAI client:', error);
  }
}

export async function recommendPlans(req: Request, res: Response): Promise<void> {
  try {
    const { operator, monthlyBudget, preferences, preferredLanguage } = req.body;
    if (!aiClient) {
      res.status(503).json({ success: false, error: customerMessages[preferredLanguage === 'ta' ? 'ta' : 'en'].uiAiUnavailable });
      return;
    }

    const prompt = `You are an expert Tamil Nadu DTH advisor for DTH Tamizhan.
User requested a plan recommendation with:
- Operator: ${operator || 'Any'}
- Monthly Budget: Rs. ${monthlyBudget || 300}
- Content Preferences: ${preferences || 'Tamil Movies, Sports & News'}
- Preferred Language: ${preferredLanguage === 'ta' ? 'Tamil (தமிழ்)' : 'English'}

Available catalog records: ${JSON.stringify((await planModel.getAll()).filter(pack => !validateCatalogPack(pack).length).map(pack => ({ operator: pack.operator, name: pack.plan_name, amount: pack.amount, duration_months: pack.duration_months })))}
Use only these catalog records. If none match, say so. Do not invent packs, prices, channel counts, statistics, testimonials, rankings, savings or activation times. Use Rs. for currency and month/months for durations. Reply in the requested language with 2-3 plain-language sentences.`;
    const result = await generateContentWithFallback(aiClient, prompt);
    if (!result.text) { res.status(503).json({ success: false, error: customerMessages[preferredLanguage === 'ta' ? 'ta' : 'en'].uiAiUnavailable }); return; }
    res.json({
      success: true,
      recommendation: result.text,
    });
  } catch (error) {
    console.error('[API Error] /api/ai/recommend-plans failed:', error);
    res.status(500).json({ success: false, error: customerMessages[req.body.preferredLanguage === 'ta' ? 'ta' : 'en'].uiAiUnavailable });
  }
}
