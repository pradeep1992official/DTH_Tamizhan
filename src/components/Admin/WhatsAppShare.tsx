import type { Language } from '../../types';

export function WhatsAppShare({ href, currentLang }: { href: string | null; currentLang: Language }) {
  const ta = currentLang === 'ta';
  return <div className="p-3 rounded-lg border border-rule bg-paper-2 text-sm">
    {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-lg border border-rule px-3 py-2 font-semibold text-success focus-visible:outline focus-visible:outline-2">
      {ta ? 'WhatsApp மூலம் அனுப்பவும்' : 'Send via WhatsApp'}
    </a> : <span className="text-muted">{ta ? 'WhatsApp அனுப்ப செல்லுபடியான வாடிக்கையாளர் மொபைல் எண் தேவை.' : 'A valid customer mobile number is needed to send via WhatsApp.'}</span>}
    <p className="text-muted mt-2">{ta ? 'WhatsApp இல் எண்ணையும் செய்தியையும் சரிபார்த்து அனுப்பவும். PDF ரசீதைத் தனியாக இணைக்கலாம்.' : 'Review the number and message in WhatsApp, then press Send. Attach a PDF receipt separately if needed.'}</p>
  </div>;
}
