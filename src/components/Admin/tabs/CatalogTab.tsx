import React, { useEffect, useMemo, useState } from 'react';
import { catalogSchemas, catalogSlug, settingsSchema, pricesStale, csvEncode, type CatalogData, type CatalogKind } from '../../../lib/newConnectionCatalog';
import './catalog.css';
import { Link } from 'react-router-dom';

type Section = CatalogKind | 'settings';
const labels: Record<Section, string> = { brands: 'Brands', packs: 'Packs', channels: 'Channels', equipment: 'Equipment', settings: 'Settings' };
const singular: Record<Section, string> = { brands: 'brand', packs: 'pack', channels: 'channel', equipment: 'equipment offer', settings: 'settings' };
const descriptions: Record<Section, string> = { brands: 'Manage DTH brands and their availability.', packs: 'Set pack prices and choose included channels.', channels: 'Manage channels and assign them to packs.', equipment: 'Set up boxes, installation charges and included packs.', settings: 'Set service areas, payment terms and policies.' };
const defaults: Record<Section, any> = {
  brands: { name: '', slug: '', logoUrl: '', active: false, sortOrder: 0, description: '', supportsSD: true, supportsHD: true, serviceNote: '' },
  channels: { name: '', language: '', genre: 'Regional', isHD: false, isPay: false, logoUrl: '', active: false, sortOrder: 0 },
  packs: { brandId: '', name: '', type: 'HD', language: '', region: '', pricingOptions: [{ validityDays: 30, price: 0 }], channelIds: [], highlights: [], active: false, sortOrder: 0 },
  equipment: { brandId: '', name: '', boxType: 'HD', hardwarePrice: 0, installationCharge: 0, includedFirstPackId: '', warrantyNote: '', active: false, sortOrder: 0 },
  settings: settingsSchema.parse({}),
};
const fieldLabels: Record<string, string> = { enabledProviders: 'Enabled payment providers', defaultProvider: 'Default payment provider', name: 'Name', slug: 'URL name', logoUrl: 'Logo URL', active: 'Available to customers', sortOrder: 'Display order', description: 'Description', supportsSD: 'Supports SD', supportsHD: 'Supports HD', serviceNote: 'Service note', language: 'Language', genre: 'Genre', isHD: 'HD channel', isPay: 'Pay channel', brandId: 'Brand', type: 'Pack type', region: 'Region', boxType: 'Box type', hardwarePrice: 'Hardware price (INR)', installationCharge: 'Installation charge (INR)', includedFirstPackId: 'Included first pack', warrantyNote: 'Warranty note', terms: 'Terms', refundPolicy: 'Refund policy', serviceablePincodes: 'Serviceable pincodes (one per line)', serviceableDistricts: 'Serviceable districts (one per line)', advanceMode: 'Advance mode', partialAmount: 'Partial amount (INR)', priceDisclaimer: 'Price disclaimer', highlights: 'Highlights (one per line)' };
const arrays = ['serviceablePincodes', 'serviceableDistricts', 'highlights'];
const multiline = ['description', 'serviceNote', 'warrantyNote', 'terms', 'refundPolicy', 'priceDisclaimer', ...arrays];
const choices: Record<string, string[]> = { defaultProvider: ['none', 'razorpay', 'youpi'], type: ['SD', 'HD', '4K', 'Regional', 'Add-on'], boxType: ['SD', 'HD', '4K'], advanceMode: ['full', 'partial', 'none'] };
function download(name: string, text: string) { const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
// Protect spreadsheet users from formula execution in downloadable error reports.
const safeCell = (s: string) => /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;

export function CatalogTab({ getAuthHeaders }: { getAuthHeaders: () => Promise<Record<string, string>> }) {
  const [section, setSection] = useState<Section>('brands');
  const [data, setData] = useState<CatalogData | null>(null);
  const [draft, setDraft] = useState<any>(null);
  const [editingId, setEditingId] = useState<string>();
  const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState(''); const [genre, setGenre] = useState(''); const [language, setLanguage] = useState(''); const [hd, setHd] = useState(''); const [pay, setPay] = useState('');
  const [selected, setSelected] = useState<string[]>([]); const [channelSearch, setChannelSearch] = useState(''); const [page, setPage] = useState(0);
  const [report, setReport] = useState<{ row: number; name: string; error: string }[]>([]);
  async function api(path = '', payload?: unknown) {
    const response = await fetch(`/api/admin/catalog${path}`, { method: payload ? 'POST' : 'GET', headers: { ...await getAuthHeaders(), 'Content-Type': 'application/json' }, ...(payload ? { body: JSON.stringify(payload) } : {}) });
    const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.error || 'Catalog request failed'); return result;
  }
  async function refresh() { setData((await api()).catalog); }
  async function run(fn: () => Promise<void>) { setBusy(true); setError(''); setNotice(''); try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Operation failed'); } finally { setBusy(false); } }
  useEffect(() => { let cancelled = false; setBusy(true); api().then(r => { if (!cancelled) setData(r.catalog); }).catch(e => { if (!cancelled) setError(e.message); }).finally(() => { if (!cancelled) setBusy(false); }); return () => { cancelled = true; }; }, []);
  const rows = useMemo(() => {
    if (!data || section === 'settings') return [];
    return [...data[section]].filter((r: any) => `${r.name} ${r.id}`.toLowerCase().includes(search.toLowerCase()) && (section !== 'channels' || ((!genre || r.genre === genre) && (!language || r.language === language) && (!hd || String(r.isHD) === hd) && (!pay || String(r.isPay) === pay)))).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }, [data, section, search, genre, language, hd, pay]);
  const matchingChannels = useMemo(() => data?.channels.filter(c => `${c.name} ${c.language} ${c.genre}`.toLowerCase().includes(channelSearch.toLowerCase())) ?? [], [data?.channels, channelSearch]);
  function edit(row?: any, duplicate = false) {
    setEditingId(duplicate ? undefined : row?.id); setChannelSearch(''); setError('');
    const value = structuredClone(row ?? (section === 'settings' ? data?.settings : defaults[section]));
    if (duplicate) { value.name += ' (copy)'; value.active = false; delete value.id; }
    setDraft(value);
  }
  function switchSection(s: Section) { setSection(s); setDraft(null); setEditingId(undefined); setSearch(''); setSelected([]); setReport([]); setError(''); setNotice(''); setPage(0); }
  async function save(event: React.FormEvent) {
    event.preventDefault(); await run(async () => {
      const cleaned = { ...draft };
      for (const key of arrays) if (Array.isArray(cleaned[key])) cleaned[key] = cleaned[key].map((v: string) => v.trim()).filter(Boolean);
      const parsed = section === 'settings' ? settingsSchema.parse(cleaned) : catalogSchemas[section].parse(cleaned);
      await api('/save', { kind: section, id: editingId, data: parsed }); setDraft(null); await refresh(); setNotice('Saved.');
    });
  }
  async function action(row: any, action: 'delete' | 'verify' | 'save') {
    if (action === 'delete' && !window.confirm(`Delete ${row.name}? Referenced records will be deactivated instead.`)) return;
    await run(async () => { const result = await api('/save', { kind: section, id: row.id, action, data: { ...row, active: !row.active } }); await refresh(); setNotice(result.softDeleted ? 'Referenced record deactivated; its references were preserved.' : action === 'verify' ? 'Prices verified today.' : 'Catalog updated.'); });
  }
  async function importFile(file: File) {
    await run(async () => {
      if (file.size > 2000000) throw new Error('CSV must be under 2 MB');
      setReport([]); const result = await api('/import', { kind: section, csv: await file.text() }); setReport(result.errors); await refresh(); setNotice(`${result.imported} rows imported; ${result.errors.length} rows failed.`);
    });
  }
  async function bulk(active: boolean) { await run(async () => { const result = await api('/channels/bulk', { ids: selected, active }); await refresh(); setSelected([]); setNotice(`${result.updated} channels updated.`); if (result.errors.length) setError(result.errors.join('; ')); }); }
  async function upload(file: File) { await run(async () => {
    if (file.size > 2 * 1024 * 1024) throw new Error('Logo must be at most 2 MB');
    const base64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error('Could not read logo')); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.readAsDataURL(file); });
    const result = await api('/logo', { base64, contentType: file.type }); setDraft((d: any) => ({ ...d, logoUrl: result.url })); setNotice('Logo uploaded. Save the form to attach it.');
  }); }
  const set = (key: string, value: unknown) => setDraft((d: any) => ({ ...d, [key]: value, ...(section === 'brands' && key === 'name' && !editingId && (!d.slug || d.slug === catalogSlug(d.name)) ? { slug: catalogSlug(String(value)) } : {}) }));
  return <div className="admin-tab catalog-tab">
    <nav aria-label="Catalog sections" className="nc-toolbar">{(Object.keys(labels) as Section[]).map(s => <button type="button" disabled={busy} key={s} aria-current={s === section ? 'page' : undefined} onClick={() => switchSection(s)}>{labels[s]}</button>)}</nav>
    {error && <p role="alert" className="text-error">{error}</p>}{notice && <p role="status">{notice}</p>}
    {busy && <p role="status">Working…</p>}
    <header className="nc-heading"><div><h2>{labels[section]}{data && section !== 'settings' && <span className="nc-count">{data[section].length}</span>}</h2><p>{descriptions[section]}</p></div><div className="nc-toolbar"><button disabled={busy} onClick={() => run(refresh)}>Refresh</button>{data && !draft && <button className="nc-primary" disabled={busy} onClick={() => edit()}>{section === 'settings' ? 'Edit settings' : `+ Add ${singular[section]}`}</button>}</div></header>
    {data && section === 'settings' && !draft && <dl>{Object.entries(data.settings).map(([key, value]) => <React.Fragment key={key}><dt>{fieldLabels[key]}</dt><dd>{Array.isArray(value) ? value.join(', ') || '—' : String(value) || '—'}</dd></React.Fragment>)}</dl>}
    {data && section !== 'settings' && !draft && <>
      {data[section].length > 0 && <div className="nc-toolbar nc-filters"><label className="nc-search"><span className="sr-only">Search {labels[section].toLowerCase()}</span><input placeholder={`Search ${labels[section].toLowerCase()}…`} value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} /></label>
        {section === 'channels' && <>
          <label>Genre<select value={genre} onChange={e => { setGenre(e.target.value); setPage(0); }}><option value="">All</option>{[...new Set(data.channels.map(c => c.genre))].sort().map(g => <option key={g}>{g}</option>)}</select></label>
          <label>Language<select value={language} onChange={e => { setLanguage(e.target.value); setPage(0); }}><option value="">All</option>{[...new Set(data.channels.map(c => c.language))].sort().map(l => <option key={l}>{l}</option>)}</select></label>
          <label>HD<select value={hd} onChange={e => { setHd(e.target.value); setPage(0); }}><option value="">All</option><option value="true">HD</option><option value="false">SD</option></select></label>
          <label>Pay<select value={pay} onChange={e => { setPay(e.target.value); setPage(0); }}><option value="">All</option><option value="true">Pay</option><option value="false">Free</option></select></label>
          {selected.length > 0 && <><span>{selected.length} selected</span><button disabled={busy} onClick={() => bulk(true)}>Activate</button><button disabled={busy} onClick={() => bulk(false)}>Deactivate</button></>}
        </>}
      </div>}
      {(section === 'channels' || section === 'packs') && <details className="nc-import"><summary>Import multiple {labels[section].toLowerCase()}</summary><div className="nc-import-content"><p>Fill in the CSV template, then upload it here.</p><div className="nc-toolbar nc-import-steps"><a className="nc-template-link" href={`/catalog-templates/${section}.csv`} download>1. Download template</a><label className={`nc-file-button ${busy ? 'is-disabled' : ''}`}><span>2. Upload completed CSV</span><input className="sr-only" type="file" aria-label={`Upload ${labels[section].toLowerCase()} CSV`} accept=".csv,text/csv" disabled={busy} onChange={e => { const f = e.target.files?.[0]; if (f) void importFile(f); e.target.value = ''; }} /></label></div><small>CSV only · Up to 2 MB / 2,000 rows. Matching entries are updated.</small></div></details>}
      {report.length > 0 && <div><button onClick={() => download('catalog-import-errors.csv', csvEncode([['row', 'name', 'error'], ...report.map(r => [r.row, safeCell(r.name), safeCell(r.error)])]))}>Download error report</button><ul>{report.slice(0, 20).map(r => <li key={r.row}>Row {r.row}: {r.name} — {r.error}</li>)}</ul></div>}
      {rows.length > 0 && <div className="catalog-table-wrap"><table><thead><tr>{section === 'channels' && <th><input type="checkbox" aria-label="Select all filtered channels" checked={rows.length > 0 && rows.every(r => selected.includes(r.id))} onChange={e => setSelected(e.target.checked ? rows.map(r => r.id) : [])} /></th>}<th>Name</th><th>Status</th><th>Details</th><th>Actions</th></tr></thead><tbody>{rows.slice(page * 50, (page + 1) * 50).map((row: any) => <tr key={row.id}>
        {section === 'channels' && <td><input type="checkbox" aria-label={`Select ${row.name}`} checked={selected.includes(row.id)} onChange={e => setSelected(s => e.target.checked ? [...s, row.id] : s.filter(id => id !== row.id))} /></td>}
        <td><div className="nc-name">{row.logoUrl && <img src={row.logoUrl} alt="" width="28" height="28" loading="lazy" />}<div><strong>{row.name}</strong>{row.sampleData && <small>SAMPLE — fictional names and prices</small>}</div></div></td><td><span className={`nc-status ${row.active ? 'is-active' : ''}`}>{row.active ? 'Active' : 'Inactive'}</span></td>
        <td>{section === 'packs' ? <><span>₹{row.monthlyPrice} / 30 days · {row.channelCount} channels ({row.payChannelCount} pay / {row.freeChannelCount} free / {row.hdChannelCount} HD)</span><small>Verified: {row.priceLastVerifiedAt ? new Date(row.priceLastVerifiedAt).toLocaleDateString() : 'Never'}</small>{pricesStale(row.priceLastVerifiedAt) && <span className="catalog-warning">Price check due</span>}</> : section === 'channels' ? `${row.language} · ${row.genre} · ${row.isHD ? 'HD' : 'SD'} · ${row.isPay ? 'Pay' : 'Free'}` : section === 'equipment' ? `${row.boxType} · ₹${row.hardwarePrice} + ₹${row.installationCharge} installation` : [row.supportsSD && 'SD', row.supportsHD && 'HD'].filter(Boolean).join(' / ') || 'Not specified'}</td>
        <td><div className="nc-toolbar nc-row-actions"><button disabled={busy} onClick={() => edit(row)}>Edit</button><details className="nc-more" onKeyDown={e => { if (e.key === 'Escape') { e.currentTarget.open = false; e.currentTarget.querySelector('summary')?.focus(); } }}><summary aria-label={`More actions for ${row.name}`}>More</summary><div className="nc-row-menu" onClick={e => { if ((e.target as HTMLElement).closest('button')) e.currentTarget.closest('details')?.removeAttribute('open'); }}><button disabled={busy} onClick={() => action(row, 'save')}>{row.active ? 'Deactivate' : 'Activate'}</button>{section === 'packs' && <><button disabled={busy} onClick={() => edit(row, true)}>Duplicate</button><button disabled={busy} onClick={() => action(row, 'verify')}>Verify prices today</button></>}<button className="nc-danger" disabled={busy} onClick={() => action(row, 'delete')}>Delete</button><details className="nc-id"><summary>View ID</summary><small className="catalog-id">{row.id}</small></details></div></details></div></td>
      </tr>)}</tbody></table></div>}
      {!rows.length && <div className="nc-empty"><h3>{data[section].length ? 'No results found' : `No ${labels[section].toLowerCase()} yet`}</h3><p>{data[section].length ? 'Try another search or change the filters.' : section === 'channels' || section === 'packs' ? `Add a ${singular[section]} above, or import a CSV to add several at once.` : `Add your first ${singular[section]} to get started.`}</p></div>}
      {rows.length > 50 && <div className="nc-toolbar nc-pagination"><span>{page * 50 + 1}–{Math.min((page + 1) * 50, rows.length)} of {rows.length}</span><button disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</button><button disabled={(page + 1) * 50 >= rows.length} onClick={() => setPage(p => p + 1)}>Next</button></div>}
    </>}
    {draft && data && <form onSubmit={save} className="catalog-editor"><h3>{section === 'settings' ? 'Connection settings' : `${editingId ? 'Edit' : 'Add'} ${singular[section]}`}</h3><fieldset disabled={busy}><div className="catalog-fields">
      {Object.keys(defaults[section]).filter(key => !['channelIds', 'pricingOptions'].includes(key)).map(key => {
        const value = draft[key] ?? defaults[section][key]; const label = fieldLabels[key] || key;
        if (key === 'enabledProviders') return <fieldset key={key}><legend>Enabled payment providers</legend><small>Keep both off for booking without online payment. Razorpay is test-only; YouPI requires manual bank confirmation.</small>{['razorpay', 'youpi'].map(provider => <label className="catalog-checkbox" key={provider}><input type="checkbox" checked={value.includes(provider)} onChange={e => set(key, e.target.checked ? [...value, provider] : value.filter((p: string) => p !== provider))} />{provider === 'razorpay' ? 'Razorpay (test)' : 'YouPI (experimental)'}</label>)}</fieldset>;
        if (typeof defaults[section][key] === 'boolean') return <label key={key} className="catalog-checkbox"><input type="checkbox" checked={Boolean(value)} onChange={e => set(key, e.target.checked)} />{label}</label>;
        if (key === 'brandId' || key === 'includedFirstPackId') return <label key={key}>{label}<select value={value} required={key === 'brandId'} onChange={e => { set(key, e.target.value); if (key === 'brandId') set('includedFirstPackId', ''); }}><option value="">{key === 'brandId' ? 'Select brand' : 'None'}</option>{(key === 'brandId' ? data.brands : data.packs.filter(p => p.brandId === draft.brandId)).map(r => <option key={r.id} value={r.id}>{r.name}{!r.active ? ' (inactive)' : ''}</option>)}</select></label>;
        if (choices[key]) return <label key={key}>{label}<select value={value} onChange={e => set(key, e.target.value)}>{choices[key].map(v => <option key={v}>{v}</option>)}</select></label>;
        if (multiline.includes(key)) return <label key={key}>{label}<textarea rows={3} value={arrays.includes(key) ? value.join('\n') : value} onChange={e => set(key, arrays.includes(key) ? e.target.value.split('\n') : e.target.value)} /></label>;
        return <label key={key}>{label}<input type={typeof defaults[section][key] === 'number' ? 'number' : key === 'logoUrl' ? 'url' : 'text'} min={0} step={['hardwarePrice', 'installationCharge', 'partialAmount'].includes(key) ? '0.01' : '1'} required={['name', 'slug', 'language'].includes(key) && section !== 'packs'} value={value} onChange={e => set(key, typeof defaults[section][key] === 'number' ? Number(e.target.value) : e.target.value)} /></label>;
      })}
      {'logoUrl' in draft && <label>Upload logo (PNG/JPEG/WebP, max 2 MB)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { const file = e.target.files?.[0]; if (file) void upload(file); e.target.value = ''; }} /></label>}
    </div>
    {section === 'packs' && <>
      <h4>Pricing options (INR)</h4>{draft.pricingOptions.map((p: any, i: number) => <div className="nc-toolbar" key={i}><label>Validity days<input required type="number" min="1" max="3650" value={p.validityDays} onChange={e => set('pricingOptions', draft.pricingOptions.map((v: any, index: number) => index === i ? { ...v, validityDays: Number(e.target.value) } : v))} /></label><label>Price<input required type="number" min="0" step="0.01" value={p.price} onChange={e => set('pricingOptions', draft.pricingOptions.map((v: any, index: number) => index === i ? { ...v, price: Number(e.target.value) } : v))} /></label><button type="button" disabled={draft.pricingOptions.length < 2} onClick={() => set('pricingOptions', draft.pricingOptions.filter((_: any, index: number) => index !== i))}>Remove option</button></div>)}<button type="button" onClick={() => set('pricingOptions', [...draft.pricingOptions, { validityDays: 90, price: 0 }])}>Add pricing option</button>
      <h4>Channels ({draft.channelIds.length} selected)</h4><label>Search channels<input value={channelSearch} onChange={e => setChannelSearch(e.target.value)} placeholder="Name, language or genre" /></label>
      <div className="catalog-selected">{draft.channelIds.map((id: string) => <button type="button" key={id} onClick={() => set('channelIds', draft.channelIds.filter((v: string) => v !== id))}>Remove {data.channels.find(c => c.id === id)?.name || id}</button>)}</div>
      <p>{matchingChannels.length} matches. Showing the first 60; search to narrow results. Counts are calculated on save.</p><div className="catalog-channel-picker">{matchingChannels.slice(0, 60).map(c => <label key={c.id}><input type="checkbox" checked={draft.channelIds.includes(c.id)} onChange={e => set('channelIds', e.target.checked ? [...draft.channelIds, c.id] : draft.channelIds.filter((id: string) => id !== c.id))} />{c.name} · {c.isHD ? 'HD' : 'SD'} · {c.isPay ? 'Pay' : 'Free'}{!c.active && ' (inactive)'}</label>)}</div>
    </>}
    <div className="nc-toolbar"><button className="nc-primary" type="submit">Save {singular[section]}</button><button type="button" onClick={() => setDraft(null)}>Cancel</button></div></fieldset></form>}
    {section === 'settings' && <p><Link to="/admin/new-connections?awaiting=true">Open payment verification queue in New Connections</Link></p>}
  </div>;
}
