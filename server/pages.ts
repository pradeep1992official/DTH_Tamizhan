import type { ErrorRequestHandler, Request, RequestHandler } from 'express';
import { pageMetadata } from '../src/lib/pageMetadata';
import type { Language } from '../src/types';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
export function requestLanguage(req: Request): Language {
  const cookie = req.headers.cookie?.match(/(?:^|;\s*)dth_lang=(en|ta)(?:;|$)/)?.[1];
  return cookie === 'ta' || (!cookie && req.headers['accept-language']?.startsWith('ta')) ? 'ta' : 'en';
}
export function statusPageBody(status: 404 | 500): string {
  return `<main style="max-width:48rem;margin:4rem auto;padding:2rem;font:1rem/1.6 system-ui;color:#33272b;background:#fffefa"><h1>${status} — ${status === 404 ? 'Page not found / பக்கம் கிடைக்கவில்லை' : 'Service error / சேவைப் பிழை'}</h1><p>${status === 404 ? 'This address does not exist. / இந்த முகவரி கிடைக்கவில்லை.' : 'The page could not be loaded. This is not confirmation of payment. / பக்கத்தை ஏற்ற முடியவில்லை. இது கட்டணம் வெற்றியடைந்ததை உறுதிப்படுத்தாது.'}</p><a href="/">Back to home / முகப்புப் பக்கத்திற்குத் திரும்பவும்</a></main>`;
}
export function injectPageMetadata(html: string, pathname: string, lang: Language, origin: string): string {
  const meta = pageMetadata(pathname, lang);
  html = html.replace(/<title>[\s\S]*?<\/title>/gi, '').replace(/<link\b(?=[^>]*rel=["']canonical["'])[^>]*>/gi, '');
  const keys = ['description', 'robots', 'og:title', 'og:description', 'og:type', 'og:url', 'og:image', 'og:locale'];
  for (const key of keys) html = html.replace(new RegExp(`<meta\\b(?=[^>]*(?:name|property)=["']${key}["'])[^>]*>`, 'gi'), '');
  const url = new URL(meta.path, origin).href;
  const tag = (attribute: string, key: string, value: string) => `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`;
  const head = `<title>${escapeHtml(meta.title)}</title>\n${tag('name', 'description', meta.description)}\n${tag('name', 'robots', meta.noindex ? 'noindex, nofollow' : 'index, follow')}\n${tag('property', 'og:title', meta.title)}\n${tag('property', 'og:description', meta.description)}\n${tag('property', 'og:type', 'website')}\n${tag('property', 'og:url', url)}\n${tag('property', 'og:image', new URL('/icon-512.png', origin).href)}\n${tag('property', 'og:locale', lang === 'ta' ? 'ta_IN' : 'en_IN')}\n${meta.status === 200 ? `<link rel="canonical" href="${escapeHtml(url)}" />` : ''}`;
  const icons = /<link\b[^>]*rel=["'][^"']*icon/i.test(html) ? '' : '<link rel="icon" href="/favicon.ico" /><link rel="icon" type="image/png" href="/favicon.png" sizes="32x32" /><link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" /><link rel="manifest" href="/site.webmanifest" />';
  return html.replace(/<html\b[^>]*>/i, `<html lang="${lang}">`).replace('</head>', `${head}\n${icons}\n</head>`);
}
function originForRequest(req: Request): string {
  try {
    const configured = new URL(process.env.APP_URL || '');
    if (['https:', 'http:'].includes(configured.protocol)) return configured.origin;
  } catch { /* Unconfigured example APP_URL: use the request origin. */ }
  return `${req.protocol}://${req.get('host') || 'localhost'}`;
}
export function pageHandler(readTemplate: (req: Request) => string | Promise<string>): RequestHandler {
  return async (req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method)) { res.status(404).send('Not found'); return; }
    try {
      const meta = pageMetadata(req.path, requestLanguage(req));
      const template = meta.status === 500 ? '<!doctype html><html><head></head><body></body></html>' : await readTemplate(req);
      let html = injectPageMetadata(template, req.path, requestLanguage(req), originForRequest(req));
      if (meta.status === 404) html = html.replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${statusPageBody(404)}</div>`);
      if (meta.status === 500) html = html.replace('</body>', `${statusPageBody(500)}</body>`);
      res.setHeader('Cache-Control', 'no-store');
      if (meta.noindex) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      res.status(meta.status).type('html').send(html);
    } catch (error) { next(error); }
  };
}
export const globalErrorHandler: ErrorRequestHandler = (_error, req, res, next) => {
  if (res.headersSent) { next(_error); return; }
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.path.startsWith('/api/')) { res.status(500).json({ success: false, error: 'Internal server error.' }); return; }
  const html = injectPageMetadata(`<!doctype html><html><head></head><body>${statusPageBody(500)}</body></html>`, '/500', requestLanguage(req), originForRequest(req));
  res.status(500).type('html').send(html);
};
