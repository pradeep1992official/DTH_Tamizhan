import { termsPolicy } from './termsPolicy';
import { privacyPolicy } from './privacyPolicy';
import { businessDetails } from './policyTranslations';
import type { PolicyKey, PolicySection } from './trustContent';
import { BUSINESS_DETAILS } from './trustContent';
import { NEW_CONNECTION_REFUND } from './newConnectionPolicy';

export const newConnectionPolicies: Record<'en' | 'ta', Record<PolicyKey, PolicySection[]>> = {
  en: {
    contact: [
      { heading: 'Booking and installation help', paragraphs: ['Contact SMP Enterprises, trading as DTH Tamizhan, for help with a new connection, installation, payment, cancellation or service request. Use the contact details above or Raise service request. Track support conversations in My tickets.', 'Quote your DTH Tamizhan booking number or ticket number. Once we book with the DTH provider, your provider customer ID and provider booking ID appear in My Bookings. Never share passwords, OTPs, UPI PINs, CVVs or full card details with support.'] },
      { heading: 'Unconfirmed payments and complaints', paragraphs: ['If your account was debited but payment is pending, keep the transaction reference and contact us before paying again. Booking cancellation and payment verification are separate processes.', `If support has not resolved your complaint, contact ${BUSINESS_DETAILS.grievanceOfficer} at ${BUSINESS_DETAILS.grievanceEmail}. We acknowledge complaints within 48 hours and seek resolution within one month, subject to any shorter applicable legal deadline. Your consumer rights remain unaffected.`] },
    ],
    terms: termsPolicy('en', businessDetails('en'), false),
    refund: [
      { heading: 'Installation refund commitment', paragraphs: [NEW_CONNECTION_REFUND.en, 'Contact support with your booking number to request the refund. Staff verify the booking and payment and record the refund separately; reaching seven days does not itself create an automatic bank refund.'] },
      { heading: 'Cancellation requests', paragraphs: ['Before installation is scheduled, eligible bookings offer Request cancellation in My Bookings. Staff review the request; submitting it does not automatically cancel the provider booking or return money.', 'For a booking already placed with the DTH provider, a scheduled visit or an installed connection, contact support so the stage of fulfilment and any applicable provider terms can be checked. We will explain the decision and any amount refundable. This does not limit the seven-day commitment or remedies required by law.'] },
      { heading: 'Refund processing and tracking', paragraphs: [BUSINESS_DETAILS.bankCredit, 'Where staff arrange a manual refund, we confirm the method and reference and record money only after it has been returned. Keep the refund reference and contact support if the communicated timeline is exceeded. Test-mode transactions do not involve real money.'] },
      { heading: 'Paid service-request assistance', paragraphs: ['Full ₹50 refund if we do not place your complaint within 24 hours of verified payment. Complaint registration is separate from the provider resolving the fault. Check My tickets for complaint and refund updates; bank credit follows payment-provider processing.'] },
    ],
    privacy: privacyPolicy('en', businessDetails('en')),
  },
  ta: {
    contact: [
      { heading: 'பதிவு மற்றும் நிறுவல் உதவி', paragraphs: ['DTH Tamizhan என்ற பெயரில் செயல்படும் SMP Enterprises-ஐ புதிய இணைப்பு, நிறுவல், கட்டணம், ரத்து அல்லது சேவைக் கோரிக்கை தொடர்பாக அணுகலாம். மேலுள்ள தொடர்பு விவரங்கள் அல்லது சேவை கோரிக்கை வசதியைப் பயன்படுத்தவும். உதவி உரையாடல்களை எனது கோரிக்கைகளில் காணலாம்.', 'DTH Tamizhan பதிவு எண் அல்லது கோரிக்கை எண்ணைத் தெரிவிக்கவும். நிறுவனத்திடம் இணைப்பு பதிவு செய்யப்பட்டதும் நிறுவன வாடிக்கையாளர் எண் மற்றும் பதிவு எண் எனது பதிவுகளில் காட்டப்படும். கடவுச்சொல், OTP, UPI PIN, CVV அல்லது முழு அட்டை விவரங்களை உதவிக் குழுவிடம் பகிர வேண்டாம்.'] },
      { heading: 'உறுதியாகாத கட்டணங்களும் புகார்களும்', paragraphs: ['பணம் பிடிக்கப்பட்டும் கட்டணம் நிலுவையில் இருந்தால் பரிவர்த்தனை எண்ணை வைத்துக்கொண்டு மீண்டும் செலுத்துவதற்கு முன் எங்களை அணுகவும். பதிவு ரத்தும் கட்டணச் சரிபார்ப்பும் தனித்தனி செயல்முறைகள்.', `தீர்க்கப்படாத புகார்களுக்கு குறைதீர் அதிகாரி லாவண்யாவை ${BUSINESS_DETAILS.grievanceEmail} என்ற முகவரியில் அணுகவும். 48 மணிநேரத்திற்குள் பெறுதல் உறுதி அளித்து ஒரு மாதத்திற்குள் தீர்வளிக்க முயல்வோம்; குறைந்த சட்டக் காலவரம்பு பொருந்தினால் அதைப் பின்பற்றுவோம். உங்கள் நுகர்வோர் உரிமைகள் பாதிக்கப்படாது.`] },
    ],
    terms: termsPolicy('ta', businessDetails('ta'), false),
    refund: [
      { heading: 'நிறுவலுக்கான பணத்திருப்பல் உறுதி', paragraphs: [NEW_CONNECTION_REFUND.ta, 'பதிவு எண்ணுடன் உதவிக் குழுவிடம் பணத்திருப்பலைக் கோரவும். குழு பதிவையும் கட்டணத்தையும் சரிபார்த்து பணத்திருப்பலைத் தனியாகப் பதிவிடும். ஏழு நாட்கள் முடிவதால் வங்கிப் பணத்திருப்பல் தானாக உருவாகாது.'] },
      { heading: 'ரத்துக் கோரிக்கைகள்', paragraphs: ['நிறுவல் திட்டமிடப்படும் முன் தகுதியான பதிவுகளில் எனது பதிவுகள் பக்கத்தில் ரத்துக் கோரிக்கையை அனுப்பலாம். குழு பரிசீலிக்கும்; அனுப்புவது மட்டும் நிறுவனப் பதிவை ரத்து செய்வதோ பணத்தைத் திருப்புவதோ அல்ல.', 'நிறுவனத்திடம் ஏற்கனவே பதிவு செய்யப்பட்ட இணைப்பு, திட்டமிட்ட வருகை அல்லது நிறுவப்பட்ட இணைப்பு தொடர்பாக உதவிக் குழுவை அணுகவும். சேவையின் நிலை மற்றும் நிறுவன விதிகளைச் சரிபார்த்து முடிவையும் திருப்பக்கூடிய தொகையையும் விளக்குவோம். ஏழு நாள் உறுதியையும் சட்டத் தீர்வுகளையும் இது கட்டுப்படுத்தாது.'] },
      { heading: 'பணத்திருப்பல் செயல்முறை', paragraphs: ["Razorpay பணத்திருப்பல் வசதி உள்ளபோது அசல் கட்டண முறைக்கே அனுப்பப்படும். செயலாக்கம் மற்றும் வங்கி வரவு நேரம் கட்டண முறை மற்றும் வங்கியைப் பொறுத்தது. தொடங்கிய பிறகு பணத்திருப்பல் எண் மற்றும் வழங்குநரின் எதிர்பார்க்கப்படும் காலத்தைத் தெரிவிப்போம். அந்த நேரத்தை மீறினால் உதவியை அணுகவும்; ரத்துக் கோரிக்கை அல்லது ஒப்புதல் மட்டும் வங்கி செயலாக்கத்தைத் தொடங்காது", 'கைமுறை பணத்திருப்பலின் முறையையும் எண்ணையும் உறுதிசெய்து உண்மையில் திருப்பிய பிறகே குழு பதிவிடும். தெரிவிக்கப்பட்ட நேரத்தை மீறினால் குறிப்பெண்ணுடன் அணுகவும். சோதனைக் கட்டணங்களில் உண்மைப் பணம் பரிமாறப்படாது.'] },
      { heading: 'கட்டணச் சேவைக் கோரிக்கை உதவி', paragraphs: ['கட்டணம் உறுதியான 24 மணிநேரத்திற்குள் புகார் பதிவு செய்யாவிட்டால் ₹50 முழுவதும் திருப்பித் தரப்படும். புகார் பதிவு செய்வதும் நிறுவனத்தால் பழுது தீர்க்கப்படுவதும் வேறு செயல்கள். புகார் மற்றும் பணத்திருப்பல் நிலையை எனது கோரிக்கைகளில் பார்க்கவும்; வங்கி வரவு கட்டண நிறுவனச் செயலாக்கத்திற்குப் பிறகு கிடைக்கும்.'] },
    ],
    privacy: privacyPolicy('ta', businessDetails('ta')),
  },
};
