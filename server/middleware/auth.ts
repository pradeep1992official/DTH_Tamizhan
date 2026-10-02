import { Request } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { getApps } from 'firebase-admin/app';

export function getSuperAdminEmail(): string {
  return (process.env.SUPER_ADMIN_EMAIL || 'professorpradeeps@gmail.com').trim().toLowerCase();
}

export function isSuperAdmin(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === getSuperAdminEmail();
}

/**
 * Verify Firebase Auth ID Token from HTTP Authorization Header (Bearer token)
 * Authenticates user cryptographically and returns their decoded UID and Email.
 */
export async function verifyAuthToken(req: Request): Promise<{ uid: string; email: string | null } | null> {
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
    const decodedToken = await getAuth().verifyIdToken(idToken);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email ? decodedToken.email.toLowerCase() : null,
    };
  } catch (err: any) {
    return null;
  }
}

/**
 * Check if the caller is authorized as an Admin or Super Admin.
 * Checks against configurable super admin email and active memory/Firestore admin records.
 */
export async function isCallerAdminAuthorized(
  req: Request, 
  approvedAdminEmails: Set<string>
): Promise<{ authorized: boolean; email?: string; isSuperAdmin: boolean }> {
  const authCtx = await verifyAuthToken(req);
  if (!authCtx || !authCtx.email) {
    return { authorized: false, isSuperAdmin: false };
  }

  const callerEmail = authCtx.email.trim().toLowerCase();
  const superAdminEmail = getSuperAdminEmail();

  if (callerEmail === superAdminEmail) {
    return { authorized: true, email: callerEmail, isSuperAdmin: true };
  }

  if (approvedAdminEmails.has(callerEmail)) {
    return { authorized: true, email: callerEmail, isSuperAdmin: false };
  }

  return { authorized: false, isSuperAdmin: false };
}
