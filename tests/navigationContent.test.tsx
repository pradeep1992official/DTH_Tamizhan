import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { missingCatalogOperators, operatorCatalogMessage, customTopUpUrl } from '../src/lib/catalogAvailability';
import { OperatorCatalogNotice } from '../src/components/OperatorCatalogNotice';
import { ErrorPage, GlobalErrorBoundary } from '../src/components/ErrorPages';
import { navigationScrollPosition } from '../src/lib/navigationScroll';
import { TOP_UP_LIMITS, parseTopUpAmount, validateTopUpAmount } from '../src/lib/topUpAmount';
import { calculatePayment } from '../server/payments';

describe('route scroll policy (QA-15)', () => {
  const saved = { x: 0, y: 1800 };
  it.each(['PUSH', 'REPLACE'])('%s always resets rather than inheriting a lower checkout position', type => {
    expect(navigationScrollPosition(type, saved, false)).toEqual({ x: 0, y: 0 });
  });
  it('restores only genuine history entries', () => {
    expect(navigationScrollPosition('POP', saved, false)).toBe(saved);
    expect(navigationScrollPosition('POP', saved, true, 'back_forward')).toBe(saved);
    expect(navigationScrollPosition('POP', saved, true, 'navigate')).toEqual({ x: 0, y: 0 });
    expect(navigationScrollPosition('POP', saved, true, 'reload')).toEqual({ x: 0, y: 0 });
    expect(navigationScrollPosition('POP', undefined, false)).toEqual({ x: 0, y: 0 });
  });
});
describe('catalog absence versus no matching results (QA-16)', () => {
  const catalog = [{ operator: 'sun_direct' as const }];
  it('checks the complete catalog, not the filtered search results', () => {
    expect(missingCatalogOperators(catalog, ['sun_direct'])).toEqual([]);
    expect(missingCatalogOperators(catalog, ['dish_tv'])).toEqual(['dish_tv']);
    expect(missingCatalogOperators(catalog, ['dish_tv', 'd2h'])).toEqual(['dish_tv']);
    expect(missingCatalogOperators([{ operator: 'd2h' }], ['dish_tv'])).toEqual([]);
    expect(missingCatalogOperators(catalog, [])).toEqual([]);
  });
  it.each(['en', 'ta'] as const)('reuses the operator explanation and links directly to custom top-up in %s', lang => {
    const html = renderToStaticMarkup(<MemoryRouter><OperatorCatalogNotice operator="d2h" currentLang={lang} /></MemoryRouter>);
    expect(html).toContain('Dish TV and D2H');
    expect(html).toContain('operator=dish_tv&amp;topup=1#custom-recharge-card');
    expect(operatorCatalogMessage('d2h', lang)).toContain(TOP_UP_LIMITS.max.toLocaleString('en-IN'));
    expect(customTopUpUrl('d2h')).toBe(customTopUpUrl('dish_tv'));
  });
});
describe('error feedback (QA-18)', () => {
  it.each([404, 500] as const)('renders %s with home recovery in both languages', status => {
    for (const currentLang of ['en', 'ta'] as const) {
      const html = renderToStaticMarkup(<ErrorPage status={status} currentLang={currentLang} />);
      expect(html).toContain(String(status)); expect(html).toContain('href="/"');
    }
  });
  it('the global boundary redirects client render failures to the real HTTP 500 endpoint', () => {
    const replace = vi.fn(); vi.stubGlobal('window', { location: { pathname: '/plans', replace } });
    try { new GlobalErrorBoundary({ children: null }).componentDidCatch(); expect(replace).toHaveBeenCalledWith('/500'); }
    finally { vi.unstubAllGlobals(); }
  });
});
describe('preceding custom-amount correction', () => {
  it.each(['', 'abc', '1e3', '0x10', '0', '-1', '9.99', '10.001', '20000.01', '20001'])('rejects %s without producing a payable total', value => {
    expect(validateTopUpAmount(value)).not.toBeNull(); expect(parseTopUpAmount(value)).toBeNull();
  });
  it.each(['10', '10.25', '20000'])('accepts supported amounts %s under the same server limits', value => {
    expect(parseTopUpAmount(value)).toBe(Number(value));
    expect(calculatePayment({ packId: 'custom', operator: 'sun_direct', customAmount: Number(value) }, []).amountPaise).toBe(Math.round(Number(value) * 100));
  });
  it('rejects above-limit requests on the server, independently of input attributes', () => {
    expect(() => calculatePayment({ packId: 'custom', operator: 'sun_direct', customAmount: 20001 }, [])).toThrow('20,000');
  });
});
