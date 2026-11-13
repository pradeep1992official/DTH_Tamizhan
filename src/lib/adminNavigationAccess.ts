import { auth } from './firebase';

export class AdminNavigationError extends Error {
  constructor(public reason: 'session' | 'server' | 'network') {
    super('Administrator access could not be verified.');
  }
}

// Navigation visibility only; protected pages and APIs independently authorize.
export async function verifyAdminNavigationAccess(uid: string, signal?: AbortSignal): Promise<boolean> {
  await auth?.authStateReady?.();
  const current = auth?.currentUser;
  if (!current || current.uid !== uid) return false;
  const token = await current.getIdToken();
  const check = (value: string) => fetch('/api/admin/verify-token', {
    headers: { Accept: 'application/json', Authorization: `Bearer ${value}` }, signal,
    cache: 'no-store',
  });
  let response: Response;
  try {
    response = await check(token);
    if (response.status === 401 && auth?.currentUser?.uid === uid) {
      response = await check(await current.getIdToken(true));
    }
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new AdminNavigationError('network');
  }
  if (!response.ok) throw new AdminNavigationError(response.status === 401 ? 'session' : 'server');
  const data = await response.json();
  return auth?.currentUser?.uid === uid && data.success === true && data.authenticated === true &&
    data.uid === uid && data.isApprovedAdmin === true;
}
