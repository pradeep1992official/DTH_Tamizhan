import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Language } from '../../types';
import { translations } from '../../lib/translations';
import { loadPublicCatalog } from '../../lib/newConnectionPublicCatalog';
import { visibleCatalog } from '../../lib/newConnectionBrowse';
import { packPackageType, type CatalogData } from '../../lib/newConnectionCatalog';
import { validityLabel } from '../../lib/newConnectionDisplay';
import { HomeDetails } from './HomeDetails';

const localLogos: Record<string, string> = { airtel: '/airtel_logo.png', tataplay: '/tata_logo.png', sundirect: '/sun_logo.png', dishtv: '/dishtv_logo.png', dh: '/d2h_logo.png' };
const upcomingOperators = [
  { name: 'Sun Direct', key: 'sundirect', src: '/sun_logo.png' },
  { name: 'Dish TV', key: 'dishtv', src: '/dishtv_logo.png' },
  { name: 'd2h', key: 'dh', src: '/d2h_logo.png' },
];
export function LaunchHomeContent({ currentLang, catalog, isSignedIn = false }: { currentLang: Language; catalog: CatalogData | null; isSignedIn?: boolean }) {
  const t = translations[currentLang]; const ta = currentLang === 'ta';
  const items = catalog ? visibleCatalog(catalog) : [];
  const brands = [...new Map(items.map(item => [item.brand.id, item.brand])).values()].sort((a, b) => a.sortOrder - b.sortOrder);
  const cheapest = items.flatMap(item => item.pack.pricingOptions.filter(option => option.price > 0).map(option => ({ item, option }))).sort((a, b) => a.option.price - b.option.price)[0];
  const online = catalog && catalog.settings.advanceMode !== 'none' && catalog.settings.defaultProvider !== 'none' && catalog.settings.enabledProviders.includes(catalog.settings.defaultProvider);
  return <>
    <section className="launch-hero" aria-labelledby="launch-hero-title">
      <div className="launch-hero-copy space-y-6">
        <h1 id="launch-hero-title" className="text-3xl sm:text-5xl font-bold leading-tight">{ta ? t.launchHeroTitle : <><span>Your new DTH connection</span><br />starts here.</>}</h1>
        <p className="text-base">{ta ? 'உங்கள் DTH பெட்டியையும் பேக்கையும் தேர்வு செய்யுங்கள். நிறுவலை ஏற்பாடு செய்ய உதவுகிறோம்.' : 'Choose your DTH box and pack. We’ll help arrange installation.'}</p>
        {cheapest ? <p className="launch-price-cue">
          {ta ? 'பேக்குகள்' : 'Packs from'} {new Intl.NumberFormat(ta ? 'ta-IN' : 'en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(cheapest.option.price)} · {validityLabel(cheapest.option.validityDays, currentLang, cheapest.option.validityMonths)}
        {packPackageType(cheapest.item.pack) && <span> · {ta ? 'இலவச நிறுவல்' : 'Free installation'}</span>}{online && <span> · {ta ? 'ஆன்லைனில் செலுத்தலாம்' : 'Pay online'}</span>}</p>
          : <Link className="launch-price-cue" to="/new-connection">{ta ? 'பேக்குகள் மற்றும் விலைகளைப் பார்க்கவும்' : 'View current packs and prices'}</Link>}
        <div className="launch-actions flex flex-wrap gap-3"><Link className="bg-accent text-accent-ink px-5 py-3 rounded-xl font-semibold" to="/new-connection">{t.launchCTA}</Link><Link className="border border-rule px-5 py-3 rounded-xl" to="/account/bookings">{isSignedIn ? t.ctTitle : (ta ? 'முன்பதிவுகளைப் பார்க்க உள்நுழையவும்' : 'Sign in to see bookings')}</Link></div>
        {brands.length > 0 && <div className="launch-operators"><p id="launch-operators-label">{ta ? 'உங்கள் DTH ஆபரேட்டரைத் தேர்வு செய்யுங்கள்' : 'Choose your DTH operator'}</p><ul aria-labelledby="launch-operators-label" className="launch-operator-logos">{brands.map(brand => {
          const normalized = brand.name.toLowerCase().replace(/[^a-z]/g, '');
          const src = Object.entries(localLogos).find(([key]) => normalized.includes(key))?.[1] || brand.logoUrl;
          return <li key={brand.id}><Link to={`/new-connection?brand=${encodeURIComponent(brand.id)}`} aria-label={ta ? `${brand.name} பேக்குகளைப் பார்க்கவும்` : `View ${brand.name} packs`}>{src ? <img src={src} alt={brand.name} width="120" height="48" decoding="async" /> : <span>{brand.name}</span>}</Link></li>;
        })}{upcomingOperators.filter(operator => !brands.some(brand => brand.name.toLowerCase().replace(/[^a-z]/g, '').includes(operator.key))).map(operator => <li key={operator.key} className="launch-operator-upcoming">
          <div className="launch-operator-preview" aria-disabled="true">
            <img src={operator.src} alt={operator.name} width="120" height="48" decoding="async" />
            <span className="launch-coming-soon">{ta ? 'விரைவில்' : 'Coming soon'}</span>
          </div>
        </li>)}</ul></div>}
      </div>
      <a className="launch-scroll-cue" href="#home-details"><span>{ta ? 'உதவி, வழிமுறை மற்றும் கேள்விகள்' : 'Support, how it works and FAQs'}</span><span aria-hidden="true">↓</span></a>
      <img className="launch-hero-image" src="/images/dth-family-hero.webp" width="1536" height="1024" fetchPriority="high" decoding="async" alt="" aria-hidden="true" />
    </section>
    <HomeDetails currentLang={currentLang} catalog={catalog} />
  </>;
}
export function LaunchHome({ currentLang, isSignedIn = false }: { currentLang: Language; isSignedIn?: boolean }) {
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  useEffect(() => { let active = true; loadPublicCatalog().then(data => { if (active) setCatalog(data); }).catch(() => { /* Keep the catalog link available if live prices cannot load. */ }); return () => { active = false; }; }, []);
  return <LaunchHomeContent currentLang={currentLang} catalog={catalog} isSignedIn={isSignedIn} />;
}
