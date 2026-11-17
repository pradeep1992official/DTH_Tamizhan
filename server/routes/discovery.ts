import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { rechargeEnabled } from '../rechargeFeature';
import { POLICY_ROUTES } from '../../src/lib/trustContent';
export const discoveryRouter = Router();
discoveryRouter.get('/site.webmanifest', (_req, res) => {
  const source = [path.join(process.cwd(), 'public/site.webmanifest'), path.join(process.cwd(), 'dist/site.webmanifest')].find(p => fs.existsSync(p));
  const manifest = source ? JSON.parse(fs.readFileSync(source, 'utf8')) : { name: 'DTH Tamizhan', short_name: 'DTH Tamizhan', scope: '/', display: 'standalone' };
  if (!rechargeEnabled()) { manifest.start_url = '/new-connection'; manifest.description = 'New DTH connections, set-top boxes and installation.'; }
  res.setHeader('Cache-Control', 'no-store'); res.type('application/manifest+json').send(JSON.stringify(manifest));
});
export function sitemapPaths(enabled: boolean) { return ['/', '/new-connection', '/help', ...POLICY_ROUTES.map(p => p.path), ...(enabled ? ['/recharge', '/plans'] : [])]; }
function origin(req: import('express').Request) { try { return new URL(process.env.APP_URL || '').origin; } catch { return `${req.protocol}://${req.get('host')}`; } }
const xml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);
discoveryRouter.get('/sitemap.xml', (req, res) => { res.setHeader('Cache-Control', 'no-store'); res.type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + sitemapPaths(rechargeEnabled()).map(p => `<url><loc>${xml(origin(req) + p)}</loc></url>`).join('') + '</urlset>'); });
discoveryRouter.get('/robots.txt', (req, res) => { res.setHeader('Cache-Control', 'no-store'); res.type('text/plain').send('User-agent: *\nDisallow: /api/\nDisallow: /admin\nDisallow: /account\nDisallow: /history\nDisallow: /my-tickets\nDisallow: /new-connection/book\nDisallow: /new-connection/compare\n' + (rechargeEnabled() ? '' : 'Disallow: /recharge\nDisallow: /plans\nDisallow: /connections\n') + `Sitemap: ${origin(req)}/sitemap.xml\n`); });
