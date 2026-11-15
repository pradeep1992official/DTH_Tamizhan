import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { isCallerAdminAuthorized, verifyAuthToken } from '../middleware/auth';
import { forwardAsyncErrors } from '../asyncRoutes';
import { customerLookupInput, adminDthLookupInput } from '../../src/lib/dthLookup';
import { dthLookupConfigured, dthLookupProviders, lookupDth } from '../models/dthLookup';
import { customerDthLookup, LookupLimitError } from '../models/customerDthLookup';
import { ticketProtection } from '../middleware/ticketProtection';

export const dthLookupRouter = Router();
dthLookupRouter.use('/api/admin/dth-lookup', async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (!await verifyAuthToken(req)) { res.status(401).json({ success: false, error: 'Please sign in.' }); return; }
    if (!(await isCallerAdminAuthorized(req, new Set())).authorized) { res.status(403).json({ success: false, error: 'Administrator access required.' }); return; }
    next();
  } catch { res.status(503).json({ success: false, error: 'Admin access could not be verified.' }); }
});
dthLookupRouter.get('/api/admin/dth-lookup/config', (_req, res) => { res.json({ success: true, configured: dthLookupConfigured(), providers: dthLookupProviders() }); });
const limiter = rateLimit({ windowMs: 60_000, limit: 5, standardHeaders: true, legacyHeaders: false, message: { success: false, error: 'Wait a minute before another test.' } });
dthLookupRouter.post('/api/admin/dth-lookup/test', limiter, async (req, res) => {
  const parsed = adminDthLookupInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ success: false, error: 'Choose an operator and enter a 9–13 digit subscriber ID.' }); return; }
  if (parsed.data.mode === 'live' && !parsed.data.consent) { res.status(400).json({ success: false, error: 'Confirm permission and lookup charges.' }); return; }
  if (parsed.data.mode === 'live' && !dthLookupProviders().some(provider => provider.ready && (parsed.data.provider === 'auto' || provider.id === parsed.data.provider))) { res.status(503).json({ success: false, error: 'Configure the selected lookup provider on the server and restart.' }); return; }
  try { const { provider, ...input } = parsed.data; res.json(await lookupDth(input, provider)); }
  catch { res.status(502).json({ success: false, error: 'Lookup unavailable. Check provider request history before retrying.' }); }
});
const customerEnabled = () => dthLookupConfigured() && process.env.DTH_CUSTOMER_LOOKUP_ENABLED !== 'false';
dthLookupRouter.get('/api/dth-lookup/config', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.json({ enabled: customerEnabled() });
});
dthLookupRouter.post('/api/dth-lookup', async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  const account = await verifyAuthToken(req);
  if (!account) { res.status(401).json({ success: false, error: 'Sign in to check your DTH details.' }); return; }
  res.locals.uid = account.uid; next();
}, ticketProtection, async (req, res) => {
  const parsed = customerLookupInput.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ success: false, error: 'Confirm permission and enter a valid operator and subscriber ID.' }); return; }
  if (!customerEnabled()) { res.status(503).json({ success: false, error: 'Details check is unavailable. You can continue manually.' }); return; }
  try { res.json(await customerDthLookup(res.locals.uid, parsed.data)); }
  catch (error) { res.status(error instanceof LookupLimitError ? 429 : 503).json({ success: false, error: error instanceof LookupLimitError ? error.message : 'Details check is unavailable. You can continue manually.' }); }
});
forwardAsyncErrors(dthLookupRouter);
