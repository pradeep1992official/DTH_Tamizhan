import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CatalogData } from '../../lib/newConnectionCatalog';
import { bookingUrl, compareUrl, connectionQuote, defaultBrowseFilters, filterSortPacks, pricing, type BrowseFilters, type PackSelection, type VisiblePack } from '../../lib/newConnectionBrowse';
import { translations } from '../../lib/translations';
import { catalogTerm } from '../../lib/newConnectionCopy';
import type { Language } from '../../types';
import { CatalogLogo, currency, PriceNotice, SampleNote } from './Shared';

interface Props { data: CatalogData; items: VisiblePack[]; lang: Language; selected: PackSelection[]; limit: boolean; onToggle: (item: VisiblePack, validity: number) => void; onRemove: (id: string) => void; onValidity: (id: string, validity: number) => void; onClear: () => void }
export function CatalogPage({ data, items, lang, selected, limit, onToggle, onRemove, onValidity, onClear }: Props) {
  const t = translations[lang]; const brands = useMemo(() => [...data.brands].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)), [data.brands]);
  const [brandId, setBrandId] = useState(brands[0]?.id ?? ''); const [filters, setFilters] = useState<BrowseFilters>(defaultBrowseFilters);
  const [validities, setValidities] = useState<Record<string, number>>({});
  const listed = useMemo(() => filterSortPacks(items, filters, brandId), [items, filters, brandId]);
  const brand = brands.find(b => b.id === brandId);
  const options = (key: 'language' | 'region' | 'type') => [...new Set(items.filter(i => i.brand.id === brandId).map(i => i.pack[key]).filter(Boolean))].sort();
  const genres = [...new Set(items.filter(i => i.brand.id === brandId).flatMap(i => Object.keys(i.genres)))].sort();
  const days = [...new Set(items.filter(i => i.brand.id === brandId).flatMap(i => i.pack.pricingOptions.map(o => o.validityDays)))].sort((a, b) => a - b);
  const update = (key: keyof BrowseFilters, value: string) => setFilters(f => ({ ...f, [key]: value }));
  if (!brands.length || !items.length) return <section className="connection-state"><h1>{t.ncSoon}</h1><p>{t.ncSoonText}</p></section>;
  return <>
    <header className="connection-heading"><p className="connection-eyebrow">{t.ncNav}</p><h1>{t.ncTitle}</h1><p>{t.ncIntro}</p></header>
    <nav className="connection-brands" aria-label={t.ncBrands}>{brands.map(b => <button key={b.id} aria-pressed={brandId === b.id} onClick={() => { setBrandId(b.id); setFilters(defaultBrowseFilters); }}><CatalogLogo key={b.logoUrl} url={b.logoUrl} name={b.name} /><span>{b.name}</span></button>)}</nav>
    {brand?.description && <p>{brand.description}</p>}{brand?.serviceNote && <p className="connection-muted">{brand.serviceNote}</p>}
    <details className="connection-filter-panel"><summary>{t.ncFilters}</summary><div className="connection-controls">
      {(['language', 'region', 'type'] as const).map(key => <label key={key}>{key === 'language' ? t.ncLanguage : key === 'region' ? t.ncRegion : t.ncType}<select value={filters[key]} onChange={e => update(key, e.target.value)}><option value="">{t.ncAll}</option>{options(key).map(v => <option key={v} value={v}>{catalogTerm(v, lang)}</option>)}</select></label>)}
      <label>{t.ncValidity}<select value={filters.validity} onChange={e => update('validity', e.target.value)}><option value="">{t.ncAll}</option>{days.map(d => <option key={d} value={d}>{d} {t.ncDays}</option>)}</select></label>
      <label>{t.ncGenre}<select value={filters.genre} onChange={e => update('genre', e.target.value)}><option value="">{t.ncAll}</option>{genres.map(v => <option key={v} value={v}>{catalogTerm(v, lang)}</option>)}</select></label>
      <label>{t.ncMin}<input type="number" min="0" value={filters.minPrice} onChange={e => update('minPrice', e.target.value)} /></label><label>{t.ncMax}<input type="number" min="0" value={filters.maxPrice} onChange={e => update('maxPrice', e.target.value)} /></label><button onClick={() => setFilters(defaultBrowseFilters)}>{t.ncReset}</button>
    </div><p className="connection-muted">{t.ncFilterNote}</p></details>
    <div className="connection-list-heading"><h2>{t.ncPacks} <span>{listed.length}</span></h2><label>{t.ncSort}<select value={filters.sort} onChange={e => update('sort', e.target.value)}><option value="price">{t.ncPriceSort}</option><option value="channels">{t.ncChannelSort}</option><option value="perChannel">{t.ncValueSort}</option></select></label></div>
    {!listed.length && <div className="connection-state"><p>{items.some(i => i.brand.id === brandId) ? t.ncEmpty : t.ncNoBrandPacks}</p><button onClick={() => setFilters(defaultBrowseFilters)}>{t.ncReset}</button></div>}
    <div className="connection-pack-grid">{listed.map(item => {
      const { pack, counts } = item;
      const chosen = pricing(pack, validities[pack.id] || selected.find(s => s.id === pack.id)?.validity || Number(filters.validity));
      const quote = connectionQuote(item, data.equipment, chosen.validityDays);
      return <article key={pack.id} className="connection-pack"><div className="connection-pack-top"><span className="connection-badge">{catalogTerm(pack.type, lang)}</span><span>{[pack.language, pack.region].filter(Boolean).map(v => catalogTerm(v, lang)).join(' · ')}</span></div><h3>{pack.name}</h3><SampleNote name={pack.name} lang={lang} />
        <dl className="connection-counts">{([[t.ncTotal, counts.channelCount], [t.ncPay, counts.payChannelCount], [t.ncFree, counts.freeChannelCount], [t.ncHD, counts.hdChannelCount]] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <div className="connection-price"><strong>{currency(chosen.price, lang)}</strong><label><span className="sr-only">{t.ncValidity}: {pack.name}</span><select value={chosen.validityDays} onChange={e => { const validity = Number(e.target.value); setValidities(v => ({ ...v, [pack.id]: validity })); onValidity(pack.id, validity); }}>{pack.pricingOptions.map(o => <option key={o.validityDays} value={o.validityDays}>{o.validityDays} {t.ncDays}</option>)}</select></label></div>
        <small className="connection-muted">{currency(pack.monthlyPrice, lang)} · {t.ncMonthly}</small>
        {pack.highlights.length > 0 && <ul className="connection-highlights">{pack.highlights.slice(0, 5).map((h, i) => <li key={i}>{h}</li>)}</ul>}
        <PriceNotice pack={pack} lang={lang} />
        <div className="connection-estimate"><span>{t.ncStarting}</span><strong>{quote.total !== null ? currency(quote.total, lang) : t.ncUnknown}</strong>{quote.offer ? <small>{quote.offer.name} · {t.ncCheapest}</small> : <small>{t.ncNoEquipment}</small>}</div>
        <div className="connection-card-actions"><Link to={`/new-connection/packs/${encodeURIComponent(pack.id)}?validity=${chosen.validityDays}`}>{t.ncView}</Link><label className="connection-check"><input type="checkbox" checked={selected.some(s => s.id === pack.id)} onChange={() => onToggle(item, chosen.validityDays)} />{t.ncCompare}</label><Link className="connection-primary" to={bookingUrl(pack, chosen.validityDays)}>{t.ncSelect}</Link></div>
      </article>;
    })}</div>
    <section className="connection-equipment"><h2>{t.ncEquipment}</h2><p className="connection-muted">{t.ncEquipmentNote}</p>{!data.equipment.some(o => o.brandId === brandId) ? <p>{t.ncNoEquipment}</p> : <div className="connection-offer-grid">{data.equipment.filter(o => o.brandId === brandId).sort((a, b) => a.sortOrder - b.sortOrder).map(offer => <article key={offer.id}><h3>{offer.name} <span className="connection-badge">{offer.boxType}</span></h3><SampleNote name={offer.name} lang={lang} /><dl><div><dt>{t.ncHardware}</dt><dd>{currency(offer.hardwarePrice, lang)}</dd></div><div><dt>{t.ncInstallation}</dt><dd>{currency(offer.installationCharge, lang)}</dd></div></dl>{offer.warrantyNote && <p>{t.ncWarranty}: {offer.warrantyNote}</p>}{offer.includedFirstPackId && <p>{t.ncIncluded}: {items.find(i => i.pack.id === offer.includedFirstPackId)?.pack.name ?? t.ncUnknown}</p>}</article>)}</div>}</section>
    {data.settings.priceDisclaimer && <p className="connection-disclaimer">{data.settings.priceDisclaimer}</p>}
    {selected.length > 0 && <aside className="connection-compare-bar" aria-label={t.ncCompare}><div><strong>{selected.length}/3 {t.ncSelected}</strong><div className="connection-selection">{selected.map(s => <button key={s.id} aria-label={`${t.ncRemove}: ${items.find(i => i.pack.id === s.id)?.pack.name ?? t.ncUnavailable}`} onClick={() => onRemove(s.id)}>{items.find(i => i.pack.id === s.id)?.pack.name ?? t.ncUnavailable} ×</button>)}</div>{selected.length < 2 && <small>{t.ncChooseTwo}</small>}{limit && <p role="status" className="connection-limit">{t.ncMaxThree}</p>}</div><button onClick={onClear}>{t.ncClear}</button>{selected.length >= 2 ? <Link className="connection-primary" to={compareUrl(selected)}>{t.ncCompare}</Link> : <button disabled>{t.ncCompare}</button>}</aside>}
  </>;
}
