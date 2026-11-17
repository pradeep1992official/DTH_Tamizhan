import React, { useEffect, useRef, useMemo, useState } from 'react';
import type { Channel, Pack } from '../../lib/newConnectionCatalog';
import { defaultChannelFilters, filterChannels, genreCounts, type ChannelFilters } from '../../lib/newConnectionBrowse';
import { catalogTerm } from '../../lib/newConnectionCopy';
import { translations } from '../../lib/translations';
import type { Language } from '../../types';

export const currency = (value: number, lang: Language) => new Intl.NumberFormat(lang === 'ta' ? 'ta-IN' : 'en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
export function ChannelQuality({ type, hdCount, totalCount, lang }: { totalCount?: number; type: Pack['type']; hdCount: number; lang: Language }) {
  const hd = type !== 'SD' && (hdCount > 0 || type === 'HD' || type === '4K');
  const label = hd ? `${hdCount} ${translations[lang].ncHD}` : lang === 'ta' ? 'SD \u0b9a\u0bc7\u0ba9\u0bb2\u0bcd\u0b95\u0bb3\u0bcd' : 'SD channels';
  return <p className={`connection-channel-quality ${hd ? 'is-hd' : 'is-sd'}`}><span className="connection-quality-icon" aria-hidden="true">{hd ? 'HD' : 'SD'}</span>{totalCount !== undefined && <><span>{totalCount} {translations[lang].ncChannels}</span><span aria-hidden="true">&middot;</span></>}<strong>{label}</strong></p>;
}
export function CatalogLogo({ url, name, size = 40, showInitials = true }: { url: string; name: string; size?: number; showInitials?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!showInitials && (!url || failed)) return null;
  return <span className="connection-logo" style={{ width: size, height: size }}>{url && !failed ? <img src={url} alt="" loading="lazy" width={size} height={size} onError={() => setFailed(true)} /> : <span aria-hidden="true">{name.trim().slice(0, 2).toUpperCase()}</span>}</span>;
}
export function PriceNotice({ pack, lang }: { pack: Pack; lang: Language }) {
  const t = translations[lang]; const validDate = pack.priceLastVerifiedAt && Number.isFinite(Date.parse(pack.priceLastVerifiedAt));
  return <div className="connection-price-note">{validDate && <p>{t.ncVerified} {new Intl.DateTimeFormat(lang === 'ta' ? 'ta-IN' : 'en-IN', { dateStyle: 'medium' }).format(new Date(pack.priceLastVerifiedAt!))}</p>}</div>;
}
export function SampleNote({ name, lang }: { name: string; lang: Language }) { return name.includes('SAMPLE') ? <small className="connection-sample">{translations[lang].ncSample}</small> : null; }
export function ChannelBrowser({ channels, lang, emptyText, channelNumbers, catalogUpdatedAt }: { channels: Channel[]; lang: Language; emptyText?: string; catalogUpdatedAt?: string; channelNumbers?: Readonly<Record<string, number>> }) {
  const t = translations[lang]; const [filters, setFilters] = useState<ChannelFilters>(defaultChannelFilters); const [page, setPage] = useState(0);
  const filtered = useMemo(() => filterChannels(channels, filters), [channels, filters]);
  const counts = useMemo(() => genreCounts(filtered), [filtered]);
  const pageSize = filtered.length > 120 ? 60 : 120;
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / pageSize) - 1));
  const paged = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const genres = [...new Set(channels.map(c => c.genre))].sort(); const languages = [...new Set(channels.map(c => c.language))].sort();
  const updateDate = catalogUpdatedAt && Number.isFinite(Date.parse(catalogUpdatedAt)) ? new Intl.DateTimeFormat(lang === 'ta' ? 'ta-IN' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(catalogUpdatedAt)) : null;
  const hasActiveFilters = Object.values(filters).some(Boolean);
  const hasPricingChoices = channels.some(c => c.isPay) && channels.some(c => !c.isPay);
  const update = (key: keyof ChannelFilters, value: string) => { setFilters(f => ({ ...f, [key]: value })); setPage(0); };
  const toolbarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const header = document.querySelector('.app-header');
    if (!header || !toolbarRef.current) return;
    const updateOffset = () => toolbarRef.current?.style.setProperty('--channel-header-offset', `${header.getBoundingClientRect().height}px`);
    updateOffset();
    const observer = new ResizeObserver(updateOffset); observer.observe(header);
    return () => observer.disconnect();
  }, []);
  return <div className="connection-channel-browser">
    <div className="connection-channel-toolbar" ref={toolbarRef}><div className="connection-controls"><label className="connection-search">{t.ncSearchChannels}<input type="search" value={filters.search} onChange={e => update('search', e.target.value)} /></label>
      <label>{t.ncGenre}<select value={filters.genre} onChange={e => update('genre', e.target.value)}><option value="">{t.ncAll}</option>{genres.map(v => <option key={v} value={v}>{catalogTerm(v, lang)}</option>)}</select></label>
      <label>{t.ncLanguage}<select value={filters.language} onChange={e => update('language', e.target.value)}><option value="">{t.ncAll}</option>{languages.map(v => <option key={v} value={v}>{catalogTerm(v, lang)}</option>)}</select></label>
      <label>{t.ncQuality}<select value={filters.hd} onChange={e => update('hd', e.target.value)}><option value="">{t.ncAll}</option><option value="true">HD</option><option value="false">SD</option></select></label>
      {hasPricingChoices && <label>{t.ncPayment}<select value={filters.pay} onChange={e => update('pay', e.target.value)}><option value="">{t.ncAll}</option><option value="true">{t.ncPaid}</option><option value="false">{t.ncFreeOnly}</option></select></label>}
    </div>
    <div className="connection-channel-results"><p role="status">{lang === 'en' ? `Showing ${filtered.length} of ${channels.length} channels` : `${channels.length} ${t.ncChannels} / ${filtered.length} ${t.ncChannels}`} &middot; <strong className="connection-channel-hd-count">{filtered.filter(channel => channel.isHD).length} HD</strong>{updateDate && <span className="connection-channel-updated">{lang === 'en' ? 'Last updated' : '\u0baa\u0b9f\u0bcd\u0b9f\u0bbf\u0baf\u0bb2\u0bcd \u0baa\u0bc1\u0ba4\u0bc1\u0baa\u0bcd\u0baa\u0bbf\u0ba4\u0bcd\u0ba4 \u0ba4\u0bc7\u0ba4\u0bbf'} <time dateTime={catalogUpdatedAt}>{updateDate}</time></span>}</p><button type="button" disabled={!hasActiveFilters} className="connection-clear-channel-filters" onClick={() => { setFilters({ ...defaultChannelFilters }); setPage(0); }}>{lang === 'en' ? 'Clear filters' : t.ncReset}</button></div>
    </div>

    {!filtered.length && <p className="connection-state">{emptyText || t.ncNoChannels}</p>}
    {Object.keys(counts).filter(genre => paged.some(c => c.genre === genre)).map(genre => <details key={genre} className="connection-channel-group" open><summary>{catalogTerm(genre, lang)} <span>{counts[genre]}</span></summary><ul className="connection-channel-grid">{paged.filter(c => c.genre === genre).map(channel => <li key={channel.id}>{channelNumbers?.[channel.name] !== undefined && <span className="connection-channel-lcn" aria-label={`LCN ${channelNumbers[channel.name]}`}><small>LCN</small>{channelNumbers[channel.name]}</span>}<CatalogLogo key={channel.logoUrl} url={channel.logoUrl} name={channel.name} size={32} showInitials={false} /><div className="connection-channel-content"><strong>{channel.name}</strong><small>{catalogTerm(channel.language, lang)}{!channel.isHD && <> &middot; SD</>}{channel.isPay && <span className="connection-channel-paid"> &middot; {t.ncPaid}</span>}</small></div>{channel.isHD && <span className="is-hd connection-channel-quality-tag"><span className="connection-quality-icon connection-channel-hd-badge">HD</span></span>}</li>)}</ul></details>)}

    {filtered.length > pageSize && <div className="connection-pagination"><span>{currentPage * pageSize + 1}&ndash;{Math.min((currentPage + 1) * pageSize, filtered.length)} {t.ncOf} {filtered.length}</span><button disabled={!currentPage} onClick={() => setPage(currentPage - 1)}>{t.ncPrevious}</button><button disabled={(currentPage + 1) * pageSize >= filtered.length} onClick={() => setPage(currentPage + 1)}>{t.ncNext}</button></div>}

  </div>;
}
