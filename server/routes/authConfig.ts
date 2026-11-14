import { Router } from 'express';
import firebaseConfig from '../../firebase-applet-config.json';
export const authConfigRouter = Router();
authConfigRouter.get('/api/auth/config', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ phoneEnabled: process.env.FIREBASE_PHONE_AUTH_ENABLED === 'true' });
});
// The reCAPTCHA site key is public configuration, never a secret or debug token.
authConfigRouter.get('/api/support/config', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const siteKey = (process.env.FIREBASE_APPCHECK_SITE_KEY || process.env.VITE_FIREBASE_APPCHECK_SITE_KEY || firebaseConfig.appCheckSiteKey || '').trim();
  res.json({ appCheckSiteKey: /^[A-Za-z0-9_-]{20,200}$/.test(siteKey) ? siteKey : null });
});
