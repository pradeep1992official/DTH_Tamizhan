import React from 'react';
import { packBoxType, packPackageType, type Pack } from '../../lib/newConnectionCatalog';
import { packDisplayName, packageCardLabel, validityLabel } from '../../lib/newConnectionDisplay';
import type { Language } from '../../types';
import { PackageTooltip } from './PackageTooltip';

export function PackQualityChip({ pack, hdCount }: { pack: Pack; hdCount: number }) {
  const hd = pack.type !== 'SD' && (hdCount > 0 || pack.type === 'HD' || pack.type === '4K');
  return <span className={`connection-pack-chip connection-pack-quality ${hd ? 'is-hd' : 'is-sd'}`}>{hd ? 'HD' : 'SD'}</span>;
}

export function PackChips({ pack, hdCount, option, lang, onValidity, showValidity = true, compactTooltip = false }: {
  pack: Pack; hdCount: number; option: Pack['pricingOptions'][number]; lang: Language;
  onValidity?: (days: number) => void;
  showValidity?: boolean;
  compactTooltip?: boolean;
}) {
  const packageType = packPackageType(pack);
  return <div className="connection-pack-chips">
    <PackQualityChip pack={pack} hdCount={hdCount} />
    <div className="connection-pack-chip connection-pack-box connection-package-help"><span>{packageType ? packageCardLabel(packageType, lang) : `${packBoxType(pack)} box`}</span>{packageType && <PackageTooltip packageType={packageType} boxType={packBoxType(pack)} lang={lang} summaryOnly={compactTooltip} />}</div>
    {showValidity && (pack.pricingOptions.length > 1 && onValidity ? <div className="connection-validity-segments" role="group" aria-label={`${lang === 'en' ? 'Validity' : '\u0b95\u0bbe\u0bb2\u0bae\u0bcd'}: ${packDisplayName(pack.name)}`}>{pack.pricingOptions.map(value => <button className="connection-pack-chip" type="button" key={value.validityDays} aria-pressed={option.validityDays === value.validityDays} onClick={() => onValidity(value.validityDays)}>{validityLabel(value.validityDays, lang, value.validityMonths)}</button>)}</div> : <span className="connection-pack-chip connection-validity-chip">{validityLabel(option.validityDays, lang, option.validityMonths)}</span>)}
  </div>;
}
