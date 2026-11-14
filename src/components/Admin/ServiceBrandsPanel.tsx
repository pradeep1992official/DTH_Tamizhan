import React, { useEffect, useState } from 'react';
import { serviceBrandsSchema, type ServiceBrand } from '../../lib/serviceBrands';
export function ServiceBrandsPanel({ getAuthHeaders }: { getAuthHeaders: () => Promise<Record<string, string>> }) {
  const [brands, setBrands] = useState<ServiceBrand[]>([]); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; fetch('/api/service-brands', { cache: 'no-store' }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(); if (active) setBrands(serviceBrandsSchema.parse(data.brands)); }).catch(() => { if (active) setNotice('Brand settings could not be loaded.'); }); return () => { active = false; }; }, []);
  const edit = (index: number, update: Partial<ServiceBrand>) => setBrands(old => old.map((brand, i) => i === index ? { ...brand, ...update } : brand));
  return <details className="rounded-lg border border-rule p-4 my-4"><summary className="cursor-pointer font-semibold">Service request brands</summary>
    <form className="space-y-4 mt-4" onSubmit={async event => { event.preventDefault(); if (busy) return; setBusy(true); setNotice(''); try {
      const valid = serviceBrandsSchema.parse(brands); const response = await fetch('/api/admin/service-brands', { method: 'POST', headers: { ...await getAuthHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ brands: valid }) }); const data = await response.json(); if (!response.ok) throw new Error(); setNotice('Brand settings saved.');
    } catch { setNotice('Could not save. Check the fields and retry.'); } finally { setBusy(false); } }}>
      {brands.map((brand, index) => <fieldset key={index} className="rounded-lg border border-rule p-3 grid gap-3 sm:grid-cols-2"><legend>{brand.displayName || 'New brand'}</legend>
        <label>Enabled <input type="checkbox" checked={brand.enabled} onChange={event => edit(index, { enabled: event.target.checked })} /></label>
        {(['id', 'displayName', 'subscriberIdLabel', 'placeholder', 'helpText'] as const).map(key => <label key={key} className="block">{({ id: 'ID', displayName: 'Name', subscriberIdLabel: 'ID label', placeholder: 'Example', helpText: 'Help text' })[key]}<input className="block w-full border border-rule rounded p-2" value={brand[key]} onChange={event => edit(index, { [key]: event.target.value })} /></label>)}
        {(['minLength', 'maxLength'] as const).map(key => <label key={key}>{key === 'minLength' ? 'Minimum digits' : 'Maximum digits'}<input type="number" min={1} max={25} required className="block w-full border border-rule rounded p-2" value={brand[key]} onChange={event => edit(index, { [key]: Number(event.target.value) })} /></label>)}
      </fieldset>)}
      <button type="button" className="admin-quiet" disabled={busy || brands.length >= 50} onClick={() => setBrands(old => [...old, { id: '', displayName: '', enabled: false, subscriberIdLabel: 'Subscriber ID', placeholder: '1234567890', minLength: 6, maxLength: 16, helpText: '' }])}>Add brand</button>
      <button className="admin-primary" disabled={busy || !brands.length}>Save brands</button><p role="status">{notice}</p>
    </form>
  </details>;
}
