import type { Language } from '../types';
import { POLICY_ROUTES } from './trustContent';

export interface PageMetadata { title: string; description: string; status: 200 | 404 | 500; noindex: boolean; path: string }
const pages: Record<string, { en: [string, string]; ta: [string, string] }> = {
  '/history': { en: ['Your Recharge History', 'Sign in to view your recharge history, payment status and receipts across all your boxes.'], ta: ['உங்கள் ரீசார்ஜ் வரலாறு', 'உங்கள் பாக்ஸ்களின் ரீசார்ஜ் வரலாறு, கட்டண நிலை மற்றும் ரசீதுகளைப் பார்க்க உள்நுழையவும்.'] },
  '/recharge': { en: ['DTH Recharge', 'Review DTH operator packs, subscriber details and custom top-up options before checkout.'], ta: ['டிடிஎச் ரீசார்ஜ்', 'கட்டணத்திற்கு முன் டிடிஎச் பேக்குகள், சந்தாதாரர் விவரங்கள் மற்றும் விருப்பத் தொகை வாய்ப்புகளைப் பாருங்கள்.'] },
  '/plans': { en: ['Browse DTH Packs', 'Search and compare DTH packs by operator, duration, price and declared channel counts.'], ta: ['டிடிஎச் பேக்குகளைப் பார்க்கவும்', 'ஆபரேட்டர், காலம், விலை மற்றும் சேனல் எண்ணிக்கையின் அடிப்படையில் பேக்குகளைத் தேடி ஒப்பிடுங்கள்.'] },
  '/account': { en: ['Your Account', 'Sign in to manage your DTH Tamizhan account and access saved connections.'], ta: ['உங்கள் கணக்கு', 'உங்கள் கணக்கை நிர்வகிக்கவும் சேமித்த இணைப்புகளை அணுகவும் உள்நுழையுங்கள்.'] },
  '/connections': { en: ['Saved Set-Top Boxes', 'Manage saved DTH subscriber IDs and choose a connection for a recharge request.'], ta: ['சேமித்த செட்-டாப் பெட்டிகள்', 'சேமித்த சந்தாதாரர் எண்களை நிர்வகித்து ரீசார்ஜுக்கான இணைப்பைத் தேர்ந்தெடுக்கவும்.'] },
};
const policyDescriptions = {
  contact: ['Find support details and learn how to raise a recharge, payment or privacy concern.', 'ரீசார்ஜ், கட்டணம் மற்றும் தனியுரிமை கேள்விகளுக்கான உதவி விவரங்களைப் பார்க்கவும்.'],
  refund: ['Read the draft rules for cancellations, failed or duplicate payments, pending transactions and refunds.', 'ரத்து, தோல்வியுற்ற அல்லது இரட்டைக் கட்டணங்கள், நிலுவை பரிவர்த்தனைகள் மற்றும் பணத்திருப்பல் பற்றிய வரைவைப் படிக்கவும்.'],
  privacy: ['Read the draft privacy notice covering account data, saved boxes, browser storage and privacy requests.', 'கணக்குத் தரவு, சேமித்த பெட்டிகள், உலாவிச் சேமிப்பு மற்றும் தனியுரிமைக் கோரிக்கைகள் பற்றிய வரைவைப் படிக்கவும்.'],
  terms: ['Read the draft terms for DTH recharge requests, payment status, service issues and consumer remedies.', 'டிடிஎச் கோரிக்கைகள், கட்டண நிலை மற்றும் சேவைச் சிக்கல்களுக்கான பயன்பாட்டு விதிமுறை வரைவைப் படிக்கவும்.'],
};
const adminTabs = new Set(['customer', 'customers', 'pending', 'worker', 'dealer', 'recharge', 'recharges', 'orders', 'pack', 'packs', 'plan', 'plans', 'payment', 'payments', 'report', 'reports', 'audit', 'operator', 'operators', 'approval', 'approvals', 'admin-access']);
export function normalizedPath(path: string): string { return path.split(/[?#]/)[0].replace(/\/+$/, '') || '/'; }
export function pageMetadata(path: string, lang: Language = 'en'): PageMetadata {
  const requestedPath = normalizedPath(path);
  path = requestedPath === '/' ? '/recharge' : requestedPath;
  const base = { path: requestedPath, status: 200 as const, noindex: false };
  if (path === '/500') return { ...base, status: 500, noindex: true, title: `${lang === 'ta' ? 'சேவைப் பிழை' : 'Service error'} (500) | DTH Tamizhan`, description: lang === 'ta' ? 'பக்கம் ஏற்றப்படவில்லை. முகப்புப் பக்கத்திற்குத் திரும்பவும்.' : 'The page could not be loaded. Return to the home page.' };
  if (path === '/worker' || path === '/dealer' || path === '/admin' || (path.startsWith('/admin/') && adminTabs.has(path.slice(7)))) {
    return { ...base, noindex: true, title: `${lang === 'ta' ? 'நிர்வாகம்' : 'Administration'}${path.startsWith('/admin/') ? ` - ${path.slice(7)}` : ''} | DTH Tamizhan`, description: lang === 'ta' ? 'அங்கீகரிக்கப்பட்ட நிர்வாகிகளுக்கான செயல்பாட்டுப் பக்கம்.' : 'Restricted operations for authorized administrators.' };
  }
  const policy = POLICY_ROUTES.find(route => route.path === path);
  if (policy) return { ...base, title: `${policy[lang]} | DTH Tamizhan`, description: policyDescriptions[policy.key][lang === 'ta' ? 1 : 0] };
  if (pages[path]) {
    const [title, description] = pages[path][lang];
    return { ...base, noindex: path === '/account' || path === '/history', title: `${title} | DTH Tamizhan`, description };
  }
  return { ...base, status: 404, noindex: true, title: `${lang === 'ta' ? 'பக்கம் கிடைக்கவில்லை' : 'Page not found'} (404) | DTH Tamizhan`, description: lang === 'ta' ? 'இந்த முகவரி கிடைக்கவில்லை. முகப்புப் பக்கத்திற்குத் திரும்பவும்.' : 'This address does not exist. Return to the home page to continue.' };
}

export function updatePageMetadata(doc: Document, path: string, lang: Language, origin: string): void {
  const meta = pageMetadata(path, lang);
  doc.title = meta.title;
  doc.documentElement.lang = lang;
  const set = (attribute: 'name' | 'property', key: string, value: string) => {
    let element = doc.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
    if (!element) { element = doc.createElement('meta'); element.setAttribute(attribute, key); doc.head.append(element); }
    element.content = value;
  };
  set('name', 'description', meta.description);
  set('name', 'robots', meta.noindex ? 'noindex, nofollow' : 'index, follow');
  set('property', 'og:title', meta.title); set('property', 'og:description', meta.description);
  set('property', 'og:type', 'website'); set('property', 'og:url', new URL(meta.path, origin).href);
  set('property', 'og:image', new URL('/icon-512.png', origin).href);
  set('property', 'og:locale', lang === 'ta' ? 'ta_IN' : 'en_IN');
  let canonical = doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (meta.status === 200) {
    if (!canonical) { canonical = doc.createElement('link'); canonical.rel = 'canonical'; doc.head.append(canonical); }
    canonical.href = new URL(meta.path, origin).href;
  } else canonical?.remove();
}
