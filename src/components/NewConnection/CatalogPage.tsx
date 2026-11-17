import React, { useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { packBoxType, packPackageType, type CatalogData } from '../../lib/newConnectionCatalog';
import { bookingUrl, compareUrl, defaultBrowseFilters, filterSortPacks, pricingForFilter, type BrowseFilters, type PackSelection, type VisiblePack } from '../../lib/newConnectionBrowse';
import { translations } from '../../lib/translations';
import { catalogTerm } from '../../lib/newConnectionCopy';
import type { Language } from '../../types';
import { monthlyComparison, packageCardLabel, validityLabel } from '../../lib/newConnectionDisplay';
import { Check, SlidersHorizontal } from '../../lib/icons';
import { PackageTooltip } from './PackageTooltip';
import { PackageImage } from './PackageImage';
import { CatalogLogo, ChannelQuality, currency, SampleNote } from './Shared';

interface Props { data: CatalogData; items: VisiblePack[]; lang: Language; selected: PackSelection[]; limit: boolean; onToggle: (item: VisiblePack, validity: number) => void; onRemove: (id: string) => void; onValidity: (id: string, validity: number) => void; onClear: () => void }
export function CatalogPage({ data, items, lang, selected, limit, onToggle, onRemove, onValidity, onClear }: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false); const filtersId = useId();
  const t = translations[lang]; const brands = useMemo(() => [...data.brands].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)), [data.brands]);
  const [savedBrowse] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('dth:pack-browse') || '{}') ?? {}; } catch { return {}; }
  });
  const [brandId, setBrandId] = useState<string>(typeof savedBrowse.brandId === 'string' ? savedBrowse.brandId : '');
  const [filters, setFilters] = useState<BrowseFilters>(() => ({ ...defaultBrowseFilters, ...Object.fromEntries(Object.entries(defaultBrowseFilters).filter(([key]) => typeof savedBrowse.filters?.[key] === 'string' && (key !== 'sort' || ['price', 'channels', 'perChannel'].includes(savedBrowse.filters[key]))).map(([key]) => [key, savedBrowse.filters[key]])) }));
  const [validities, setValidities] = useState<Record<string, number>>({});
  useEffect(() => {
    try { sessionStorage.setItem('dth:pack-browse', JSON.stringify({ brandId, filters })); } catch { /* Storage can be unavailable. */ }
  }, [brandId, filters]);
  const listed = useMemo(() => filterSortPacks(items, filters, brandId || undefined, { ...Object.fromEntries(selected.map(s => [s.id, s.validity])), ...validities }), [items, filters, brandId, selected, validities]);
  function chooseBrand(id: string) { setBrandId(id); }
  function clearFilters() { setBrandId(''); setFilters(current => ({ ...defaultBrowseFilters, sort: current.sort })); }
  const options = (key: 'language' | 'region' | 'type') => [...new Set(items.map(i => i.pack[key]).filter(Boolean))].sort();
  const boxTypes = [...new Set(items.map(i => packBoxType(i.pack)))].sort();
  const genres = [...new Set(items.flatMap(i => Object.keys(i.genres)))].sort();
  const durations = [...new Map(items.flatMap(i => i.pack.pricingOptions).map(o => [o.validityMonths ? `months:${o.validityMonths}` : String(o.validityDays), o])).entries()].sort((a, b) => a[1].validityDays - b[1].validityDays);
  const update = (key: keyof BrowseFilters, value: string) => setFilters(f => ({ ...f, [key]: value }));
  const filterLabels: Record<string, string> = { boxType: lang === 'en' ? 'Box type' : '\u0baa\u0bc6\u0b9f\u0bcd\u0b9f\u0bbf \u0bb5\u0b95\u0bc8', language: t.ncLanguage, region: t.ncRegion, type: t.ncType, genre: t.ncGenre, validity: t.ncValidity, minPrice: t.ncMin, maxPrice: t.ncMax };
  const activeFilters = [
    ...(brandId ? [{ key: 'brand', label: t.ncBrand, value: brands.find(b => b.id === brandId)?.name ?? t.ncUnknown }] : []),
    ...Object.entries(filters).filter(([key, value]) => key !== 'sort' && value).map(([key, value]) => {
      const duration = key === 'validity' ? durations.find(([id]) => id === value)?.[1] : undefined;
      return { key, label: filterLabels[key], value: key === 'minPrice' || key === 'maxPrice' ? currency(Number(value), lang) : duration ? validityLabel(duration.validityDays, lang, duration.validityMonths) : catalogTerm(value, lang) };
    }),
  ];
  if (!brands.length || !items.length) return <section className="connection-state"><h1>{t.ncSoon}</h1><p>{t.ncSoonText}</p></section>;
  return <div className="connection-catalog">
    <header className="connection-heading connection-catalog-heading"><h1>{t.ncNav}</h1><p>{lang === 'en' ? 'Compare packs and choose your connection.' : '\u0baa\u0bc7\u0b95\u0bcd\u0b95\u0bc1\u0b95\u0bb3\u0bc8 \u0b92\u0baa\u0bcd\u0baa\u0bbf\u0b9f\u0bcd\u0b9f\u0bc1 \u0ba4\u0bc7\u0bb0\u0bcd\u0bb5\u0bc1 \u0b9a\u0bc6\u0baf\u0bcd\u0baf\u0bb5\u0bc1\u0bae\u0bcd.'}</p></header>
    <div className="connection-list-heading"><h2>{t.ncPacks} <span>{listed.length}</span></h2><div className="connection-catalog-actions"><label>{t.ncBrand}<select aria-label={t.ncBrand} value={brandId} onChange={e => chooseBrand(e.target.value)}><option value="">{lang === 'en' ? 'All brands' : '\u0b85\u0ba9\u0bc8\u0ba4\u0bcd\u0ba4\u0bc1 \u0baa\u0bbf\u0bb0\u0bbe\u0ba3\u0bcd\u0b9f\u0bc1\u0b95\u0bb3\u0bc1\u0bae\u0bcd'}</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label>{filterLabels.boxType}<select aria-label={filterLabels.boxType} value={filters.boxType} onChange={e => update('boxType', e.target.value)}><option value="">{lang === 'en' ? 'All box types' : t.ncAll}</option>{boxTypes.map(type => <option key={type} value={type}>{type}</option>)}</select></label><button type="button" className="connection-filter-button" aria-expanded={filtersOpen} aria-controls={filtersId} onClick={() => setFiltersOpen(open => !open)}><SlidersHorizontal size={16} aria-hidden="true" />{lang === 'en' ? 'More filters' : '\u0bae\u0bc7\u0bb2\u0bc1\u0bae\u0bcd \u0bb5\u0b9f\u0bbf\u0b95\u0b9f\u0bcd\u0b9f\u0bbf\u0b95\u0bb3\u0bcd'}{activeFilters.length > 0 && <span className="connection-filter-count">({activeFilters.length})</span>}</button><label>{t.ncSort}<select aria-label={t.ncSort} value={filters.sort} onChange={e => update('sort', e.target.value)}><option value="price">{t.ncPriceSort}</option><option value="channels">{t.ncChannelSort}</option><option value="perChannel">{t.ncValueSort}</option></select></label></div></div>
    {activeFilters.length > 0 && <div className="connection-active-filters" aria-label={lang === 'en' ? 'Active filters' : t.ncFilters}>{activeFilters.map(filter => <button type="button" key={filter.key} aria-label={`${t.ncRemove} ${filter.label}: ${filter.value}`} onClick={() => filter.key === 'brand' ? setBrandId('') : update(filter.key as keyof BrowseFilters, '')}>{filter.label}: {filter.value}<span aria-hidden="true">&times;</span></button>)}<button type="button" className="connection-clear-filters" onClick={clearFilters}>{lang === 'en' ? 'Clear all' : t.ncReset}</button></div>}
    <div className="connection-filter-panel" id={filtersId} hidden={!filtersOpen}><div className="connection-controls">

      {(['language', 'region', 'type'] as const).filter(key => options(key).length > 1).map(key => <label key={key}>{key === 'language' ? t.ncLanguage : key === 'region' ? t.ncRegion : t.ncType}<select value={filters[key]} onChange={e => update(key, e.target.value)}><option value="">{t.ncAll}</option>{options(key).map(v => <option key={v} value={v}>{catalogTerm(v, lang)}</option>)}</select></label>)}
      {durations.length > 1 && <label>{t.ncValidity}<select value={filters.validity} onChange={e => update('validity', e.target.value)}><option value="">{t.ncAll}</option>{durations.map(([value, option]) => <option key={value} value={value}>{validityLabel(option.validityDays, lang, option.validityMonths)}</option>)}</select></label>}
      {genres.length > 1 && <label>{t.ncGenre}<select value={filters.genre} onChange={e => update('genre', e.target.value)}><option value="">{t.ncAll}</option>{genres.map(v => <option key={v} value={v}>{catalogTerm(v, lang)}</option>)}</select></label>}
      <label>{t.ncMin}<input type="number" min="0" value={filters.minPrice} onChange={e => update('minPrice', e.target.value)} /></label><label>{t.ncMax}<input type="number" min="0" value={filters.maxPrice} onChange={e => update('maxPrice', e.target.value)} /></label><button onClick={clearFilters}>{t.ncReset}</button>
    </div><p className="connection-muted">{t.ncFilterNote}</p></div>

    {!listed.length && <div className="connection-state"><p>{t.ncEmpty}</p><button onClick={clearFilters}>{t.ncReset}</button></div>}
    <div className="connection-pack-grid">{listed.map(item => {
      const { pack, counts } = item;
      const chosen = pricingForFilter(pack, filters.validity, validities[pack.id] || selected.find(s => s.id === pack.id)?.validity);
      const packageType = packPackageType(pack);
      const isCompared = selected.some(s => s.id === pack.id);
      return <article key={pack.id} className="connection-pack" data-selected={isCompared}>
        {isCompared && <span className="connection-comparison-state"><Check size={13} aria-hidden="true" />{lang === 'en' ? 'Selected for comparison' : '\u0b92\u0baa\u0bcd\u0baa\u0bbf\u0b9f \u0ba4\u0bc7\u0bb0\u0bcd\u0ba8\u0bcd\u0ba4\u0bc6\u0b9f\u0bc1\u0b95\u0bcd\u0b95\u0baa\u0bcd\u0baa\u0b9f\u0bcd\u0b9f\u0ba4\u0bc1'}</span>}

        <div className="connection-pack-product"><div className="connection-pack-title">
          <div className="connection-card-brand"><CatalogLogo key={item.brand.logoUrl} url={item.brand.logoUrl || (item.brand.name.toLowerCase().includes('airtel') ? '/airtel_logo.png' : item.brand.name.toLowerCase().replace(/[^a-z]/g, '').includes('tataplay') ? '/tata_logo.png' : '')} name={item.brand.name} size={28} /><span className="sr-only">{item.brand.name}</span></div>

          <h3>{pack.name.replace(/\s*[-\u2014]\s*(ONLY\s*BOX|FULL\s*SET)$/i, '')}</h3>{packBoxType(pack) === 'Android' && <p className="connection-box-type">Android box</p>}
        </div><PackageImage brand={item.brand.name} pack={pack.name} packageType={packageType} boxType={packBoxType(pack)} /></div>
        <div className="connection-package-row"><div className="connection-package-help"><span className="connection-package-type">{packageType ? packageCardLabel(packageType, lang) : `${packBoxType(pack)} box`}</span>{packageType && <PackageTooltip packageType={packageType} boxType={packBoxType(pack)} lang={lang} />}</div></div>
        {packageType && <p className="connection-package-includes"><Check size={14} aria-hidden="true" /><span>{packageType === 'only_box' ? (lang === 'en' ? 'Free installation' : '\u0ba8\u0bbf\u0bb1\u0bc1\u0bb5\u0bb2\u0bcd \u0b87\u0bb2\u0bb5\u0b9a\u0bae\u0bcd') : (lang === 'en' ? 'Dish + free installation' : '\u0b9f\u0bbf\u0bb7\u0bcd + \u0b87\u0bb2\u0bb5\u0b9a \u0ba8\u0bbf\u0bb1\u0bc1\u0bb5\u0bb2\u0bcd')}</span></p>}
        <SampleNote name={pack.name} lang={lang} />
        <ChannelQuality type={pack.type} hdCount={counts.hdChannelCount} totalCount={counts.channelCount} lang={lang} />
        <div className="connection-price"><div className="connection-price-amount"><div className="connection-price-line"><strong>{currency(chosen.price, lang)}</strong><span className="connection-price-separator" aria-hidden="true">/</span>{pack.pricingOptions.length === 1 ? <span className="connection-validity">{validityLabel(chosen.validityDays, lang, chosen.validityMonths)}</span> : <label><span className="sr-only">{t.ncValidity}: {pack.name}</span><select aria-label={`${t.ncValidity}: ${pack.name}`} value={chosen.validityDays} onChange={e => { const validity = Number(e.target.value); setValidities(v => ({ ...v, [pack.id]: validity })); onValidity(pack.id, validity); }}>{pack.pricingOptions.map(o => <option key={o.validityDays} value={o.validityDays}>{validityLabel(o.validityDays, lang, o.validityMonths)}</option>)}</select></label>}</div><small title={chosen.validityMonths ? 'Monthly equivalent for the selected plan' : 'Based on 30-day months'}>{monthlyComparison(chosen.price, chosen.validityDays, lang, chosen.validityMonths)}</small></div></div>
        <div className="connection-card-actions"><Link to={`/new-connection/packs/${encodeURIComponent(pack.id)}?validity=${chosen.validityDays}`}><span className="link-label">{t.ncView}</span><span className="link-arrow" aria-hidden="true">&rarr;</span></Link><label className="connection-check connection-card-compare" htmlFor={`${filtersId}-compare-${pack.id}`} data-selected={isCompared}><input id={`${filtersId}-compare-${pack.id}`} type="checkbox" aria-label={`${t.ncCompare}: ${pack.name}`} checked={isCompared} onChange={() => onToggle(item, chosen.validityDays)} />{t.ncCompare}</label><Link className="connection-primary" to={bookingUrl(pack, chosen.validityDays)}>{t.ncSelect}</Link></div>
      </article>;
    })}</div>
    {brands.some(b => b.serviceNote) && <details className="connection-installation-info"><summary>{lang === 'en' ? 'Installation info' : '\u0ba8\u0bbf\u0bb1\u0bc1\u0bb5\u0bb2\u0bcd \u0ba4\u0b95\u0bb5\u0bb2\u0bcd'}</summary>{brands.filter(b => b.serviceNote).map(b => <p key={b.id}><strong>{b.name}: </strong>{b.serviceNote}</p>)}</details>}
    {data.settings.priceDisclaimer && <p className="connection-disclaimer">{data.settings.priceDisclaimer}</p>}
    {selected.length > 0 && <aside className="connection-compare-bar" aria-label={t.ncCompare}><div><strong>{selected.length}/3 {t.ncSelected}</strong><div className="connection-selection">{selected.map(s => <button key={s.id} aria-label={`${t.ncRemove}: ${items.find(i => i.pack.id === s.id)?.pack.name ?? t.ncUnavailable}`} onClick={() => onRemove(s.id)}>{items.find(i => i.pack.id === s.id)?.pack.name ?? t.ncUnavailable} ×</button>)}</div>{selected.length < 2 && <small>{t.ncChooseTwo}</small>}{limit && <p role="status" className="connection-limit">{t.ncMaxThree}</p>}</div><button onClick={onClear}>{t.ncClear}</button>{selected.length >= 2 ? <Link className="connection-primary" to={compareUrl(selected)}>{t.ncCompare}</Link> : <button disabled>{t.ncCompare}</button>}</aside>}
  </div>;
}
