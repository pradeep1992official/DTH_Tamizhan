import type { PolicySection } from './trustContent';
import { NEW_CONNECTION_RENTAL } from './newConnectionPolicy';

type TermsBusiness = { legalName: string; address: string; gstin: string; email: string; grievanceOfficer: string; grievanceEmail: string };

export function termsPolicy(lang: 'en' | 'ta', business: TermsBusiness, recharge = true): PolicySection[] {
  if (lang === 'ta') return [
    { heading: 'எங்கள் சேவை', paragraphs: [
      `DTH Tamizhan ${recharge ? 'ரீசார்ஜ் கோரிக்கைகளை அனுப்பவும் புதிய DTH இணைப்புகளை ஏற்பாடு செய்யவும்' : 'புதிய DTH இணைப்புகளை ஏற்பாடு செய்யவும்'} உதவும் ஒரு சேவைத் தளம். பேக் கிடைப்பது, சேனல்கள், செல்லுபடிக் காலம் மற்றும் சேவையை இயக்குவது DTH நிறுவனத்தின் கட்டுப்பாட்டில் உள்ளன. உங்கள் கோரிக்கையைக் கையாளுவது, அதன் நிலையைத் தெரிவிப்பது மற்றும் கட்டணம் அல்லது சேவைச் சிக்கல்களைத் தீர்க்க உதவுவது எங்கள் பொறுப்பு.`,
      'இந்த விதிமுறைகள் இந்தியாவில் எங்கள் இணையதளம், முன்பதிவுகள் மற்றும் உதவிச் சேவைகளைப் பயன்படுத்துவதற்குப் பொருந்தும். நிறுவனங்களின் பெயர்கள் மற்றும் சின்னங்கள் சேவையை அடையாளம் காண்பவை; அவை மட்டும் அதிகாரப்பூர்வக் கூட்டாண்மை அல்லது ஆதரவைக் குறிக்காது.',
    ] },
    { heading: 'உங்கள் விவரங்களைச் சரிபார்க்கவும்', paragraphs: [
      'உறுதிசெய்யும் முன் DTH நிறுவனம், வாடிக்கையாளர் எண், பேக், செல்லுபடிக் காலம், தொடர்பு விவரங்கள் மற்றும் தொகையைச் சரிபார்க்கவும். புதிய இணைப்புக்கு பெட்டி, நிறுவல் முகவரி மற்றும் விருப்ப நேரத்தையும் சரிபார்க்கவும். மற்றொருவரின் கணக்கில் அவர்களின் அனுமதியின்றி கோரிக்கை வைக்க வேண்டாம். உங்கள் உள்நுழைவு விவரங்களைப் பாதுகாப்பாக வைத்திருக்கவும்; மோசடி அல்லது இணையதளத்தைப் பாதிக்கும் செயல்களுக்குப் பயன்படுத்த வேண்டாம்.',
    ] },
    { heading: 'கட்டணங்கள்', paragraphs: [
      'விலைகள் இந்திய ரூபாயில் காட்டப்படும். பொருந்தும் கூடுதல் கட்டணங்களும் வரிகளும் பணம் செலுத்தும்முன் தெரிவிக்கப்பட வேண்டும். காட்டப்படும் இறுதித் தொகையே வசூலிக்கப்படும். புதிய இணைப்புக்கு இப்போது செலுத்த வேண்டிய தொகையும் நிறுவலின்போது செலுத்த வேண்டிய மீதித் தொகையும் காட்டப்படும். கூடுதல் வேலை அல்லது கட்டணத்திற்கு முன்கூட்டியே உங்கள் ஒப்புதல் பெற வேண்டும்.',
      'எங்கள் கட்டணப் பக்கத்தில் தனியாக Razorpay சேவைக் கட்டணம் சேர்க்கப்படுவதில்லை. Razorpay செயலாக்கக் கட்டணமும் அதற்கான GST-யும் எங்கள் வணிகச் செலவுகள்; அவை ரீசார்ஜ் தொகைக்கு தானாக 18% வரி சேர்ப்பதில்லை. கட்டண ரசீது பரிவர்த்தனைப் பதிவு மட்டுமே; அது GST வரி விலைப்பட்டியல் அல்ல.',
    ] },
    ...(recharge ? [{ heading: 'கட்டணமும் ரீசார்ஜும்', paragraphs: [
      'பணம் பிடித்தம் செய்யப்பட்டதாலோ, பொத்தானை அழுத்தியதாலோ அல்லது வேறு பக்கத்திற்குச் சென்றதாலோ ரீசார்ஜ் முடிந்ததாகக் கருத வேண்டாம். கட்டணத்தைப் பணம் பெறும் நிறுவனமும் ரீசார்ஜை DTH நிறுவனமும் உறுதிசெய்ய வேண்டும். உடனடி செயல்பாடு உறுதியளிக்கப்படுவதில்லை. பணம் பிடித்தும் நிலை தெளிவாக இல்லாவிட்டால், மீண்டும் செலுத்தும்முன் எங்களைத் தொடர்புகொள்ளவும்.',
      'பேக் ஏற்றுக்கொள்ளப்படுவது, சேனல்கள், செல்லுபடிக் காலம் மற்றும் செயல்படுத்தும் நேரம் DTH நிறுவனத்தின் விதிகளையும் உங்கள் கணக்கு விவரங்களையும் பொறுத்தது. பட்டியலில் பேக் இருப்பது மட்டும் நிறுவனம் அதை ஏற்கும் என்ற உறுதி அல்ல. தவறான விலை அல்லது சேவை கிடைக்காத நிலை ஏற்பட்டால், சிக்கலையும் தீர்வுகளையும் விளக்குவோம்.',
    ] }] : []),
    { heading: 'புதிய இணைப்பும் நிறுவலும்', paragraphs: [
      'கட்டணமும் முன்பதிவு விவரங்களும் சரிபார்க்கப்பட்ட பிறகு DTH நிறுவனத்திடம் உங்கள் இணைப்பைப் பதிவு செய்கிறோம். நிறுவன வாடிக்கையாளர் எண்ணையும் பதிவு எண்ணையும் எனது பதிவுகளில் காணலாம். தொழில்நுட்ப நிபுணர் நிறுவலை ஏற்பாடு செய்ய 24–48 மணி நேரத்திற்குள் தொடர்புகொள்வார். நீங்கள் தேர்ந்தெடுக்கும் நேரம் உறுதிசெய்யப்பட்ட சந்திப்பு அல்ல; கட்டணம் செலுத்துவது மட்டும் நிறுவல் முடிந்ததாகாது.',
      `${NEW_CONNECTION_RENTAL.ta} பெட்டி, சேனல்கள், செயல்படுத்துதல் மற்றும் உத்தரவாத ஏற்பாடுகள் தேர்ந்தெடுத்த DTH நிறுவனம் மற்றும் சலுகையைப் பொறுத்தவை.`,
    ] },
    { heading: 'உதவி மற்றும் விருப்பக் கட்டணச் சேவை', paragraphs: [
      'கணக்கு, இணையதளம் மற்றும் ஆர்டர் தொடர்பான பொதுவான உதவிக்குக் கட்டணப் புகார் பதிவு வசதியை வாங்க வேண்டியதில்லை. வழங்கப்படும் இடங்களில், DTH நிறுவனத்திடம் புகாரைப் பதிவு செய்ய உதவும் விருப்பச் சேவைக்கான ₹50 கட்டணம் செலுத்தும்முன் காட்டப்படும். இது புகாரைப் பதிவு செய்வதற்கான உதவி மட்டுமே; நிறுவனம் கோளாறைச் சரிசெய்யும் அல்லது குறிப்பிட்ட நேரத்தில் தீர்க்கும் என்ற உறுதி அல்ல. DTH நிறுவனத்தை நேரடியாகத் தொடர்புகொண்டு இலவச உதவி பெறலாம். எனது கோரிக்கைகளில் நிலையைப் பார்க்கலாம்.',
    ] },
    ...(recharge ? [{ heading: 'விருப்பக் கணக்குச் சரிபார்ப்பு', paragraphs: [
      'உங்கள் அனுமதியுடன் கணக்கைச் சரிபார்க்கலாம்; இது கட்டாயமில்லை. வெளிப்புற வழங்குநரின் விவரங்கள் தாமதமாகவோ முழுமையின்றியோ இருக்கலாம். சரிபார்ப்பு வெற்றியடைந்தாலும் ரீசார்ஜ் முடிந்ததாகவோ பேக் கிடைப்பதாகவோ பொருள் இல்லை. சரிபார்க்க முடியாவிட்டால் விவரங்களை நீங்களே உள்ளிட்டு தொடரலாம்.',
    ] }] : []),

    { heading: 'புகார்களும் உங்கள் உரிமைகளும்', paragraphs: [
      'ஆர்டர் அல்லது சேவை தொடர்பான சிக்கல்களுக்கு தொடர்பு மற்றும் குறைதீர்ப்பு விவரங்கள் பக்கத்தின் மூலம் எங்களை அணுகவும். தீர்க்கப்படாத புகார்களுக்கு அங்குள்ள குறைதீர்ப்பு அதிகாரியைத் தொடர்புகொள்ளவும்.',
      'இந்தியச் சட்டம் பொருந்தும். பொருந்தும் நுகர்வோர் சட்டங்களின்படி உங்களுக்கு உள்ள உரிமைகளை இந்த விதிமுறைகள் கட்டுப்படுத்துவதில்லை.',
    ] },
  ];
  return [
    { heading: 'Our role', paragraphs: [
      `DTH Tamizhan is a facilitator: we help customers ${recharge ? 'place recharge requests and ' : ''}arrange new DTH connections. The DTH provider controls pack availability, channels, validity and activation. We remain responsible for handling your request, communicating its status and helping resolve payment or service issues.`,
      `These terms cover our website, bookings and support services in India. Provider names and logos identify their services; they do not by themselves mean an official partnership or endorsement.`,
    ] },
    { heading: 'Check your details', paragraphs: [
      'Before confirming, check your DTH operator, subscriber ID, pack, validity, contact details and amount. For a new connection, also check the box, installation address and preferred visit details. Only place requests for accounts you own or have permission to use. Keep your sign-in details private and do not use the website for fraud or to disrupt the service.',
    ] },
    { heading: 'Prices and charges', paragraphs: [
      'Prices are shown in Indian rupees. We show the final amount before you pay, including any applicable charges and taxes. For new connections, checkout shows what is due now and any balance payable at installation. Any extra work or charge must be explained and agreed with you before it is carried out.',
      'Our checkout does not add a separate Razorpay fee. Razorpay processing fees and GST on those fees are our business costs; they do not automatically add 18% tax to your recharge amount. A payment receipt records your transaction. It is not a GST tax invoice.',
    ] },
    ...(recharge ? [{ heading: 'Payment and recharge', paragraphs: [
      'A debit, button click or payment redirect does not by itself confirm a completed recharge. The payment provider must confirm payment, and the DTH provider must confirm the recharge. This can take time, so instant activation is not guaranteed. If money is debited but the result is unclear, contact us before paying again.',
      'Pack acceptance, channels, validity and activation depend on the DTH provider’s rules and your account details. A pack appearing on our website does not guarantee the provider will accept it. If a price is wrong or a service is unavailable, we will explain the problem and the available remedies.',
    ] }] : []),
    { heading: 'New connections and installation', paragraphs: [
      'We arrange the booking with the DTH provider after checking payment and booking details. Once recorded, provider customer and booking IDs appear in My Bookings. A technician will contact you within 24–48 hours to arrange installation. Your preferred visit time is a request, not a confirmed appointment. Paying does not mean installation is complete.',
      `${NEW_CONNECTION_RENTAL.en} Equipment, channels, activation and warranty arrangements depend on the selected provider and offer.`,
    ] },
    { heading: 'Support and optional paid assistance', paragraphs: [
      'You do not need to buy complaint-registration assistance to get general account, website or order support. Where offered, the optional fee for helping register a DTH complaint is ₹50, shown before payment. This pays for placing the complaint with the provider. It does not guarantee a repair or a resolution time. You can contact your DTH provider directly for free help. Track support and complaint references in My tickets.',
    ] },
    ...(recharge ? [{ heading: 'Optional account checks', paragraphs: [
      'Account checks need your permission and are optional. Details come from an outside provider and may be delayed, incomplete or unavailable. A successful check does not mean a recharge is complete or a pack is available. You can enter your details manually when a check is unavailable.',
    ] }] : []),

    { heading: 'Problems and your rights', paragraphs: [
      'For order or service issues, use the Contact & Grievance Details page. For unresolved complaints, contact the grievance officer listed there.',
      'Indian law applies. These terms do not limit your rights under applicable consumer laws.',
    ] },
  ];
}
