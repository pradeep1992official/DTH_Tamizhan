import express from 'express';
import type { Server } from 'node:http';
import { expect, it } from 'vitest';
import { newConnectionStatusLimiter } from '../server/middleware/rateLimiter';

it('limits booking status lookups to 60 per minute', async () => {
  const app = express();
  app.get('/status', newConnectionStatusLimiter, (_req, res) => res.json({ success: true }));
  const server = await new Promise<Server>(resolve => { const running = app.listen(0, '127.0.0.1', () => resolve(running)); });
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing test server address');
    const url = `http://127.0.0.1:${address.port}/status`;
    for (let count = 0; count < 60; count++) expect((await fetch(url)).status).toBe(200);
    const limited = await fetch(url);
    expect(limited.status).toBe(429);
    expect(await limited.json()).toMatchObject({ code: 'RATE_LIMITED' });
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
