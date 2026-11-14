import type { Request, Response, NextFunction } from 'express';
import { getAppCheck } from 'firebase-admin/app-check';
import { getAdminFirestore } from './auth';
import { documentKey } from '../persistence';
import firebaseConfig from '../../firebase-applet-config.json';
import { stripTicketHtml } from '../../src/lib/tickets';
export class TicketRequestError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function logTicketBlock(uid: string | null, reason: string, path: string) {
  await getAdminFirestore().collection('server_ticket_blocks').doc().create({ uid, reason, path: path.slice(0, 200), createdAt: new Date().toISOString() });
}
export async function ticketProtection(req: Request, res: Response, next: NextFunction) {
  if (req.method !== 'POST') { next(); return; }
  const uid = res.locals.ticketUid || res.locals.uid;
  try {
    const token = req.headers['x-firebase-appcheck'];
    if (typeof token !== 'string') throw new TicketRequestError(403, 'App verification is required. Refresh the page and retry.');
    try { const verified = await getAppCheck().verifyToken(token); if (verified.appId !== firebaseConfig.appId) throw new Error('app'); }
    catch { throw new TicketRequestError(403, 'App verification failed. Refresh the page and retry.'); }
    const now = Date.now(); const minute = Math.floor(now / 60_000); const db = getAdminFirestore();
    await db.runTransaction(async tx => {
      const refs = [db.collection('server_ticket_limits').doc(documentKey(`user:${uid}:${minute}`)), db.collection('server_ticket_limits').doc(documentKey(`ip:${req.ip}:${minute}`))];
      const snapshots = await Promise.all(refs.map(ref => tx.get(ref)));
      if (snapshots.some((snapshot, index) => (snapshot.data()?.count || 0) >= (index === 0 ? 20 : 40))) throw new TicketRequestError(429, 'Too many requests. Please wait a minute and retry.');
      refs.forEach((ref, index) => tx.set(ref, { count: (snapshots[index].data()?.count || 0) + 1, expiresAt: new Date(now + 2 * 60_000) }));
    });
    if (req.body?.website) throw new TicketRequestError(400, 'This request could not be accepted. Please reload the form.');
    if (req.body && typeof req.body === 'object') {
      delete req.body.website;
      for (const key of ['name', 'state', 'description', 'message', 'reason']) if (typeof req.body[key] === 'string') req.body[key] = stripTicketHtml(req.body[key]);
    }
    next();
  } catch (error) {
    try { await logTicketBlock(uid || null, error instanceof TicketRequestError ? error.message : 'protection_unavailable', req.path); } catch { /* Fail closed even if audit storage is unavailable. */ }
    res.status(error instanceof TicketRequestError ? error.status : 503).json({ success: false, error: error instanceof TicketRequestError ? error.message : 'Request protection is unavailable. Please retry shortly.' });
  }
}
