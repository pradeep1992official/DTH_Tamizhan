import type { PolicySection } from './trustContent';
import { NEW_CONNECTION_REFUND } from './newConnectionPolicy';

type RefundContact = { email: string; grievanceOfficer: string; grievanceEmail: string };

export function refundPolicy(lang: 'en' | 'ta', business: RefundContact): PolicySection[] {
  if (lang === 'ta') return [
    { heading: 'ரீசார்ஜ் தோல்வியடைந்தால்', paragraphs: [
      'பணம் பிடித்தும் ரீசார்ஜ் நடக்கவில்லை என்றால், ஆர்டர் எண் மற்றும் கட்டண எண்ணுடன் எங்களைத் தொடர்புகொள்ளவும். கட்டண நிறுவனத்திடமும் DTH நிறுவனத்திடமும் நிலையைச் சரிபார்ப்பது எங்கள் பொறுப்பு. உறுதிசெய்யப்படாத கட்டணத்தைத் தோல்வியாகக் கருத வேண்டாம்; சரிபார்க்கும் வரை மீண்டும் பணம் செலுத்த வேண்டாம்.',
      'நாங்கள் பணத்தைப் பெற்றும் ரீசார்ஜ் நிறைவேறவில்லை என்பது உறுதியானால், திருப்பித் தர வேண்டிய தொகையை உறுதிசெய்து பணத்திருப்பலை ஏற்பாடு செய்வோம். எங்களிடம் வராத கட்டணத்திற்கு, கட்டண நிறுவனம் அல்லது வங்கி பணம் திரும்பும் நிலையைச் சரிபார்க்க வேண்டும். அதைப் பின்தொடரத் தேவையான விவரங்களைப் பெற உதவுவோம்.',
    ] },
    { heading: 'தவறான வாடிக்கையாளர் எண்', paragraphs: [
      'பணம் செலுத்தும்முன் DTH நிறுவனம், வாடிக்கையாளர் எண், பேக், செல்லுபடிக் காலம் மற்றும் தொகையைச் சரிபார்ப்பது உங்கள் பொறுப்பு. தவறைக் கண்டால் உடனே எங்களிடம் தெரிவிக்கவும். DTH நிறுவனம் ஏற்கும்முன் கோரிக்கையை நிறுத்தவோ திருத்தவோ முடியுமா என்பதைச் சரிபார்ப்போம்.',
      'நீங்கள் கொடுத்த தவறான எண்ணுக்கு ரீசார்ஜ் சென்றுவிட்டால், அதை மாற்றுவதும் பணத்தைத் திருப்புவதும் DTH நிறுவனத்தால் செய்ய முடியுமா என்பதைப் பொறுத்தது; பணத்திருப்பலுக்கு உறுதியளிக்க முடியாது. நீங்கள் கொடுத்த சரியான விவரங்களை எங்கள் குழு தவறாகப் பயன்படுத்தியிருந்தால், நாங்கள் விசாரித்து உரிய திருத்தம் அல்லது பணத்திருப்பலை ஏற்பாடு செய்வோம். உங்கள் சட்டப்பூர்வ உரிமைகள் பாதிக்கப்படாது.',
    ] },
    { heading: 'தாமதம் அல்லது நிலுவை நிலை', paragraphs: [
      'கட்டணம் உறுதியானதும் ரீசார்ஜ் முடிந்துவிட்டதாகாது. DTH நிறுவனத்தின் செயல்படுத்துதலிலோ, கட்டண நிறுவனம் அல்லது வங்கியின் உறுதிப்படுத்தலிலோ தாமதம் இருக்கலாம். நிலையைப் பின்தொடர்ந்து உங்களுக்குத் தெரிவிப்பது எங்கள் பொறுப்பு. நிலுவையில் இருப்பது மட்டும் வெற்றி அல்லது தோல்விக்கான உறுதி அல்ல.',
      'எங்களிடம் பணம் வந்து சேவை வழங்க முடியவில்லை என்பது உறுதியானால், பொருந்தும் பணத்திருப்பலை ஏற்பாடு செய்வோம். வங்கி பணம் திருப்பும் காலத்தையும் DTH நிறுவனம் செயல்படுத்தும் நேரத்தையும் நாங்கள் நேரடியாகக் கட்டுப்படுத்த முடியாது; அதற்காக உங்கள் புகாரைக் கையாளும் எங்கள் பொறுப்பு நீங்காது.',
    ] },
    { heading: 'இருமுறை கட்டணம் செலுத்தியிருந்தால்', paragraphs: [
      'ஒரே கோரிக்கைக்கு இருமுறை பணம் பிடித்திருந்தால் இரண்டு கட்டண எண்களையும் அனுப்பவும். ஒவ்வொரு கட்டணத்தையும் தனியாகச் சரிபார்ப்போம். தனியாக நிறைவேற்றப்பட்ட சேவைக்குப் பயன்படுத்தப்படாத கூடுதல் கட்டணத்திற்கு உரிய பணத்திருப்பலை ஏற்பாடு செய்வோம். இரண்டு ரீசார்ஜ்களும் ஏற்கெனவே சென்றிருந்தால், DTH நிறுவனத்திடம் கிடைக்கும் தீர்வுகளைச் சரிபார்ப்போம்.',
    ] },
    { heading: 'ரத்து செய்ய வேண்டுமா?', paragraphs: [
      'எங்களிடம் விரைவாகத் தொடர்புகொள்ளவும். DTH நிறுவனத்துக்கு அனுப்பப்பட்டதா அல்லது ஏற்கப்பட்டதா என்பதைப் பொறுத்து ரீசார்ஜை நிறுத்த முடியுமா என்பது முடிவாகும். ஏற்கெனவே சென்ற ரீசார்ஜை ரத்து செய்யவோ திருப்பவோ முடியாமல் இருக்கலாம். ரத்து கோரிக்கை அனுப்புவது மட்டும் சேவையை நிறுத்தாது அல்லது பணத்திருப்பலைத் தொடங்காது.',
      'புதிய இணைப்புக்கு, தகுதியுள்ள பதிவுகளில் எனது பதிவுகள் பகுதியில் ரத்து கோரிக்கையை அனுப்பலாம். ஏற்கெனவே DTH நிறுவனத்தில் பதிவுசெய்யப்பட்ட, நிறுவல் நேரம் ஒதுக்கப்பட்ட அல்லது நிறுவப்பட்ட இணைப்புக்கு உதவிக் குழுவைத் தொடர்புகொள்ளவும். சேவை நிலை, நிறுவன விதிகள், பணத்திருப்பல் தொகை மற்றும் பொருந்தும் முன்கூட்டியே தெரிவிக்கப்பட்ட கட்டணங்களை விளக்குவோம். கீழுள்ள ஏழு நாள் உறுதிமொழியும் சட்டப்பூர்வ உரிமைகளும் தொடரும்.',
    ] },
    { heading: 'நிறுவல் மற்றும் கட்டண உதவிச் சேவை', paragraphs: [
      NEW_CONNECTION_REFUND.ta,
      'இந்த பணத்திருப்பலைக் கோர உங்கள் புதிய இணைப்பு பதிவு எண்ணுடன் தொடர்புகொள்ளவும். பதிவையும் கட்டணத்தையும் சரிபார்த்து பணத்திருப்பலை ஏற்பாடு செய்வோம்; ஏழு நாட்கள் ஆனதும் வங்கியில் தானாகப் பணம் திரும்பாது.',
      'சரிபார்க்கப்பட்ட கட்டணத்திலிருந்து 24 மணி நேரத்திற்குள் உங்கள் புகாரை DTH நிறுவனத்திடம் பதிவு செய்யாவிட்டால், விருப்பப் புகார் பதிவு உதவிக்கான ₹50 முழுவதும் திருப்பித் தரப்படும். புகாரைப் பதிவு செய்வதும் நிறுவனம் கோளாறைத் தீர்ப்பதும் வெவ்வேறு செயல்கள். எனது கோரிக்கைகளில் நிலையைப் பார்க்கலாம்.',
    ] },
    { heading: 'பணம் எப்படி திரும்பும்?', paragraphs: [
      'பணத்திருப்பல் வழங்கப்படும்போது, தொகை, தொடங்கிய தேதி மற்றும் பணத்திருப்பல் எண்ணைத் தெரிவிப்போம். பொருந்தும் இடங்களில் முதலில் பணம் செலுத்திய முறையிலேயே திருப்புவோம். அது முடியாவிட்டால் மாற்று முறையை விளக்கிப் பதிவு செய்வோம். பணத்திருப்பலைத் தொடங்குவது எங்கள் பொறுப்பு; அதன் பிறகு பணம் வரவு வைப்பதை கட்டண நிறுவனமும் வங்கியும் கையாளும்.',
      'ஒப்புதல் மட்டும் வங்கிச் செயலாக்கத்தைத் தொடங்காது. பணத்திருப்பலை நாங்கள் சமர்ப்பித்த பிறகு, கட்டண நிறுவனம் தெரிவிக்கும் எதிர்பார்க்கப்படும் காலத்தைப் பகிர்வோம். அது கடந்தும் பணம் வராவிட்டால் எங்களைத் தொடர்புகொள்ளவும். சோதனைக் கட்டணங்களில் உண்மையான பணம் பெறப்படுவதில்லை; திருப்பித் தர உண்மையான பணமும் இல்லை. பணத்திருப்பல் பெற மேலும் பணம் அனுப்பவோ UPI PIN அல்லது OTP பகிரவோ வேண்டாம்.',
    ] },
    { heading: 'உதவி பெறுவது எப்படி?', paragraphs: [
      `ஆர்டர் எண் அல்லது கோரிக்கை எண், கட்டண எண் மற்றும் சிக்கலின் விவரத்துடன் ${business.email} முகவரிக்கு எழுதவும். தீர்க்கப்படாத புகார்களுக்கு ${business.grievanceOfficer} அவர்களை ${business.grievanceEmail} மூலம் தொடர்புகொள்ளவும். இந்தக் கொள்கை சட்டப்படி உங்களுக்கு உள்ள பணத்திருப்பல் அல்லது பிற தீர்வுகளுக்கான உரிமைகளை நீக்குவதில்லை.`,
    ] },
  ];
  return [
    { heading: 'If your recharge fails', paragraphs: [
      'If money is debited but your recharge does not go through, contact us with your order and payment references. We are responsible for checking the payment and recharge status with the payment provider and DTH operator. An unclear payment is not a confirmed failure. Please do not pay again while we check it.',
      'If we received your payment and confirm that the recharge was not provided, we will confirm the amount due back and arrange the refund. If the payment never reached us, the payment provider or bank must check its return. We will help you obtain the details needed to follow it up.',
    ] },
    { heading: 'If you entered the wrong subscriber ID', paragraphs: [
      'You are responsible for checking the operator, subscriber ID, pack, validity and amount before paying. Tell us immediately if you notice a mistake. We will check whether the request can be stopped or corrected before the operator accepts it.',
      'If a recharge has already reached the incorrect account you supplied, reversal depends on what the DTH provider can do. We cannot guarantee a refund in that case. If you supplied correct details and our team used them incorrectly, we will investigate and arrange the appropriate correction or refund. Your legal rights remain protected.',
    ] },
    { heading: 'If your recharge is delayed or pending', paragraphs: [
      'Payment confirmation does not mean the recharge is complete. The DTH operator may take time to activate it, or the payment provider or bank may still be confirming payment. We are responsible for following up and explaining the status. A pending result alone does not confirm success or failure.',
      'If we have your payment and confirm that we cannot provide the service, we will arrange the refund due. We cannot directly control bank processing or the operator’s activation time, but we remain responsible for handling your complaint.',
    ] },
    { heading: 'If you paid twice', paragraphs: [
      'Send us both payment references if you were charged twice for the same request. We check each payment separately and arrange a refund for any extra payment that did not pay for a separate completed service. If both recharges have already been credited, we will check the available options with the operator.',
    ] },
    { heading: 'If you want to cancel', paragraphs: [
      'Contact us as soon as possible. Stopping a recharge depends on whether it has been sent to or accepted by the operator. A credited recharge may not be reversible. Asking to cancel does not automatically stop a service or start a refund.',
      'For a new connection, eligible bookings offer Request cancellation in My Bookings. If your booking is already with the provider, a visit is scheduled or installation is complete, contact support. We will explain the decision, any refund amount and any applicable charges disclosed before booking. The seven-day installation promise below and your legal rights still apply.',
    ] },
    { heading: 'Installation and paid assistance', paragraphs: [
      NEW_CONNECTION_REFUND.en,
      'Contact us with your new-connection booking number to request this refund. We check the booking and payment and arrange the refund; reaching seven days does not automatically return money to your bank.',
      'The optional ₹50 complaint-registration assistance fee is refunded in full if we do not place your complaint with the DTH provider within 24 hours of verified payment. Registering a complaint is separate from the provider fixing the fault. Track updates in My tickets.',
    ] },
    { heading: 'How your refund reaches you', paragraphs: [
      'When a refund is due, we confirm the amount, initiation date and refund reference. We return it to the original payment method where supported. If that is unavailable, we explain and record the alternative. We are responsible for submitting the refund; the payment provider and bank handle the money reaching your account.',
      'Approval alone does not start bank processing. After we submit the refund, we share the payment provider’s estimated timeline. Contact us if that estimate is exceeded. Test payments collect no real money, so there is no real money to return. You never need to send another payment or share a UPI PIN or OTP to receive a refund.',
    ] },
    { heading: 'How to get help', paragraphs: [
      `Email ${business.email} with your order or ticket number, payment reference and a description of the issue. For unresolved complaints, contact ${business.grievanceOfficer} at ${business.grievanceEmail}. This policy does not remove refunds or other remedies required by law.`,
    ] },
  ];
}
