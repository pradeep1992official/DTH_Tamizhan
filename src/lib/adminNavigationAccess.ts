import { auth } from './firebase';

// Navigation visibility only; protected pages and APIs independently authorize.
export async function verifyAdminNavigationAccess(uid: string, signal?: AbortSignal): Promise<boolean> {
  await auth?.authStateReady?.();
  const current = auth?.currentUser;
  if (!current || current.uid !== uid) return false;
  const token = await current.getIdToken();
  const response = await fetch('/api/admin/verify-token', {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }, signal,
  });
  if (!response.ok) throw new Error('Administrator access could not be verified.');
  const data = await response.json();
  return auth?.currentUser?.uid === uid && data.success === true && data.authenticated === true &&
    data.uid === uid && data.isApprovedAdmin === true;
}
