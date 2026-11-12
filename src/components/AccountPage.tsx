import React from 'react';
import { Link } from 'react-router-dom';
import type { Language, UserProfile } from '../types';
export function AccountPage({ user, currentLang, onOpenAuth }: { user: UserProfile | null; currentLang: Language; onOpenAuth: () => void }) {
  const ta = currentLang === 'ta';
  return <section className="space-y-5 p-6 border border-rule rounded-2xl bg-paper text-ink">
    <h1 className="text-2xl font-bold">{ta ? 'உங்கள் கணக்கு' : 'Your account'}</h1>
    {user ? <><p>{user.displayName || user.email}</p><Link to="/connections" className="underline">{ta ? 'சேமித்த பெட்டிகளைப் பார்க்கவும்' : 'View saved set-top boxes'}</Link></> : <><p>{ta ? 'சேமித்த இணைப்புகளை அணுக உள்நுழையுங்கள்.' : 'Sign in to access your saved connections.'}</p><button type="button" onClick={onOpenAuth} className="dialog-primary px-4 py-2 rounded-lg">{ta ? 'உள்நுழையுங்கள்' : 'Sign in'}</button></>}
  </section>;
}
