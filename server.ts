import { pageHandler, globalErrorHandler } from './server/pages';
import { paymentsRouter } from './server/routes/payments';
import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer } from 'node:http';
import { startReceiptEmailWorker, emailDeliveryConfig } from './server/emailDelivery';
import { emailRouter } from './server/routes/email';
import { customerHistoryRouter } from './server/routes/customerHistory';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { getApps, initializeApp } from 'firebase-admin/app';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };
import { initStoreFromDisk } from './server/models/store';
import { apiLimiter } from './server/middleware/rateLimiter';
import { ordersRouter } from './server/routes/orders';
import { plansRouter } from './server/routes/plans';
import { adminRouter } from './server/routes/admin';
import { aiRouter } from './server/routes/ai';
import { coreRouter } from './server/routes/core';

dotenv.config();

// Initialize Firebase Admin SDK for server-side token verification
if (!getApps().length) {
  try {
    initializeApp({
      projectId: firebaseConfig.projectId,
    });
  } catch (initErr) {
    console.warn('[firebase-admin] init error:', initErr);
  }
}

// Initialize server disk persistence
initStoreFromDisk();

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  let vite: Awaited<ReturnType<typeof createViteServer>> | undefined;

  // Enable trust proxy for reverse proxies (Google Cloud Run / Load Balancer)
  app.set('trust proxy', 1);

  // 1. Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows Vite HMR and dynamic client scripts in iframe
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    })
  );

  // 2. Request Parsing Middleware (Mounted BEFORE route handlers)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 3. Global Rate Limiter for /api routes
  app.use('/api', apiLimiter);

  // 4. Mount MVC API routes
  app.use(coreRouter);
  app.use(ordersRouter);
  app.use(paymentsRouter);
  app.use(plansRouter);
  app.use(adminRouter);
  app.use(aiRouter);
  app.use(emailRouter);
  app.use(customerHistoryRouter);

  app.use('/api', (_req, res) => { res.status(404).json({ success: false, error: 'API route not found.' }); });

  // 5. Vite middleware for development or Static Asset serving in Production
  if (process.env.NODE_ENV !== 'production') {
    vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer } },
      appType: 'custom',
    });
    app.use(vite.middlewares);
    app.use(pageHandler(async req => vite!.transformIndexHtml(req.originalUrl, fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8'))));
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false }));
    app.use(pageHandler(() => fs.readFileSync(path.join(distPath, 'index.html'), 'utf8')));
  }
  app.use(globalErrorHandler);

  try {
    await new Promise<void>((resolve, reject) => {
      const onError = (error: NodeJS.ErrnoException) => reject(error.code === 'EADDRINUSE'
        ? new Error(`Port ${PORT} is already in use. Stop the other DTH Tamizhan server before starting another instance.`) : error);
      httpServer.once('error', onError);
      httpServer.listen(PORT, '0.0.0.0', () => { httpServer.off('error', onError); resolve(); });
    });
  } catch (error) { await vite?.close(); throw error; }
  console.log(`[DTH Tamizhan] Unified Server listening on http://0.0.0.0:${PORT}`);
  const stopEmailWorker = startReceiptEmailWorker();
  const emailConfig = emailDeliveryConfig();
  console.log(`[email] Brevo ${emailConfig.enabled && emailConfig.configured ? 'enabled' : 'disabled or not configured'}.`);

  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    stopEmailWorker();
    const timeout = setTimeout(() => process.exit(1), 5000);
    timeout.unref();
    await vite?.close();
    httpServer.closeAllConnections();
    httpServer.close(() => { clearTimeout(timeout); process.exit(0); });
  };
  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
}

startServer().catch((err) => {
  console.error('[Server Startup Error]', err);
  process.exit(1);
});
