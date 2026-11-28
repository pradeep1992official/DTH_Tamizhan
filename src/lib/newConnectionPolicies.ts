import { refundPolicy } from './refundPolicy';
import { termsPolicy } from './termsPolicy';
import { privacyPolicy } from './privacyPolicy';
import { businessDetails } from './policyTranslations';
import type { PolicyKey, PolicySection } from './trustContent';
import { BUSINESS_DETAILS } from './trustContent';

export const newConnectionPolicies: Record<'en' | 'ta', Record<PolicyKey, PolicySection[]>> = {
  en: {
    contact: [
      { heading: 'Booking and installation help', paragraphs: ['Contact SMP Enterprises, trading as DTH Tamizhan, for help with a new connection, installation, payment, cancellation or service request. Use the contact details above or Raise service request. Track support conversations in My tickets.', 'Quote your DTH Tamizhan booking number or ticket number. Once we book with the DTH provider, your provider customer ID and provider booking ID appear in My Bookings. Never share passwords, OTPs, UPI PINs, CVVs or full card details with support.'] },
      { heading: 'Unconfirmed payments and complaints', paragraphs: ['If your account was debited but payment is pending, keep the transaction reference and contact us before paying again. Booking cancellation and payment verification are separate processes.', `If support has not resolved your complaint, contact ${BUSINESS_DETAILS.grievanceOfficer} at ${BUSINESS_DETAILS.grievanceEmail}. We acknowledge complaints within 48 hours and seek resolution within one month, subject to any shorter applicable legal deadline. Your consumer rights remain unaffected.`] },
    ],
    terms: termsPolicy('en', businessDetails('en'), false),
    refund: refundPolicy('en', businessDetails('en')),
    privacy: privacyPolicy('en', businessDetails('en')),
  },
  ta: {
    contact: [
      { heading: 'பதிவு மற்றும் நிறுவல் உதவி', paragraphs: ['DTH Tamizhan என்ற பெயரில் செயல்படும் SMP Enterprises-ஐ புதிய இணைப்பு, நிறுவல், கட்டணம், ரத்து அல்லது சேவைக் கோரிக்கை தொடர்பாக அணுகலாம். மேலுள்ள தொடர்பு விவரங்கள் அல்லது சேவை கோரிக்கை வசதியைப் பயன்படுத்தவும். உதவி உரையாடல்களை எனது கோரிக்கைகளில் காணலாம்.', 'DTH Tamizhan பதிவு எண் அல்லது கோரிக்கை எண்ணைத் தெரிவிக்கவும். நிறுவனத்திடம் இணைப்பு பதிவு செய்யப்பட்டதும் நிறுவன வாடிக்கையாளர் எண் மற்றும் பதிவு எண் எனது பதிவுகளில் காட்டப்படும். கடவுச்சொல், OTP, UPI PIN, CVV அல்லது முழு அட்டை விவரங்களை உதவிக் குழுவிடம் பகிர வேண்டாம்.'] },
      { heading: 'உறுதியாகாத கட்டணங்களும் புகார்களும்', paragraphs: ['பணம் பிடிக்கப்பட்டும் கட்டணம் நிலுவையில் இருந்தால் பரிவர்த்தனை எண்ணை வைத்துக்கொண்டு மீண்டும் செலுத்துவதற்கு முன் எங்களை அணுகவும். பதிவு ரத்தும் கட்டணச் சரிபார்ப்பும் தனித்தனி செயல்முறைகள்.', `தீர்க்கப்படாத புகார்களுக்கு ${businessDetails('ta').grievanceOfficer} அவர்களை ${BUSINESS_DETAILS.grievanceEmail} என்ற முகவரியில் அணுகவும். 48 மணிநேரத்திற்குள் பெறுதல் உறுதி அளித்து ஒரு மாதத்திற்குள் தீர்வளிக்க முயல்வோம்; குறைந்த சட்டக் காலவரம்பு பொருந்தினால் அதைப் பின்பற்றுவோம். உங்கள் நுகர்வோர் உரிமைகள் பாதிக்கப்படாது.`] },
    ],
    terms: termsPolicy('ta', businessDetails('ta'), false),
    refund: refundPolicy('ta', businessDetails('ta')),
    privacy: privacyPolicy('ta', businessDetails('ta')),
  },
};
