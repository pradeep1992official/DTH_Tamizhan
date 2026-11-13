import { onAuthStateChanged, signOut, type Auth, type User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, type Firestore } from 'firebase/firestore';
import type { UserProfile } from '../types';

export function sessionProfile(account: User, saved: Record<string, unknown> = {}): UserProfile {
  const now = new Date().toISOString();
  return {
    uid: account.uid, email: account.email || undefined,
    displayName: typeof saved.displayName === 'string' && saved.displayName.trim() ? saved.displayName.trim() : account.displayName || account.email?.split('@')[0] || 'Customer',
    phoneNumber: typeof saved.phoneNumber === 'string' ? saved.phoneNumber.trim() || undefined : account.phoneNumber || undefined,
    photoURL: account.photoURL || undefined,
    createdAt: typeof saved.createdAt === 'string' ? saved.createdAt : account.metadata?.creationTime || now,
    lastLoginAt: now, authProviders: account.providerData?.map(provider => provider.providerId) || [],
    // Role authorization always comes from the protected server endpoints.
    role: 'customer', is_worker: false, is_plan_admin: false,
  };
}

export function observeAccountSession(auth: Auth, db: Firestore | null, changed: (profile: UserProfile | null) => void,
  failed: (message: string) => void = () => {}) {
  let generation = 0; let stopProfile: (() => void) | undefined;
  const stopAuth = onAuthStateChanged(auth, account => {
    const version = ++generation;
    stopProfile?.(); stopProfile = undefined;
    // Clear the previous account immediately, including during account switches.
    changed(null);
    if (!account) return;
    const current = () => version === generation && auth.currentUser?.uid === account.uid;
    const base = sessionProfile(account);
    changed(base);
    if (!db) return;
    let loginRecorded = false;
    stopProfile = onSnapshot(doc(db, 'users', account.uid), { includeMetadataChanges: true }, snapshot => {
      if (!current()) return;
      const saved = snapshot.exists() ? snapshot.data() : {};
      changed(sessionProfile(account, saved));
      // An empty offline cache does not prove the server profile is missing.
      if (!snapshot.exists() && snapshot.metadata.fromCache) return;
      if (loginRecorded) return;
      loginRecorded = true;
      // Only initialize editable fields on a new document; never rewrite saved edits at login.
      const values = snapshot.exists() ? { lastLoginAt: base.lastLoginAt } : {
        uid: account.uid, displayName: base.displayName || '', phoneNumber: base.phoneNumber || '',
        createdAt: base.createdAt, lastLoginAt: base.lastLoginAt,
      };
      void setDoc(doc(db, 'users', account.uid), values, { merge: true }).catch(() => {
        if (current()) failed('Your session is active, but profile details could not be saved.');
      });
    }, () => { if (current()) failed('Your session is active, but saved profile details could not be loaded.'); });
  }, () => { generation++; stopProfile?.(); changed(null); failed('Your session could not be restored. Please sign in again.'); });
  return () => { generation++; stopProfile?.(); stopAuth(); };
}

export async function signOutAccount(auth: Auth | null) {
  if (auth) await signOut(auth);
}
