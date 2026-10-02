import { GoogleGenAI } from '@google/genai';

const FALLBACK_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash'
] as const;

export async function generateContentWithFallback(
  ai: GoogleGenAI,
  prompt: string | any,
  config?: any
): Promise<any> {
  let lastError: any = null;

  for (const model of FALLBACK_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const statusCode = err?.status || err?.statusCode || err?.response?.status;
      const isRecoverable = [503, 429, 404, 500, 502, 504].includes(Number(statusCode));
      
      console.warn(`[AI Fallback] Model ${model} failed (status: ${statusCode}), trying fallback ladder...`);
      if (!isRecoverable && statusCode && statusCode < 500) {
        // Non-recoverable client error
        break;
      }
    }
  }

  throw lastError || new Error('All Gemini model fallback attempts failed.');
}
