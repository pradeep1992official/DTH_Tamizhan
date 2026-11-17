import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { packBoxType, packPackageType, type CatalogData } from '../../lib/newConnectionCatalog';
import { bookingUrl, compareUrl, defaultBrowseFilters, filterSortPacks, pricingForFilter, type BrowseFilters, type PackSelection, type VisiblePack } from '../../lib/newConnectionBrowse';
import { translations } from '../../lib/translations';
import type { Language } from '../../types';
import { monthlyComparison, packDisplayName, packageCardLabel, validityLabel } from '../../lib/newConnectionDisplay';
import { Check, ChevronDown } from '../../lib/icons';
import { PackageTooltip } from './PackageTooltip';
import { PackageImage } from './PackageImage';
import { CatalogLogo, ChannelQuality, currency, SampleNote } from './Shared';

interface Props { data: CatalogData; items: VisiblePack[]; lang: Language; selected: PackSelection[]; limit: boolean; onToggle: (item: VisiblePack, validity: number) => void; onRemove: (id: string) => void; onValidity: (id: string, validity: number) => void; onClear: () => void }
export function CatalogPage({ data, items, lang, selected, limit, onToggle, onRemove, onValidity, onClear }: Props) {
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
  const [brandId, setBrandId] = useState<string>(typeof savedBrowse.brandId === 'string' ? savedBrowse.brandId : '');
  const [filters, setFilters] = useState<BrowseFilters>(() => ({
    ...defaultBrowseFilters,
    boxType: typeof savedBrowse.filters?.boxType === 'string' ? savedBrowse.filters.boxType : '',
    packageType: savedBrowse.filters?.packageType === 'only_box' || savedBrowse.filters?.packageType === 'full_set' ? savedBrowse.filters.packageType : '',
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
  const comparisonHintId = `${filtersId}-comparison-hint`;
  const comparisonFull = selected.length >= 3;
  if (!brands.length || !items.length) return <section className="connection-state"><h1>{t.ncSoon}</h1><p>{t.ncSoonText}</p></section>;
  return <div className="connection-catalog" ref={catalogRef} data-has-comparison={selected.length > 0}>
    <header className="connection-heading connection-catalog-heading"><h1>{t.ncNav}</h1><p>{lang === 'en' ? 'Compare packs and choose your connection.' : '\u0baa\u0bc7\u0b95\u0bcd\u0b95\u0bc1\u0b95\u0bb3\u0bc8 \u0b92\u0baa\u0bcd\u0baa\u0bbf\u0b9f\u0bcd\u0b9f\u0bc1 \u0ba4\u0bc7\u0bb0\u0bcd\u0bb5\u0bc1 \u0b9a\u0bc6\u0baf\u0bcd\u0baf\u0bb5\u0bc1\u0bae\u0bcd.'}</p></header>
    <div className="connection-list-heading"><h2>{t.ncPacks} <span>{listed.length}</span></h2><div className="connection-catalog-actions"><label>{t.ncBrand}<select aria-label={t.ncBrand} value={brandId} onChange={e => chooseBrand(e.target.value)}><option value="">{lang === 'en' ? 'All brands' : '\u0b85\u0ba9\u0bc8\u0ba4\u0bcd\u0ba4\u0bc1 \u0baa\u0bbf\u0bb0\u0bbe\u0ba3\u0bcd\u0b9f\u0bc1\u0b95\u0bb3\u0bc1\u0bae\u0bcd'}</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label>{boxTypeLabel}<select aria-label={boxTypeLabel} value={filters.boxType} onChange={e => update('boxType', e.target.value)}><option value="">{lang === 'en' ? 'All box types' : t.ncAll}</option>{boxTypes.map(type => <option key={type} value={type}>{type}</option>)}</select></label><label>{lang === 'en' ? 'Package option' : '\u0b9a\u0bc6\u0b9f\u0bcd \u0bb5\u0b95\u0bc8'}<select aria-label={lang === 'en' ? 'Package option' : '\u0b9a\u0bc6\u0b9f\u0bcd \u0bb5\u0b95\u0bc8'} value={filters.packageType} onChange={e => update('packageType', e.target.value)}><option value="">{lang === 'en' ? 'All package options' : '\u0b85\u0ba9\u0bc8\u0ba4\u0bcd\u0ba4\u0bc1 \u0b9a\u0bc6\u0b9f\u0bcd \u0bb5\u0b95\u0bc8\u0b95\u0bb3\u0bcd'}</option><option value="only_box">{packageCardLabel('only_box', lang)}</option><option value="full_set">{packageCardLabel('full_set', lang)}</option></select></label></div></div>

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

          <h3>{packDisplayName(pack.name)}</h3>{packBoxType(pack) === 'Android' && <p className="connection-box-type">Android box</p>}
        </div><PackageImage brand={item.brand.name} pack={pack.name} packageType={packageType} boxType={packBoxType(pack)} /></div>
        <div className="connection-package-row"><div className="connection-package-help"><span className="connection-package-type">{packageType ? packageCardLabel(packageType, lang) : `${packBoxType(pack)} box`}</span>{packageType && <PackageTooltip packageType={packageType} boxType={packBoxType(pack)} lang={lang} />}</div></div>
        {packageType && <p className="connection-package-includes"><Check size={14} aria-hidden="true" /><span>{packageType === 'only_box' ? (lang === 'en' ? 'Free installation' : '\u0ba8\u0bbf\u0bb1\u0bc1\u0bb5\u0bb2\u0bcd \u0b87\u0bb2\u0bb5\u0b9a\u0bae\u0bcd') : (lang === 'en' ? 'Dish + free installation' : '\u0b9f\u0bbf\u0bb7\u0bcd + \u0b87\u0bb2\u0bb5\u0b9a \u0ba8\u0bbf\u0bb1\u0bc1\u0bb5\u0bb2\u0bcd')}</span></p>}
        <SampleNote name={pack.name} lang={lang} />
        <ChannelQuality type={pack.type} hdCount={counts.hdChannelCount} totalCount={counts.channelCount} lang={lang} />
        <div className="connection-price"><div className="connection-price-amount"><div className="connection-price-line"><strong>{currency(chosen.price, lang)}</strong><span className="connection-price-separator" aria-hidden="true">/</span>{pack.pricingOptions.length === 1 ? <span className="connection-validity">{validityLabel(chosen.validityDays, lang, chosen.validityMonths)}</span> : <label><span className="sr-only">{t.ncValidity}: {pack.name}</span><select aria-label={`${t.ncValidity}: ${pack.name}`} value={chosen.validityDays} onChange={e => { const validity = Number(e.target.value); setValidities(v => ({ ...v, [pack.id]: validity })); onValidity(pack.id, validity); }}>{pack.pricingOptions.map(o => <option key={o.validityDays} value={o.validityDays}>{validityLabel(o.validityDays, lang, o.validityMonths)}</option>)}</select></label>}</div><small title={chosen.validityMonths ? 'Monthly equivalent for the selected plan' : 'Based on 30-day months'}>{monthlyComparison(chosen.price, chosen.validityDays, lang, chosen.validityMonths)}</small></div></div>
        <div className="connection-card-actions"><Link to={`/new-connection/packs/${encodeURIComponent(pack.id)}?validity=${chosen.validityDays}`}><span className="link-label">{t.ncView}</span><span className="link-arrow" aria-hidden="true">&rarr;</span></Link><label className="connection-check connection-card-compare" htmlFor={`${filtersId}-compare-${pack.id}`} data-selected={isCompared}><input id={`${filtersId}-compare-${pack.id}`} type="checkbox" aria-label={`${t.ncCompare}: ${pack.name}`} checked={isCompared} disabled={comparisonFull && !isCompared} aria-describedby={comparisonFull ? comparisonHintId : undefined} onChange={() => onToggle(item, chosen.validityDays)} />{t.ncCompare}</label><Link className="connection-primary" to={bookingUrl(pack, chosen.validityDays)}>{t.ncSelect}</Link></div>
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
