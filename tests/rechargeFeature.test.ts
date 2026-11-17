import express from 'express';
import type { Server } from 'node:http';
import { createHmac } from 'node:crypto';
import { beforeAll, afterAll, beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ ncRazorpay: vi.fn(), ncYoupi: vi.fn(), reconcile: vi.fn(), recover: vi.fn(), operators: vi.fn() }));
vi.mock('../server/controllers/coreController', () => ({ health: (_q: any, r: any) => r.json({ status: 'ok' }), listOperators: (_q: any, r: any) => { f.operators(); r.json({ success: true, operators: [] }); } }));
vi.mock('../server/controllers/ordersController', () => ({ ordersController: { list: (_q: any, r: any) => r.json({ success: true, orders: [] }), listAdmin: (_q: any, r: any) => r.json({ success: true }), updateStatus: (_q: any, r: any) => r.json({ success: true }) } }));
vi.mock('../server/controllers/plansController', () => { const action = (_q: any, r: any) => r.json({ success: true, plans: [] }); return { plansController: { list: action, listCatalog: action, listAdmin: action, listDeleted: action, save: action, delete: action, syncSeed: action } }; });
vi.mock('../server/controllers/aiController', () => ({ recommendPlans: (_q: any, r: any) => r.json({ success: true }) }));
vi.mock('../server/controllers/rechargeAssistant', () => ({ prepareAssistantRecharge: (_q: any, r: any) => r.json({ success: true }) }));
vi.mock('../server/middleware/auth', () => ({ getSuperAdminEmail: () => 'root@example.com', getAdminFirestore: () => { throw new Error('No live DB'); }, verifyAuthToken: async (req: any) => req.headers.authorization === 'Bearer owner' ? { uid: 'owner' } : null, isCallerAdminAuthorized: async () => ({ authorized: true }) }));
vi.mock('../server/models/newConnectionOrders', () => ({ handleNewConnectionRazorpayEvent: f.ncRazorpay, handleNewConnectionYoupiCallback: f.ncYoupi }));
vi.mock('../server/models/rechargeRecovery', () => ({ rememberRechargeOrder: vi.fn(), reconcileRechargePayment: f.reconcile, recoverRechargeOrder: f.recover, reconcilePendingRecharges: vi.fn() }));
vi.mock('../server/models/planModel', () => ({ planModel: { getAll: async () => [], getById: async () => null } }));
vi.mock('../server/models/sharedStore', () => ({ readOperators: async () => [] }));
import { rechargeEnabled, disabledRechargeEndpoints } from '../server/rechargeFeature';
import { rechargeReturnTarget, setClientRechargeEnabled } from '../src/lib/rechargeFeature';
import { coreRouter } from '../server/routes/core';
import { ordersRouter } from '../server/routes/orders';
import { plansRouter } from '../server/routes/plans';
import { paymentsRouter } from '../server/routes/payments';
import { dthLookupRouter } from '../server/routes/dthLookup';
import { aiRouter } from '../server/routes/ai';
import { authConfigRouter } from '../server/routes/authConfig';
import { discoveryRouter, sitemapPaths } from '../server/routes/discovery';
import { rechargeWebhookRouter } from '../server/routes/rechargeRecovery';
import { youpiWebhookRouter } from '../server/youpi';
import { injectPageMetadata, pageHandler } from '../server/pages';
import { pageMetadata } from '../src/lib/pageMetadata';
let server: Server, base: string;
beforeAll(async () => { const app = express(); app.use(youpiWebhookRouter); app.use(rechargeWebhookRouter); app.use(express.json()); for (const router of [coreRouter, ordersRouter, plansRouter, paymentsRouter, dthLookupRouter, aiRouter, authConfigRouter, discoveryRouter]) app.use(router); app.use(pageHandler(() => '<!doctype html><html><head></head><body><div id="root"></div></body></html>')); server = await new Promise<Server>(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); }); const addr = server.address(); if (!addr || typeof addr === 'string') throw new Error(); base = 'http://127.0.0.1:' + addr.port; });
afterAll(async () => { await new Promise<void>(resolve => server.close(() => resolve())); vi.unstubAllEnvs(); setClientRechargeEnabled(true); });
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('RECHARGE_ENABLED', 'false'); vi.stubEnv('RAZORPAY_RECHARGE_WEBHOOK_SECRET', 'fixture-secret'); vi.stubEnv('YOUPI_WEBHOOK_SECRET', 'fixture-secret'); f.ncRazorpay.mockResolvedValue(true); f.ncYoupi.mockResolvedValue(undefined); f.reconcile.mockResolvedValue({ order: { id: 'order_old', amount: 10000, currency: 'INR' }, payment: { id: 'pay_old', status: 'captured' } }); });
it('fails closed when unset or malformed in every environment', () => { for (const value of [undefined, '', 'FALSE', '1', 'TRUE']) { if (value === undefined) delete process.env.RECHARGE_ENABLED; else vi.stubEnv('RECHARGE_ENABLED', value); expect(rechargeEnabled()).toBe(false); } vi.stubEnv('RECHARGE_ENABLED', 'true'); expect(rechargeEnabled()).toBe(true); });
it('blocks every NEW recharge endpoint before auth, validation, plan reads or provider calls', async () => {
  const paths = ['/api/create-order', '/api/payments/session', '/api/payments/youpi', '/api/payments/config', '/api/catalog', '/api/plans', '/api/operators', '/api/dth-lookup', '/api/dth-lookup/config', '/api/verify-subscriber', '/api/ai/recommend-plans', '/api/ai/recharge'];
  expect(new Set(paths)).toEqual(disabledRechargeEndpoints);
  for (const path of paths) for (const method of ['GET', 'POST']) {
    const response = await fetch(base + path, { method, ...(method === 'POST' ? { headers: { 'Content-Type': 'application/json' }, body: '{}' } : {}) });
    expect(response.status, path).toBe(404); expect(await response.json()).toEqual({ success: false, code: 'FEATURE_DISABLED', error: 'This feature is not available.' }); expect(response.headers.get('cache-control')).toBe('no-store');
  }
  for (const path of ['/API/CREATE-ORDER/', '/api/%63atalog']) { const response = await fetch(base + path); expect(response.status).toBe(404); expect((await response.json()).code).toBe('FEATURE_DISABLED'); }
  expect(f.operators).not.toHaveBeenCalled();
});
it('restores the original router behavior with exactly the one server switch', async () => {
  vi.stubEnv('RECHARGE_ENABLED', 'true'); expect((await fetch(base + '/api/operators')).status).toBe(200); expect(f.operators).toHaveBeenCalled(); expect((await fetch(base + '/api/catalog')).status).toBe(200);
  const checkout = await fetch(base + '/api/create-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); expect(checkout.status).toBe(401);
  const page = await fetch(base + '/recharge', { redirect: 'manual' }); expect(page.status).toBe(200); expect(await page.text()).toContain('DTH Recharge');
});
it('exposes the effective boolean through config and HTML bootstrap, never a client enforcement claim', async () => {
  expect((await (await fetch(base + '/api/auth/config')).json()).rechargeEnabled).toBe(false);
  const html = injectPageMetadata('<html><head><title>Old recharge</title></head><body></body></html>', '/', 'en', 'https://example.test'); expect(html).toContain('"rechargeEnabled":false'); expect(html).not.toContain('Old recharge'); expect(html).toContain('application/ld+json'); expect(html).not.toMatch(/DTH Recharge/);
  expect(pageMetadata('/recharge', 'en', false).noindex).toBe(true); expect(pageMetadata('/', 'en', false).description).not.toMatch(/recharge/i);
});
it('redirects disabled routes/deep links and sends existing-payment returns to owner history', async () => {
  for (const path of ['/recharge', '/recharge/old', '/plans?operator=sun_direct', '/connections']) { const res = await fetch(base + path, { redirect: 'manual' }); expect(res.status).toBe(301); expect(res.headers.get('location')).toBe('/new-connection'); expect(res.headers.get('x-robots-tag')).toContain('noindex'); }
  for (const path of ['/recharge?razorpay_order_id=order_old', '/?paymentId=provider-old']) { const res = await fetch(base + path, { redirect: 'manual' }); expect(res.status).toBe(301); expect(res.headers.get('location')).toMatch(/^\/history\?payment=/); }
  expect(rechargeReturnTarget('?status=paid&returnUrl=https://evil.test')).toBe('/new-connection');
});
it('discovery and the manifest advertise only enabled offerings', async () => {
  expect(sitemapPaths(false)).not.toContain('/recharge'); const sitemap = await (await fetch(base + '/sitemap.xml')).text(); expect(sitemap).toContain('/new-connection'); expect(sitemap).not.toMatch(/\/recharge|\/plans|\/connections/);
  const robots = await (await fetch(base + '/robots.txt')).text(); expect(robots).toContain('Disallow: /recharge'); expect(robots).toContain('/sitemap.xml');
  expect((await (await fetch(base + '/site.webmanifest')).json()).start_url).toBe('/new-connection'); vi.stubEnv('RECHARGE_ENABLED', 'true'); expect(sitemapPaths(true)).toContain('/recharge'); expect((await (await fetch(base + '/site.webmanifest')).json()).start_url).toBe('/recharge');
});
it('keeps signed Razorpay and YouPI new-connection dispatch active, while rejecting forged signatures', async () => {
  const razorpay = JSON.stringify({ event: 'payment.captured', payload: { order: { entity: { id: 'order_nc', notes: { purpose: 'new_connection' } } } } });
  const signature = createHmac('sha256', 'fixture-secret').update(razorpay).digest('hex');
  expect((await fetch(base + '/api/webhooks/recharges', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': signature }, body: razorpay })).status).toBe(200); expect(f.ncRazorpay).toHaveBeenCalledTimes(1);
  expect((await fetch(base + '/api/webhooks/recharges', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': '0'.repeat(64) }, body: razorpay })).status).toBe(401); expect(f.ncRazorpay).toHaveBeenCalledTimes(1);
  const youpi = JSON.stringify({ orderId: 'nc_' + 'a'.repeat(48), status: 'OBSERVED_SUCCESS' }); const ysig = createHmac('sha256', 'fixture-secret').update(youpi).digest('hex');
  expect((await fetch(base + '/api/payments/youpi/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-gateway-signature': ysig }, body: youpi })).status).toBe(200); expect(f.ncYoupi).toHaveBeenCalledTimes(1);
  expect((await fetch(base + '/api/payments/youpi/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-gateway-signature': '0'.repeat(64) }, body: youpi })).status).toBe(400); expect(f.ncYoupi).toHaveBeenCalledTimes(1);
});
it('preserves the authenticated verification endpoint for existing recharge payments', async () => {
  vi.stubEnv('RAZORPAY_KEY_SECRET', 'signature-secret'); const signature = createHmac('sha256', 'signature-secret').update('order_old|pay_old').digest('hex');
  const response = await fetch(base + '/api/verify-payment', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' }, body: JSON.stringify({ razorpay_order_id: 'order_old', razorpay_payment_id: 'pay_old', razorpay_signature: signature }) }); expect(response.status).toBe(200); expect((await response.json()).paid).toBe(true); expect(f.reconcile).toHaveBeenCalledWith('pay_old', 'order_old', 'owner');
});
