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
    expect(html).toContain('nav-new-connection-btn'); expect(html).toContain('mobile-nav-new-connection-btn'); expect(html).not.toMatch(/src="[^"]*(?:sun_logo|tata_logo|airtel_logo)/);
  }
});
it('makes the home hero about authorized new connections, with working booking/catalog links', () => {
  const en = render(<LaunchHome currentLang="en" />); expect(en).toContain('Authorized dealer'); expect(en).toContain('set-top box'); expect(en).toContain('href="/new-connection"'); expect(en).toContain('href="/account/bookings"'); expect(en).not.toMatch(/href="\/(?:recharge|plans|connections)"/);
  expect(render(<LaunchHome currentLang="ta" />)).toContain('புதிய DTH');
});
it('keeps past recharges hidden from the account while preserving booking access', () => {
  for (const has of [false, true]) {
    const html = render(<AccountPage recharge={false} hasPastRecharges={has} user={user} currentLang="en" onOpenAuth={() => {}} />);
    expect(html).not.toContain('href="/history"'); expect(html).not.toContain('href="/recharge"'); expect(html).not.toContain('href="/plans"'); expect(html).not.toContain('href="/connections"'); expect(html).toContain('href="/account/bookings"');
  }
  const guest = render(<AccountPage recharge={false} user={null} currentLang="ta" onOpenAuth={() => {}} />); expect(guest).toContain('href="/new-connection"'); expect(guest).not.toContain('href="/history"');
});
it('keeps the navbar focused on bookings and service while recharge account entries remain available when enabled', () => {
  setClientRechargeEnabled(true);
  const html = render(<Header currentLang="en" user={null} onLanguageChange={() => {}} onOpenAuth={() => {}} onUpdateProfile={async () => {}} onSignOut={() => {}} activeTab="recharge" onTabChange={() => {}} currentTheme={getOperatorTheme('sun_direct')} />); expect(html).not.toContain('id="nav-recharge-btn"'); expect(html).not.toContain('id="mobile-nav-plans-btn"'); expect(html).toContain('id="nav-bookings-btn"'); expect(html).toContain('Service Request'); expect(html).toContain('Profile');
  const account = render(<AccountPage user={user} currentLang="en" onOpenAuth={() => {}} />); expect(account).toContain('href="/recharge"'); expect(account).toContain('href="/history"');
});
it('uses accurate launch-specific policy copy and marks missing business decisions in both languages', () => {
  for (const lang of ['en', 'ta'] as const) for (const route of POLICY_ROUTES) {
    const html = render(<PolicyPage policy={route.key} currentLang={lang} />); expect(html).not.toContain('Installation services are not offered'); expect(html).not.toContain('operator recharge'); expect(html).toContain(lang === 'en' ? 'confirmation' : 'உறுதிப்படுத்தல்');
  }
});
