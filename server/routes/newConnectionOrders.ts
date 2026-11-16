import { Router } from 'express';
import { z } from 'zod';
import { verifyAuthToken, isCallerAdminAuthorized } from '../middleware/auth';
import { orderCreateLimiter, newConnectionStatusLimiter, adminLimiter } from '../middleware/rateLimiter';
import { bookingStatus, BookingError, confirmYoupiByAdmin, createBooking, paymentReviewQueue, startBookingCheckout, verifyBooking } from '../models/newConnectionOrders';
import { providerEnabled } from '../newConnectionPaymentProviders';
import { readNewConnectionCatalog } from '../models/newConnectionCatalog';

export const newConnectionOrdersRouter = Router();
function failure(res: import('express').Response, error: unknown) {
  res.status(error instanceof BookingError ? error.status : error instanceof z.ZodError ? 400 : 503).json({ success: false, code: error instanceof BookingError ? error.code : error instanceof z.ZodError ? 'INVALID_DETAILS' : 'VERIFICATION_PENDING', ...(error instanceof BookingError && error.details ? { quote: error.details } : {}) });
}
newConnectionOrdersRouter.get('/api/new-connection/config', newConnectionStatusLimiter, async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try { const data = await readNewConnectionCatalog(); res.json({ success: true, enabledProviders: data.settings.enabledProviders.filter(providerEnabled), defaultProvider: data.settings.defaultProvider, advanceMode: data.settings.advanceMode, settings: data.settings }); } catch (e) { failure(res, e); }
});
newConnectionOrdersRouter.use('/api/new-connection/orders', async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  try { const account = await verifyAuthToken(req); if (!account) { res.status(401).json({ success: false, code: 'SIGN_IN_REQUIRED' }); return; } res.locals.account = account; next(); } catch { res.status(401).json({ success: false, code: 'SIGN_IN_REQUIRED' }); }
});
newConnectionOrdersRouter.post('/api/new-connection/orders', orderCreateLimiter, async (req, res) => {
  try {
    if (res.locals.account.signInProvider !== 'google.com') throw new BookingError('GOOGLE_SIGN_IN_REQUIRED', 403);
    const result = await createBooking(res.locals.account.uid, req.body);
    if (result.duplicate) { res.json({ success: true, order: result.order, checkout: null, needsReview: true }); return; }
    try { res.json({ success: true, ...await startBookingCheckout(res.locals.account.uid, result.order.id) }); }
    catch { res.json({ success: true, order: result.order, checkout: null, pending: true }); }
  } catch (e) { failure(res, e); }
});
newConnectionOrdersRouter.get('/api/new-connection/orders/:id', newConnectionStatusLimiter, async (req, res) => {
  try { res.json({ success: true, ...await bookingStatus(res.locals.account.uid, req.params.id) }); } catch (e) { failure(res, e); }
});
newConnectionOrdersRouter.post('/api/new-connection/orders/:id/checkout', orderCreateLimiter, async (req, res) => {
  try { z.object({}).strict().parse(req.body); if (res.locals.account.signInProvider !== 'google.com') throw new BookingError('GOOGLE_SIGN_IN_REQUIRED', 403); res.json({ success: true, ...await startBookingCheckout(res.locals.account.uid, req.params.id) }); } catch (e) { failure(res, e); }
});
newConnectionOrdersRouter.post('/api/new-connection/orders/:id/verify', orderCreateLimiter, async (req, res) => {
  try { const confirmation = z.record(z.string(), z.unknown()).parse(req.body); res.json({ success: true, order: await verifyBooking(res.locals.account.uid, req.params.id, confirmation) }); } catch (e) { failure(res, e); }
});
newConnectionOrdersRouter.use('/api/admin/new-connection/payments', adminLimiter, async (req, res, next) => {
  try { if (!(await isCallerAdminAuthorized(req, new Set())).authorized) { res.status(403).json({ success: false, code: 'ADMIN_REQUIRED' }); return; } const account = await verifyAuthToken(req); res.locals.adminUid = account!.uid; res.setHeader('Cache-Control', 'no-store'); next(); } catch (e) { failure(res, e); }
});
newConnectionOrdersRouter.get('/api/admin/new-connection/payments', async (_req, res) => { try { res.json({ success: true, orders: await paymentReviewQueue() }); } catch (e) { failure(res, e); } });
newConnectionOrdersRouter.post('/api/admin/new-connection/payments/:id/confirm', async (req, res) => { try { res.json({ success: true, order: await confirmYoupiByAdmin(req.params.id, res.locals.adminUid, req.body) }); } catch (e) { failure(res, e); } });
