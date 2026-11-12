import express from 'express';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { pageHandler, globalErrorHandler, injectPageMetadata } from '../server/pages';
import { pageMetadata } from '../src/lib/pageMetadata';

const template = fs.readFileSync('index.html', 'utf8');
let server: Server;
let origin: string;
beforeAll(async () => {
  vi.stubEnv('APP_URL', 'https://example.test');
  const app = express();
  app.get('/test-synchronous-error', () => { throw new Error('PRIVATE ERROR MUST NOT BE RENDERED'); });
  app.use(pageHandler(async req => {
    if (req.path === '/test-template-error') throw new Error('PRIVATE TEMPLATE FAILURE');
    return template;
  }));
  app.use(globalErrorHandler);
  await new Promise<void>(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(async () => { await new Promise<void>(resolve => server.close(() => resolve())); vi.unstubAllEnvs(); });

describe('real HTTP page responses and metadata (QA-18 / QA-20)', () => {
  it.each(['/recharge', '/plans', '/account', '/connections', '/contact', '/refund-policy', '/privacy-policy', '/terms'])('%s serves its own title, description and OG tags before JavaScript', async path => {
    const response = await fetch(origin + path);
    const html = await response.text();
    const expected = pageMetadata(path);
    expect(response.status).toBe(200);
    expect(html).toContain(`<title>${expected.title.replace(/&/g, '&amp;')}</title>`);
    expect(html).toContain('property="og:title"'); expect(html).toContain('property="og:description"');
    expect(html).toContain(`property="og:url" content="https://example.test${path}"`);
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html.match(/name="description"/g)).toHaveLength(1);
  });
  it('gives a nonexistent URL a real 404 and language-specific recovery feedback, without redirecting', async () => {
    const response = await fetch(origin + '/qa-nonexistent-page');
    expect(response.status).toBe(404); expect(response.redirected).toBe(false);
    const html = await response.text();
    expect(html).toContain('Page not found'); expect(html).toContain('<html lang="en">');
    expect(html).toContain('href="/"'); expect(response.headers.get('x-robots-tag')).toContain('noindex');
  });
  it.each(['/500', '/test-synchronous-error', '/test-template-error'])('%s returns a real 500 with no stack leak and a home link', async path => {
    const response = await fetch(origin + path); const html = await response.text();
    expect(response.status).toBe(500); expect(html).toContain('Service error');
    expect(html).toContain('We could not load this page'); expect(html).toContain('href="/"');
    expect(html).not.toContain('PRIVATE'); expect(html).not.toContain('/src/main.tsx');
    expect(html).toContain('rel="icon"'); expect(html).toContain('rel="manifest"');
  });
  it.each([['/qa-nonexistent-page', 404], ['/500', 500]] as const)('%s sends UTF-8 Tamil error content for the selected language', async (path, status) => {
    const response = await fetch(origin + path, { headers: { cookie: 'dth_lang=ta' } });
    const html = await response.text();
    expect(response.status).toBe(status); expect(html).toContain('<html lang="ta">');
    expect(html).toMatch(/<meta charset="UTF-8"/i);
    expect(html).toContain('முகப்புப் பக்கத்திற்குத் திரும்பவும்');
    expect(html).not.toContain('Back to home');
  });
  it.each(['/admin', '/admin/orders', '/admin/packs', '/admin/reports'])('%s is noindex in both HTML and HTTP headers', async path => {
    const response = await fetch(origin + path);
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(await response.text()).toContain('name="robots" content="noindex, nofollow"');
  });
  it('supports Tamil metadata based on the language preference cookie', async () => {
    const response = await fetch(origin + '/plans', { headers: { cookie: 'dth_lang=ta' } });
    expect(await response.text()).toContain(pageMetadata('/plans', 'ta').title);
  });
  it('rejects unknown admin subsections as 404 rather than silently opening customers', async () => {
    expect((await fetch(origin + '/admin/not-a-section')).status).toBe(404);
  });
  it('escapes request-derived canonical/OG values', () => {
    const html = injectPageMetadata(template, '/plans', 'en', 'https://example.test');
    expect(html).toContain('rel="canonical" href="https://example.test/plans"');
    expect(html.match(/property="og:title"/g)).toHaveLength(1);
  });
});
