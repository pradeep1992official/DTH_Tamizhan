import { businessDetails } from '../src/lib/policyTranslations';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { BUSINESS_DETAILS, POLICY_CONTENT, POLICY_ROUTES } from '../src/lib/trustContent';
import { PolicyLinks, SupportDetails } from '../src/components/TrustContent';
import { PaymentModal } from '../src/components/PaymentModal';
import { PolicyPage, policyPageTitle } from '../src/components/PolicyPage';
import { translations } from '../src/lib/translations';
import { ReceiptModal } from '../src/components/ReceiptModal';
import type { RechargeOrder } from '../src/types';

describe('trust and legal routes (QA-07)', () => {
  it.each(POLICY_ROUTES)('renders $path as a real public route with a distinct heading and title', route => {
    const html = renderToStaticMarkup(<MemoryRouter initialEntries={[route.path]}><Routes>
      {POLICY_ROUTES.map(item => <Route key={item.key} path={item.path} element={<PolicyPage policy={item.key} currentLang="en" />} />)}
    </Routes></MemoryRouter>);
    expect(html).toContain(`<h1 class="text-2xl font-bold">${route.en.replace(/&/g, '&amp;')}</h1>`);
    expect(html).toContain('To be announced after launch');
    expect(html).toContain('Draft');
    expect(policyPageTitle(route.key, 'en')).toBe(`${route.en} | DTH Tamizhan`);
    expect(policyPageTitle(route.key, 'ta')).toContain(route.ta);
  });
  it('publishes confirmed business details while keeping the launch date pending', () => {
    expect(BUSINESS_DETAILS.policyDate).toContain('To be announced after launch');
    expect(BUSINESS_DETAILS.installation).toContain('recharges only');
    expect(BUSINESS_DETAILS.processors).toContain('Netlify');
    expect(BUSINESS_DETAILS.retention).toContain('72 months from the due date');
    expect(BUSINESS_DETAILS.retention).toContain('automatic deletion is not implemented');
    const contact = renderToStaticMarkup(<SupportDetails currentLang="en" full />);
    for (const field of ['legalName', 'address', 'phone', 'email', 'supportHours', 'gstin', 'grievanceOfficer'] as const) expect(contact).toContain(BUSINESS_DETAILS[field]);
    expect(contact).toContain('href="tel:+918144404504"');
    expect(contact).toContain('href="mailto:professorpradeeps@gmail.com"');
    expect(contact).toContain('href="mailto:lavanyacommunication09@gmail.com"');
    const tamil = renderToStaticMarkup(<SupportDetails currentLang="ta" full />);
    expect(tamil).toContain('SMP Enterprises'); expect(tamil).toContain(BUSINESS_DETAILS.gstin); expect(tamil).toContain(BUSINESS_DETAILS.grievanceEmail);
  });
  it.each(['en', 'ta'] as const)('includes all English and Tamil footer destinations in %s mode', currentLang => {
    const html = renderToStaticMarkup(<MemoryRouter><PolicyLinks currentLang={currentLang} bilingual /></MemoryRouter>);
    for (const route of POLICY_ROUTES) {
      expect(html).toContain(`href="${route.path}"`);
      expect(html).toContain(route.en.replace(/&/g, '&amp;'));
      expect(html).toContain(route.ta);
    }
  });
  it.each(['en', 'ta'] as const)('omits policy links and business/support placeholders from checkout in %s', currentLang => {
    const html = renderToStaticMarkup(<PaymentModal isOpen onClose={() => {}} currentLang={currentLang} currentTheme={{} as any} user={null} plan={{ name: 'Fixture', price: 200, validityDays: 30 }} subscriber={null} operator={{ id: 'sun_direct', name: 'Sun Direct' } as any} smartCard="41289456123" saveBox={false} onPaymentSuccess={() => {}} />);
    for (const route of POLICY_ROUTES) expect(html).not.toContain(`href="${route.path}"`);
    expect(html).not.toContain('[FILL IN]');
    expect(html).not.toContain(businessDetails(currentLang).phone);
    expect(html).not.toContain(businessDetails(currentLang).email);
    expect(html).not.toContain(businessDetails(currentLang).supportHours);
    expect(html).not.toContain(currentLang === 'en' ? 'By paying you agree' : 'பணம் செலுத்துவதன் மூலம்');
  });
  it('distinguishes merchant review from provider credit estimates and preserves statutory remedies', () => {
    const text = JSON.stringify(POLICY_CONTENT.refund);
    expect(text).toContain(BUSINESS_DETAILS.refundReview);
    expect(text).toContain(BUSINESS_DETAILS.refundProcessing);
    expect(text).toContain(BUSINESS_DETAILS.bankCredit);
    expect(text).toContain('required by law');
    expect(BUSINESS_DETAILS.bankCredit).toContain('7–10 working days');
    expect(BUSINESS_DETAILS.refundProcessing).toContain('manually submit');
    expect(BUSINESS_DETAILS.refundReview).toContain('does not set');
    expect(BUSINESS_DETAILS.reconciliation).toContain('not a promise');
    expect(BUSINESS_DETAILS.feesAndTaxes).toContain('not an automatic 18% tax');
  });
  it('removes unsupported trust, timing and encryption claims in both languages', () => {
    for (const lang of ['en', 'ta'] as const) {
      const text = [translations[lang].brandTagline, translations[lang].footerDisclaimer, translations[lang].secureEncryption,
        translations[lang].tollFreeSupport, translations[lang].newDishSubtitle].join(' ');
      expect(text).not.toMatch(/#1|256|24x7|Authorized DTH|next-day|free Tamil/i);
    }
  });
  it('shows recorded receipt status without an invented GST split or tax-invoice claim', () => {
    const order = { orderId: 'fixture', operator: 'sun_direct', operatorName: 'Sun Direct', smartCardNumber: '41289456123',
      amount: 200, packName: 'Fixture', packValidity: '1 month', paymentMethod: 'upi', paymentStatus: 'paid', rechargeStatus: 'pending',
      createdAt: '2026-01-01T00:00:00Z', operatorRefId: '' } as RechargeOrder;
    const html = renderToStaticMarkup(<ReceiptModal order={order} onClose={() => {}} currentLang="en" />);
    expect(html).toContain('Recorded status'); expect(html).toContain('pending');
    expect(html).not.toContain('GST (18%)'); expect(html).not.toContain('Official DTH Recharge Tax Invoice');
    expect(html).not.toContain('Recharge Processed Successfully');
    expect(html).toContain(BUSINESS_DETAILS.gstin);
  });
});
