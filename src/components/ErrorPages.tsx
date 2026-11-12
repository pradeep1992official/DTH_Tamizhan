import React from 'react';
import type { Language } from '../types';

export function ErrorPage({ status, currentLang = 'en' }: { status: 404 | 500; currentLang?: Language }) {
  const ta = currentLang === 'ta';
  return <section className="space-y-5 p-6 border border-rule rounded-2xl bg-paper text-ink" role={status === 500 ? 'alert' : undefined}>
    <h1 tabIndex={-1} className="text-2xl font-bold">{status} — {status === 404 ? (ta ? 'பக்கம் கிடைக்கவில்லை' : 'Page not found') : (ta ? 'பக்கத்தை ஏற்ற முடியவில்லை' : 'We could not load this page')}</h1>
    <p>{status === 404 ? (ta ? 'இந்த முகவரி கிடைக்கவில்லை. இணைப்பைச் சரிபார்க்கவும் அல்லது முகப்புக்குச் செல்லவும்.' : 'This address does not exist. Check the link or return home.') : (ta ? 'மீண்டும் முயற்சிக்க முகப்புப் பக்கத்திற்குச் செல்லவும். இந்தப் பிழை கட்டணம் வெற்றியடைந்ததை உறுதிப்படுத்தாது.' : 'Return home to try again. This error is not confirmation that a payment succeeded.')}</p>
    <a href="/" className="underline underline-offset-4">{ta ? 'முகப்புப் பக்கத்திற்குத் திரும்பவும்' : 'Back to home'}</a>
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
