import React from 'react';
import { Link } from 'react-router-dom';
import type { Language } from '../types';
import { BUSINESS_DETAILS, POLICY_ROUTES } from '../lib/trustContent';

export function PolicyLinks({ currentLang, bilingual = false, onNavigate }: { currentLang: Language; bilingual?: boolean; onNavigate?: () => void }) {
  return <nav aria-label={currentLang === 'ta' ? 'உதவி மற்றும் கொள்கைகள்' : 'Support and policies'} className="flex flex-wrap gap-x-5 gap-y-3 text-sm">
    {POLICY_ROUTES.map(route => <Link key={route.key} to={route.path} onClick={onNavigate} className="underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">{bilingual ? <>{route.en} <span lang="ta">/ {route.ta}</span></> : route[currentLang]}</Link>)}
  </nav>;
}

export function SupportDetails({ currentLang, full = false }: { currentLang: Language; full?: boolean }) {
  const ta = currentLang === 'ta';
  const rows = [
    [ta ? 'வணிகப் பெயர்' : 'Business name', BUSINESS_DETAILS.legalName],
    [ta ? 'உதவி தொலைபேசி' : 'Support phone', BUSINESS_DETAILS.phone],
    [ta ? 'உதவி மின்னஞ்சல்' : 'Support email', BUSINESS_DETAILS.email],
    [ta ? 'உதவி நேரம்' : 'Support hours', BUSINESS_DETAILS.supportHours],
    ...(full ? [[ta ? 'முகவரி' : 'Address', BUSINESS_DETAILS.address], ['GSTIN', BUSINESS_DETAILS.gstin],
      [ta ? 'குறைதீர் அதிகாரி' : 'Grievance officer', BUSINESS_DETAILS.grievanceOfficer],
      [ta ? 'குறைதீர் மின்னஞ்சல்' : 'Grievance email', BUSINESS_DETAILS.grievanceEmail],
      [ta ? 'குறைதீர் முகவரி' : 'Grievance address', BUSINESS_DETAILS.grievanceAddress]] : []),
  ];
  return <dl className="space-y-2 text-sm break-words">{rows.map(([label, value]) => <div key={label}><dt className="font-medium inline">{label}: </dt><dd className="inline">{value}</dd></div>)}</dl>;
}

export function CheckoutPolicies({ currentLang, onNavigate }: { currentLang: Language; onNavigate: () => void }) {
  return <section aria-label={currentLang === 'ta' ? 'கட்டண விதிமுறைகள் மற்றும் உதவி' : 'Payment terms and support'} className="space-y-3 border-t border-rule pt-4 text-sm">
    <p>{currentLang === 'ta' ? 'பணம் செலுத்துவதன் மூலம் பயன்பாட்டு விதிமுறைகளையும் பணத்திருப்பல் கொள்கையையும் ஏற்கிறீர்கள். தனியுரிமைக் கொள்கையையும் படிக்கவும்.' : 'By paying you agree to the Terms of Use and Refund & Cancellation Policy. Please also read the Privacy Policy.'}</p>
    <PolicyLinks currentLang={currentLang} onNavigate={onNavigate} />
    <SupportDetails currentLang={currentLang} />
  </section>;
}
