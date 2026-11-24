import React, { useState } from 'react';
import type { Language } from '../../types';
type Step = { title: string; body: string };
const tasks = ['recharge', 'connection', 'service'] as const;
export function homeRechargeFaqs(lang: Language) {
  return lang === 'ta' ? [
  [
    "எப்படி DTH ரீசார்ஜ் செய்வது?",
    "முகப்பில் ரீசார்ஜ் செய்யவும் என்பதைத் தொடவும். சேமித்த இணைப்பைத் தேர்ந்தெடுக்கவும் அல்லது உங்கள் DTH நிறுவனத்தையும் வாடிக்கையாளர் எண்ணையும் உள்ளிடவும். பேக் அல்லது தொகையைச் சரிபார்த்துப் பணம் செலுத்தவும்."
  ],
  [
    "பணம் பிடிக்கப்பட்டும் ரீசார்ஜ் நிலுவையில் உள்ளது. என்ன செய்வது?",
    "மீண்டும் பணம் செலுத்த வேண்டாம். ரீசார்ஜ் வரலாற்றில் புதிய தகவலைப் பார்க்கவும். மேலும் உதவி தேவைப்பட்டால் ஆர்டர் மற்றும் கட்டண எண்களுடன் சேவைக் கோரிக்கையை அனுப்பவும்."
  ],
  [
    "எனது பேக் கிடைக்காவிட்டால் என்ன செய்வது?",
    "கிடைக்கும் பேக்குகள் உங்கள் DTH நிறுவனத்தைப் பொறுத்தவை. தொகையை உள்ளிடும் வசதி இருந்தால் அந்தத் தொகைக்கு ரீசார்ஜ் செய்யலாம். இது தற்போதைய பேக்கை மாற்றாமல் இருப்பில் பணத்தைச் சேர்க்கலாம். சந்தேகம் இருந்தால் எங்களிடம் கேளுங்கள்."
  ],
  [
    "வாடிக்கையாளர் எண்ணை எங்கே பார்ப்பது?",
    "உங்கள் DTH செயலி, பில் அல்லது பெட்டியின் கணக்கு விவரங்களில் பார்க்கவும். நிறுவனம் கேட்கும் வாடிக்கையாளர் அல்லது ஸ்மார்ட் கார்டு எண்ணை உள்ளிடவும். இது உங்கள் கைப்பேசி எண்ணிலிருந்து வேறாக இருக்கலாம்."
  ],
  [
    "கணக்கு விவரங்களை ஏன் சரிபார்க்க முடியவில்லை?",
    "சில நேரங்களில் கணக்கைச் சரிபார்க்கும் சேவை கிடைக்காமல் இருக்கலாம். அதனால் உங்கள் வாடிக்கையாளர் எண் தவறு என்று பொருளல்ல. DTH நிறுவனத்தையும் எண்ணையும் நீங்களே சரிபார்க்கவும். இரண்டும் சரியாக இருந்தால் கணக்குச் சரிபார்ப்பு இல்லாமல் தொடரலாம்."
  ],
  [
    "பணம் செலுத்திவிட்டேன். TV எப்போது வேலை செய்யும்?",
    "கட்டணம் வெற்றியடைந்தாலும் ரீசார்ஜ் முடிய இன்னும் நேரமாகலாம். ரீசார்ஜ் வரலாற்றில் புதிய நிலையைப் பார்க்கவும். தொடர்ந்து நிலுவையில் இருந்தாலோ TV வேலை செய்யாவிட்டாலோ ஆர்டர் எண்ணுடன் எங்களைத் தொடர்புகொள்ளவும்."
  ],
  [
    "ரீசார்ஜை ரத்து செய்யவோ பணத்தைத் திரும்பப் பெறவோ முடியுமா?",
    "ஆர்டர் மற்றும் கட்டண எண்களுடன் உடனே எங்களை அணுகவும். ரீசார்ஜை நிறுத்தவோ பணத்தைத் திருப்பவோ முடியுமா என்று பார்ப்போம். DTH கணக்கில் ரீசார்ஜ் சேர்ந்த பிறகு அதைத் திரும்பப் பெற முடியாமல் இருக்கலாம். விவரங்களுக்கு பணத்திருப்பல் மற்றும் ரத்துக் கொள்கையைப் பார்க்கவும்."
  ],
  [
    "பதிவுகளைப் பார்க்கவும் உதவி பெறவும் எங்கு செல்ல வேண்டும்?",
    "சுயவிவரப் பட்டியலில் புதிய இணைப்புகளுக்கு எனது பதிவுகளையும், உதவிக் கோரிக்கைகள் மற்றும் பதில்களுக்கு எனது கோரிக்கைகளையும் தேர்ந்தெடுக்கவும். உதவி கேட்க முகப்பில் உதவி வேண்டுமா அல்லது பட்டியலில் சேவைக் கோரிக்கையைத் தேர்ந்தெடுக்கவும். தொலைபேசி அல்லது WhatsApp மூலமும் பேசலாம்."
  ]
] : [
  [
    "How do I recharge my DTH?",
    "Tap Recharge now on Home. Choose your saved connection, or select your DTH company and enter your customer ID. Check the pack or amount, then pay."
  ],
  [
    "Money was deducted, but my recharge is pending. What should I do?",
    "Do not pay again. Check Recharge history for the latest update. If you still need help, send us your order and payment numbers through Service Request."
  ],
  [
    "What if I can’t find my pack?",
    "The available packs depend on your DTH company. If you see an option to enter an amount, you can recharge that amount. This may add balance without changing your current pack. Ask us if you’re unsure."
  ],
  [
    "Where can I find my customer ID?",
    "Check your DTH app, bill or set-top box account details. Enter the number requested for your DTH company, such as a customer ID or smart-card number. It may be different from your mobile number."
  ],
  [
    "Why can’t you check my account details?",
    "Sometimes the account-check service is unavailable. This doesn’t mean your customer ID is wrong. Check the DTH company and number yourself. If both are correct, you can continue without the account check."
  ],
  [
    "I’ve paid. When will my TV start working?",
    "A successful payment means we’ve received your payment; the recharge may still be waiting to finish. Check Recharge history for the latest status. If it stays pending or your TV is still not working, contact us with your order number."
  ],
  [
    "Can I cancel a recharge or get my money back?",
    "Contact us as soon as possible with your order and payment numbers. We’ll check whether the recharge can be stopped or refunded. Once it has reached the DTH account, it may not be possible to reverse it. See our Refund & Cancellation Policy for details."
  ],
  [
    "Where can I see my bookings or get help?",
    "Open your profile menu and choose My Bookings for new connections, or My tickets for help requests and replies. To ask for help, choose Need help on Home or Service Request in the menu. You can also call or WhatsApp us."
  ]
];
}
export function HomeHowItWorks({ lang, connectionSteps, recharge }: { lang: Language; connectionSteps: Step[]; recharge: boolean }) {
  const [task, setTask] = useState<typeof tasks[number]>(recharge ? 'recharge' : 'connection');
  const ta = lang === 'ta';
  const labels = ta ? ['ரீசார்ஜ்', 'புதிய இணைப்பு', 'சேவைக் கோரிக்கை'] : ['Recharge', 'New connection', 'Service request'];
  const steps: Step[] = task === 'recharge' ? ta ? [
    { title: 'இணைப்பைத் தேர்ந்தெடுக்கவும்', body: 'நிறுவனம் மற்றும் வாடிக்கையாளர் எண்ணை உள்ளிடவும் அல்லது சேமித்த பெட்டியைத் தேர்ந்தெடுக்கவும்.' },
    { title: 'பேக் அல்லது தொகையைத் தேர்ந்தெடுக்கவும்', body: 'பேக், காலம் மற்றும் தொகையைச் சரிபார்த்து செலுத்தவும்.' },
    { title: 'ரீசார்ஜ் நிலையைப் பார்க்கவும்', body: 'ரீசார்ஜ் வரலாற்றில் கட்டணம் மற்றும் நிறுவன உறுதிப்படுத்தலைத் தனித்தனியாகப் பார்க்கவும்.' },
  ] : [
    { title: 'Choose your connection', body: 'Select your operator and enter your subscriber ID, or use a saved box.' },
    { title: 'Choose a pack or top-up', body: 'Review the pack, validity and amount before paying.' },
    { title: 'Track the recharge', body: 'Check Recharge history for payment and operator completion separately.' },
  ] : task === 'service' ? ta ? [
    { title: 'பிரச்சனையைத் தெரிவிக்கவும்', body: 'நிறுவனம் மற்றும் பிரச்சனையைத் தேர்ந்தெடுத்து தேவையான விவரங்களை வழங்கவும்.' },
    { title: 'சரிபார்த்து அனுப்பவும்', body: 'பொது உதவி இலவசம். விருப்பக் கட்டண உதவி இருந்தால் செலுத்தும் முன் விளக்கப்படும்.' },
    { title: 'பதில்களைப் பார்க்கவும்', body: 'எனது கோரிக்கைகளில் பதில்களையும் சேவை நிலையையும் பார்க்கவும்.' },
  ] : [
    { title: 'Tell us the problem', body: 'Choose the problem and provide the details needed to help.' },
    { title: 'Review and submit', body: 'General support is free. Optional paid complaint assistance is explained before checkout.' },
    { title: 'Follow the updates', body: 'Read replies and track your request in My tickets.' },
  ] : connectionSteps;
  return <div className="home-how-it-works"><h2 id="home-details-title">{ta ? 'எப்படிச் செயல்படும்' : 'How it works'}</h2>
    <div className="home-how-tabs" role="tablist" aria-label={ta ? 'சேவைகள்' : 'Services'}>{tasks.map((value, index) => <button type="button" key={value} role="tab" id={`how-tab-${value}`} aria-selected={task === value} aria-controls="home-how-panel" tabIndex={task === value ? 0 : -1} onClick={() => setTask(value)} onKeyDown={event => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
      setTask(tasks[next]); event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`#how-tab-${tasks[next]}`)?.focus();
    }}>{labels[index]}</button>)}</div>
    <div id="home-how-panel" role="tabpanel" aria-labelledby={`how-tab-${task}`} tabIndex={0}><ol className="launch-steps">{steps.map((step, index) => <li key={index}><span className="launch-step-number" aria-hidden="true">{index + 1}</span><h3 className="launch-step-title">{step.title}</h3><p>{step.body}</p></li>)}</ol></div>
  </div>;
}
