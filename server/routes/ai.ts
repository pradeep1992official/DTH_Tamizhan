import { Router } from 'express';
import { recommendPlans } from '../controllers/aiController';
import { apiLimiter } from '../middleware/rateLimiter';

export const aiRouter = Router();

aiRouter.post('/api/ai/recommend-plans', apiLimiter, recommendPlans);
