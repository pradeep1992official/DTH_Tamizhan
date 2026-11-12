import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { pageMetadata, updatePageMetadata } from '../src/lib/pageMetadata';
import { POLICY_ROUTES } from '../src/lib/trustContent';

describe('page-specific metadata and icons (QA-19 / QA-20)', () => {
  it('major pages have distinct titles and descriptions in both languages', () => {
    const paths = ['/recharge', '/plans', '/account', '/connections', '/security', ...POLICY_ROUTES.map(route => route.path), '/404'];
    for (const lang of ['en', 'ta'] as const) {
      const values = paths.map(path => pageMetadata(path, lang));
      expect(new Set(values.map(item => item.title)).size).toBe(paths.length);
      expect(new Set(values.map(item => item.description)).size).toBe(paths.length);
    }
  });
  it('SPA metadata updates replace existing values and canonical URLs', () => {
    const elements = new Map<string, any>();
    const doc = { title: '', documentElement: { lang: '' }, createElement: () => ({ setAttribute(key: string, value: string) { (this as any)[key] = value; }, remove() { elements.delete('canonical'); } }),
      head: { querySelector: (query: string) => elements.get(query === 'link[rel="canonical"]' ? 'canonical' : query.match(/="(.*?)"/)?.[1] || ''),
        append: (item: any) => elements.set(item.name || item.property || item.rel, item) } } as any;
    updatePageMetadata(doc, '/recharge', 'en', 'https://example.test');
    updatePageMetadata(doc, '/plans', 'en', 'https://example.test');
    expect(doc.title).toBe(pageMetadata('/plans').title);
    expect(elements.get('description').content).toBe(pageMetadata('/plans').description);
    expect(elements.get('canonical').href).toBe('https://example.test/plans');
    updatePageMetadata(doc, '/admin/reports', 'ta', 'https://example.test');
    expect(elements.get('robots').content).toContain('noindex'); expect(doc.documentElement.lang).toBe('ta');
    updatePageMetadata(doc, '/missing', 'en', 'https://example.test');
    expect(elements.has('canonical')).toBe(false);
    expect(elements.size).toBe(8);
  });
  it('declares ICO, PNG, apple-touch and manifest assets with valid image headers', () => {
    const html = fs.readFileSync('index.html', 'utf8');
    for (const path of ['favicon.ico', 'favicon.png', 'apple-touch-icon.png', 'site.webmanifest']) { expect(html).toContain('/' + path); expect(fs.existsSync('public/' + path)).toBe(true); }
    const ico = fs.readFileSync('public/favicon.ico'); expect(ico.readUInt16LE(2)).toBe(1); expect(ico.readUInt16LE(4)).toBe(3);
    const manifest = JSON.parse(fs.readFileSync('public/site.webmanifest', 'utf8'));
    expect(manifest.start_url).toBe('/recharge');
    for (const icon of manifest.icons) {
      const png = fs.readFileSync('public' + icon.src);
      expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`).toBe(icon.sizes);
    }
  });
  it('Hosting sends page routes to the HTTP server rather than masking errors with index.html', () => {
    const config = JSON.parse(fs.readFileSync('firebase.json', 'utf8')).hosting;
    expect(config.rewrites.find((item: any) => item.source === '**').run.serviceId).toBe('dth-tamizhan');
    expect(config.ignore).toContain('index.html');
  });
});
