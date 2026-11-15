import express from 'express';
import { expect, it, vi } from 'vitest';
vi.mock('../server/controllers/ordersController', () => ({ ordersController: { list: vi.fn(), listAdmin: vi.fn(), updateStatus: vi.fn() } }));
import { ordersRouter } from '../server/routes/orders';
it('returns a uniform retired response without looking up or disclosing a subscriber', async () => {
  const app = express(); app.use(express.json()); app.use(ordersRouter);
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as { port: number }).port}/api/verify-subscriber`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operator: 'sun_direct', smartCardNumber: '40000000001' }) });
    expect(response.status).toBe(410); expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ success: false, error: 'This lookup endpoint has been retired.' });
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
