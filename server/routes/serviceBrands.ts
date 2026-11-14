import { Router } from 'express';
import { z } from 'zod';
import { verifyAuthToken, isCallerAdminAuthorized } from '../middleware/auth';
import { readServiceBrands, saveServiceBrands } from '../models/serviceBrands';
export const serviceBrandsRouter = Router();
serviceBrandsRouter.get('/api/service-brands', async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try { res.json({ success: true, brands: await readServiceBrands() }); }
  catch { res.status(503).json({ success: false, error: 'Brand settings could not be loaded. Please retry.' }); }
});
serviceBrandsRouter.post('/api/admin/service-brands', async (req, res) => {
  try {
    const account = await verifyAuthToken(req);
    if (!account) { res.status(401).json({ success: false, error: 'Please sign in.' }); return; }
    if (!(await isCallerAdminAuthorized(req, new Set())).authorized) { res.status(403).json({ success: false, error: 'Administrator access required.' }); return; }
    const { brands } = z.object({ brands: z.unknown() }).strict().parse(req.body);
    res.json({ success: true, brands: await saveServiceBrands(brands, account.uid) });
  } catch (error) { res.status(error instanceof z.ZodError ? 400 : 503).json({ success: false, error: 'Brand settings could not be saved. Check the fields and retry.' }); }
});
