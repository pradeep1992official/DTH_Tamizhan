import React, { useState } from 'react';
import { WhatsappLogo } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import type { Language } from '../../types';
import type { CatalogData } from '../../lib/newConnectionCatalog';
import { translations } from '../../lib/translations';
import { bookingRefundPolicy, NEW_CONNECTION_RENTAL } from '../../lib/newConnectionPolicy';
import { businessDetails } from '../../lib/policyTranslations';
import { BUSINESS_DETAILS } from '../../lib/trustContent';
import { ChevronDown, Phone } from '../../lib/icons';
import { districtTamil } from '../../lib/newConnectionBookingCopy';

export function serviceAreaText(catalog: CatalogData | null, lang: Language) {
  const ta = lang === 'ta';
  const districts = catalog?.settings.serviceableDistricts ?? [];
  const pincodes = catalog?.settings.serviceablePincodes ?? [];
  if (!districts.length && !pincodes.length) return '';
  return [districts.length ? `${ta ? 'சேவை வழங்கும் தமிழ்நாடு மாவட்டங்கள்' : 'Tamil Nadu districts we serve'}: ${districts.map(name => ta ? districtTamil[name] || name : name).join(', ')}.` : '', pincodes.length ? `${ta ? 'சேவை அஞ்சல் குறியீடுகள்' : 'Serviceable pincodes'}: ${pincodes.join(', ')}.` : ''].filter(Boolean).join(' ');
}

export function HomeDetails({ currentLang: lang, catalog }: { currentLang: Language; catalog: CatalogData | null }) {
  const [showAllFaqs, setShowAllFaqs] = useState(false);
  const ta = lang === 'ta'; const t = translations[lang]; const support = businessDetails(lang);
  const mode = catalog?.settings.advanceMode;
  const online = catalog && mode !== 'none' && catalog.settings.defaultProvider !== 'none' && catalog.settings.enabledProviders.includes(catalog.settings.defaultProvider);
  const step2 = online ? (ta ? 'விவரங்களை வழங்கி ஆன்லைனில் செலுத்துங்கள்' : 'Enter details and pay online') : (ta ? 'விவரங்களை வழங்கி முன்பதிவு செய்யுங்கள்' : 'Enter details and request installation');
  const payment = !catalog ? (ta ? 'முன்பதிவின் Review படியில் செலுத்த வேண்டிய தொகையைச் சரிபார்க்கவும்.' : 'Review the amount due in the booking Review step before confirming.') : online && mode === 'full' ? (ta ? 'முழுத் தொகையையும் முன்பதிவின்போது ஆன்லைனில் செலுத்துங்கள்.' : 'Pay the full amount online when booking.') : online ? (ta ? 'முன்பணத்தை ஆன்லைனில் செலுத்துங்கள். நிறுவலின்போது செலுத்த வேண்டிய மீதித் தொகை Review படியில் காட்டப்படும்.' : 'Pay the advance online. The Review step shows the remaining Pay at installation balance.') : (ta ? 'ஆன்லைன் கட்டணம் தேவையில்லை. Review படியில் நிறுவலின்போது செலுத்த வேண்டிய தொகையைப் பார்க்கவும்.' : 'No online payment is required for a payment-free booking. Check the Pay at installation amount in Review.');
  const faqs = [
    [ta ? 'பேக்கில் என்ன சேர்க்கப்பட்டுள்ளது?' : 'What is included in my pack?', ta ? 'பெட்டி, டிஷ், சேனல்கள், கால அளவு மற்றும் நிறுவல் விவரங்களை பேக் பக்கத்திலும் Plan படியிலும் பார்க்கவும்.' : 'The pack card and Plan step list the set-top box, dish where included, channels, validity and installation. Check your selected pack before booking.'],
    [ta ? 'செட்-டாப் பெட்டி சொந்தமா அல்லது வாடகையா?' : 'Is the set-top box owned or rented?', NEW_CONNECTION_RENTAL[lang]],
    [ta ? 'நிறுவலுக்கு எவ்வளவு நேரமாகும்?' : 'How long does installation take?', `${support.installation.split('. ')[0]}.`],
    [ta ? 'என் முகவரியில் நிறுவ முடியாவிட்டால் பணம் திரும்பக் கிடைக்குமா?' : 'What if you cannot install at my address?', bookingRefundPolicy(catalog?.settings.refundPolicy || '', lang)],
    [ta ? 'நிறுவலின்போது என்ன கட்டணம் செலுத்த வேண்டும்?' : 'What are the charges at installation?', payment],
    [ta ? 'எந்தப் பகுதிகளில் சேவை வழங்குகிறீர்கள்?' : 'Which areas do you serve?', serviceAreaText(catalog, lang)],
    [ta ? 'ஏற்கனவே உள்ள டிஷைப் பயன்படுத்தலாமா?' : 'Can I use my existing dish?', ta ? 'பெட்டி மட்டும் உள்ள பேக்குகளைப் பாருங்கள். பொருத்தத்தை உறுதிப்படுத்த முன்பதிவுக்கு முன் எங்களை அழைக்கவும்.' : 'Look for Box only (existing dish). Contact us before booking to confirm whether your existing dish is compatible.'],
    [ta ? 'பின்னர் எப்படி ரீசார்ஜ் செய்வது?' : 'How do I recharge later?', ta ? 'செயல்படுத்தப்பட்ட பிறகு உங்கள் ஆபரேட்டரின் அதிகாரப்பூர்வ செயலி, இணையதளம் அல்லது அங்கீகரிக்கப்பட்ட விற்பனையாளர் மூலம் ரீசார்ஜ் செய்யலாம். வாடிக்கையாளர் எண் மற்றும் உதவிக்கு எங்களைத் தொடர்புகொள்ளுங்கள்.' : 'After activation, use your operator’s official recharge app, website or an authorized dealer. Contact us if you need help finding your customer ID or the correct recharge option.'],
  ];
  const steps = [
    { title: ta ? 'பேக்கைத் தேர்வு செய்யுங்கள்' : 'Choose your pack', body: ta ? 'ஆபரேட்டர், பெட்டி, சேனல்கள் மற்றும் கால அளவை ஒப்பிடுங்கள்.' : 'Compare operators, boxes, channels and validity. Review what is included.' },
    { title: step2, body: payment },
    { title: ta ? 'நிறுவல் வருகையை நாங்கள் உறுதிசெய்வோம்' : 'We confirm your installation visit', body: ta ? 'நிறுவலை ஏற்பாடு செய்ய தொழில்நுட்ப நிபுணர் உங்களைத் தொடர்புகொள்வார்.' : 'A technician contacts you to arrange installation. Track updates in My Bookings.' },
  ];
  return <section id="home-details" className="launch-details" aria-labelledby="home-details-title" tabIndex={-1}>
    <h2 id="home-details-title">{ta ? '\u0baa\u0bc1\u0ba4\u0bbf\u0baf \u0b87\u0ba3\u0bc8\u0baa\u0bcd\u0baa\u0bc8\u0baa\u0bcd \u0baa\u0bc6\u0bb1\u0bc1\u0bb5\u0ba4\u0bc1 \u0b8e\u0baa\u0bcd\u0baa\u0b9f\u0bbf' : 'Your new connection, step by step'}</h2>
    <ol className="launch-steps">{steps.map((step, index) => <li key={index}><span className="launch-step-number" aria-hidden="true">{index + 1}</span><h3 className="launch-step-title">{step.title}</h3><p>{step.body}</p></li>)}</ol>
    <div className="launch-help-grid"><div><h3>{ta ? 'தேர்வு செய்ய உதவி வேண்டுமா?' : 'Need help choosing?'}</h3><p>{ta ? 'எந்த பேக் என்று தெரியவில்லையா? உங்கள் தேவைகளைக் கூறுங்கள்; பொருத்தமான பேக்கை பரிந்துரைக்கிறோம்.' : 'Not sure which pack? Tell us your needs and we’ll suggest one.'}</p>
      <div className="launch-support-actions"><strong className="launch-support-number">{BUSINESS_DETAILS.phone}</strong><a href={`tel:${BUSINESS_DETAILS.phone.replace(/[^+0-9]/g, '')}`}><Phone size={18} aria-hidden="true" />{ta ? 'அழைக்கவும்' : 'Call'}</a><a href={`https://wa.me/${BUSINESS_DETAILS.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"><WhatsappLogo size={18} aria-hidden="true" />WhatsApp</a></div>
      <p>{support.supportHours}</p>
      {serviceAreaText(catalog, lang) && <p className="launch-service-area">{serviceAreaText(catalog, lang)}</p>}
    </div><div id="home-faqs"><h3>{ta ? 'அடிக்கடி கேட்கப்படும் கேள்விகள்' : 'Frequently asked questions'}</h3><p className="launch-faq-hint">{ta ? 'பதிலைப் பார்க்க ஒரு கேள்வியைத் தேர்வு செய்யுங்கள்.' : 'Select a question to see the answer.'}</p>{faqs.filter(([, answer]) => answer).slice(0, showAllFaqs ? undefined : 3).map(([question, answer]) => <details key={question}><summary><span>{question}</span><ChevronDown size={20} aria-hidden="true" /></summary><p>{answer}</p></details>)}
      {showAllFaqs && <details><summary><span>{ta ? 'முன்பதிவை எங்கே பார்ப்பது?' : 'Where can I track my booking?'}</span><ChevronDown size={20} aria-hidden="true" /></summary><p><Link to="/account/bookings">{t.ctTitle}</Link>{ta ? ' பக்கத்தில் அதே கணக்கில் உள்நுழைந்து நிலையைப் பார்க்கலாம்.' : ' shows booking and installation updates when you sign in with the same account.'}</p></details>}
      <button type="button" className="launch-faq-toggle" aria-expanded={showAllFaqs} aria-controls="home-faqs" onClick={() => setShowAllFaqs(value => !value)}>{showAllFaqs ? (ta ? '\u0b95\u0bc1\u0bb1\u0bc8\u0bb5\u0bbe\u0b95\u0b95\u0bcd \u0b95\u0bbe\u0ba3\u0bcd\u0b95' : 'View less') : (ta ? '\u0bae\u0bc7\u0bb2\u0bc1\u0bae\u0bcd \u0baa\u0bbe\u0bb0\u0bcd\u0b95\u0bcd\u0b95' : 'View more')}</button>
    </div></div>
    <div className="launch-bottom-cta"><h3>{ta ? 'உங்கள் பேக்கைத் தேர்வு செய்யத் தயாரா?' : 'Ready to choose your connection?'}</h3><Link to="/new-connection">{t.launchCTA}</Link></div>
  </section>;
}
