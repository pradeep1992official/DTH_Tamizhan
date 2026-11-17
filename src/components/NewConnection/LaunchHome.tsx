import React from 'react';
import { Link } from 'react-router-dom';
import type { Language } from '../../types';
import { translations } from '../../lib/translations';
export function LaunchHome({ currentLang }: { currentLang: Language }) {
  const t = translations[currentLang];
  return <section className="max-w-3xl mx-auto py-10 sm:py-16 space-y-6"><p className="text-sm text-accent font-semibold">DTH Tamizhan</p><h1 className="text-3xl sm:text-5xl font-bold leading-tight">{t.launchHeroTitle}</h1><p className="text-base text-muted max-w-2xl">{t.launchHeroText}</p><div className="flex flex-wrap gap-3"><Link className="bg-accent text-accent-ink px-5 py-3 rounded-xl font-semibold" to="/new-connection">{t.launchCTA}</Link><Link className="border border-rule px-5 py-3 rounded-xl" to="/account/bookings">{t.ctTitle}</Link></div><p className="text-sm text-muted">{t.launchFooter}</p></section>;
}
