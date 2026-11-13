import { sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, EmailAuthProvider, linkWithCredential, reauthenticateWithCredential, type Auth } from 'firebase/auth';

const hintKey = 'dth_email_link_hint';
interface EmailLinkHint { email: string; flow: 'signin' | 'link'; uid?: string; savedAt: number }
type HintStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export function emailLinkStorage(): HintStorage | null { try { return window.localStorage; } catch { return null; } }
export function readEmailLinkHint(storage: HintStorage | null, now = Date.now()): EmailLinkHint | null {
  try {
    const hint = JSON.parse(storage?.getItem(hintKey) || 'null');
    if (!hint || !validEmail(hint.email) || !['signin', 'link'].includes(hint.flow) || typeof hint.savedAt !== 'number' || now - hint.savedAt > 86400000 || hint.savedAt > now || (hint.flow === 'link' && typeof hint.uid !== 'string')) {
      storage?.removeItem(hintKey); return null;
    }
    return hint;
  } catch { return null; }
}
export function clearEmailLinkHint(storage: HintStorage | null) { try { storage?.removeItem(hintKey); } catch {} }

export async function requestEmailSignInLink(auth: Auth, emailInput: string, origin: string, storage: HintStorage | null, linkingUid?: string | null) {
  const email = emailInput.trim();
  if (!validEmail(email)) throw new Error('Enter a valid email address.');
  const base = new URL(origin);
  if (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(base.hostname))) throw new Error('Use a secure HTTPS website for email sign-in.');
  if (linkingUid && auth.currentUser?.uid !== linkingUid) throw new Error('Your account changed. Please sign in again.');
  if (linkingUid && auth.currentUser?.email && auth.currentUser.email.toLowerCase() !== email.toLowerCase()) throw new Error('Use the email address on your current account.');
  const flow = linkingUid ? 'link' : 'signin';
  const callback = new URL('/auth/email-link', base.origin);
  if (linkingUid) callback.searchParams.set('flow', 'link');
  await sendSignInLinkToEmail(auth, email, { url: callback.href, handleCodeInApp: true });
  // Email is only a completion hint, never authentication. Do not store the link/token or put email in the URL.
  try { storage?.setItem(hintKey, JSON.stringify({ email, flow, ...(linkingUid ? { uid: linkingUid } : {}), savedAt: Date.now() })); } catch { /* Cross-device confirmation will ask for the address. */ }
}

export async function finishEmailSignInLink(auth: Auth, emailInput: string, link: string, storage: HintStorage | null, flow: 'signin' | 'link', expectedUid?: string) {
  const email = emailInput.trim();
  if (!validEmail(email)) throw new Error('Enter the email address that received this sign-in link.');
  if (!isSignInWithEmailLink(auth, link)) throw new Error('This sign-in link is invalid. Request a new one.');
  let result;
  if (flow === 'link') {
    const current = auth.currentUser;
    if (!current || (expectedUid && current.uid !== expectedUid)) throw new Error('Sign in to the original account before linking this email.');
    if (current.email && current.email.toLowerCase() !== email.toLowerCase()) throw new Error('This link is for a different email address.');
    const credential = EmailAuthProvider.credentialWithLink(email, link);
    result = current.providerData.some(provider => provider.providerId === 'password')
      ? await reauthenticateWithCredential(current, credential) : await linkWithCredential(current, credential);
  } else {
    result = await signInWithEmailLink(auth, email, link);
  }
  await result.user.getIdToken(true).catch(() => {});
  clearEmailLinkHint(storage);
  return result;
}
