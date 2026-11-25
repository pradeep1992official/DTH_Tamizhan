import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { packBoxType, packPackageType, type CatalogData } from '../../lib/newConnectionCatalog';
import { bookingUrl, compareUrl, defaultBrowseFilters, filterSortPacks, pricingForFilter, type BrowseFilters, type PackSelection, type VisiblePack } from '../../lib/newConnectionBrowse';
import { translations } from '../../lib/translations';
import type { Language } from '../../types';
import { monthlyComparison, packDisplayName, packageCardLabel, validityLabel } from '../../lib/newConnectionDisplay';
import { Check, ChevronDown } from '../../lib/icons';
import { PackChips } from './PackChips';
import { PackageImage } from './PackageImage';
import { CatalogLogo, currency, SampleNote } from './Shared';

interface Props { initialBrandId?: string; data: CatalogData; items: VisiblePack[]; lang: Language; selected: PackSelection[]; limit: boolean; onToggle: (item: VisiblePack, validity: number) => void; onRemove: (id: string) => void; onValidity: (id: string, validity: number) => void; onClear: () => void }
export function CatalogPage({ initialBrandId, data, items, lang, selected, limit, onToggle, onRemove, onValidity, onClear }: Props) {
  const catalogRef = useRef<HTMLDivElement>(null);
  const compareBarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const bar = compareBarRef.current;
    if (!bar) return;
    const measure = () => catalogRef.current?.style.setProperty('--compare-bar-height', `${bar.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure); observer.observe(bar);
    return () => observer.disconnect();
  }, [selected.length]);
  const filtersId = useId();
  const t = translations[lang]; const brands = useMemo(() => [...data.brands].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)), [data.brands]);
  const [savedBrowse] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('dth:pack-browse') || '{}') ?? {}; } catch { return {}; }
  });
  const linkedBrand = initialBrandId && brands.some(brand => brand.id === initialBrandId) ? initialBrandId : '';
  const [brandId, setBrandId] = useState<string>(linkedBrand || (typeof savedBrowse.brandId === 'string' ? savedBrowse.brandId : ''));
  const [filters, setFilters] = useState<BrowseFilters>(() => ({
    ...defaultBrowseFilters,
    ...(!linkedBrand ? {
    ...Object.fromEntries(Object.keys(defaultBrowseFilters).filter(key => key !== 'sort' && typeof savedBrowse.filters?.[key] === 'string').map(key => [key, savedBrowse.filters[key]])),
    sort: ['price', 'channels', 'perChannel'].includes(savedBrowse.filters?.sort) ? savedBrowse.filters.sort : 'price',
    packageType: savedBrowse.filters?.packageType === 'only_box' || savedBrowse.filters?.packageType === 'full_set' ? savedBrowse.filters.packageType : '',
    } : {}),
  }));
  const [validities, setValidities] = useState<Record<string, number>>({});
  useEffect(() => {
    try { sessionStorage.setItem('dth:pack-browse', JSON.stringify({ brandId, filters })); } catch { /* Storage can be unavailable. */ }
  }, [brandId, filters]);
  const listed = useMemo(() => filterSortPacks(items, filters, brandId || undefined, { ...Object.fromEntries(selected.map(s => [s.id, s.validity])), ...validities }), [items, filters, brandId, selected, validities]);
  function chooseBrand(id: string) { setBrandId(id); }
  function clearFilters() { setBrandId(''); setFilters(current => ({ ...defaultBrowseFilters, sort: current.sort })); }
  const boxTypes = [...new Set(items.map(i => packBoxType(i.pack)))].sort();
  const update = (key: keyof BrowseFilters, value: string) => setFilters(f => ({ ...f, [key]: value }));
  const boxTypeLabel = lang === 'en' ? 'Box type' : '\u0baa\u0bc6\u0b9f\u0bcd\u0b9f\u0bbf \u0bb5\u0b95\u0bc8';
  const validityOptions = [...new Map(items.flatMap(item => item.pack.pricingOptions).map(option => [option.validityMonths ? `months:${option.validityMonths}` : String(option.validityDays), option])).entries()].sort((a, b) => a[1].validityDays - b[1].validityDays);
  const extraKeys = ['boxType', 'language', 'region', 'genre', 'minPrice', 'maxPrice'] as const;
  const extraCount = extraKeys.filter(key => filters[key] !== defaultBrowseFilters[key]).length;
  const comparisonHintId = `${filtersId}-comparison-hint`;
  const comparisonFull = selected.length >= 3;
  if (!brands.length || !items.length) return <section className="connection-state"><h1>{t.ncSoon}</h1><p>{t.ncSoonText}</p></section>;
  return <div className="connection-catalog" ref={catalogRef} data-has-comparison={selected.length > 0}>
    <header className="connection-heading connection-catalog-heading"><h1>{t.ncNav}</h1><p>{lang === 'en' ? 'Compare packs and choose your connection.' : '\u0baa\u0bc7\u0b95\u0bcd\u0b95\u0bc1\u0b95\u0bb3\u0bc8 \u0b92\u0baa\u0bcd\u0baa\u0bbf\u0b9f\u0bcd\u0b9f\u0bc1 \u0ba4\u0bc7\u0bb0\u0bcd\u0bb5\u0bc1 \u0b9a\u0bc6\u0baf\u0bcd\u0baf\u0bb5\u0bc1\u0bae\u0bcd.'}</p></header>
    <div className="connection-list-heading"><h2>{t.ncPacks} <span>{listed.length}</span></h2><div className="connection-catalog-actions">
      <label>{t.ncBrand}<select aria-label={t.ncBrand} value={brandId} onChange={e => chooseBrand(e.target.value)}><option value="">{lang === 'en' ? 'All brands' : t.ncAll}</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <label>{boxTypeLabel}<select aria-label={boxTypeLabel} value={filters.packageType} onChange={e => update('packageType', e.target.value)}><option value="">{t.ncAll}</option><option value="only_box">{packageCardLabel('only_box', lang)}</option><option value="full_set">{packageCardLabel('full_set', lang)}</option></select></label>
      <label>{t.ncQuality}<select aria-label={t.ncQuality} value={filters.type} onChange={e => update('type', e.target.value)}><option value="">{t.ncAll}</option><option value="HD">HD</option><option value="SD">SD</option></select></label>
      <label>{t.ncValidity}<select aria-label={t.ncValidity} value={filters.validity} onChange={e => update('validity', e.target.value)}><option value="">{t.ncAll}</option>{validityOptions.map(([key, option]) => <option key={key} value={key}>{validityLabel(option.validityDays, lang, option.validityMonths)}</option>)}</select></label>
    <details className="connection-extra-filters"><summary>{lang === 'en' ? 'More filters' : t.ncFilters}{extraCount > 0 && <span className="connection-filter-count" aria-label={`${extraCount} ${lang === 'en' ? 'active filters' : t.ncFilters}`}>{extraCount}</span>}</summary><div className="connection-controls">
      <label>{lang === 'en' ? 'Set-top box' : t.nbOffer}<select aria-label={lang === 'en' ? 'Set-top box' : t.nbOffer} value={filters.boxType} onChange={e => update('boxType', e.target.value)}><option value="">{t.ncAll}</option>{boxTypes.map(type => <option key={type} value={type}>{type}</option>)}</select></label>
      {(['language', 'region', 'genre'] as const).map(key => <label key={key}>{key === 'language' ? t.ncLanguage : key === 'region' ? t.ncRegion : t.ncGenre}<select value={filters[key]} onChange={e => update(key, e.target.value)}><option value="">{t.ncAll}</option>{[...new Set(items.flatMap(item => key === 'genre' ? Object.keys(item.genres) : [item.pack[key]]))].filter(Boolean).sort().map(value => <option key={value} value={value}>{value}</option>)}</select></label>)}
      <label>{t.ncMin}<input type="number" min="0" value={filters.minPrice} onChange={e => update('minPrice', e.target.value)} /></label><label>{t.ncMax}<input type="number" min="0" value={filters.maxPrice} onChange={e => update('maxPrice', e.target.value)} /></label>
      <label>{t.ncSort}<select aria-label={t.ncSort} value={filters.sort} onChange={e => update('sort', e.target.value)}><option value="price">{t.ncPriceSort}</option><option value="channels">{t.ncChannelSort}</option><option value="perChannel">{t.ncValueSort}</option></select></label>
      <button type="button" onClick={clearFilters}>{t.ncReset}</button>
    </div></details></div></div>

    {!listed.length && <div className="connection-state"><p>{t.ncEmpty}</p><button onClick={clearFilters}>{t.ncReset}</button></div>}
    <div className="connection-pack-grid">{listed.map(item => {
      const { pack, counts } = item;
      const chosen = pricingForFilter(pack, filters.validity, validities[pack.id] || selected.find(s => s.id === pack.id)?.validity);
      const packageType = packPackageType(pack);
      const isCompared = selected.some(s => s.id === pack.id);
      return <article key={pack.id} className="connection-pack" data-selected={isCompared}>
        {isCompared && <span className="connection-comparison-state"><Check size={13} aria-hidden="true" />{lang === 'en' ? 'Selected for comparison' : '\u0b92\u0baa\u0bcd\u0baa\u0bbf\u0b9f \u0ba4\u0bc7\u0bb0\u0bcd\u0ba8\u0bcd\u0ba4\u0bc6\u0b9f\u0bc1\u0b95\u0bcd\u0b95\u0baa\u0bcd\u0baa\u0b9f\u0bcd\u0b9f\u0ba4\u0bc1'}</span>}

        <div className="connection-pack-product"><div className="connection-card-brand"><CatalogLogo key={item.brand.logoUrl} url={item.brand.logoUrl || (item.brand.name.toLowerCase().includes('airtel') ? '/airtel_logo.png' : item.brand.name.toLowerCase().replace(/[^a-z]/g, '').includes('tataplay') ? '/tata_logo.png' : '')} name={item.brand.name} size={24} /><span>{item.brand.name}</span></div><PackageImage brand={item.brand.name} pack={pack.name} packageType={packageType} boxType={packBoxType(pack)} /></div>
        <PackChips showValidity={false} pack={pack} hdCount={counts.hdChannelCount} option={chosen} lang={lang} onValidity={validity => { setValidities(v => ({ ...v, [pack.id]: validity })); onValidity(pack.id, validity); }} />
        <div className="connection-price"><div className="connection-price-amount"><div className="connection-price-line"><strong>{currency(chosen.price, lang)}</strong></div><small title={chosen.validityMonths ? 'Monthly equivalent for the selected plan' : 'Based on 30-day months'}>{monthlyComparison(chosen.price, chosen.validityDays, lang, chosen.validityMonths)}</small></div><div className="connection-card-validity"><span>{t.ncValidity} :</span>{pack.pricingOptions.length === 1 ? <strong>{validityLabel(chosen.validityDays, lang, chosen.validityMonths)}</strong> : <select aria-label={`${t.ncValidity}: ${packDisplayName(pack.name)}`} value={chosen.validityDays} onChange={e => { const validity = Number(e.target.value); setValidities(v => ({ ...v, [pack.id]: validity })); onValidity(pack.id, validity); }}>{pack.pricingOptions.map(option => <option key={option.validityDays} value={option.validityDays}>{validityLabel(option.validityDays, lang, option.validityMonths)}</option>)}</select>}</div></div>
        <div className="connection-pack-muted"><h3>{packDisplayName(pack.name)}</h3><p>{counts.channelCount} {t.ncChannels} &middot; {counts.hdChannelCount} HD</p>
          {packageType && <p className="connection-package-includes"><Check size={14} aria-hidden="true" /><span>{packageType === 'only_box' ? (lang === 'en' ? 'Free installation' : '\u0b87\u0bb2\u0bb5\u0b9a \u0ba8\u0bbf\u0bb1\u0bc1\u0bb5\u0bb2\u0bcd') : (lang === 'en' ? 'Dish + free installation' : '\u0b9f\u0bbf\u0bb7\u0bcd + \u0b87\u0bb2\u0bb5\u0b9a \u0ba8\u0bbf\u0bb1\u0bc1\u0bb5\u0bb2\u0bcd')}</span></p>}
          <SampleNote name={pack.name} lang={lang} />
        </div>
        <p className="connection-card-coverage">{t.launchCoverage}</p>
        <div className="connection-card-actions"><Link to={`/new-connection/packs/${encodeURIComponent(pack.id)}?validity=${chosen.validityDays}`}><span className="link-label">{t.ncView}</span><span className="link-arrow" aria-hidden="true">&rarr;</span></Link><label className="connection-check connection-card-compare" htmlFor={`${filtersId}-compare-${pack.id}`} data-selected={isCompared}><input id={`${filtersId}-compare-${pack.id}`} type="checkbox" aria-label={`${t.ncCompare}: ${packDisplayName(pack.name)}`} checked={isCompared} disabled={comparisonFull && !isCompared} aria-describedby={comparisonFull ? comparisonHintId : undefined} onChange={() => onToggle(item, chosen.validityDays)} />{t.ncCompare}</label><Link className="connection-primary" to={bookingUrl(pack, chosen.validityDays)}>{t.ncSelect}</Link></div>
      </article>;
    })}</div>
    {brands.some(b => b.serviceNote) && <details className="connection-installation-info"><summary>{lang === 'en' ? 'Installation info' : '\u0ba8\u0bbf\u0bb1\u0bc1\u0bb5\u0bb2\u0bcd \u0ba4\u0b95\u0bb5\u0bb2\u0bcd'}<ChevronDown size={20} aria-hidden="true" /></summary>{brands.filter(b => b.serviceNote).map(b => <p key={b.id}><strong>{b.name}: </strong>{b.serviceNote}</p>)}</details>}
    {data.settings.priceDisclaimer && <p className="connection-disclaimer">{data.settings.priceDisclaimer}</p>}
    {selected.length > 0 && <aside ref={compareBarRef} className="connection-compare-bar" aria-label={t.ncCompare}><div className="connection-compare-summary">
      <strong>{lang === 'en' ? `${selected.length} of 3 packs selected` : `${selected.length} / 3 ${t.ncSelected}`}</strong>
      <div className="connection-selection">{selected.map(s => {
        const item = items.find(i => i.pack.id === s.id);
        const type = item && packPackageType(item.pack);
        const label = item ? [item.brand.name, packDisplayName(item.pack.name), type ? packageCardLabel(type, lang) : ''].filter(Boolean).join(' \u00b7 ') : t.ncUnavailable;
        return <button key={s.id} title={label} aria-label={`${t.ncRemove}: ${label}`} onClick={() => onRemove(s.id)}><span className="connection-selection-label">{label}</span><span className="connection-selection-remove" aria-hidden="true">&times;</span></button>;
      })}</div>
      <p id={comparisonHintId} role="status" className="connection-limit">{comparisonFull || limit ? (lang === 'en' ? 'Maximum 3 packs selected. Remove one to choose another.' : t.ncMaxThree) : selected.length < 2 ? (lang === 'en' ? 'Select at least 2 packs' : t.ncChooseTwo) : (lang === 'en' ? 'Compare up to 3 packs' : t.ncMaxThree)}</p>
    </div><div className="connection-compare-actions"><button onClick={onClear}>{t.ncClear}</button>{selected.length >= 2 ? <Link className="connection-primary" to={compareUrl(selected)}>{t.ncCompare}</Link> : <button disabled aria-describedby={comparisonHintId}>{t.ncCompare}</button>}</div></aside>}

  </div>;
}
