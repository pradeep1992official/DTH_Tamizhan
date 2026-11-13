import { expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { safeRetryPath, ServerSignalPage } from '../src/components/ServerSignalPage';

it('renders the rain-fade recovery page with honest payment guidance and native links', () => {
  const html = renderToStaticMarkup(createElement(ServerSignalPage, { retryPath: '/plans?secret=private' }));
  expect(html).toContain('Server signal lost'); expect(html).toContain('ERR 500'); expect(html).toContain('server-error-dish');
  expect(html).toContain('href="/plans"'); expect(html).toContain('href="/history"'); expect(html).toContain('href="/contact"');
  expect(html).toContain('If money was debited, check your payment history before paying again.');
  expect(html).not.toContain('completely safe'); expect(html).not.toContain('68%'); expect(html).not.toContain('private');
  expect(html).toContain('/assets/server-signal-error.css');
});
it('keeps retry destinations local, excludes query data and escapes content', () => {
  expect(safeRetryPath('/account?token=private#fragment')).toBe('/account');
  for (const value of ['https://external.test', '//external.test', '/\\external.test', '/bad\npath']) expect(safeRetryPath(value)).toBe('/500');
  const html = renderToStaticMarkup(createElement(ServerSignalPage, { retryPath: '/<script>' }));
  expect(html).toContain('&lt;script&gt;'); expect(html).not.toContain('<script>');
});
it('supports Tamil recovery and payment guidance', () => {
  const html = renderToStaticMarkup(createElement(ServerSignalPage, { currentLang: 'ta' }));
  expect(html).toContain('சேவையக சிக்னல் கிடைக்கவில்லை'); expect(html).toContain('கட்டண வரலாற்றைப் பார்க்கவும்');
});
