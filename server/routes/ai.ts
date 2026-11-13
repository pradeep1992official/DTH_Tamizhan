import { Router } from 'express';
import { recommendPlans } from '../controllers/aiController';
import { apiLimiter } from '../middleware/rateLimiter';
import { forwardAsyncErrors } from '../asyncRoutes';
import { prepareAssistantRecharge } from '../controllers/rechargeAssistant';

export const aiRouter = Router();

aiRouter.post('/api/ai/recommend-plans', apiLimiter, recommendPlans);
aiRouter.post('/api/ai/recharge', apiLimiter, prepareAssistantRecharge);
forwardAsyncErrors(aiRouter);
