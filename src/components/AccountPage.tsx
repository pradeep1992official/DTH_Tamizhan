import { translations } from '../lib/translations';
import React, { useState } from 'react';
import { localizeCustomerError } from '../lib/customerMessages';
import { Link } from 'react-router-dom';
import type { DthConnection, Language, UserProfile } from '../types';

interface AccountPageProps {
  user: UserProfile | null;
  currentLang: Language;
  connections?: DthConnection[];
  onOpenAuth: () => void;
  onSignOut?: () => void;
  onUpdateProfile?: (updates: Pick<UserProfile, 'displayName' | 'phoneNumber'>) => Promise<void>;
}

export function AccountPage({ user, currentLang, connections = [], onOpenAuth, onSignOut, onUpdateProfile }: AccountPageProps) {
  const t = translations[currentLang];
  const ta = currentLang === 'ta';
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedProfile, setSavedProfile] = useState(false);
  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onUpdateProfile || saving) return;
    if (name.trim().length < 2) { setError(t.uiNameMustBeAtLeast2Characters); return; }
    setSaving(true);
    setError(null);
    try {
      await onUpdateProfile({ displayName: name.trim(), phoneNumber: phone.trim() || undefined });
      setEditing(false);
      setSavedProfile(true);
    } catch (err) {
      setError(localizeCustomerError(err instanceof Error ? err.message : t.uiUnableToSaveProfilePleaseTryAgain, currentLang));
    } finally { setSaving(false); }
  };
  const copy = ta ? {
    intro: 'உங்கள் விவரங்கள், சேமித்த பெட்டிகள் மற்றும் ரீசார்ஜ் இணைப்புகள் ஒரே இடத்தில்.',
    profile: 'சுயவிவர விவரங்கள்', name: 'பெயர்', email: 'மின்னஞ்சல்', phone: 'கைபேசி எண்',
    missing: 'சேர்க்கப்படவில்லை', boxes: 'சேமித்த செட்-டாப் பெட்டிகள்', manage: 'பெட்டிகளை நிர்வகிக்க',
    empty: 'இன்னும் பெட்டிகள் சேமிக்கப்படவில்லை.', emptyHelp: 'அடுத்த முறை விரைவாக ரீசார்ஜ் செய்ய உங்கள் இணைப்பைச் சேமிக்கவும்.',
    help: 'உதவி தேவையா?', helpText: 'ரீசார்ஜ் அல்லது கட்டணக் கேள்விகளுக்கு உதவியை அணுகவும்.',
    contact: 'உதவியை அணுகவும்', privacy: 'தனியுரிமைக் கொள்கை',
    guest: 'உங்கள் DTH இணைப்புகளை ஒரே இடத்தில் நிர்வகிக்கவும்',
    guestHelp: 'உள்நுழைந்து சேமித்த பெட்டிகளைப் பார்க்கவும், ஒவ்வொரு முறையும் எண் உள்ளிடாமல் ரீசார்ஜ் செய்யவும்.',
    guestBrowse: 'பேக்குகளைப் பார்க்க உள்நுழையத் தேவையில்லை.', signedIn: 'உள்நுழைந்துள்ளீர்கள்',
  } : {
    intro: 'Your details, saved boxes and recharge shortcuts, all in one place.',
    profile: 'Profile details', name: 'Name', email: 'Email address', phone: 'Mobile number',
    missing: 'Not provided', boxes: 'Saved set-top boxes', manage: 'Manage boxes',
    empty: 'No saved boxes yet', emptyHelp: 'Save a connection to make your next recharge quicker.',
    help: 'Need a hand?', helpText: 'Get help with a recharge or payment question.',
    contact: 'Contact support', privacy: 'Privacy policy',
    guest: 'Keep your DTH connections together',
    guestHelp: 'Sign in to access saved boxes and recharge without entering your subscriber ID each time.',
    guestBrowse: 'You can browse packs without signing in.', signedIn: 'Signed in',
  };
  const saved = user ? connections.filter(connection => connection.user_id === user.uid) : [];
  const displayName = user?.displayName || user?.email || t.uiYourAccount;

  return <section className="account-page">
    <header className="account-heading">
      <div><h1>{t.uiYourAccount}</h1><p>{copy.intro}</p></div>
      {user && onSignOut && <button type="button" className="account-signout" onClick={onSignOut}>{t.signOut}</button>}
    </header>
    {user ? <div className="account-grid">
      <section className="account-card account-profile">
        <div className="account-identity">
          <span className="account-avatar" aria-hidden="true">{Array.from(displayName)[0]?.toLocaleUpperCase()}</span>
          <div><p className="account-eyebrow">{copy.signedIn}</p><h2>{displayName}</h2></div>
        </div>
        <div className="account-card-heading"><h3>{copy.profile}</h3>
          {!editing && onUpdateProfile && <button type="button" className="account-text-link" onClick={() => {
            setName(user.displayName || ''); setPhone(user.phoneNumber || ''); setError(null); setSavedProfile(false); setEditing(true);
          }}>{t.editProfile}</button>}
        </div>
        {editing ? <form className="account-edit-form" onSubmit={saveProfile}>
          <label htmlFor="account-name">{copy.name}</label>
          <input id="account-name" autoFocus autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={event => setName(event.target.value)} disabled={saving} />
          <label htmlFor="account-phone">{copy.phone}</label>
          <input id="account-phone" type="tel" autoComplete="tel" maxLength={20} value={phone} onChange={event => setPhone(event.target.value)} disabled={saving} />
          <p>{copy.email}: {user.email || copy.missing}</p>
          {error && <p role="alert" className="text-error">{error}</p>}
          <div className="account-actions"><button type="submit" className="account-primary" disabled={saving}>{saving ? t.uiSaving : t.save}</button>
            <button type="button" className="account-signout" disabled={saving} onClick={() => setEditing(false)}>{t.cancel}</button></div>
        </form> : <dl>{[[copy.name, user.displayName], [copy.email, user.email], [copy.phone, user.phoneNumber]].map(([label, value]) =>
          <div key={label}><dt>{label}</dt><dd>{value || copy.missing}</dd></div>
        )}</dl>}
        {savedProfile && <p role="status">{ta ? 'சுயவிவரம் சேமிக்கப்பட்டது.' : 'Profile saved.'}</p>}
        <Link className="account-text-link" to="/privacy-policy">{copy.privacy} &rarr;</Link>
      </section>
      <div className="account-secondary">
        <section className="account-card"><h2>{ta ? 'உங்கள் ரீசார்ஜ் வரலாறு' : 'Your recharge history'}</h2><p className="text-sm text-muted mt-2 mb-4">{ta ? 'அனைத்து பாக்ஸ்களின் ரீசார்ஜ், கட்டண நிலை மற்றும் ரசீதுகளைப் பார்க்கவும்.' : 'View recharges, payment status and PDF receipts for all your boxes.'}</p><Link className="account-primary" to="/history">{ta ? 'வரலாற்றைப் பார்க்கவும்' : 'View history'}</Link></section>
        <section className="account-card">
          <div className="account-card-heading"><h2>{copy.boxes}</h2><span className="account-count">{saved.length}</span></div>
          {saved.length ? <ul className="account-boxes">{saved.slice(0, 3).map(connection => <li key={connection.id}>
            <span><strong>{connection.nickname || connection.operatorName}</strong><small>{connection.operatorName}</small></span>
            <span className="account-box-id">&bull;&bull;&bull;&bull; {connection.smartCardNumber.slice(-4)}</span>
          </li>)}</ul> : <div className="account-empty"><h3>{copy.empty}</h3><p>{copy.emptyHelp}</p></div>}
          <div className="account-actions"><Link className="account-primary" to="/connections">{copy.manage}</Link><Link className="account-text-link" to="/recharge">{t.navRecharge} &rarr;</Link></div>
        </section>
        <section className="account-card account-help"><h2>{copy.help}</h2><p>{copy.helpText}</p><Link className="account-text-link" to="/contact">{copy.contact} &rarr;</Link></section>
      </div>
    </div> : <section className="account-card account-guest">
      <h2>{copy.guest}</h2><p>{copy.guestHelp}</p>
      <div className="account-actions"><button type="button" className="account-primary" onClick={onOpenAuth}>{t.uiSignIn}</button><Link className="account-text-link" to="/plans">{t.navPlans} &rarr;</Link></div>
      <p className="account-guest-note">{copy.guestBrowse}</p>
    </section>}
  </section>;
}
