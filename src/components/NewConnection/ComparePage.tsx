import { brandChannelNumbers } from '../../lib/channelLcn';
import { packDisplayName, packageCardLabel, validityLabel } from '../../lib/newConnectionDisplay';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { packBoxType, packPackageType, type CatalogData } from '../../lib/newConnectionCatalog';
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
  const activeGroup = diffGroup === 'shared' ? (diff.sharedByTwo.length ? 'shared' : 'common') : diffGroup !== 'common' && !diff.unique[Number(diffGroup)]?.length ? 'common' : diffGroup;
  const diffIndex = Number(activeGroup); const diffChannels = activeGroup === 'common' ? diff.common : activeGroup === 'shared' ? diff.sharedByTwo : diff.unique[diffIndex] ?? [];
  const shortName = (item: VisiblePack) => packDisplayName(item.pack.name).replace(/^Tamil\s+/i, '').replace(/\s+HDs?$/i, '');
  const packLabel = (item: VisiblePack) => {
    const label = `${item.brand.name} ${shortName(item)}`;
    const sameName = available.filter(other => other.brand.id === item.brand.id && shortName(other) === shortName(item));
    if (sameName.length < 2) return label;
    const packageType = packPackageType(item.pack);
    const hardware = packageType ? packageCardLabel(packageType, lang) : packBoxType(item.pack);
    const samePackage = sameName.filter(other => packPackageType(other.pack) === packageType);
    return `${label} (${hardware}${packageType && samePackage.length > 1 ? `, ${packBoxType(item.pack)}` : ''})`;
  };
  const tabLabel = (item: VisiblePack) => available.filter(other => other.brand.id === item.brand.id).length > 1 ? packLabel(item) : item.brand.name;
  const groups = [{ id: 'common', label: t.ncCommon, channels: diff.common }, ...available.map((item, i) => ({ id: String(i), label: `${t.ncOnly} ${tabLabel(item)}`, channels: diff.unique[i] })), ...(available.length === 3 ? [{ id: 'shared', label: lang === 'en' ? 'In any two' : '\u0b8f\u0ba4\u0bc7\u0ba9\u0bc1\u0bae\u0bcd \u0b87\u0bb0\u0ba3\u0bcd\u0b9f\u0bbf\u0bb2\u0bcd', channels: diff.sharedByTwo }] : [])];
  const visibleGroups = groups.filter(group => group.id === 'common' || group.channels.length > 0);
  const showTabs = visibleGroups.length > 1;
  const identical = diff.unique.every(channels => channels.length === 0) && diff.sharedByTwo.length === 0;
  const subsetIndex = available.length === 2 ? diff.unique.findIndex(channels => channels.length === 0) : -1;
  const hardwareVariants = available.length === 2 && available[0].brand.id === available[1].brand.id && shortName(available[0]) === shortName(available[1]) && (packPackageType(available[0].pack) !== packPackageType(available[1].pack) || packBoxType(available[0].pack) !== packBoxType(available[1].pack));
  let insight: React.ReactNode = null;
  if (identical) {
    insight = lang === 'en'
      ? <>{available.length === 2 ? 'Both packs have' : 'All packs have'} the same {diff.common.length} channels ({diff.common.filter(channel => channel.isHD).length} HD).{hardwareVariants && ' They differ only in hardware and price.'}</>
      : <>{available.length} {'\u0baa\u0bc7\u0b95\u0bcd\u0b95\u0bc1\u0b95\u0bb3\u0bbf\u0bb2\u0bc1\u0bae\u0bcd'} {diff.common.length} {'\u0b92\u0bb0\u0bc7 \u0b9a\u0bc7\u0ba9\u0bb2\u0bcd\u0b95\u0bb3\u0bcd'} ({diff.common.filter(channel => channel.isHD).length} HD).</>;
  } else if (subsetIndex >= 0) {
    const smaller = available[subsetIndex]; const larger = available[1 - subsetIndex]; const extra = diff.unique[1 - subsetIndex];
    insight = lang === 'en'
      ? <>{packLabel(larger)} adds <strong>{extra.length} channels</strong>, including <strong>{extra.filter(channel => channel.isHD).length} HD</strong>, that {packLabel(smaller)} doesn&apos;t have.<span className="connection-diff-zero-note">Every channel in {packLabel(smaller)} is also in the {packLabel(larger)} pack.</span></>
      : <>{packLabel(larger)}: +{extra.length} {'\u0b9a\u0bc7\u0ba9\u0bb2\u0bcd\u0b95\u0bb3\u0bcd'} ({extra.filter(channel => channel.isHD).length} HD).</>;
  }
  const filterOptions = useMemo(() => [...new Map(available.flatMap(item => item.channels).map(channel => [channel.id, channel])).values()], [items, location.search]);
  const lcnBrands = [...new Map(available.map(item => [item.brand.id, item.brand])).values()].map(brand => brandChannelNumbers(brand, filterOptions));
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
    return <tr key={label}><th scope="row">{label}</th>{values.map((value, i) => <td key={selection[i].id} className={best[i] ? 'connection-best-cell' : ''}>{value === null ? t.ncUnknown : display(value)}{best[i] && <small className="connection-best">{highest ? (lang === 'en' ? 'Most channels' : '\u0b85\u0ba4\u0bbf\u0b95 \u0b9a\u0bc7\u0ba9\u0bb2\u0bcd\u0b95\u0bb3\u0bcd') : t.ncBest}</small>}</td>)}</tr>;
  };
  return <>
    <Link className="connection-back" to="/new-connection"><span className="link-arrow" aria-hidden="true">&larr;</span> <span className="link-label">{t.ncBack}</span></Link><header className="connection-heading"><h1>{t.ncCompareTitle}</h1><p>{t.ncCompareIntro}</p></header>
    <div className="connection-controls"><button onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); setNotice(t.ncCopied); } catch { setNotice(t.ncCopyFailed); } }}>{t.ncShare}</button><p role="status">{notice}</p></div>
    {selection.length < 2 && <p className="connection-state">{t.ncChooseTwo}</p>}
    {selection.length > 0 && <div className="connection-compare-scroll" role="region" aria-label={t.ncCompareTitle} tabIndex={0}><table className="connection-compare-table"><caption className="sr-only">{t.ncCompareTitle}</caption><thead><tr><th scope="col">{t.ncPack}</th>{columns.map(({ selected, item }) => <th scope="col" key={selected.id}><strong>{item ? packDisplayName(item.pack.name) : t.ncUnavailable}</strong>{item ? <><SampleNote name={item.pack.name} lang={lang} /><PriceNotice pack={item.pack} lang={lang} /></> : <p>{t.ncUnavailableText}</p>}<button aria-label={`${t.ncRemove}: ${item ? packDisplayName(item.pack.name) : t.ncUnavailable}`} onClick={() => change(selection.filter(s => s.id !== selected.id))}>{t.ncRemove}</button></th>)}</tr></thead><tbody>
      <tr><th scope="row">{t.ncBrand}</th>{columns.map(c => <td key={c.selected.id}>{c.item?.brand.name ?? t.ncUnknown}</td>)}</tr>
      <tr><th scope="row">{t.ncValidity}</th>{columns.map(c => <td key={c.selected.id}>{c.item && c.quote ? c.item.pack.pricingOptions.length === 1 ? validityLabel(c.quote.option.validityDays, lang, c.quote.option.validityMonths) : <label><span className="sr-only">{t.ncValidity}: {c.item.pack.name}</span><select value={c.quote.option.validityDays} onChange={e => change(selection.map(s => s.id === c.selected.id ? { ...s, validity: Number(e.target.value) } : s))}>{c.item.pack.pricingOptions.map(o => <option key={o.validityDays} value={o.validityDays}>{validityLabel(o.validityDays, lang, o.validityMonths)}</option>)}</select></label> : t.ncUnknown}</td>)}</tr>
      <tr><th scope="row">{lang === 'en' ? 'Box type' : '\u0baa\u0bc6\u0b9f\u0bcd\u0b9f\u0bbf \u0bb5\u0b95\u0bc8'}</th>{columns.map(c => <td key={c.selected.id}>{c.item ? (packPackageType(c.item.pack) ? packageCardLabel(packPackageType(c.item.pack)!, lang) : `${packBoxType(c.item.pack)} box`) : t.ncUnknown}</td>)}</tr>
      {metric(t.ncChosenPrice, columns.map(c => c.quote?.option.price ?? null), v => currency(v, lang))}
      {([[t.ncTotal, 'channelCount'], [t.ncPay, 'payChannelCount'], [t.ncFree, 'freeChannelCount'], [t.ncHD, 'hdChannelCount']] as const).map(([label, key]) => metric(label, columns.map(c => c.item?.counts[key] ?? null), v => v, true))}
      <tr className="connection-table-section"><th colSpan={columns.length + 1}>{t.ncGenreCounts}</th></tr>{genres.map(g => metric(catalogTerm(g, lang), columns.map(c => c.item ? c.item.genres[g] ?? 0 : null), v => v, true))}
      <tr><th scope="row">{t.ncSelect}</th>{columns.map(c => <td key={c.selected.id}>{c.item && c.quote ? <Link className="connection-primary" to={bookingUrl(c.item.pack, c.quote.option.validityDays)}>{t.ncSelect}</Link> : t.ncUnavailable}</td>)}</tr>
    </tbody></table></div>}
    {data.settings.priceDisclaimer && <p className="connection-disclaimer">{data.settings.priceDisclaimer}</p>}
    <section className="connection-diff"><h2>{t.ncDifferences}</h2><p className="connection-muted connection-diff-help">{t.ncVisibleNote}{allAvailable && showTabs && <> {lang === 'en' ? <>&ldquo;Only in&rdquo; shows channels found in just that pack.</> : '\u0b87\u0ba8\u0bcd\u0ba4\u0baa\u0bcd \u0baa\u0bc7\u0b95\u0bcd\u0b95\u0bbf\u0bb2\u0bcd \u0bae\u0b9f\u0bcd\u0b9f\u0bc1\u0bae\u0bcd \u0b89\u0bb3\u0bcd\u0bb3 \u0b9a\u0bc7\u0ba9\u0bb2\u0bcd\u0b95\u0bb3\u0bc8\u0b95\u0bcd \u0b95\u0bbe\u0b9f\u0bcd\u0b9f\u0bc1\u0b95\u0bbf\u0bb1\u0ba4\u0bc1.'}</>}</p>{!allAvailable ? <p>{available.length !== columns.length ? t.ncUnavailableText : t.ncDiffUnavailable}</p> : <>
      {insight && <p className="connection-diff-insight">{insight}</p>}
      {showTabs && <div className="connection-diff-tabs" role="tablist" aria-label={t.ncDifferences}>{visibleGroups.map(group => <button type="button" role="tab" id={`diff-tab-${group.id}`} aria-controls="diff-panel" key={group.id} aria-selected={activeGroup === group.id} tabIndex={activeGroup === group.id ? 0 : -1} onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const enabled = groups.filter(g => g.channels.length || g.id === 'common');
        const index = enabled.findIndex(g => g.id === group.id);
        const next = enabled[event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + enabled.length) % enabled.length];
        setDiffGroup(next.id); document.getElementById(`diff-tab-${next.id}`)?.focus();
      }} onClick={() => { if (group.channels.length || group.id === 'common') setDiffGroup(group.id); }}>{group.label} ({group.channels.length} &middot; {group.channels.filter(c => c.isHD).length} HD)</button>)}</div>}
      <div id="diff-panel" role={showTabs ? "tabpanel" : undefined} aria-labelledby={showTabs ? `diff-tab-${activeGroup}` : undefined}><ChannelBrowser key={selection.map(s => s.id).join(',')} channels={diffChannels} filterOptions={filterOptions} lcnBrands={lcnBrands} lang={lang} emptyText={t.ncNoDiff} /></div></>}</section>
  </>;
}
