import type { PolicySection } from './trustContent';

type PrivacyContact = { legalName: string; address: string; email: string; grievanceOfficer: string; grievanceEmail: string };

export function privacyPolicy(lang: 'en' | 'ta', business: PrivacyContact): PolicySection[] {
  if (lang === 'ta') return [
    { heading: 'நாங்கள் சேகரிக்கும் தகவல்கள்', paragraphs: [
      'கணக்கை உருவாக்கும்போது அல்லது சேவையைப் பயன்படுத்தும்போது, உங்கள் பெயர், மின்னஞ்சல், தொலைபேசி எண், கணக்கு அடையாள எண் மற்றும் சுயவிவரப் படம் கிடைக்கலாம். நீங்கள் வழங்கும் தகவல்களையும் பயன்படுத்துகிறோம்.',
      'ரீசார்ஜ் மற்றும் புதிய இணைப்புகளுக்கு DTH நிறுவனம், வாடிக்கையாளர் எண், தேர்ந்தெடுத்த பெட்டி மற்றும் பேக், தொகை, கட்டண எண் மற்றும் நிலை தேவைப்படும். நிறுவலுக்கு முகவரியும் விருப்ப நேரமும் கேட்கிறோம். உதவிக்காக நீங்கள் அனுப்பும் சிக்கல் விவரங்களையும் செய்திகளையும் வைத்திருக்கிறோம்.',
    ] },
    { heading: 'இந்தத் தகவல்கள் ஏன் தேவை?', paragraphs: [
      'உங்களை உள்நுழையச் செய்யவும், சேமித்த DTH இணைப்புகளைக் காட்டவும், ரீசார்ஜ் மற்றும் முன்பதிவுகளைச் செய்யவும் இந்தத் தகவல்களைப் பயன்படுத்துகிறோம். நிறுவலை ஏற்பாடு செய்யவும், கட்டணத்தைச் சரிபார்க்கவும், உதவி வழங்கவும், தவறான பயன்பாட்டைத் தடுக்கவும், தேவையான பதிவுகளை வைத்திருக்கவும் இவை உதவுகின்றன.',
    ] },
    { heading: 'யார் இந்தத் தகவல்களைப் பெறுகிறார்கள்?', paragraphs: [
      'எங்கள் அனுமதி பெற்ற நிர்வாகிகள் மற்றும் உதவிக் குழுவினர் ஆர்டர்களையும் கோரிக்கைகளையும் கையாளத் தேவையான விவரங்களைப் பார்க்கலாம். இணைப்பு அல்லது புகாரை ஏற்பாடு செய்யத் தேவையான விவரங்கள் சம்பந்தப்பட்ட DTH நிறுவனத்துடனும் நிறுவல் குழுவுடனும் பகிரப்படும்.',
      'Google/Firebase இணையதளம், உள்நுழைவு மற்றும் தகவல் சேமிப்பை வழங்குகிறது. Razorpay கட்டணங்களைக் கையாளுகிறது. Brevo ரசீதுகள் மற்றும் ஆர்டர் அறிவிப்புகளை மின்னஞ்சலில் அனுப்புகிறது. ஆர்டர் விவரங்கள் orders@dthtamizhan.in என்ற எங்கள் குழுவின் மின்னஞ்சலுக்கும் அனுப்பப்படும்; அந்தப் பெட்டி Zoho Mail-ல் உள்ளது.',
      'இணையதள எழுத்துருக்களை Google வழங்குகிறது. இணையதளம் மற்றும் சேவை வழங்குநர்களுக்கு உங்கள் இணைய முகவரி (IP), உலாவி அல்லது சாதன விவரங்கள் மற்றும் பிழைப் பதிவுகள் கிடைக்கலாம். வழங்குநர்களின் அமைப்பைப் பொறுத்து இந்தியாவிலும் பிற நாடுகளிலும் தகவல்கள் கையாளப்படலாம்.',
    ] },
    { heading: 'கட்டண ரகசிய விவரங்கள்', paragraphs: [
      'எங்கள் கட்டணப் பக்கம் உங்கள் அட்டை எண், CVV அல்லது UPI PIN-ஐ சேகரிப்பதில்லை. அவற்றை Razorpay-ன் கட்டணப் பக்கத்தில் மட்டுமே உள்ளிடவும். எங்களிடம் தொகை, பரிவர்த்தனை எண் மற்றும் கட்டண நிலை போன்ற பதிவுகள் இருக்கும். கடவுச்சொல், OTP அல்லது கட்டண ரகசியங்களை உதவிச் செய்திகளில் அனுப்ப வேண்டாம்.',
    ] },
    { heading: 'விருப்ப வசதிகள்', paragraphs: [
      'கணக்கைச் சரிபார்க்கும் வசதியை நீங்கள் அனுமதித்தால், DTH நிறுவனம் மற்றும் வாடிக்கையாளர் எண் Way2API அல்லது அமைக்கப்பட்ட மாற்று வழங்குநருக்கு அனுப்பப்படும். பெயர், இருப்புத் தொகை, பேக் மற்றும் ரீசார்ஜ் தேதிகள் திரும்பக் கிடைக்கலாம். முடிவுகள் சிறிது நேரம் வைத்திருக்கப்படும்; உங்கள் கணக்கில் தானாகச் சேமிக்கப்படாது. வழங்குநரின் பதிவுகளுக்கு அதன் விதிகள் பொருந்தும்.',
      'இயக்கப்பட்ட AI உதவி வசதியைப் பயன்படுத்தினால், நீங்கள் அனுப்பும் உரை, விருப்பங்கள் மற்றும் தொடர்புடைய பேக் விவரங்கள் Google Gemini-க்கு அனுப்பப்படலாம். கட்டண ரகசியங்களையோ தேவையற்ற தனிப்பட்ட விவரங்களையோ சேர்க்க வேண்டாம். இந்த வசதிகளைப் பயன்படுத்துவது உங்கள் விருப்பம்; அது விளம்பரச் செய்திகளுக்கான ஒப்புதல் அல்ல. புதிய விளம்பர அல்லது தகவல் பகிர்வு பயன்பாடுகளைத் தொடங்கும்முன் தெரிவிப்போம்.',
    ] },
    { heading: 'உங்கள் சாதனத்தில் சேமிக்கப்படுபவை', paragraphs: [
      'உள்நுழைவு நிலை, மொழித் தேர்வு, தேர்ந்தெடுத்த DTH நிறுவனம், சேமித்த இணைப்புகள் மற்றும் முடிக்காத முன்பதிவு விவரங்களை உங்கள் உலாவி நினைவில் வைத்திருக்கலாம். உலாவிச் சேமிப்பை அழிப்பது எங்களிடம் உள்ள பதிவுகளை நீக்காது; எல்லாச் சேவைகளிலிருந்தும் உங்களை வெளியேற்றாது.',
    ] },
    { heading: 'எவ்வளவு காலம் வைத்திருக்கிறோம்?', paragraphs: [
      'கணக்கு மற்றும் சேமித்த DTH விவரங்களைச் சேவை வழங்கத் தேவையான காலம் வரை வைத்திருக்கிறோம். முடிக்கப்பட்ட உதவி உரையாடல்களை முடிவடைந்த நாளிலிருந்து 2 ஆண்டுகள் வைத்திருக்கிறோம். GST கணக்குகளுக்குத் தேவையான கட்டணம், ரீசார்ஜ் மற்றும் பணத்திருப்பல் பதிவுகளை சம்பந்தப்பட்ட ஆண்டு அறிக்கையின் கடைசி நாளிலிருந்து 72 மாதங்கள் வைத்திருக்கிறோம்.',
      'வழக்கு அல்லது விசாரணை தொடர்பான பதிவுகளை இறுதி முடிவுக்குப் பிறகு ஓராண்டு அல்லது சட்டப்படி தேவையான காலம், இவற்றில் பிந்தையது வரை வைத்திருக்கலாம். பிற சட்டத் தேவைகளாலும் காலம் நீளலாம். தேவையற்ற பதிவுகளை ஆய்வு செய்து நீக்குகிறோம் அல்லது அடையாள விவரங்களை அகற்றுகிறோம்; தானியங்கி நீக்கம் இல்லை.',
    ] },
    { heading: 'உங்கள் விருப்பங்கள் மற்றும் தொடர்பு', paragraphs: [
      `உங்கள் தகவல்களைப் பார்க்க, திருத்த, நீக்க அல்லது அனுமதியைத் திரும்பப் பெற ${business.email} முகவரிக்கு எழுதலாம். இந்தியச் சட்டத்தின்படி பொருந்தும் கோரிக்கைகளைக் கையாளுகிறோம். கணக்கு உங்களுடையது என்பதைச் சரிபார்க்கலாம். வைத்திருக்க வேண்டிய பதிவுகளையும் அவற்றை நீக்க முடியாத காரணத்தையும் விளக்குவோம்.`,
      `DTH Tamizhan-ஐ நடத்துவது ${business.legalName}. முகவரி: ${business.address}. தீர்க்கப்படாத தனியுரிமைப் புகார்களுக்கு ${business.grievanceOfficer} அவர்களை ${business.grievanceEmail} மூலம் தொடர்புகொள்ளவும். சேவைகள் அல்லது வழங்குநர்கள் மாறும்போது இந்தக் கொள்கையையும் தேதியையும் புதுப்பிப்போம்.`,
    ] },
  ];
  return [
    { heading: 'What we collect', paragraphs: [
      'When you sign in or use our services, we may receive your name, email, phone number, account ID and profile picture. We also use the details you choose to give us.',
      'For recharges and new connections, this includes your DTH operator, subscriber ID, chosen box and pack, amount, payment references and order status. For installation, we ask for your address and preferred visit details. For support, we keep the problem description and messages you send.',
    ] },
    { heading: 'Why we need it', paragraphs: [
      'We use these details to sign you in, remember your DTH connections, process recharges and bookings, arrange installation, check payments and help with problems. We also use them to prevent misuse and keep required business records.',
    ] },
    { heading: 'Who receives it', paragraphs: [
      'Our authorised admins and support team can access the details needed to handle orders and requests. We share relevant details with your DTH provider and installation team to arrange the service or raise a complaint.',
      'Google/Firebase runs our website, sign-in and data storage. Razorpay handles payments. Brevo sends receipts and order emails. Order details are also emailed to our team at orders@dthtamizhan.in, whose inbox is hosted by Zoho Mail.',
      'Google also provides website fonts. Our website and service providers may receive your internet address (IP), browser or device details and error logs. Depending on the provider, information may be handled in India or other countries.',
    ] },
    { heading: 'Your payment details', paragraphs: [
      'Our checkout does not collect your card number, CVV or UPI PIN. Enter these only in Razorpay’s payment checkout. We keep records such as the amount, payment reference and status. Never send passwords, OTPs or payment secrets in support messages.',
    ] },
    { heading: 'Optional features', paragraphs: [
      'If you allow an account check, we send your DTH operator and subscriber ID to Way2API or a configured alternative provider. The result may include your name, balance, pack and recharge dates. Results are kept briefly to avoid repeating checks and are not automatically saved to your account. The provider handles its own request records under its terms.',
      'If you use an enabled AI help feature, your messages, preferences and relevant pack details may be sent to Google Gemini. Do not include payment secrets or unrelated personal details. These features are optional and do not sign you up for marketing. We will explain any new analytics, advertising or information-sharing use before enabling it.',
    ] },
    { heading: 'What stays on your device', paragraphs: [
      'Your browser may remember your sign-in, language, selected operator, saved connections and unfinished booking details. Clearing browser storage removes those local copies. It does not delete our records or sign you out of every service.',
    ] },
    { heading: 'How long we keep it', paragraphs: [
      'We keep account and saved-connection details while needed to provide the service. We keep closed support conversations for 2 years after closure. Payment, recharge and refund records needed for GST accounts are kept for 72 months from the due date of the relevant annual return.',
      'Records involved in a legal case or investigation may be kept until one year after the final decision, or the required legal period, whichever is later. Other legal requirements may also extend this time. We review records before removing them or removing identifying details; deletion is not automatic.',
    ] },
    { heading: 'Your choices and privacy contact', paragraphs: [
      `Email ${business.email} to ask to see, correct or delete your information, withdraw consent or raise a privacy concern, where applicable under Indian law. We may need to check that the account is yours. If we must keep some records, we will explain which ones and why.`,
      `DTH Tamizhan is operated by ${business.legalName}, at ${business.address}. For unresolved privacy complaints, contact ${business.grievanceOfficer} at ${business.grievanceEmail}. We update this policy and its date when our services or providers change.`,
    ] },
  ];
}
