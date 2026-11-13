import {
  createUserWithEmailAndPassword, EmailAuthProvider, linkWithCredential, sendEmailVerification,
  sendPasswordResetEmail, signInWithEmailAndPassword, updateProfile, updatePassword, type Auth,
  signInWithPhoneNumber, linkWithPhoneNumber, type ApplicationVerifier, type ConfirmationResult,
} from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { saveAccountProfile } from './accountProfile';

export function normalizeLoginPhone(value: string) {
  const phone = value.replace(/[\s()-]/g, '');
  if (/^[6-9]\d{9}$/.test(phone)) return `+91${phone}`;
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error('Enter a valid mobile number with country code.');
  return phone;
}

export async function emailSignIn(auth: Auth, email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}
export async function emailSignUp(auth: Auth, db: Firestore | null, name: string, email: string, password: string) {
  if (name.trim().length < 2) throw new Error('Enter your full name.');
  const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
  // Creation establishes a session even if a follow-up profile/email operation fails.
  let verificationSent = false;
  let profileSaved = true;
  try { await updateProfile(result.user, { displayName: name.trim() }); } catch { profileSaved = false; }
  try { if (db) await saveAccountProfile(db, auth, result.user.uid, { displayName: name.trim(), phoneNumber: result.user.phoneNumber || undefined }, 'Please sign in again.'); }
  catch { profileSaved = false; }
  try { await sendEmailVerification(result.user); verificationSent = true; } catch { /* Allow a signed-in resend. */ }
  return { user: result.user, verificationSent, profileSaved };
}
export async function linkEmailPassword(auth: Auth, email: string, password: string, expectedUid: string) {
  const account = auth.currentUser;
  if (!account || account.uid !== expectedUid) throw new Error('Your account changed. Please sign in again.');
  if (account.email && account.email.toLowerCase() !== email.trim().toLowerCase()) throw new Error('Use the email address on your current account.');
  if (account.providerData.some(provider => provider.providerId === 'password')) await updatePassword(account, password);
  else await linkWithCredential(account, EmailAuthProvider.credential(email.trim(), password));
  let verificationSent = account.emailVerified;
  if (!account.emailVerified) { try { await sendEmailVerification(account); verificationSent = true; } catch { /* Resend remains available. */ } }
  return { verificationSent };
}
export async function resetLoginPassword(auth: Auth, email: string) {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function sendPhoneCode(auth: Auth, phone: string, verifier: ApplicationVerifier, expectedUid?: string | null) {
  const number = normalizeLoginPhone(phone);
  if (expectedUid) {
    if (auth.currentUser?.uid !== expectedUid) throw new Error('Your account changed. Please sign in again.');
    return linkWithPhoneNumber(auth.currentUser, number, verifier);
  }
  return signInWithPhoneNumber(auth, number, verifier);
}
export async function confirmPhoneCode(auth: Auth, confirmation: ConfirmationResult, code: string, expectedUid?: string | null) {
  if (!/^\d{6}$/.test(code)) throw new Error('Enter the 6-digit verification code.');
  if (expectedUid && auth.currentUser?.uid !== expectedUid) throw new Error('Your account changed. Please sign in again.');
  return confirmation.confirm(code);
}

export function loginError(error: unknown, ta = false) {
  const code = (error as { code?: string })?.code;
  const messages: Record<string, [string, string]> = {
    'auth/invalid-credential': ['Email or password is incorrect. If you registered with Google, use Google sign-in.', 'மின்னஞ்சல் அல்லது கடவுச்சொல் தவறு. Google மூலம் பதிவு செய்திருந்தால் அதைப் பயன்படுத்தவும்.'],
    'auth/wrong-password': ['Email or password is incorrect.', 'மின்னஞ்சல் அல்லது கடவுச்சொல் தவறு.'],
    'auth/user-not-found': ['Email or password is incorrect.', 'மின்னஞ்சல் அல்லது கடவுச்சொல் தவறு.'],
    'auth/email-already-in-use': ['An account already uses this email. Sign in with your existing method, then add a password from Your account.', 'இந்த மின்னஞ்சலுக்கு கணக்கு உள்ளது. பழைய முறையில் உள்நுழைந்து உங்கள் கணக்கில் கடவுச்சொல்லைச் சேர்க்கவும்.'],
    'auth/invalid-email': ['Enter a valid email address.', 'சரியான மின்னஞ்சல் முகவரியை உள்ளிடவும்.'],
    'auth/expired-action-code': ['This link has expired. Request a new sign-in link.', 'இணைப்பு காலாவதியானது. புதிய உள்நுழைவு இணைப்பைக் கோரவும்.'],
    'auth/invalid-action-code': ['This link is invalid or has already been used. Request a new sign-in link.', 'இணைப்பு தவறானது அல்லது ஏற்கெனவே பயன்படுத்தப்பட்டது. புதிய இணைப்பைக் கோரவும்.'],
    'auth/weak-password': ['Your password does not meet the account password requirements.', 'கடவுச்சொல் தேவைகளைப் பூர்த்தி செய்யவும்.'],
    'auth/operation-not-allowed': ['This sign-in method is not enabled yet. Please use another method.', 'இந்த உள்நுழைவு முறை இன்னும் செயல்படுத்தப்படவில்லை. வேறு முறையைப் பயன்படுத்தவும்.'],
    'auth/too-many-requests': ['Too many attempts. Please wait and try again.', 'பல முயற்சிகள் செய்யப்பட்டன. சிறிது நேரம் கழித்து முயற்சிக்கவும்.'],
    'auth/invalid-verification-code': ['The code is incorrect. Please check it and retry.', 'குறியீடு தவறு. சரிபார்த்து மீண்டும் முயற்சிக்கவும்.'],
    'auth/code-expired': ['Your code has expired. Request a new code.', 'குறியீடு காலாவதியானது. புதிய குறியீட்டைக் கோரவும்.'],
    'auth/captcha-check-failed': ['Complete the security check and try again.', 'பாதுகாப்புச் சோதனையை முடித்து மீண்டும் முயற்சிக்கவும்.'],
    'auth/invalid-phone-number': ['Enter a valid phone number with country code.', 'நாட்டுக் குறியீட்டுடன் சரியான தொலைபேசி எண்ணை உள்ளிடவும்.'],
    'auth/quota-exceeded': ['SMS sign-in is temporarily unavailable. Please use email or Google.', 'SMS உள்நுழைவு தற்போது கிடைக்கவில்லை. மின்னஞ்சல் அல்லது Google ஐப் பயன்படுத்தவும்.'],
    'auth/billing-not-enabled': ['Phone sign-in is not available yet. Please use email or Google.', 'தொலைபேசி உள்நுழைவு இன்னும் கிடைக்கவில்லை. மின்னஞ்சல் அல்லது Google ஐப் பயன்படுத்தவும்.'],
    'auth/credential-already-in-use': ['This sign-in method belongs to another account. Sign in to that account; accounts were not merged.', 'இந்த உள்நுழைவு முறை வேறு கணக்குடன் இணைக்கப்பட்டுள்ளது. அந்தக் கணக்கில் உள்நுழையவும்.'],
    'auth/provider-already-linked': ['This sign-in method is already linked to your account.', 'இந்த உள்நுழைவு முறை ஏற்கெனவே உங்கள் கணக்குடன் இணைக்கப்பட்டுள்ளது.'],
    'auth/requires-recent-login': ['Sign out and sign in again before adding or changing a sign-in method.', 'உள்நுழைவு முறையை மாற்றும் முன் வெளியேறி மீண்டும் உள்நுழையவும்.'],
    'auth/network-request-failed': ['Check your internet connection and try again.', 'இணைய இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.'],
    'auth/unauthorized-domain': ['Sign-in is not configured for this website address yet.', 'இந்த இணையதள முகவரிக்கு உள்நுழைவு இன்னும் அமைக்கப்படவில்லை.'],
    'auth/popup-closed-by-user': ['Sign-in was cancelled. Please try again.', 'உள்நுழைவு ரத்து செய்யப்பட்டது. மீண்டும் முயற்சிக்கவும்.'],
  };
  return messages[code || '']?.[ta ? 1 : 0] || (error instanceof Error && !code ? error.message : ta ? 'உள்நுழைய முடியவில்லை. மீண்டும் முயற்சிக்கவும்.' : 'Could not sign in. Please try again.');
}
