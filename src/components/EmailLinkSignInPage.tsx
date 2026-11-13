import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { isSignInWithEmailLink } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { emailLinkStorage, readEmailLinkHint, finishEmailSignInLink } from '../lib/emailLinkAuth';
import { loginError } from '../lib/signInMethods';
import type { Language, UserProfile } from '../types';
import { ShieldCheck } from '../lib/icons';
import './AuthModal.css';
import { signOutAccount } from '../lib/accountSession';

export function EmailLinkSignInPage({ currentLang, user, onOpenAuth }: { currentLang: Language; user: UserProfile | null; onOpenAuth: () => void }) {
  const navigate = useNavigate();
  const [link] = useState(() => window.location.href);
  const [hint] = useState(() => readEmailLinkHint(emailLinkStorage()));
  const [email, setEmail] = useState(hint?.email || '');
  const [ready, setReady] = useState(false);
  const [valid, setValid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  const flow = new URL(link).searchParams.get('flow') === 'link' ? 'link' : 'signin';
  const expectedUid = flow === 'link' && hint?.flow === 'link' ? hint.uid : undefined;
  const wrongAccount = flow === 'link' && (!user || (expectedUid && user.uid !== expectedUid));
  const text = (en: string, ta: string) => currentLang === 'ta' ? ta : en;
  async function switchAccount() {
    if (locked.current) return;
    locked.current = true; setBusy(true);
    try { if (user) await signOutAccount(auth); onOpenAuth(); }
    catch (e) { setError(loginError(e, currentLang === 'ta')); }
    finally { locked.current = false; setBusy(false); }
  }
  useEffect(() => {
    let active = true;
    (async () => {
      try { await auth?.authStateReady?.(); if (active) setValid(Boolean(auth && isSignInWithEmailLink(auth, link))); }
      catch (e) { if (active) setError(loginError(e, currentLang === 'ta')); }
      finally { if (active) setReady(true); }
    })();
    return () => { active = false; };
  }, [link]);
  async function complete(event: React.FormEvent) {
    event.preventDefault(); if (locked.current || !auth) return;
    locked.current = true; setBusy(true); setError('');
    try {
      await auth.authStateReady();
      if (flow === 'link' && !user) throw new Error(text('Sign in to your original account before linking this email.', 'மின்னஞ்சலை இணைக்கும் முன் உங்கள் பழைய கணக்கில் உள்நுழையவும்.'));
      const result = await finishEmailSignInLink(auth, email, link, emailLinkStorage(), flow, expectedUid || (flow === 'link' ? user?.uid : undefined));
      if (flow === 'link' && db && auth.currentUser?.uid === result.user.uid) {
        try { await setDoc(doc(db, 'users', result.user.uid), { lastLoginAt: new Date().toISOString() }, { merge: true }); } catch { /* Auth linking already succeeded. */ }
      }
      // Drop the one-time action code from the address bar after completion.
      navigate('/account', { replace: true });
    } catch (e) { setError(loginError(e, currentLang === 'ta')); }
    finally { locked.current = false; setBusy(false); }
  }
  return <section className="email-link-page signin-dialog border border-rule rounded-xl bg-paper text-ink">
    <header className="signin-header"><ShieldCheck size={26} /><div><h1 className="text-xl font-bold">{flow === 'link' ? text('Link your email', 'உங்கள் மின்னஞ்சலை இணைக்கவும்') : text('Finish signing in', 'உள்நுழைவை முடிக்கவும்')}</h1><p>{text('Confirm the email address that received this link. No password needed.', 'இந்த இணைப்பைப் பெற்ற மின்னஞ்சலை உறுதிப்படுத்தவும். கடவுச்சொல் தேவையில்லை.')}</p></div></header>
    <div className="signin-body">
      {!ready && <p role="status">{text('Checking your sign-in link…', 'உள்நுழைவு இணைப்பு சரிபார்க்கப்படுகிறது…')}</p>}
      {error && <p role="alert" className="signin-alert">{error}</p>}
      {ready && !valid && <><p role="alert">{text('This is not a valid email sign-in link. Request a new link.', 'இது சரியான மின்னஞ்சல் உள்நுழைவு இணைப்பு அல்ல. புதிய இணைப்பைக் கோரவும்.')}</p><button type="button" className="signin-primary" onClick={onOpenAuth}>{text('Request a sign-in link', 'உள்நுழைவு இணைப்பைக் கோரவும்')}</button></>}
      {ready && valid && <>
        {flow === 'link' && wrongAccount ? <><p>{text('Sign in to the original account you want to keep before linking this email.', 'இந்த மின்னஞ்சலை இணைக்கும் முன் நீங்கள் வைத்திருக்க விரும்பும் பழைய கணக்கில் உள்நுழையவும்.')}</p><button type="button" className="signin-primary" disabled={busy} onClick={() => void switchAccount()}>{text('Sign in to the original account', 'பழைய கணக்கில் உள்நுழையவும்')}</button></> : <>
          {flow === 'link' && user && <p className="signin-message">{text('This email will be linked to', 'இந்த மின்னஞ்சல் இணைக்கப்படும் கணக்கு')}: {user.displayName || user.email || user.phoneNumber}</p>}
          {!hint && <p className="text-sm text-muted">{text('Opening on another device? Enter the same email address you used to request the link.', 'வேறு சாதனத்தில் திறந்தீர்களா? இணைப்பைக் கோரிய அதே மின்னஞ்சலை உள்ளிடவும்.')}</p>}
          {flow === 'signin' && user?.email && user.email.toLowerCase() !== email.trim().toLowerCase() && <p className="signin-message">{text('Continuing will switch from your currently signed-in account.', 'தொடர்வது தற்போது உள்நுழைந்துள்ள கணக்கை மாற்றும்.')}</p>}
          <form className="signin-form" onSubmit={event => void complete(event)}><label>{text('Email address', 'மின்னஞ்சல் முகவரி')}<input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required disabled={busy} /></label><button type="submit" className="signin-primary" disabled={busy} aria-busy={busy}>{busy ? text('Signing in…', 'உள்நுழைகிறது…') : flow === 'link' ? text('Confirm & link email', 'உறுதிசெய்து மின்னஞ்சலை இணைக்கவும்') : text('Confirm & sign in', 'உறுதிசெய்து உள்நுழையவும்')}</button></form>
        </>}
        {error && <button type="button" className="signin-text" onClick={onOpenAuth}>{text('Request a new link', 'புதிய இணைப்பைக் கோரவும்')}</button>}
      </>}
      <Link to="/recharge" className="signin-text text-center">{text('Back to home', 'முகப்பிற்குத் திரும்பவும்')}</Link>
    </div>
  </section>;
}
