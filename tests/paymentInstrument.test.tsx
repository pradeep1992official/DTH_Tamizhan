import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PaymentInstrument } from '../src/components/PaymentModal';
import type { CheckoutSession } from '../server/payments';

const session: CheckoutSession = { id: 'TEST-fixture', mode: 'sandbox', provider: 'Local sandbox simulator',
  amountPaise: 25000, packName: 'Fixture', validity: '1 month', expiresAt: 180000, status: 'ready' };
describe('checkout instrument presentation', () => {
  it('production card tab collects no card number, expiry or CVV and shows provider unavailability', () => {
    const html = renderToStaticMarkup(<PaymentInstrument method="card" mode="production" session={null} expired={false} seconds={0} />);
    expect(html).not.toContain('<input');
    expect(html).not.toContain('4532');
    expect(html).not.toContain('12/28');
    expect(html).toContain('Provider unavailable');
  });
  it('production UPI shows an error and never substitutes a mock QR', () => {
    const html = renderToStaticMarkup(<PaymentInstrument method="upi" mode="production" session={session} expired={false} seconds={180} />);
    expect(html).toContain('Provider QR is unavailable');
    expect(html).not.toContain('<svg');
    expect(html).not.toContain('Mock QR');
    expect(html).not.toContain('Test session');
  });
  it('sandbox explicitly labels the mock QR and card', () => {
    const upi = renderToStaticMarkup(<PaymentInstrument method="upi" mode="sandbox" session={session} expired={false} seconds={179} />);
    expect(upi).toContain('Mock QR illustration - cannot be scanned or paid');
    expect(upi).toContain('2:59');
    const card = renderToStaticMarkup(<PaymentInstrument method="card" mode="sandbox" session={session} expired={false} seconds={179} />);
    expect(card).toContain('Mock card payment');
    expect(card).not.toContain('<input');
  });
  it('removes the mock QR and countdown once expired', () => {
    const html = renderToStaticMarkup(<PaymentInstrument method="upi" mode="sandbox" session={session} expired={true} seconds={0} />);
    expect(html).not.toContain('<svg');
    expect(html).not.toContain('Test session');
  });
});
