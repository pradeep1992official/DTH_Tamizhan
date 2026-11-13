import React from 'react';
import type { Language } from '../types';
import { SignalLostPage } from './SignalLostPage';
import { ServerSignalPage } from './ServerSignalPage';

export function ErrorPage({ status, currentLang = 'en' }: { status: 404 | 500; currentLang?: Language }) {
  if (status === 404) return <SignalLostPage currentLang={currentLang} />;
  return <ServerSignalPage currentLang={currentLang} />;
}

export class GlobalErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() {
    // A client exception cannot change an already-delivered HTTP response.
    // Navigate to the real server 500 endpoint instead of disguising it as a 200.
    if (typeof window !== 'undefined' && window.location.pathname !== '/500') window.location.replace(`/500?retry=${encodeURIComponent(window.location.pathname)}`);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    let lang: Language = 'en';
    try { if (localStorage.getItem('dth_tamizhan_lang') === 'ta') lang = 'ta'; } catch {}
    return <ErrorPage status={500} currentLang={lang} />;
  }
}
