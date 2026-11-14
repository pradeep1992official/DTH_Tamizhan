import { initializeAppCheck, getToken, ReCaptchaEnterpriseProvider, type AppCheck } from 'firebase/app-check';
import { getApps } from 'firebase/app';
import { paymentAuthHeaders } from './paymentAuth';
let appCheck: AppCheck | undefined;
export async function ticketAuthHeaders() {
  const headers = await paymentAuthHeaders();
  const key = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY;
  const app = getApps().find(app => app.name === '[DEFAULT]');
  if (!app || !key) throw new Error('Support verification is not configured. Please contact Support by email.');
  appCheck ||= initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(key), isTokenAutoRefreshEnabled: true });
  const { token } = await getToken(appCheck);
  return { ...headers, 'X-Firebase-AppCheck': token };
}
