import React, { useMemo, useState } from 'react';
import type { Channel, Pack } from '../../lib/newConnectionCatalog';
import { pricesStale } from '../../lib/newConnectionCatalog';
import { defaultChannelFilters, filterChannels, genreCounts, type ChannelFilters } from '../../lib/newConnectionBrowse';
import { catalogTerm } from '../../lib/newConnectionCopy';
import { translations } from '../../lib/translations';
import type { Language } from '../../types';

export const currency = (value: number, lang: Language) => new Intl.NumberFormat(lang === 'ta' ? 'ta-IN' : 'en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
export function CatalogLogo({ url, name, size = 40 }: { url: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  return <span className="connection-logo" style={{ width: size, height: size }}>{url && !failed ? <img src={url} alt="" loading="lazy" width={size} height={size} onError={() => setFailed(true)} /> : <span aria-hidden="true">{name.trim().slice(0, 2).toUpperCase()}</span>}</span>;
}
export function PriceNotice({ pack, lang }: { pack: Pack; lang: Language }) {
  const t = translations[lang]; const validDate = pack.priceLastVerifiedAt && Number.isFinite(Date.parse(pack.priceLastVerifiedAt));
  return <div className="connection-price-note">{validDate && <p>{t.ncVerified} {new Intl.DateTimeFormat(lang === 'ta' ? 'ta-IN' : 'en-IN', { dateStyle: 'medium' }).format(new Date(pack.priceLastVerifiedAt!))}</p>}{pricesStale(pack.priceLastVerifiedAt) && <p>{t.ncUnverified}</p>}</div>;
}
export function SampleNote({ name, lang }: { name: string; lang: Language }) { return name.includes('SAMPLE') ? <small className="connection-sample">{translations[lang].ncSample}</small> : null; }
export function ChannelBrowser({ channels, lang, emptyText }: { channels: Channel[]; lang: Language; emptyText?: string }) {
  const t = translations[lang]; const [filters, setFilters] = useState<ChannelFilters>(defaultChannelFilters); const [page, setPage] = useState(0);
  const filtered = useMemo(() => filterChannels(channels, filters), [channels, filters]);
  const counts = useMemo(() => genreCounts(filtered), [filtered]);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / 60) - 1));
  const paged = filtered.slice(currentPage * 60, (currentPage + 1) * 60);
  const genres = [...new Set(channels.map(c => c.genre))].sort(); const languages = [...new Set(channels.map(c => c.language))].sort();
  const update = (key: keyof ChannelFilters, value: string) => { setFilters(f => ({ ...f, [key]: value })); setPage(0); };
  return <div className="connection-channel-browser">
    <div className="connection-controls"><label className="connection-search">{t.ncSearchChannels}<input type="search" value={filters.search} onChange={e => update('search', e.target.value)} /></label>
      <label>{t.ncGenre}<select value={filters.genre} onChange={e => update('genre', e.target.value)}><option value="">{t.ncAll}</option>{genres.map(v => <option key={v} value={v}>{catalogTerm(v, lang)}</option>)}</select></label>
      <label>{t.ncLanguage}<select value={filters.language} onChange={e => update('language', e.target.value)}><option value="">{t.ncAll}</option>{languages.map(v => <option key={v} value={v}>{catalogTerm(v, lang)}</option>)}</select></label>
      <label>{t.ncQuality}<select value={filters.hd} onChange={e => update('hd', e.target.value)}><option value="">{t.ncAll}</option><option value="true">HD</option><option value="false">SD</option></select></label>
      <label>{t.ncPayment}<select value={filters.pay} onChange={e => update('pay', e.target.value)}><option value="">{t.ncAll}</option><option value="true">{t.ncPaid}</option><option value="false">{t.ncFreeOnly}</option></select></label>
    </div>
    <p className="connection-muted" role="status">{filtered.length} {t.ncChannels} · {t.ncVisibleNote}</p>
    {!filtered.length && <p className="connection-state">{emptyText || t.ncNoChannels}</p>}
    {Object.keys(counts).filter(genre => paged.some(c => c.genre === genre)).map(genre => <section key={genre} className="connection-channel-group"><h3>{catalogTerm(genre, lang)} <span>{counts[genre]}</span></h3><ul className="connection-channel-grid">{paged.filter(c => c.genre === genre).map(channel => <li key={channel.id}><CatalogLogo key={channel.logoUrl} url={channel.logoUrl} name={channel.name} size={32} /><div><strong>{channel.name}</strong><small>{catalogTerm(channel.language, lang)} · {channel.isHD ? 'HD' : 'SD'} · {channel.isPay ? t.ncPaid : t.ncFreeOnly}</small></div></li>)}</ul></section>)}
    {filtered.length > 60 && <div className="connection-pagination"><span>{currentPage * 60 + 1}–{Math.min((currentPage + 1) * 60, filtered.length)} {t.ncOf} {filtered.length}</span><button disabled={!currentPage} onClick={() => setPage(currentPage - 1)}>{t.ncPrevious}</button><button disabled={(currentPage + 1) * 60 >= filtered.length} onClick={() => setPage(currentPage + 1)}>{t.ncNext}</button></div>}
  </div>;
}
