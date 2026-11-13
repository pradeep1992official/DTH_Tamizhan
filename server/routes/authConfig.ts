import { Router } from 'express';
export const authConfigRouter = Router();
authConfigRouter.get('/api/auth/config', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ phoneEnabled: process.env.FIREBASE_PHONE_AUTH_ENABLED === 'true' });
});
