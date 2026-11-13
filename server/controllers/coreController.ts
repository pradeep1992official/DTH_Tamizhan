import { Request, Response } from 'express';
import { readOperators } from '../models/sharedStore';
import { usesFirestore } from '../persistence';

export function health(_req: Request, res: Response): void {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'DTH Tamizhan Core Service',
    persistence: usesFirestore() ? 'firestore' : 'file',
  });
}

export async function listOperators(_req: Request, res: Response): Promise<void> {
  res.json({ success: true, operators: await readOperators() });
}
