import { expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SignalLostPage } from '../src/components/SignalLostPage';

it('renders the DTH 404 recovery screen and working operator destinations without scripts', () => {
  const html = renderToStaticMarkup(createElement(SignalLostPage, { path: '/missing-channel?token=private' }));
  expect(html).toContain('Channel Unavailable'); expect(html).toContain('ERROR 404'); expect(html).toContain('NO SIGNAL');
  expect(html).toContain('Go to Homepage'); expect(html).toContain('href="/plans"');
  expect(html).toContain('/plans?operator=sun_direct'); expect(html).toContain('/plans?operator=dish_tv');
  expect(html).toContain('action="/api/broken-links"'); expect(html).toContain('value="/missing-channel"'); expect(html).not.toContain('private');
  expect(html).toContain('/assets/channel-not-found.css');
});
it('provides Tamil copy and escapes the reported path', () => {
  const html = renderToStaticMarkup(createElement(SignalLostPage, { currentLang: 'ta', path: '/<script>alert(1)</script>' }));
  expect(html).toContain('சேனல் கிடைக்கவில்லை'); expect(html).toContain('&lt;script&gt;'); expect(html).not.toContain('<script>');
});
