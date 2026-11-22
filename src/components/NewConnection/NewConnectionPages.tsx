import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { packBoxType, packPackageType } from '../../lib/newConnectionCatalog';
import { packDisplayName, packageCardLabel, validityLabel } from '../../lib/newConnectionDisplay';
import { Download } from '../../lib/icons';
import { PackageInclusions } from './PackageInclusions';
import type { CatalogData } from '../../lib/newConnectionCatalog';
import { loadPublicCatalog } from '../../lib/newConnectionPublicCatalog';
import { bookingUrl, parseCompare, pricing, visibleCatalog, type PackSelection, type VisiblePack } from '../../lib/newConnectionBrowse';
import { translations } from '../../lib/translations';
import type { Language, UserProfile } from '../../types';
import { ErrorPage } from '../ErrorPages';
import { CatalogPage } from './CatalogPage';
import { ComparePage } from './ComparePage';
import { CatalogLogo, ChannelBrowser, currency, PriceNotice, SampleNote } from './Shared';
import './new-connection.css';
import { brandChannelNumbers } from '../../lib/channelLcn';
import { channelFlyer } from '../../lib/channelFlyers';
import { BookingPage } from './BookingPage';

export function PackChannels({ items, lang }: { items: VisiblePack[]; lang: Language }) {
  const { packId } = useParams(); const { search } = useLocation();
  const validity = Number(new URLSearchParams(search).get('validity'));
  const item = items.find(i => i.pack.id === packId); const t = translations[lang];
  const pageRef = useRef<HTMLDivElement>(null);
  const selectBarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const bar = selectBarRef.current;
    if (!bar) return;
    const measure = () => pageRef.current?.style.setProperty('--pack-select-height', `${bar.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure); observer.observe(bar);
    return () => observer.disconnect();
  }, [item?.pack.id]);
  if (!item) return <section className="connection-state"><h1>{t.ncUnavailable}</h1><p>{t.ncUnavailableText}</p></section>;
  const option = pricing(item.pack, validity);
  const packageType = packPackageType(item.pack);
  const name = packDisplayName(item.pack.name);
  const term = validityLabel(option.validityDays, lang, option.validityMonths);
  const flyer = channelFlyer(item.brand.name, item.pack.name);
  return <div className="connection-pack-channels" ref={pageRef}>
    <Link className="connection-back" to="/new-connection"><span className="link-arrow" aria-hidden="true">&larr;</span> <span className="link-label">{t.ncBack}</span></Link>
    <header className="connection-heading">
      <div className="connection-detail-brand" role="img" aria-label={item.brand.name}><CatalogLogo url={item.brand.logoUrl || (item.brand.name.toLowerCase().includes('airtel') ? '/airtel_logo.png' : item.brand.name.toLowerCase().replace(/[^a-z]/g, '').includes('tataplay') ? '/tata_logo.png' : '')} name={item.brand.name} size={64} /></div><h1>{name}</h1>
      {packageType && <span className="connection-package-type">{packageCardLabel(packageType, lang)}</span>}
      <div className="connection-detail-purchase"><p className="connection-detail-price"><strong>{currency(option.price, lang)}</strong> / {term}</p><Link className="connection-primary" to={bookingUrl(item.pack, option.validityDays)}>{lang === 'en' ? 'Select pack' : t.ncSelect}</Link></div>
      {packageType && <PackageInclusions packageType={packageType} boxType={packBoxType(item.pack)} lang={lang} />}
      <SampleNote name={item.pack.name} lang={lang} /><PriceNotice pack={item.pack} lang={lang} />
      {flyer && <a className="connection-channel-download" href={flyer} download={flyer.split('/').pop()}><Download size={18} aria-hidden="true" />{lang === 'ta' ? '\u0b9a\u0bc7\u0ba9\u0bb2\u0bcd \u0baa\u0b9f\u0bcd\u0b9f\u0bbf\u0baf\u0bb2\u0bc8\u0baa\u0bcd \u0baa\u0ba4\u0bbf\u0bb5\u0bbf\u0bb1\u0b95\u0bcd\u0b95\u0bb5\u0bc1\u0bae\u0bcd' : 'Download channel list'} (JPG)</a>}
    </header>
    <ChannelBrowser key={item.pack.id} catalogUpdatedAt={item.pack.updatedAt} channels={item.channels} lcnBrands={[brandChannelNumbers(item.brand, item.channels)]} showLcnBrand={false} lang={lang} />
    <aside ref={selectBarRef} className="connection-pack-select-bar" aria-label={lang === 'en' ? 'Selected pack' : t.ncPack}>
      <div><strong className="connection-select-name">{name}</strong><span><b>{currency(option.price, lang)}</b><span className="connection-select-term"> / {term}</span></span></div>
      <Link className="connection-primary" to={bookingUrl(item.pack, option.validityDays)}>{lang === 'en' ? 'Select pack' : t.ncSelect}</Link>
    </aside>
  </div>;
}
export function NewConnectionPages({ currentLang: lang, user = null, onOpenAuth = () => {} }: { currentLang: Language; user?: UserProfile | null; onOpenAuth?: () => void }) {
  const t = translations[lang]; const location = useLocation(); const [data, setData] = useState<CatalogData | null>(null); const [error, setError] = useState(false); const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<PackSelection[]>(() => parseCompare(location.search)); const [limit, setLimit] = useState(false);
  useEffect(() => { let cancelled = false; setError(false); loadPublicCatalog().then(catalog => { if (!cancelled) setData(catalog); }).catch(() => { if (!cancelled) setError(true); }); return () => { cancelled = true; }; }, [attempt, location.pathname]);
  const items = useMemo(() => data ? visibleCatalog(data) : [], [data]);
  const toggle = (item: VisiblePack, validity: number) => {
    if (selected.some(s => s.id === item.pack.id)) { setSelected(s => s.filter(v => v.id !== item.pack.id)); setLimit(false); }
    else if (selected.length >= 3) setLimit(true);
    else { setSelected(s => [...s, { id: item.pack.id, validity }]); setLimit(false); }
  };
  return <div className="new-connection-page">{error ? <section className="connection-state" role="alert"><p>{t.ncError}</p><button onClick={() => setAttempt(a => a + 1)}>{t.ncRetry}</button></section> : !data ? <section className="connection-state" role="status" aria-busy="true">{t.ncLoading}</section> : <>
    <Routes><Route index element={<CatalogPage data={data} items={items} lang={lang} selected={selected} limit={limit} onToggle={toggle} onRemove={id => { setSelected(s => s.filter(v => v.id !== id)); setLimit(false); }} onValidity={(id, validity) => setSelected(s => s.map(v => v.id === id ? { ...v, validity } : v))} onClear={() => { setSelected([]); setLimit(false); }} />} /><Route path="compare" element={<ComparePage data={data} items={items} lang={lang} onSelection={setSelected} />} /><Route path="packs/:packId" element={<PackChannels items={items} lang={lang} />} /><Route path="book" element={<BookingPage key={user?.uid || 'guest'} data={data} items={items} lang={lang} user={user} onOpenAuth={onOpenAuth} />} /><Route path="*" element={<ErrorPage status={404} currentLang={lang} />} /></Routes>
  </>}</div>;
}
