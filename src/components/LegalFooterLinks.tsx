import React from 'react';
import type { Language } from '../types';
import { POLICY_ROUTES } from '../lib/trustContent';

// Native links also work on server-rendered error pages without the app router.
export function LegalFooterLinks({ currentLang }: { currentLang: Language }) {
  return <nav aria-label={currentLang === 'ta' ? 'கொள்கைகள் மற்றும் தொடர்பு' : 'Policies and contact'} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 20px', fontSize: '14px' }}>
    {POLICY_ROUTES.map(route => <a key={route.key} href={route.path} style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '4px' }}>{route[currentLang]}</a>)}
  </nav>;
}
