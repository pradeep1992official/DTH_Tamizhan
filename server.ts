import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { getApps, initializeApp } from 'firebase-admin/app';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };
import { initStoreFromDisk, OPERATORS } from './server/store';
import { apiLimiter } from './server/middleware/rateLimiter';
import { ordersRouter } from './server/routes/orders';
import { plansRouter } from './server/routes/plans';
import { adminRouter } from './server/routes/admin';
import { aiRouter } from './server/routes/ai';

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

const PORT = 3000;

async function startServer() {
  const app = express();

  // 1. Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows Vite HMR and dynamic client scripts in iframe
      crossOriginEmbedderPolicy: false,
    })
  );

  // 2. Request Parsing Middleware (Mounted BEFORE route handlers)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 3. Global Rate Limiter for /api routes
  app.use('/api', apiLimiter);

  // 4. Base Health & Operators Information Endpoints
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'DTH Tamizhan Core Service',
    });
  });

  app.get('/api/operators', (_req: Request, res: Response) => {
    res.json({
      success: true,
      operators: OPERATORS,
    });
  });

  // 5. Mount Modular API Routers
  app.use(ordersRouter);
  app.use(plansRouter);
  app.use(adminRouter);
  app.use(aiRouter);

  // 6. Vite middleware for development or Static Asset serving in Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DTH Tamizhan] Unified Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Startup Error]', err);
  process.exit(1);
});
