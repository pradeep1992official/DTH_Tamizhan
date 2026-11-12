import type { Auth } from 'firebase/auth';
import { doc, setDoc, type Firestore } from 'firebase/firestore';
import type { UserProfile } from '../types';

export async function saveAccountProfile(
  db: Firestore,
  auth: Auth | null,
  uid: string,
  updates: Pick<UserProfile, 'displayName' | 'phoneNumber'>,
  signInMessage: string,
) {
  await auth?.authStateReady();
  if (!auth?.currentUser || auth.currentUser.uid !== uid) throw new Error(signInMessage);
  // Send only editable fields. Cached roles and identity fields must never be written here.
  await setDoc(doc(db, 'users', uid), {
    uid,
    displayName: updates.displayName?.trim() || '',
    phoneNumber: updates.phoneNumber?.trim() || '',
  }, { merge: true });
}
