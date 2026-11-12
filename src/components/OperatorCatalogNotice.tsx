import React from 'react';
import { Link } from 'react-router-dom';
import type { DthOperatorId, Language } from '../types';
import { customTopUpUrl, operatorCatalogMessage } from '../lib/catalogAvailability';
export function OperatorCatalogNotice({ operator, currentLang, onChoose }: { operator: DthOperatorId; currentLang: Language; onChoose?: () => void }) {
  const label = currentLang === 'ta' ? 'விருப்பத் தொகை ரீசார்ஜ்' : 'Choose custom top-up';
  return <div role="status" className="p-4 rounded-2xl border border-rule bg-paper text-ink space-y-3 text-sm">
    <p>{operatorCatalogMessage(operator, currentLang)}</p>
    {onChoose ? <button type="button" onClick={onChoose} className="dialog-primary rounded-lg px-4 py-2">{label}</button> : <Link to={customTopUpUrl(operator)} className="underline underline-offset-4">{label}</Link>}
  </div>;
}
