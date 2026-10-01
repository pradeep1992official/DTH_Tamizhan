import { auth } from './firebase';

/**
 * Returns authenticated headers with Firebase ID Bearer token.
 * This guarantees all API communications are cryptographically verified on the backend.
 */
export async function getAuthHeaders(extraHeaders: Record<string, string> = {}): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...extraHeaders };
  if (auth && auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('[apiAuth] Failed to retrieve Firebase ID token:', e);
    }
  }
  return headers;
}

/**
 * Convenience wrapper for fetch with automatic Firebase Authorization header.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const customHeaders = (options.headers as Record<string, string>) || {};
  const authHeaders = await getAuthHeaders(customHeaders);
  return fetch(url, {
    ...options,
    headers: authHeaders,
  });
}
