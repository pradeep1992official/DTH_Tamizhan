import { packDisplayName, packageCardLabel, validityLabel } from '../../lib/newConnectionDisplay';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { packBoxType, packPackageType, packageTypeLabel, type CatalogData } from '../../lib/newConnectionCatalog';
import { bestValue, bookingUrl, channelDiff, compareUrl, connectionQuote, parseCompare, type PackSelection, type VisiblePack } from '../../lib/newConnectionBrowse';
import { translations } from '../../lib/translations';
import { catalogTerm } from '../../lib/newConnectionCopy';
import type { Language } from '../../types';
import { ChannelBrowser, currency, PriceNotice, SampleNote } from './Shared';

export function ComparePage({ data, items, lang, onSelection }: { data: CatalogData; items: VisiblePack[]; lang: Language; onSelection: (selection: PackSelection[]) => void }) {
  const t = translations[lang]; const location = useLocation(); const navigate = useNavigate(); const selection = useMemo(() => parseCompare(location.search), [location.search]); const [notice, setNotice] = useState('');
  const columns = selection.map(s => { const item = items.find(i => i.pack.id === s.id); return { selected: s, item, quote: item ? connectionQuote(item, data.equipment, s.validity) : null }; });
  const available = columns.flatMap(c => c.item ? [c.item] : []); const allAvailable = available.length === columns.length && columns.length >= 2;
  const diff = useMemo(() => channelDiff(available), [items, location.search]);
  const [diffGroup, setDiffGroup] = useState('common');
  const diffIndex = Number(diffGroup); const diffChannels = diffGroup === 'common' ? diff.common : diff.unique[diffIndex] ?? [];
  const change = (updated: PackSelection[]) => { onSelection(updated); navigate(compareUrl(updated), { replace: true }); };
  // Canonicalize a validity removed since the link was shared, using the value
  // actually displayed. Unavailable pack slots remain intact in the shared URL.
  useEffect(() => {
    const canonical = columns.map(c => ({ ...c.selected, validity: c.quote?.option.validityDays ?? c.selected.validity }));
    if (canonical.some((s, i) => s.validity !== selection[i].validity)) change(canonical);
    else onSelection(selection);
  }, [location.search, items]);
  useEffect(() => { setDiffGroup('common'); }, [selection.map(s => s.id).join(',')]);
  const genres = [...new Set(available.flatMap(i => Object.keys(i.genres)))].sort();
  const metric = (label: string, values: (number | null)[], display: (value: number) => React.ReactNode, highest = false) => {
    const best = bestValue(values, highest);
    return <tr key={label}><th scope="row">{label}</th>{values.map((value, i) => <td key={selection[i].id} className={best[i] ? 'connection-best-cell' : ''}>{value === null ? t.ncUnknown : display(value)}{best[i] && <small className="connection-best">{t.ncBest}</small>}</td>)}</tr>;
  };
  return <>
    <Link className="connection-back" to="/new-connection"><span className="link-arrow" aria-hidden="true">&larr;</span> <span className="link-label">{t.ncBack}</span></Link><header className="connection-heading"><h1>{t.ncCompareTitle}</h1><p>{t.ncCompareIntro}</p></header>
    <div className="connection-controls"><button onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); setNotice(t.ncCopied); } catch { setNotice(t.ncCopyFailed); } }}>{t.ncShare}</button><p role="status">{notice}</p></div>
    {selection.length < 2 && <p className="connection-state">{t.ncChooseTwo}</p>}
    {selection.length > 0 && <div className="connection-compare-scroll" role="region" aria-label={t.ncCompareTitle} tabIndex={0}><table className="connection-compare-table"><caption className="sr-only">{t.ncCompareTitle}</caption><thead><tr><th scope="col">{t.ncPack}</th>{columns.map(({ selected, item }) => <th scope="col" key={selected.id}><strong>{item ? packDisplayName(item.pack.name) : t.ncUnavailable}</strong>{item ? <><SampleNote name={item.pack.name} lang={lang} /><PriceNotice pack={item.pack} lang={lang} /></> : <p>{t.ncUnavailableText}</p>}<button aria-label={`${t.ncRemove}: ${item ? packDisplayName(item.pack.name) : t.ncUnavailable}`} onClick={() => change(selection.filter(s => s.id !== selected.id))}>{t.ncRemove}</button></th>)}</tr></thead><tbody>
      <tr><th scope="row">{t.ncBrand}</th>{columns.map(c => <td key={c.selected.id}>{c.item?.brand.name ?? t.ncUnknown}</td>)}</tr>
      <tr><th scope="row">{t.ncType}</th>{columns.map(c => <td key={c.selected.id}>{c.item ? catalogTerm(c.item.pack.type, lang) : t.ncUnknown}</td>)}</tr>
      <tr><th scope="row">{lang === 'ta' ? '\u0b9a\u0bc6\u0b9f\u0bcd \u0bb5\u0b95\u0bc8' : 'Package option'}</th>{columns.map(c => <td key={c.selected.id}>{c.item ? packageTypeLabel(packPackageType(c.item.pack), lang) || t.ncUnknown : t.ncUnknown}</td>)}</tr>
      <tr><th scope="row">{t.ncValidity}</th>{columns.map(c => <td key={c.selected.id}>{c.item && c.quote ? <label><span className="sr-only">{t.ncValidity}: {c.item.pack.name}</span><select value={c.quote.option.validityDays} onChange={e => change(selection.map(s => s.id === c.selected.id ? { ...s, validity: Number(e.target.value) } : s))}>{c.item.pack.pricingOptions.map(o => <option key={o.validityDays} value={o.validityDays}>{validityLabel(o.validityDays, lang, o.validityMonths)}</option>)}</select></label> : t.ncUnknown}</td>)}</tr>
      <tr><th scope="row">{t.ncValidityOptions}</th>{columns.map(c => <td key={c.selected.id}>{c.item?.pack.pricingOptions.map(o => validityLabel(o.validityDays, lang, o.validityMonths)).join(' / ') ?? t.ncUnknown}</td>)}</tr>
      <tr><th scope="row">{lang === 'en' ? 'Box type' : '\u0baa\u0bc6\u0b9f\u0bcd\u0b9f\u0bbf \u0bb5\u0b95\u0bc8'}</th>{columns.map(c => <td key={c.selected.id}>{c.item ? packBoxType(c.item.pack) : t.ncUnknown}</td>)}</tr>
      {metric(t.ncChosenPrice, columns.map(c => c.quote?.option.price ?? null), v => currency(v, lang))}
      {([[t.ncTotal, 'channelCount'], [t.ncPay, 'payChannelCount'], [t.ncFree, 'freeChannelCount'], [t.ncHD, 'hdChannelCount']] as const).map(([label, key]) => metric(label, columns.map(c => c.item?.counts[key] ?? null), v => v, true))}
      <tr className="connection-table-section"><th colSpan={columns.length + 1}>{t.ncGenreCounts}</th></tr>{genres.map(g => metric(catalogTerm(g, lang), columns.map(c => c.item ? c.item.genres[g] ?? 0 : null), v => v, true))}
      <tr><th scope="row">{t.ncSelect}</th>{columns.map(c => <td key={c.selected.id}>{c.item && c.quote ? <Link className="connection-primary" to={bookingUrl(c.item.pack, c.quote.option.validityDays)}>{t.ncSelect}</Link> : t.ncUnavailable}</td>)}</tr>
    </tbody></table></div>}
    <p className="connection-muted">{t.ncVisibleNote}</p>{data.settings.priceDisclaimer && <p className="connection-disclaimer">{data.settings.priceDisclaimer}</p>}
    <section className="connection-diff"><h2>{t.ncDifferences}</h2>{!allAvailable ? <p>{available.length !== columns.length ? t.ncUnavailableText : t.ncDiffUnavailable}</p> : <><p className="connection-muted">{t.ncDiffNote}</p><div className="connection-diff-tabs" role="group" aria-label={t.ncDifferences}><button aria-pressed={diffGroup === 'common'} onClick={() => setDiffGroup('common')}>{t.ncCommon} ({diff.common.length})</button>{available.map((item, i) => <button key={item.pack.id} aria-pressed={diffGroup === String(i)} onClick={() => setDiffGroup(String(i))}>{t.ncOnly} {item.pack.name} ({diff.unique[i].length})</button>)}</div><ChannelBrowser key={`${diffGroup}:${selection.map(s => s.id).join(',')}`} channels={diffChannels} lang={lang} emptyText={t.ncNoDiff} /></>}</section>
  </>;
}
