import express from 'express';
import { z } from 'zod';
import { expect, it, vi } from 'vitest';
import { registerYoupiRoutes } from '../server/youpi';
import { paymentMode } from '../server/payments';
import { settingsSchema } from '../src/lib/newConnectionCatalog';
import { advanceQuote } from '../src/lib/newConnectionOrders';

it('never selects the retired gateway from an old payment mode value', () => {
  expect(paymentMode('youpi')).toBe('production');
});
it('removes retired options from stored settings while keeping Razorpay enabled', () => {
  const settings = settingsSchema.parse({ enabledProviders: ['razorpay', 'youpi'], defaultProvider: 'youpi', advanceMode: 'full' });
  expect(settings.enabledProviders).toEqual(['razorpay']);
  expect(settings.defaultProvider).toBe('razorpay');
  expect(settings.advanceMode).toBe('full');
  const retiredOnly = settingsSchema.parse({ enabledProviders: ['youpi'], defaultProvider: 'youpi', advanceMode: 'full' });
  expect(retiredOnly.enabledProviders).toEqual([]); expect(retiredOnly.defaultProvider).toBe('none');
  expect(retiredOnly.advanceMode).toBe('full'); // Retiring a gateway must not turn a paid booking into a free one.
});
it('rejects the retired creation endpoint before provider calls or payment writes', async () => {
  const router = express.Router(); const operator = vi.fn(); const plans = vi.fn();
  registerYoupiRoutes(router, z.object({}), operator, plans);
  const app = express(); app.use(express.json()); app.use(router);
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as {port:number}).port}/api/payments/youpi`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    expect(response.status).toBe(410); expect((await response.json()).error).toContain('Razorpay');
    expect(operator).not.toHaveBeenCalled(); expect(plans).not.toHaveBeenCalled();
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
it.each(['full', 'partial'] as const)('preserves %s advance through repeated legacy settings parsing', mode => {
  const legacy = { enabledProviders: ['youpi'], defaultProvider: 'youpi', advanceMode: mode, partialAmount: 250 };
  const first = settingsSchema.parse(legacy);
  const second = settingsSchema.parse(first);
  expect(second).toEqual(first); expect(settingsSchema.parse(second)).toEqual(first);
  const quote = advanceQuote({ hardware: 600, installation: 100, pack: 300, perConnectionTotal: 1000, total: 1000, currency: 'INR' }, second);
  expect(quote.amountDueNow).toBe(mode === 'full' ? 1000 : 250);
  expect(second.enabledProviders).toEqual([]);
});
