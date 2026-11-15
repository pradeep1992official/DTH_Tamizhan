import type { Language } from '../types';

export function authModalCopy(mode: 'link' | 'signin' | 'signup' | 'reset', method: 'email' | 'phone', linking: boolean, created: boolean, lang: Language) {
  const copy = (en: string, ta: string) => lang === 'ta' ? ta : en;
  if (created) return { title: copy('Account created', 'கணக்கு உருவாக்கப்பட்டது'), description: copy('Check your email for verification, then continue to your account.', 'சரிபார்ப்பு மின்னஞ்சலைத் திறந்து உங்கள் கணக்கிற்குத் தொடரவும்.') };
  if (linking) return { title: copy('Sign-in methods', 'உள்நுழைவு முறைகள்'), description: copy('Add another way to access this same account.', 'இதே கணக்கில் உள்நுழைய மற்றொரு முறையைச் சேர்க்கவும்.') };
  if (method === 'phone') return { title: copy('Sign in with your phone', 'தொலைபேசி மூலம் உள்நுழையவும்'), description: copy('Verify your mobile number with a one-time code.', 'ஒருமுறைக் குறியீட்டைப் பயன்படுத்தி உங்கள் மொபைல் எண்ணைச் சரிபார்க்கவும்.') };
  if (mode === 'signup') return { title: copy('Create your DTH Tamizhan account', 'உங்கள் கணக்கை உருவாக்கவும்'), description: copy('Save your boxes and keep your recharges and receipts together.', 'உங்கள் பாக்ஸ்களைச் சேமித்து ரீசார்ஜ்களையும் ரசீதுகளையும் ஒரே இடத்தில் வைத்திருங்கள்.') };
  if (mode === 'reset') return { title: copy('Reset your password', 'கடவுச்சொல்லை மீட்டமைக்கவும்'), description: copy('Enter your account email to receive a password reset link.', 'கடவுச்சொல் மீட்டமைப்பு இணைப்பைப் பெற உங்கள் கணக்கின் மின்னஞ்சலை உள்ளிடவும்.') };
  if (mode === 'link') return { title: copy('Get a sign-in link', 'உள்நுழைவு இணைப்பைப் பெறவும்'), description: copy('We will email you a link to sign in without a password.', 'கடவுச்சொல் இல்லாமல் உள்நுழைய மின்னஞ்சலில் இணைப்பை அனுப்புவோம்.') };
  return { title: copy('Sign in to DTH Tamizhan', 'DTH Tamizhan இல் உள்நுழையவும்'), description: copy('Access your boxes, recharges and receipts.', 'உங்கள் பாக்ஸ்கள், ரீசார்ஜ் மற்றும் ரசீதுகளை அணுகவும்.') };
}
