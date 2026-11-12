import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const cells = vi.hoisted(() => ({ values: [] as unknown[], index: 0 }));
vi.mock('react', async original => ({ ...(await original<any>()), useState: (initial: any) => [cells.values[cells.index++] ?? initial, vi.fn()] }));
import { PaymentModal } from '../src/components/PaymentModal';
const now = 1000000;
const ready = { id: 'TEST-fixture', mode: 'sandbox', status: 'ready', provider: 'Local sandbox simulator', packName: 'Fixture', validity: '6 months', amountPaise: 139900, expiresAt: now + 180000 };
const render = () => renderToStaticMarkup(<PaymentModal isOpen onClose={vi.fn()} currentLang="ta" currentTheme={{} as any} user={null} plan={{ name: 'Fixture', price: 1399, validityDays: 180 }} subscriber={null} operator={{ id: 'sun_direct', name: 'Sun Direct' } as any} smartCard="41289456123" saveBox={false} onPaymentSuccess={vi.fn()} />);
beforeEach(() => { cells.index = 0; cells.values = ['sandbox', ready, 'upi', 'success', false, null, now]; });
describe('Tamil checkout states', () => {
  it.each([
    ['success', 'சோதனைக் கட்டணம் வெற்றியடைந்தது'],
    ['failed', 'சோதனைக் கட்டணம் தோல்வியடைந்தது'],
    ['pending', 'சோதனைக் கட்டணம் நிலுவையில் உள்ளது'],
  ])('renders %s as localized feedback without triggering a payment', (status, expected) => {
    cells.values[1] = { ...ready, status };
    const html = render(); expect(html).toContain(expected);
    expect(html).not.toMatch(/Test payment|Start a new test session/);
  });
  it('localizes ready state, currency, methods and full duration', () => {
    const html = render();
    expect(html).toContain('Rs. 1,399.00'); expect(html).toContain('6 மாதங்கள்');
    expect(html).toContain('சோதனை முறை'); expect(html).toContain('சோதனைக் கட்டணத்தை இயக்கவும்');
    expect(html).not.toMatch(/Test mode|Simulate test payment|Total payable|Debit \/ Credit Card|6 months/);
  });
  it('expires with a localized new-QR action', () => {
    cells.values[1] = { ...ready, expiresAt: now - 1 };
    const html = render();
    expect(html).toContain('நேரம் முடிந்துவிட்டது'); expect(html).toContain('புதிய சோதனை QR உருவாக்கவும்');
    expect(html).not.toContain('Generate a new');
  });
  it('localizes loading and provider errors', () => {
    cells.values = ['production', null, 'upi', 'success', true, 'Payment provider is not configured. No payment has been taken. Please retry later.', now];
    const html = render();
    expect(html).toContain('சேவை இன்னும் அமைக்கப்படவில்லை'); expect(html).toContain('சரிபார்க்கப்படுகின்றன');
    expect(html).not.toMatch(/Payment provider is not configured|Checking checkout/);
  });
});
