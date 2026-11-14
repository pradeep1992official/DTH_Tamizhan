import type { Response } from 'express';
import { collections, documentKey, mutateRecord, usesFirestore } from '../persistence';

interface Window { timestamps: number[] }
const local = new Map<string, Window>();
class LimitReached extends Error {}

// Shared by both AI endpoints. Production reservations are atomic across instances.
export async function allowAiRequest(uid: string, res: Response, now = Date.now()): Promise<boolean> {
  const id = `ai_requests_${documentKey(uid)}`;
  const reserve = (old?: Window): Window => {
    const timestamps = (old?.timestamps || []).filter(time => time > now - 60_000);
    if (timestamps.length >= 20) throw new LimitReached();
    return { timestamps: [...timestamps, now] };
  };
  try {
    if (usesFirestore()) await mutateRecord<Window>(collections.runtime, id, reserve);
    else {
      for (const [key, value] of local) if (value.timestamps.at(-1)! <= now - 60_000) local.delete(key);
      local.set(id, reserve(local.get(id)));
    }
    return true;
  } catch (error) {
    if (error instanceof LimitReached) {
      res.setHeader('Retry-After', '60');
      res.status(429).json({ success: false, error: 'AI request limit reached. Try again in a minute.' });
    } else {
      // Fail closed if the shared rate-limit store is unavailable.
      res.status(503).json({ success: false, error: 'AI service temporarily unavailable.' });
    }
    return false;
  }
}
