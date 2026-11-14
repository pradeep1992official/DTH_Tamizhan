import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
vi.mock('../src/lib/firebase', () => ({ auth: { currentUser: { uid: 'owner' } } }));
import { HelpPage } from '../src/components/HelpPage';
import type { UserProfile } from '../src/types';
const user = { uid: 'owner', displayName: 'Customer', phoneNumber: '+919876543210' } as UserProfile;
function render(state?: unknown, language: 'en' | 'ta' = 'en') { return renderToStaticMarkup(<MemoryRouter initialEntries={[{ pathname: '/help', state }]}><HelpPage user={user} currentLang={language} onOpenAuth={vi.fn()} /></MemoryRouter>); }
it('shows problem chips and profile phone without a support-versus-service choice', () => {
  const html = render();
  expect(html).toContain('Get Help'); expect(html).toContain('9876543210'); expect(html).toContain('Something else');
  expect(html).not.toContain('Subscriber ID'); expect(html).not.toContain('Let us do it'); expect(html).not.toContain('Service Request');
  expect(html).toContain('aria-pressed="false"');
});
it('shows subscriber input only for DTH chips and a 1000-character box for other', () => {
  expect(render({ ticketPrefill: { issueCategory: 'no_signal', subscriberId: '1234567890' } })).toContain('Subscriber ID');
  const html = render({ ticketPrefill: { issueCategory: 'other', description: 'Please help me.' } });
  expect(html).toMatch(/maxlength="1000"/i); expect(html).toContain('Please help me.'); expect(html).not.toContain('Subscriber ID');
  expect(render(undefined, 'ta')).toMatch(/[\u0B80-\u0BFF]/);
});
it('keeps legacy URLs as redirects and all assistant support entry points at /help', () => {
  const app = readFileSync('src/App.tsx', 'utf8');
  for (const path of ['/support', '/service-request']) expect(app).toContain(`path="${path}" element={<Navigate to="/help"`);
  expect(readFileSync('src/components/AssistantSupportCard.tsx', 'utf8')).toContain("navigate('/help'");
  expect(readFileSync('src/components/Header.tsx', 'utf8')).toContain('href="/help"');
});
