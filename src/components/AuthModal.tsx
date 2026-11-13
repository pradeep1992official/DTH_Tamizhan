import React, { useEffect, useRef, useState } from 'react';
import { X, ShieldCheck } from '../lib/icons';
import type { Language, UserProfile } from '../types';
import { auth, db, isFirebaseConfigured } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, RecaptchaVerifier, sendEmailVerification, reload, type ConfirmationResult } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { emailSignIn, emailSignUp, linkEmailPassword, loginError, normalizeLoginPhone, resetLoginPassword, sendPhoneCode, confirmPhoneCode } from '../lib/signInMethods';
import { useAccessibleModal } from '../lib/useAccessibleModal';
import './AuthModal.css';
import { requestEmailSignInLink, emailLinkStorage } from '../lib/emailLinkAuth';

interface AuthModalProps { isOpen: boolean; onClose: () => void; currentLang: Language; onSuccess: () => void; currentUser?: UserProfile | null }
export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, currentLang, onSuccess, currentUser }) => {
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [mode, setMode] = useState<'link' | 'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState(''); const [code, setCode] = useState(''); const [codeSent, setCodeSent] = useState(false);
  const [phoneEnabled, setPhoneEnabled] = useState<boolean | null>(null);
  const [cooldown, setCooldown] = useState(0); const [busy, setBusy] = useState(false);
  const [emailCooldown, setEmailCooldown] = useState(0);
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [linkingUid, setLinkingUid] = useState<string | null>(null);
  const [createdAccount, setCreatedAccount] = useState(false);
  const verifier = useRef<RecaptchaVerifier | null>(null); const confirmation = useRef<ConfirmationResult | null>(null);
  const locked = useRef(false); const generation = useRef(0);
  const text = (en: string, ta: string) => currentLang === 'ta' ? ta : en;
  const { modalRef } = useAccessibleModal({ isOpen, onClose: () => { if (!locked.current) onClose(); } });
  function clearCaptcha() { verifier.current?.clear(); verifier.current = null; }
  useEffect(() => {
    generation.current++; locked.current = false; setBusy(false); setError(''); setMessage(''); setMethod('email'); setMode('signin'); setEmailCooldown(0);
    setEmail(currentUser?.email || ''); setPassword(''); setConfirmPassword(''); setName(currentUser?.displayName || '');
    setPhone(currentUser?.phoneNumber || ''); setCode(''); setCodeSent(false); setCooldown(0); confirmation.current = null;
    setLinkingUid(currentUser && auth?.currentUser?.uid === currentUser.uid ? currentUser.uid : null);
    setCreatedAccount(false);
    if (!isOpen) return;
    const controller = new AbortController(); setPhoneEnabled(null);
    fetch('/api/auth/config', { signal: controller.signal, cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error('Unavailable'); const config = await response.json();
      if (!controller.signal.aborted) setPhoneEnabled(config.phoneEnabled === true);
    }).catch(() => { if (!controller.signal.aborted) setPhoneEnabled(false); });
    return () => { generation.current++; controller.abort(); clearCaptcha(); confirmation.current = null; };
  }, [isOpen]);
  useEffect(() => () => clearCaptcha(), [method]);
  useEffect(() => {
    if (!isOpen || cooldown <= 0) return;
    const timeout = setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000); return () => clearTimeout(timeout);
  }, [isOpen, cooldown]);
  useEffect(() => {
    if (!isOpen || emailCooldown <= 0) return;
    const timeout = setTimeout(() => setEmailCooldown(value => Math.max(0, value - 1)), 1000); return () => clearTimeout(timeout);
  }, [isOpen, emailCooldown]);
  async function run(action: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(''); setMessage(''); const version = generation.current;
    try {
      if (!isFirebaseConfigured || !auth) throw new Error(text('Sign-in is unavailable. Please try later.', 'உள்நுழைவு தற்போது கிடைக்கவில்லை.'));
      await action();
    } catch (e) { if (version === generation.current) setError(loginError(e, currentLang === 'ta')); }
    finally { if (version === generation.current) { locked.current = false; setBusy(false); } }
  }
  const done = () => { setPassword(''); setConfirmPassword(''); setCode(''); onSuccess(); onClose(); };
  async function submitEmail(event: React.FormEvent) {
    event.preventDefault();
    await run(async () => {
      if (mode === 'link') {
        if (emailCooldown > 0) return;
        auth!.languageCode = currentLang === 'ta' ? 'ta' : 'en';
        await requestEmailSignInLink(auth!, email, window.location.origin, emailLinkStorage(), linkingUid);
        setEmailCooldown(60);
        setMessage(text('Check your email and open the sign-in link. No password needed. You can close this window.', 'உங்கள் மின்னஞ்சலில் உள்ள உள்நுழைவு இணைப்பைத் திறக்கவும். கடவுச்சொல் தேவையில்லை. இந்தச் சாளரத்தை மூடலாம்.'));
      } else if (linkingUid) {
        if (password !== confirmPassword) throw new Error(text('Passwords do not match.', 'கடவுச்சொற்கள் பொருந்தவில்லை.'));
        const result = await linkEmailPassword(auth!, email, password, linkingUid);
        if (db && auth!.currentUser?.uid === linkingUid) {
          try { await setDoc(doc(db, 'users', linkingUid), { lastLoginAt: new Date().toISOString() }, { merge: true }); } catch { /* Method linking already succeeded. */ }
        }
        setPassword(''); setConfirmPassword('');
        setMessage(result.verificationSent ? text('Email/password sign-in is ready. Verify your email if a verification message was sent.', 'மின்னஞ்சல் உள்நுழைவு தயாராக உள்ளது. சரிபார்ப்பு மின்னஞ்சல் வந்தால் அதைப் பயன்படுத்தவும்.') : text('Password saved. Use Resend verification email to verify your address.', 'கடவுச்சொல் சேமிக்கப்பட்டது. மின்னஞ்சலைச் சரிபார்க்கவும்.'));
      } else if (mode === 'reset') {
        await resetLoginPassword(auth!, email);
        setMessage(text('If an account can use password reset, an email will arrive shortly. Check your inbox and spam folder.', 'கணக்கு இருந்தால் கடவுச்சொல் மீட்டமைப்பு மின்னஞ்சல் வரும். உங்கள் மின்னஞ்சலைச் சரிபார்க்கவும்.'));
      } else if (mode === 'signup') {
        if (password !== confirmPassword) throw new Error(text('Passwords do not match.', 'கடவுச்சொற்கள் பொருந்தவில்லை.'));
        const result = await emailSignUp(auth!, db, name, email, password);
        setMode('signin'); setPassword(''); setConfirmPassword(''); setLinkingUid(result.user.uid); setCreatedAccount(true);
        setMessage(result.verificationSent ? text('Account created. Check your email to verify your address. You can close this window and continue.', 'கணக்கு உருவாக்கப்பட்டது. மின்னஞ்சலைச் சரிபார்த்து இந்தச் சாளரத்தை மூடலாம்.') : text('Account created. Use Resend verification email below to verify your email.', 'கணக்கு உருவாக்கப்பட்டது. கீழே உள்ள பொத்தான் மூலம் சரிபார்ப்பு மின்னஞ்சலை அனுப்பவும்.'));
      } else { await emailSignIn(auth!, email, password); done(); }
    });
  }
  async function sendCode() {
    if (!phoneEnabled || cooldown > 0) return;
    await run(async () => {
      const version = generation.current;
      const number = normalizeLoginPhone(phone);
      if (linkingUid && auth!.currentUser?.uid !== linkingUid) throw new Error('Your account changed. Please sign in again.');
      clearCaptcha(); auth!.languageCode = currentLang === 'ta' ? 'ta' : 'en';
      try {
        // Let Firebase run one on-demand check for this SMS request.
        verifier.current = new RecaptchaVerifier(auth!, 'phone-recaptcha', { size: 'invisible' });
        const result = await sendPhoneCode(auth!, number, verifier.current!, linkingUid);
        if (version !== generation.current) return;
        clearCaptcha();
        confirmation.current = result;
        setPhone(number); setCodeSent(true); setCooldown(60); setCode('');
        setMessage(text('Enter the 6-digit code sent to your phone.', 'உங்கள் தொலைபேசிக்கு அனுப்பிய 6 இலக்கக் குறியீட்டை உள்ளிடவும்.'));
      } catch (e) { clearCaptcha(); throw e; }
    });
  }
  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    await run(async () => {
      if (!confirmation.current || !/^\d{6}$/.test(code)) throw new Error(text('Enter the 6-digit verification code.', '6 இலக்கக் குறியீட்டை உள்ளிடவும்.'));
      if (linkingUid && auth!.currentUser?.uid !== linkingUid) throw new Error('Your account changed. Please sign in again.');
      const result = await confirmPhoneCode(auth!, confirmation.current, code, linkingUid);
      if (db && auth!.currentUser?.uid === result.user.uid) {
        try { await setDoc(doc(db, 'users', result.user.uid), { uid: result.user.uid, phoneNumber: result.user.phoneNumber || '' }, { merge: true }); }
        catch { /* Sign-in succeeded; profile details can be updated later. */ }
      }
      done();
    });
  }
  if (!isOpen) return null;
  return <div className="dialog-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
    <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="auth-modal-title" className="hm-dialog signin-dialog bg-paper text-ink w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl border border-rule">
      <header className="signin-header"><ShieldCheck size={25} /><div><h2 id="auth-modal-title">{linkingUid ? text('Sign-in methods', 'உள்நுழைவு முறைகள்') : text('Sign in to DTH Tamizhan', 'DTH Tamizhan இல் உள்நுழையவும்')}</h2><p>{linkingUid ? text('Add another way to access this same account.', 'இதே கணக்கில் உள்நுழைய மற்றொரு முறையைச் சேர்க்கவும்.') : text('Access your boxes, recharges and receipts.', 'உங்கள் பாக்ஸ்கள், ரீசார்ஜ் மற்றும் ரசீதுகளை அணுகவும்.')}</p></div><button type="button" disabled={busy} onClick={onClose} aria-label={text('Close', 'மூடவும்')}><X size={19} /></button></header>
      <div className="signin-body">
        {error && <p role="alert" className="signin-alert">{error}</p>}{message && <p role="status" className="signin-message">{message}</p>}
        {!linkingUid && <button type="button" className="signin-google" disabled={busy} onClick={() => void run(async () => { const provider = new GoogleAuthProvider(); provider.setCustomParameters({ prompt: 'select_account' }); await signInWithPopup(auth!, provider); done(); })}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18v2.84L5.84 14.09z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>{text('Continue with Google', 'Google மூலம் தொடரவும்')}</button>}
        <div className="signin-methods" role="group" aria-label={text('Sign-in method', 'உள்நுழைவு முறை')}><button type="button" aria-pressed={method === 'email'} disabled={busy} onClick={() => { setMethod('email'); setError(''); setMessage(''); }}>{text('Email', 'மின்னஞ்சல்')}</button><button type="button" aria-pressed={method === 'phone'} disabled={busy} onClick={() => { setMethod('phone'); setError(''); setMessage(''); }}>{text('Phone number', 'தொலைபேசி எண்')}</button></div>
        {method === 'email' ? <>
          {!createdAccount && <form className="signin-form" onSubmit={event => void submitEmail(event)}>
            {!linkingUid && mode === 'signup' && <label>{text('Full name', 'முழுப் பெயர்')}<input autoComplete="name" value={name} onChange={event => setName(event.target.value)} required minLength={2} maxLength={100} disabled={busy} /></label>}
            <label>{text('Email address', 'மின்னஞ்சல் முகவரி')}<input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required disabled={busy || (!!linkingUid && !!auth?.currentUser?.email)} /></label>
            {mode !== 'reset' && mode !== 'link' && <label>{text('Password', 'கடவுச்சொல்')}<input type="password" autoComplete={mode === 'signup' || linkingUid ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} required minLength={mode === 'signup' || linkingUid ? 6 : undefined} maxLength={4096} disabled={busy} /></label>}
            {mode !== 'link' && (mode === 'signup' || linkingUid) && <label>{text('Confirm password', 'கடவுச்சொல்லை உறுதிப்படுத்தவும்')}<input type="password" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required disabled={busy} /></label>}
            <button type="submit" className="signin-primary" disabled={busy || (mode === 'link' && emailCooldown > 0)} aria-busy={busy}>{busy ? text('Please wait…', 'காத்திருக்கவும்…') : mode === 'link' ? emailCooldown ? `${text('Resend in', 'மீண்டும் அனுப்ப')} ${emailCooldown}s` : text('Email me a sign-in link', 'உள்நுழைவு இணைப்பை அனுப்பவும்') : linkingUid ? text('Save email/password', 'மின்னஞ்சல் கடவுச்சொல்லைச் சேமிக்கவும்') : mode === 'reset' ? text('Send reset email', 'மீட்டமைப்பு மின்னஞ்சல் அனுப்பவும்') : mode === 'signup' ? text('Create account', 'கணக்கு உருவாக்கவும்') : text('Sign in', 'உள்நுழையவும்')}</button>
          </form>}
          {createdAccount && <button type="button" className="signin-primary" disabled={busy} onClick={done}>{text('Continue to my account', 'எனது கணக்கிற்குத் தொடரவும்')}</button>}
          {!createdAccount && <button type="button" className="signin-text" disabled={busy} onClick={() => { setMode(mode === 'link' ? 'signin' : 'link'); setPassword(''); setConfirmPassword(''); setError(''); setMessage(''); }}>{mode === 'link' ? text('Use a password instead', 'கடவுச்சொல்லைப் பயன்படுத்தவும்') : text('Use a sign-in link instead', 'உள்நுழைவு இணைப்பைப் பயன்படுத்தவும்')}</button>}
          {!linkingUid && mode !== 'link' && <div className="signin-links"><button type="button" disabled={busy} onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setPassword(''); setConfirmPassword(''); setError(''); setMessage(''); }}>{mode === 'signup' ? text('Already have an account? Sign in', 'ஏற்கெனவே கணக்கு உள்ளதா? உள்நுழையவும்') : text('Create an account', 'கணக்கு உருவாக்கவும்')}</button><button type="button" disabled={busy} onClick={() => { setMode(mode === 'reset' ? 'signin' : 'reset'); setPassword(''); setError(''); setMessage(''); }}>{mode === 'reset' ? text('Back to sign in', 'உள்நுழைவுக்குத் திரும்பவும்') : text('Forgot password?', 'கடவுச்சொல் மறந்துவிட்டதா?')}</button></div>}
          {linkingUid && auth?.currentUser?.email && !auth.currentUser.emailVerified && <div className="signin-links"><button type="button" disabled={busy} onClick={() => void run(async () => { if (auth!.currentUser?.uid !== linkingUid) throw new Error('Please sign in again.'); await sendEmailVerification(auth!.currentUser!); setMessage(text('Verification email sent. Check your inbox.', 'சரிபார்ப்பு மின்னஞ்சல் அனுப்பப்பட்டது.')); })}>{text('Resend verification email', 'சரிபார்ப்பு மின்னஞ்சலை மீண்டும் அனுப்பவும்')}</button><button type="button" disabled={busy} onClick={() => void run(async () => { const account = auth!.currentUser; if (account?.uid !== linkingUid) throw new Error('Please sign in again.'); await reload(account); await account.getIdToken(true); setMessage(account.emailVerified ? text('Email verified. You can continue.', 'மின்னஞ்சல் சரிபார்க்கப்பட்டது. தொடரலாம்.') : text('Email is not verified yet. Open the verification link in your inbox.', 'உங்கள் மின்னஞ்சலில் உள்ள சரிபார்ப்பு இணைப்பைத் திறக்கவும்.')); })}>{text('Check verification', 'சரிபார்ப்பைச் சரிபார்க்கவும்')}</button></div>}
        </> : <>
          <form className="signin-form" onSubmit={event => { if (codeSent) void verifyCode(event); else { event.preventDefault(); void sendCode(); } }}>
            <label>{text('Mobile number', 'மொபைல் எண்')}<input type="tel" inputMode="tel" autoComplete="tel" placeholder="+91 98765 43210" value={phone} onChange={event => setPhone(event.target.value)} required disabled={busy || codeSent} maxLength={22} /></label>
            {codeSent && <label>{text('6-digit code', '6 இலக்கக் குறியீடு')}<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} required disabled={busy} /></label>}
            <div id="phone-recaptcha" />
            {!phoneEnabled && <p className="text-sm text-muted">{phoneEnabled === null ? text('Checking phone sign-in…', 'தொலைபேசி உள்நுழைவு சரிபார்க்கப்படுகிறது…') : text('Phone sign-in is not enabled yet. Please use email or Google.', 'தொலைபேசி உள்நுழைவு இன்னும் செயல்படுத்தப்படவில்லை. மின்னஞ்சல் அல்லது Google ஐப் பயன்படுத்தவும்.')}</p>}
            <button type="submit" className="signin-primary" disabled={busy || !phoneEnabled || (!codeSent && cooldown > 0)}>{busy ? text('Please wait…', 'காத்திருக்கவும்…') : codeSent ? text('Verify & continue', 'சரிபார்த்துத் தொடரவும்') : text('Send verification code', 'சரிபார்ப்புக் குறியீட்டை அனுப்பவும்')}</button>
            {codeSent && <div className="signin-links"><button type="button" disabled={busy || cooldown > 0} onClick={() => void sendCode()}>{cooldown ? `${text('Resend in', 'மீண்டும் அனுப்ப')} ${cooldown}s` : text('Resend code', 'குறியீட்டை மீண்டும் அனுப்பவும்')}</button><button type="button" disabled={busy} onClick={() => { setCodeSent(false); confirmation.current = null; setCode(''); clearCaptcha(); }}>{text('Change number', 'எண்ணை மாற்றவும்')}</button></div>}
          </form><p className="signin-consent">{text('By continuing, you agree to receive a verification SMS; standard rates may apply. Google sends and stores your number to help prevent spam and abuse. Keep access to your number; email and Google sign-in are also available.', 'தொடர்வதன் மூலம் சரிபார்ப்பு SMS பெற ஒப்புக்கொள்கிறீர்கள்; வழக்கமான கட்டணங்கள் பொருந்தலாம். தவறான பயன்பாட்டைத் தடுக்க Google உங்கள் எண்ணைச் சேமிக்கிறது. உங்கள் எண்ணின் அணுகலைப் பாதுகாக்கவும்; மின்னஞ்சல் அல்லது Google மூலமும் உள்நுழையலாம்.')}</p>
        </>}
      </div>
    </div>
  </div>;
};

