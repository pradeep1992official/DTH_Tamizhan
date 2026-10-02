import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { generateContentWithFallback } from '../utils/aiFallback';
import { apiLimiter } from '../middleware/rateLimiter';

export const aiRouter = Router();

let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({});
  } catch (err) {
    console.warn('[AI Setup] Failed to initialize GoogleGenAI client:', err);
  }
}

aiRouter.post('/api/ai/recommend-plans', apiLimiter, async (req: Request, res: Response) => {
  try {
    const { operator, monthlyBudget, preferences, preferredLanguage } = req.body;

    if (!aiClient) {
      res.json({
        success: true,
        recommendation: `Based on your budget of ₹${monthlyBudget || 300}, we recommend the ${operator === 'sun_direct' ? 'Sun Direct Prime HD' : 'Tamil Entertainment HD'} pack.`,
      });
      return;
    }

    const prompt = `You are an expert Tamil Nadu DTH advisor for DTH Tamizhan.
User requested a plan recommendation with:
- Operator: ${operator || 'Any'}
- Monthly Budget: ₹${monthlyBudget || 300}
- Content Preferences: ${preferences || 'Tamil Movies, Sports & News'}
- Preferred Language: ${preferredLanguage === 'ta' ? 'Tamil (தமிழ்)' : 'English'}

Provide a friendly 2-3 sentence recommendation highlighting value, HD clarity, and savings.`;

    const result = await generateContentWithFallback(aiClient, prompt);
    res.json({
      success: true,
      recommendation: result.text || 'Recommended Tamil HD entertainment pack.',
    });
  } catch (err: any) {
    console.error('[API Error] /api/ai/recommend-plans failed:', err);
    res.status(500).json({ success: false, error: 'AI recommendation service unavailable' });
  }
});
