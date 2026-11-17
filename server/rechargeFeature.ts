import type { RequestHandler } from 'express';

// Fail closed in every environment. Client configuration never grants access.
export function rechargeEnabled() { return process.env.RECHARGE_ENABLED === 'true'; }
export const disabledRechargeEndpoints = new Set([
  '/api/create-order', '/api/payments/session', '/api/payments/youpi', '/api/payments/config',
  '/api/catalog', '/api/plans', '/api/operators', '/api/dth-lookup', '/api/dth-lookup/config',
  '/api/verify-subscriber', '/api/ai/recommend-plans', '/api/ai/recharge',
]);
export const rechargeGuard: RequestHandler = (req, res, next) => {
  let path = req.path;
  try { path = decodeURIComponent(path); } catch { /* Normal router rejects malformed URLs. */ }
  if (!rechargeEnabled() && disabledRechargeEndpoints.has(path.toLowerCase().replace(/\/+$/, ''))) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(404).json({ success: false, code: 'FEATURE_DISABLED', error: 'This feature is not available.' }); return;
  }
  next();
};
