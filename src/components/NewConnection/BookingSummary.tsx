import React from 'react';
import type { Language } from '../../types';
import type { VisiblePack } from '../../lib/newConnectionBrowse';
import type { EquipmentOffer, Pack, NewConnectionSettings } from '../../lib/newConnectionCatalog';
import type { BookingQuote } from '../../lib/newConnectionOrders';
import { packBoxType, packPackageType } from '../../lib/newConnectionCatalog';
import { packDisplayName, validityLabel, monthlyComparison } from '../../lib/newConnectionDisplay';
import { translations } from '../../lib/translations';
import { PackageImage } from './PackageImage';
import { PackageInclusions } from './PackageInclusions';
import { PackChips } from './PackChips';
import { CatalogLogo, SampleNote, currency } from './Shared';
import { NEW_CONNECTION_REFUND } from '../../lib/newConnectionPolicy';
import { BUSINESS_DETAILS } from '../../lib/trustContent';

export function BookingSummary({ item, option, offer, quote, settings, validSelection, lang, review = false }: {
  item: VisiblePack; option: Pack['pricingOptions'][number]; offer: EquipmentOffer;
  quote: BookingQuote | null; settings: NewConnectionSettings; validSelection: boolean; lang: Language; review?: boolean;
}) {
  const t = translations[lang];
  return <aside className={`connection-booking-summary${review ? ' connection-review-summary' : ''}`} aria-label={lang === 'en' ? 'Your connection summary' : t.nbReview}>
      <div className="connection-plan-header"><div className="connection-plan-identity">
        <div className="connection-plan-heading">
        <div className="connection-booking-summary-brand"><CatalogLogo url={item.brand.logoUrl || (item.brand.name.toLowerCase().includes('airtel') ? '/airtel_logo.png' : item.brand.name.toLowerCase().replace(/[^a-z]/g, '').includes('tataplay') ? '/tata_logo.png' : '')} name={item.brand.name} size={48} /><span>{item.brand.name}</span></div>
        <div className="connection-plan-muted"><h2>{packDisplayName(item.pack.name)}</h2><p className="connection-booking-channel-count">{item.counts.channelCount} {t.ncChannels} &middot; <strong>{item.counts.hdChannelCount} HD</strong></p></div>
        </div>
        <div className="connection-plan-chips-and-validity"><PackChips showValidity={false} compactTooltip pack={item.pack} hdCount={item.counts.hdChannelCount} option={option} lang={lang} /></div>


      </div><div className="connection-plan-product"><PackageImage brand={item.brand.name} pack={item.pack.name} packageType={packPackageType(item.pack)} boxType={packBoxType(item.pack)} /></div></div>
        {quote && <dl className="connection-booking-breakdown connection-plan-price" aria-live="polite"><div className="connection-plan-due"><dt>{lang === 'en' ? review ? 'Total due now' : 'Total price' : review ? t.nbDue : '\u0bae\u0bca\u0ba4\u0bcd\u0ba4 \u0bb5\u0bbf\u0bb2\u0bc8'}</dt><dd><div className="connection-plan-validity-row"><span>{t.ncValidity} :</span><strong className="connection-plan-validity-text">{validityLabel(option.validityDays, lang, option.validityMonths)}</strong></div><p className="connection-plan-coverage">{lang === 'en' ? `Pack ${validityLabel(option.validityDays, lang, option.validityMonths)} + ${packBoxType(item.pack)} set-top box + installation${packPackageType(item.pack) === 'full_set' ? ' + dish' : ''}` : `${t.ncPack} (${validityLabel(option.validityDays, lang, option.validityMonths)}) + ${packBoxType(item.pack)} ${t.nbOffer} + ${t.ncInstallation}`}</p><div className="connection-plan-price-amount"><strong>{currency(review ? quote.amountDueNow : quote.priceBreakdown.total, lang)}</strong><small>{monthlyComparison(option.price, option.validityDays, lang, option.validityMonths)}</small></div></dd></div></dl>}
        {quote && <div className="connection-booking-refund">
          <p><strong>{NEW_CONNECTION_REFUND[lang]}</strong></p>
          <p>{lang === 'en' ? 'To request your refund, ' : 'பணத்தைத் திரும்பப் பெற, '}<a href={`tel:${BUSINESS_DETAILS.phone.replace(/[^+0-9]/g, '')}`}>{lang === 'en' ? 'call support' : 'உதவிக்குழுவை அழைக்கவும்'}</a>{lang === 'en' ? ' and provide your booking number. Refunds are processed after verification.' : '. உங்கள் முன்பதிவு எண்ணைத் தெரிவிக்கவும். சரிபார்த்த பிறகு பணத்திருப்பு செயல்படுத்தப்படும்.'} <a href="/refund-policy">{t.nbRefund}</a></p>
        </div>}
        {packPackageType(item.pack) ? <PackageInclusions packageType={packPackageType(item.pack)!} boxType={packBoxType(item.pack)} lang={lang} existingDishNote={lang === 'en' ? 'Dish not included. Your existing dish is required.' : undefined} /> : <p>{offer.name} &middot; {packBoxType(item.pack)}</p>}
        <SampleNote name={item.pack.name} lang={lang} />
        {!packPackageType(item.pack) && <p className="connection-muted">{t.ncEquipmentNote}</p>}{settings.priceDisclaimer && <p className="connection-disclaimer">{settings.priceDisclaimer}</p>}
                {!validSelection && <p role="alert">{t.nbUnavailableSelection}</p>}

      </aside>;
}
