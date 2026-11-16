import React, { useEffect, useMemo, useState } from 'react';
import { Link, Route, Routes, useLocation, useParams } from 'react-router-dom';
import type { CatalogData } from '../../lib/newConnectionCatalog';
import { loadPublicCatalog } from '../../lib/newConnectionPublicCatalog';
import { bookingUrl, parseCompare, pricing, visibleCatalog, type PackSelection, type VisiblePack } from '../../lib/newConnectionBrowse';
import { translations } from '../../lib/translations';
import type { Language, UserProfile } from '../../types';
import { ErrorPage } from '../ErrorPages';
import { CatalogPage } from './CatalogPage';
import { ComparePage } from './ComparePage';
import { ChannelBrowser, currency, PriceNotice, SampleNote } from './Shared';
import './new-connection.css';
import { BookingPage } from './BookingPage';

function PackChannels({ items, lang }: { items: VisiblePack[]; lang: Language }) {
  const { packId } = useParams(); const { search } = useLocation(); const validity = Number(new URLSearchParams(search).get('validity')); const item = items.find(i => i.pack.id === packId); const t = translations[lang];
  return <><Link className="connection-back" to="/new-connection">← {t.ncBack}</Link>{item ? <><header className="connection-heading"><p className="connection-eyebrow">{item.brand.name}</p><h1>{item.pack.name}</h1><SampleNote name={item.pack.name} lang={lang} /><PriceNotice pack={item.pack} lang={lang} /></header><ChannelBrowser key={item.pack.id} channels={item.channels} lang={lang} /><Link className="connection-primary" to={bookingUrl(item.pack, pricing(item.pack, validity).validityDays)}>{t.ncSelect}</Link></> : <section className="connection-state"><h1>{t.ncUnavailable}</h1><p>{t.ncUnavailableText}</p></section>}</>;
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
