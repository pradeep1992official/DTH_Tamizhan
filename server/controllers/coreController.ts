import { Request, Response } from 'express';
import { OPERATORS } from '../models/store';

export function health(_req: Request, res: Response): void {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'DTH Tamizhan Core Service',
  });
}

export function listOperators(_req: Request, res: Response): void {
  res.json({ success: true, operators: OPERATORS });
}
