import { translations } from '../lib/translations';
import React from 'react';
import { Link } from 'react-router-dom';
import type { Language, UserProfile } from '../types';
export function AccountPage({ user, currentLang, onOpenAuth }: { user: UserProfile | null; currentLang: Language; onOpenAuth: () => void }) {
  const ta = currentLang === 'ta';
  return <section className="space-y-5 p-6 border border-rule rounded-2xl bg-paper text-ink">
    <h1 className="text-2xl font-bold">{translations[currentLang].uiYourAccount}</h1>
    {user ? <><p>{user.displayName || user.email}</p><Link to="/connections" className="underline">{translations[currentLang].uiViewSavedSetTopBoxes}</Link></> : <><p>{translations[currentLang].uiSignInToAccessYourSavedConnections}</p><button type="button" onClick={onOpenAuth} className="dialog-primary px-4 py-2 rounded-lg">{translations[currentLang].uiSignIn}</button></>}
  </section>;
}
