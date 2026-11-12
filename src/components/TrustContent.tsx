import { businessDetails } from '../lib/policyTranslations';
import { translations } from '../lib/translations';
import React from 'react';
import { Link } from 'react-router-dom';
import type { Language } from '../types';
import { BUSINESS_DETAILS, POLICY_ROUTES } from '../lib/trustContent';

export function PolicyLinks({ currentLang, bilingual = false, onNavigate }: { currentLang: Language; bilingual?: boolean; onNavigate?: () => void }) {
  return <nav aria-label={translations[currentLang].uiSupportAndPolicies} className="flex flex-wrap gap-x-5 gap-y-3 text-sm">
    {POLICY_ROUTES.map(route => <Link key={route.key} to={route.path} onClick={onNavigate} className="underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">{bilingual ? <>{route.en} <span lang="ta">/ {route.ta}</span></> : route[currentLang]}</Link>)}
  </nav>;
}

export function SupportDetails({ currentLang, full = false }: { currentLang: Language; full?: boolean }) {
  const ta = currentLang === 'ta';
  const details = businessDetails(currentLang);
  const rows = [
    [translations[currentLang].uiBusinessName, details.legalName],
    [translations[currentLang].uiSupportPhone, details.phone],
    [translations[currentLang].uiSupportEmail, details.email],
    [translations[currentLang].uiSupportHours, details.supportHours],
    ...(full ? [[translations[currentLang].uiAddress, details.address], [translations[currentLang].uiGSTIN, details.gstin],
      [translations[currentLang].uiGrievanceOfficer, details.grievanceOfficer],
      [translations[currentLang].uiGrievanceEmail, details.grievanceEmail],
      [translations[currentLang].uiGrievanceAddress, details.grievanceAddress]] : []),
  ];
  return <dl className="space-y-2 text-sm break-words">{rows.map(([label, value]) => <div key={label}><dt className="font-medium inline">{label}: </dt><dd className="inline">{value}</dd></div>)}</dl>;
}

export function CheckoutPolicies({ currentLang, onNavigate }: { currentLang: Language; onNavigate: () => void }) {
  return <section aria-label={translations[currentLang].uiPaymentTermsAndSupport} className="space-y-3 border-t border-rule pt-4 text-sm">
    <p>{translations[currentLang].uiByPayingYouAgreeToTheTermsOfUseAndRefundCancellationPolicyPleaseAlsoRe}</p>
    <PolicyLinks currentLang={currentLang} onNavigate={onNavigate} />
    <SupportDetails currentLang={currentLang} />
  </section>;
}
