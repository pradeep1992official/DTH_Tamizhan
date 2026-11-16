import express from 'express';
import { createHmac } from 'node:crypto';
import type { Server } from 'node:http';
import { beforeAll, afterAll, beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ reconcile: vi.fn() }));
vi.mock('../server/models/newConnectionRefunds', () => ({ reconcileConnectionRefund: f.reconcile }));
vi.mock('../server/models/rechargeRecovery', () => ({ reconcileRechargePayment: vi.fn(), recoverRechargeOrder: vi.fn(), reconcilePendingRecharges: vi.fn() }));
import { rechargeWebhookRouter } from '../server/routes/rechargeRecovery';
let server: Server, base: string;
beforeAll(async () => { const app = express(); app.use(rechargeWebhookRouter); server = await new Promise<Server>(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); }); const address = server.address(); if (!address || typeof address === 'string') throw new Error(); base = 'http://127.0.0.1:' + address.port; });
afterAll(async () => { await new Promise<void>(resolve => server.close(() => resolve())); vi.unstubAllEnvs(); });
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('RAZORPAY_RECHARGE_WEBHOOK_SECRET', 'fixture-secret'); f.reconcile.mockResolvedValue(true); });
async function deliver(event: string, signature = true, purpose = 'new_connection') { const body = JSON.stringify({ event, payload: { refund: { entity: { id: 'rfnd_fixture', notes: { purpose } } } } }); return fetch(base + '/api/webhooks/recharges', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': signature ? createHmac('sha256', 'fixture-secret').update(body).digest('hex') : '0'.repeat(64) }, body }); }
it('extends the existing signed endpoint for processed/failed refunds, fetching provider truth in the model', async () => {
  for (const event of ['refund.processed', 'refund.failed']) expect((await deliver(event)).status).toBe(200); expect(f.reconcile).toHaveBeenCalledTimes(2); expect(f.reconcile).toHaveBeenCalledWith('rfnd_fixture');
});
it('rejects forged raw signatures, preserves unrelated refund dispatch, and retries failed reconciliation', async () => {
  expect((await deliver('refund.processed', false)).status).toBe(401); expect(f.reconcile).not.toHaveBeenCalled(); expect((await deliver('refund.processed', true, 'other_feature')).status).toBe(200); expect(f.reconcile).not.toHaveBeenCalled();
  f.reconcile.mockRejectedValue(new Error('unavailable')); expect((await deliver('refund.processed')).status).toBe(503);
});
