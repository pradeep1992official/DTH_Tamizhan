import { initializeAppCheck, getToken, ReCaptchaEnterpriseProvider, type AppCheck } from 'firebase/app-check';
import { getApps } from 'firebase/app';
import { paymentAuthHeaders } from './paymentAuth';
import firebaseConfig from '../../firebase-applet-config.json';
let appCheck: AppCheck | undefined;
let configuration: Promise<string> | undefined;
async function siteKey() {
  const built = (import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY || firebaseConfig.appCheckSiteKey)?.trim();
  if (built) return built;
  return configuration ||= (async () => {
    const response = await fetch('/api/support/config', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('Support verification could not be loaded. Please refresh and retry.');
    const config = await response.json();
    if (typeof config.appCheckSiteKey !== 'string' || !/^[A-Za-z0-9_-]{20,200}$/.test(config.appCheckSiteKey)) throw new Error('Support verification is not configured. Please contact Support by email.');
    return config.appCheckSiteKey;
  })().catch(error => { configuration = undefined; throw error; });
}
export async function ticketAuthHeaders() {
  const headers = await paymentAuthHeaders();
  const key = await siteKey();
  const app = getApps().find(app => app.name === '[DEFAULT]');
  if (!app) throw new Error('Please sign in again and retry.');
  try {
    appCheck ||= initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(key), isTokenAutoRefreshEnabled: true });
    const { token } = await getToken(appCheck);
    return { ...headers, 'X-Firebase-AppCheck': token };
  } catch { throw new Error('App verification could not be completed. Refresh the page and retry.'); }
}
