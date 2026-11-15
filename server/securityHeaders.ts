import type { Request, Response } from 'express';
import firebaseConfig from '../firebase-applet-config.json';

export function productionCsp(enforce = process.env.CSP_MODE === 'enforce') {
  const authOrigin = `https://${firebaseConfig.authDomain}`;
  return {
    useDefaults: true,
    reportOnly: !enforce,
    directives: {
      defaultSrc: ["'self'"], baseUri: ["'self'"], objectSrc: ["'none'"],
      scriptSrc: ["'self'", 'https://checkout.razorpay.com', 'https://www.google.com', 'https://www.gstatic.com', 'https://www.recaptcha.net', 'https://apis.google.com', 'https://accounts.google.com', authOrigin],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://*.googleusercontent.com', 'https://*.gstatic.com', 'https://*.razorpay.com'],
      connectSrc: ["'self'", 'https://*.googleapis.com', 'https://*.firebaseio.com', 'wss://*.firebaseio.com', 'https://*.razorpay.com', 'https://www.google.com', 'https://www.recaptcha.net', authOrigin],
      frameSrc: ["'self'", 'https://*.razorpay.com', 'https://www.google.com', 'https://www.recaptcha.net', 'https://accounts.google.com', authOrigin],
      frameAncestors: ["'self'"], formAction: ["'self'", 'https://*.razorpay.com'],
      workerSrc: ["'self'", 'blob:'], reportUri: ['/api/csp-report'],
    },
  };
}
export function cspReport(req: Request, res: Response) {
  const report = req.body?.['csp-report'];
  if (report && typeof report === 'object') {
    let blocked = String(report['blocked-uri'] || '').slice(0, 200);
    try { blocked = new URL(blocked).origin; } catch { blocked = ['inline', 'eval', 'self', 'data', 'blob'].includes(blocked) ? blocked : 'other'; }
    console.warn('[csp]', { directive: String(report['effective-directive'] || '').slice(0, 80), blocked });
  }
  res.sendStatus(204);
}
