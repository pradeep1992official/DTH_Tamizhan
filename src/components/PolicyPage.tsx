import { clientRechargeEnabled } from '../lib/rechargeFeature';
import { launchPolicies } from '../lib/rechargeLaunchCopy';
import React from 'react';
import type { Language } from '../types';
import { BUSINESS_DETAILS, POLICY_CONTENT, POLICY_ROUTES, type PolicyKey } from '../lib/trustContent';
import { PolicyLinks, SupportDetails } from './TrustContent';
import { translations } from '../lib/translations';
import { formatMessage } from '../lib/customerMessages';
import { businessDetails, POLICY_CONTENT_TA } from '../lib/policyTranslations';

export function policyPageTitle(policy: PolicyKey, currentLang: Language): string {
  return `${POLICY_ROUTES.find(route => route.key === policy)![currentLang]} | DTH Tamizhan`;
}
export function PolicyPage({ policy, currentLang }: { policy: PolicyKey; currentLang: Language }) {
  const route = POLICY_ROUTES.find(route => route.key === policy)!;
  const recharge = clientRechargeEnabled();
  return <article className="max-w-3xl mx-auto text-left space-y-6 p-5 sm:p-7 border border-rule rounded-2xl bg-paper text-ink">
    <header className="space-y-3"><h1 className="text-2xl font-bold">{route[currentLang]}</h1>
      <p className="text-sm text-muted" lang={currentLang}>{recharge ? formatMessage(translations[currentLang].uiPolicyDraft, { date: businessDetails(currentLang).policyDate }) : `${currentLang === 'ta' ? 'கடைசியாகப் புதுப்பிக்கப்பட்டது' : 'Last updated'}: ${BUSINESS_DETAILS.policyDate}`}</p>
    </header>
    {(policy === 'contact' || !recharge) && <SupportDetails currentLang={currentLang} full />}
    <div lang={currentLang} className="space-y-6">{(recharge ? (currentLang === 'ta' ? POLICY_CONTENT_TA : POLICY_CONTENT) : launchPolicies[currentLang])[policy].map(section => <section key={section.heading} className="space-y-2">
      <h2 className="text-lg font-semibold">{section.heading}</h2>
      {section.paragraphs.map(paragraph => <p key={paragraph} className="text-sm leading-relaxed">{paragraph}</p>)}
    </section>)}</div>
    <PolicyLinks currentLang={currentLang} />
  </article>;
}
