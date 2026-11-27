import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, afterEach, expect, it } from 'vitest';
import { Header } from '../src/components/Header';
import { AccountPage } from '../src/components/AccountPage';
import { PolicyPage } from '../src/components/PolicyPage';
import { LaunchHome } from '../src/components/NewConnection/LaunchHome';
import { setClientRechargeEnabled } from '../src/lib/rechargeFeature';
import { getOperatorTheme } from '../src/lib/theme';
import { POLICY_ROUTES } from '../src/lib/trustContent';
const user = { uid: 'owner', displayName: 'Customer', email: 'owner@example.com', role: 'customer' } as any;
const render = (node: React.ReactNode) => renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);
beforeEach(() => setClientRechargeEnabled(false));
afterEach(() => setClientRechargeEnabled(true));
it('removes desktop/mobile recharge, pack and saved-box navigation in both languages', () => {
  for (const lang of ['en', 'ta'] as const) {
    const html = render(<Header recharge={false} currentLang={lang} user={null} onLanguageChange={() => {}} onOpenAuth={() => {}} onUpdateProfile={async () => {}} onSignOut={() => {}} activeTab="new-connection" onTabChange={() => {}} currentTheme={getOperatorTheme('sun_direct')} />);
    for (const id of ['nav-recharge-btn', 'nav-plans-btn', 'nav-connections-btn', 'mobile-nav-recharge-btn', 'mobile-nav-plans-btn', 'mobile-nav-connections-btn']) expect(html).not.toContain(`id="${id}"`);
    expect(html.match(/href="\/new-connection"/g)).toHaveLength(2); expect(html).toContain('header-mobile-navigation'); expect(html).not.toMatch(/src="[^"]*(?:sun_logo|tata_logo|airtel_logo)/);
    expect(html).not.toContain('href="/plans"');
  }
});
it('makes the home hero about new connections, with working booking/catalog links', () => {
  const en = render(<LaunchHome currentLang="en" />); expect(en).toContain('Vanakkam! Let&#x27;s get your TV sorted.'); expect(en).toContain('Need help'); expect(en).toContain('href="/new-connection"'); expect(en).toContain('href="/service-request"'); expect(en).toContain('href="/recharge"');
  expect(render(<LaunchHome currentLang="ta" />)).toMatch(/[\u0B80-\u0BFF]/);
});
it('keeps past recharges hidden from the account while preserving booking access', () => {
  for (const has of [false, true]) {
    const html = render(<AccountPage recharge={false} hasPastRecharges={has} user={user} currentLang="en" onOpenAuth={() => {}} />);
    expect(html).not.toContain('href="/history"'); expect(html).not.toContain('href="/recharge"'); expect(html).not.toContain('href="/plans"'); expect(html).not.toContain('href="/connections"'); expect(html).toContain('href="/account/bookings"');
  }
  const guest = render(<AccountPage recharge={false} user={null} currentLang="ta" onOpenAuth={() => {}} />); expect(guest).toContain('href="/new-connection"'); expect(guest).not.toContain('href="/history"');
});
it('exposes Browse Packs beside Recharge for guests on desktop and mobile', () => {
  setClientRechargeEnabled(true);
  const html = render(<Header currentLang="en" user={null} onLanguageChange={() => {}} onOpenAuth={() => {}} onUpdateProfile={async () => {}} onSignOut={() => {}} activeTab="recharge" onTabChange={() => {}} currentTheme={getOperatorTheme('sun_direct')} />); expect(html).not.toContain('id="nav-recharge-btn"'); expect(html).not.toContain('id="mobile-nav-plans-btn"'); expect(html).not.toContain('href="/account/bookings"'); expect(html).toContain('Service Request'); expect(html).toContain('Profile');
  expect(html.match(/href="\/recharge"/g)).toHaveLength(2);
  expect(html.match(/href="\/plans"/g)).toHaveLength(2); expect(html).toContain('Browse Packs');
  for (const path of ['/connections', '/history']) expect(html).not.toContain('href="' + path + '"');
  const account = render(<AccountPage user={user} currentLang="en" onOpenAuth={() => {}} />); expect(account).toContain('href="/recharge"'); expect(account).toContain('href="/history"');
});
it('offers a public homepage link to recharge packs in both languages', () => {
  for (const lang of ['en', 'ta'] as const) {
    const html = render(<LaunchHome recharge currentLang={lang} user={null} />);
    expect(html).toContain('href="/plans"');
    expect(html).toContain(lang === 'en' ? 'Browse recharge packs' : 'ரீசார்ஜ் பேக்குகளைப் பாருங்கள்');
    expect(html).toContain('href="/new-connection"');
  }
});
it('publishes current booking and service policies in both languages without launch placeholders', () => {
  for (const lang of ['en', 'ta'] as const) for (const route of POLICY_ROUTES) {
    const html = render(<PolicyPage policy={route.key} currentLang={lang} />); expect(html).not.toContain('Installation services are not offered'); expect(html).not.toContain('operator recharge'); expect(html).toContain('24 November 2026'); expect(html).not.toContain('Business input required'); expect(html).not.toContain('Netlify');
  }
});
