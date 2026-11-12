import { Request } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { ROOT_ADMIN_EMAIL, approvedAdminRecord } from '../../src/lib/adminPolicy';

export function getSuperAdminEmail(): string {
  return ROOT_ADMIN_EMAIL;
}

export function isSuperAdmin(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === getSuperAdminEmail();
}

/**
 * Verify Firebase Auth ID Token from HTTP Authorization Header (Bearer token)
 * Authenticates user cryptographically and returns their decoded UID and Email.
 */
export async function verifyAuthToken(req: Request): Promise<{ uid: string; email: string | null; emailVerified: boolean } | null> {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  const idToken = authHeader.split('Bearer ')[1]?.trim();
  if (!idToken) return null;

  if (!getApps().length) {
    // If Firebase Admin SDK is not initialized, fail closed
    return null;
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken, true);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email ? decodedToken.email.toLowerCase() : null,
      emailVerified: decodedToken.email_verified === true,
    };
  } catch (err: any) {
    return null;
  }
}

/**
 * Check if the caller is authorized as an Admin or Super Admin.
 * Checks the fixed root identity or the canonical UID-keyed Firestore admin registry.
 */
export async function isCallerAdminAuthorized(
  req: Request, 
  _approvedAdminEmails: Set<string>
): Promise<{ authorized: boolean; email?: string; isSuperAdmin: boolean }> {
  const authCtx = await verifyAuthToken(req);
  if (!authCtx || !authCtx.email || !authCtx.emailVerified) {
    return { authorized: false, isSuperAdmin: false };
  }

  const callerEmail = authCtx.email.trim().toLowerCase();
  const superAdminEmail = getSuperAdminEmail();

  if (callerEmail === superAdminEmail) {
    return { authorized: true, email: callerEmail, isSuperAdmin: true };
  }

  // Same UID-keyed registry and email binding used by firestore.rules.
  // Disk/email caches are never authorization authorities.
  try {
    const record = await getAdminFirestore().collection('admins').doc(authCtx.uid).get();
    if (approvedAdminRecord(callerEmail, record.data())) return { authorized: true, email: callerEmail, isSuperAdmin: false };
  } catch { /* Registry unavailable: deny access. */ }

  return { authorized: false, isSuperAdmin: false };
}

export function getAdminFirestore() { return getFirestore(firebaseConfig.firestoreDatabaseId); }
