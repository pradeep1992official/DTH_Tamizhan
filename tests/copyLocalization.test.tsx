import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { checkLocalization, localizationIssues } from '../scripts/check-localization';
import { localizeCustomerError } from '../src/lib/customerMessages';
import { translations } from '../src/lib/translations';
import { formatPrice, formatDuration, formatStoredDuration } from '../src/lib/catalog';
import { subscriberError, subscriberLabel, subscriberPlaceholder } from '../src/lib/subscriberValidation';
import { PackCard } from '../src/components/PackCard';
import { PaymentInstrument } from '../src/components/PaymentModal';
import { AccountPage } from '../src/components/AccountPage';
import { PolicyPage } from '../src/components/PolicyPage';
import { ReceiptModal } from '../src/components/ReceiptModal';
import { HeroIllustrativeGraphic } from '../src/components/BrandAssets';
import { POLICY_ROUTES } from '../src/lib/trustContent';
import { getOperatorTheme } from '../src/lib/theme';
import type { CheckoutSession } from '../server/payments';

const theme = getOperatorTheme('sun_direct');
const session: CheckoutSession = { id: 'TEST-fixture', mode: 'sandbox', status: 'ready', provider: 'Local sandbox simulator', packName: 'Fixture', validity: '6 months', amountPaise: 139900, expiresAt: Date.now() + 180000 };
describe('copy and localization (QA-11 / QA-12)', () => {
  it('has matching English/Tamil keys, intact UTF-8 and policy coverage', async () => { expect(await checkLocalization()).toEqual([]); });
  it('fails on missing keys, damaged text and mismatched interpolation', () => {
    expect(localizationIssues({ key: 'Hello' }, {})).toContain('key: missing Tamil key');
    expect(localizationIssues({ key: 'Hello' }, { key: '???? ??????' })).toContain('key.ta: damaged text');
    expect(localizationIssues({ key: 'Hello {name}' }, { key: 'வணக்கம்' })).toContain('key: interpolation tokens disagree');
  });
  it('keeps the requested English wording exactly, with Rs. currency', () => {
    expect(translations.en.brandTagline).toBe('DTH recharge and support for Tamil Nadu.');
    expect(translations.en.heroDescription).toBe('Choose your DTH operator, enter your customer ID, and check the total before paying.');
    expect(translations.en.instantActivation).toBe('Track your recharge status after payment.');
    expect(translations.en.secureEncryption).toBe('Review your payment details before continuing.');
    expect(translations.en.customPack).toBe('Recharge with your own amount');
    expect(translations.en.customDescription).toBe('Enter a recharge amount of Rs. 10 or more.');
    expect(translations.en.noPlansMatch).toBe('No matching packs. Try another search or clear your filters.');
    expect(translations.en.loadingLiveCatalog).toBe('Loading available recharge packs…');
    expect(translations.en.receiptConfirmation).toBe('Mobile number for your recharge receipt');
    expect(translations.en.madeWithLove).toBe('Helping Tamil Nadu households keep their favourite channels on.');
  });
  it.each(['en', 'ta'] as const)('formats currency consistently in %s without changing prices', lang => {
    expect(formatPrice(1399, lang)).toBe('Rs. 1,399');
    expect(formatPrice(10.5, lang)).toBe('Rs. 10.50');
    expect(formatPrice(233.17, lang)).toBe('Rs. 233.17');
  });
  it('uses full duration words and localizes stored checkout durations', () => {
    expect(formatDuration(1)).toBe('1 month'); expect(formatDuration(6)).toBe('6 months');
    expect(formatStoredDuration('6M', 'ta')).toBe('6 மாதங்கள்');
    expect(formatStoredDuration('12 months', 'ta')).toBe('12 மாதங்கள்');
  });
  it.each(['HD', 'SD', 'FLEXIBLE'] as const)('renders the %s title and selected state in Tamil', type => {
    const html = renderToStaticMarkup(<PackCard type={type} currentLang="ta" operatorTheme={theme} isSelected><p>Rs. 100.00</p></PackCard>);
    expect(html).toContain('தேர்ந்தெடுக்கப்பட்டது');
    expect(html).not.toMatch(/Recommended|Selected|Flexible top-up|\?{2,}/);
    expect(html).toContain(type === 'FLEXIBLE' ? 'விருப்பத் தொகை' : 'பரிந்துரைக்கப்படும்');
  });
  it('uses correct operator terms in Tamil labels, placeholders and errors', () => {
    expect(subscriberLabel('sun_direct', false, 'ta')).toBe('ஸ்மார்ட் கார்டு எண்');
    expect(subscriberLabel('tata_play', false, 'ta')).toBe('சந்தாதாரர் எண்');
    expect(subscriberLabel('airtel_dth', false, 'ta')).toBe('வாடிக்கையாளர் எண்');
    expect(subscriberPlaceholder('sun_direct', false, 'ta')).not.toMatch(/Smart|Number/);
    expect(subscriberError('sun_direct', '123', false, 'ta')).toContain('11 இலக்கங்கள்');
  });
  it('updates known error copy when the language setting changes', () => {
    const tamil = localizeCustomerError('Checkout unavailable. Please retry.', 'ta');
    expect(tamil).toMatch(/[\u0b80-\u0bff]/);
    expect(localizeCustomerError(tamil, 'en')).toBe('Checkout unavailable. Please retry.');
  });
  it.each(['upi', 'card', 'netbanking'] as const)('localizes %s sandbox and production payment feedback', method => {
    for (const mode of ['sandbox', 'production'] as const) {
      const html = renderToStaticMarkup(<PaymentInstrument method={method} mode={mode} session={session} expired={false} seconds={179} currentLang="ta" />);
      expect(html).toMatch(/[\u0b80-\u0bff]/);
      expect(html).not.toMatch(/Mock |Provider |No bank login|Test session/);
    }
  });
  it('localizes account actions and the corrupted group label', () => {
    const html = renderToStaticMarkup(<MemoryRouter><AccountPage user={null} currentLang="ta" onOpenAuth={() => {}} /></MemoryRouter>);
    expect(html).not.toContain('Sign in'); expect(html).toContain('உள்நுழை');
    expect(translations.ta.uiPackView).toBe('பேக்குகளைக் காணும் முறை');
    expect(translations.ta.signOut).toBe('வெளியேறு');
  });
  it.each(['sun_direct', 'airtel_dth', 'tata_play', 'dish_tv'] as const)('localizes the %s illustration description', operator => {
    const html = renderToStaticMarkup(<HeroIllustrativeGraphic theme={getOperatorTheme(operator)} currentLang="ta" />);
    expect(html).toMatch(/alt="[^\"]*[\u0b80-\u0bff]/);
    expect(html).not.toMatch(/alt="[^\"]*(Setup|Set-Top Box)/);
  });
  it('localizes receipt GST, status, payment method and operator ID labels', () => {
    const html = renderToStaticMarkup(<ReceiptModal currentLang="ta" onClose={() => {}} order={{ orderId: 'fixture', user_id: 'fixture-user', packId: 'fixture-pack', updatedAt: '2026-11-12T00:00:00Z', operator: 'tata_play', operatorName: 'Tata Play', smartCardNumber: '1029384756', amount: 1399, packName: 'Fixture', packValidity: '6M', paymentMethod: 'card', paymentStatus: 'paid', rechargeStatus: 'pending', createdAt: '2026-11-12T00:00:00Z', operatorRefId: '' }} />);
    expect(html).toContain('சந்தாதாரர் எண்'); expect(html).toContain('சரக்கு மற்றும் சேவை வரி எண்');
    expect(html).toContain('நிலுவையில் உள்ளது'); expect(html).toContain('டெபிட் / கிரெடிட் கார்டு');
    expect(html).toContain('6 மாதங்கள்'); expect(html).not.toMatch(/Smart Card Number|Amount Paid|Payment Mode/);
  });
  it.each(POLICY_ROUTES)('renders Tamil content for $path, not an English-only body', route => {
    const html = renderToStaticMarkup(<MemoryRouter><PolicyPage currentLang="ta" policy={route.key} /></MemoryRouter>);
    expect(html).toContain('lang="ta"'); expect(html).not.toContain('lang="en"');
    expect(html).toContain('[FILL IN]'); expect(html).toContain('வரைவு');
  });
});
