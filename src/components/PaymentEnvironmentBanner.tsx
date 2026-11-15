import { useEffect, useState } from 'react';
import type { Language } from '../types';

export function PaymentEnvironmentBanner({ currentLang }: { currentLang: Language }) {
  const [testMode, setTestMode] = useState<boolean | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/payments/config', { cache: 'no-store', signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); const data = await response.json(); if (!controller.signal.aborted) setTestMode(data.testMode === true || data.mode === 'sandbox'); })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  if (testMode === false) return null;
  return <aside role="status" className="payment-environment-banner" lang={currentLang}>
    <strong>{testMode === null ? (currentLang === 'ta' ? 'கட்டணச் சூழல் சரிபார்க்கப்படுகிறது' : 'Checking payment environment') : (currentLang === 'ta' ? 'சோதனை முறை' : 'Sandbox / Test mode')}</strong>
    <span>{testMode === null ? (currentLang === 'ta' ? 'தொடர்வதற்கு முன் கட்டணச் சூழலை உறுதிசெய்யவும்.' : 'Confirm the payment environment before proceeding.') : (currentLang === 'ta' ? 'உண்மையான பணம் பெறப்படாது. உண்மையான DTH ரீசார்ஜ் செய்யப்படாது.' : 'No real money is collected. No real DTH recharge will be placed.')}</span>
  </aside>;
}
