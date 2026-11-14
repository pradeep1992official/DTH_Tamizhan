import { aiRequestScope, AiToolAccessDenied } from '../utils/aiToolSecurity';
import { executeAssistantTool } from '../utils/assistantTools';
import { verifyAuthToken } from '../middleware/auth';
import { allowAiRequest } from '../middleware/aiRateLimiter';
import { refundDraftArgs } from '../../src/lib/assistantDrafts';
import { Router } from 'express';
import { recommendPlans } from '../controllers/aiController';
import { apiLimiter } from '../middleware/rateLimiter';
import { forwardAsyncErrors } from '../asyncRoutes';
import { prepareAssistantRecharge } from '../controllers/rechargeAssistant';

export const aiRouter = Router();
aiRouter.use(aiRequestScope);

aiRouter.post('/api/ai/recommend-plans', apiLimiter, recommendPlans);
aiRouter.post('/api/ai/recharge', apiLimiter, prepareAssistantRecharge);
// A user-triggered submit preflight: read-only business data; mandatory audit events are written.
aiRouter.post('/api/ai/refund-draft-check', apiLimiter, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const account = await verifyAuthToken(req);
  if (!account) { res.status(401).json({ success: false, error: 'Please sign in.' }); return; }
  if (!await allowAiRequest(account.uid, res)) return;
  const parsed = refundDraftArgs.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ success: false, error: 'Invalid refund draft.' }); return; }
  try { res.json({ success: true, action: await executeAssistantTool('draft_refund_request', parsed.data, account.uid) }); }
  catch (error) { res.status(error instanceof AiToolAccessDenied ? error.status : 503).json({ success: false, error: error instanceof AiToolAccessDenied ? error.message : 'Refund eligibility could not be checked. Please retry.' }); }
});
forwardAsyncErrors(aiRouter);
