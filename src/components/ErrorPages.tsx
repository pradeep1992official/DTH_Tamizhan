import { translations } from '../lib/translations';
import React from 'react';
import type { Language } from '../types';

export function ErrorPage({ status, currentLang = 'en' }: { status: 404 | 500; currentLang?: Language }) {
  const ta = currentLang === 'ta';
  return <section className="space-y-5 p-6 border border-rule rounded-2xl bg-paper text-ink" role={status === 500 ? 'alert' : undefined}>
    <h1 tabIndex={-1} className="text-2xl font-bold">{status} — {status === 404 ? (translations[currentLang].uiPageNotFound) : (translations[currentLang].uiWeCouldNotLoadThisPage)}</h1>
    <p>{status === 404 ? (translations[currentLang].uiThisAddressDoesNotExistCheckTheLinkOrReturnHome) : (translations[currentLang].uiReturnHomeToTryAgainThisErrorIsNotConfirmationThatAPaymentSucceeded)}</p>
    <a href="/" className="underline underline-offset-4">{translations[currentLang].uiBackToHome}</a>
  </section>;
}

export class GlobalErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() {
    // A client exception cannot change an already-delivered HTTP response.
    // Navigate to the real server 500 endpoint instead of disguising it as a 200.
    if (typeof window !== 'undefined' && window.location.pathname !== '/500') window.location.replace('/500');
  }
  render() {
    if (!this.state.failed) return this.props.children;
    let lang: Language = 'en';
    try { if (localStorage.getItem('dth_tamizhan_lang') === 'ta') lang = 'ta'; } catch {}
    return <ErrorPage status={500} currentLang={lang} />;
  }
}
