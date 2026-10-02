import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import { env } from './env.ts';
import { requireAdmin, requireBot } from './middleware/auth.ts';
import { errorHandler } from './middleware/error.ts';
import { authRouter } from './routes/auth.ts';
import { botRouter } from './routes/bot.ts';
import { ordersRouter } from './routes/orders.ts';
import { categoriesRouter, productsRouter } from './routes/products.ts';
import { settingsRouter } from './routes/settings.ts';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN.split(',').map((s) => s.trim()) }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/auth', authRouter);

  // Panel: todo requiere login
  const admin = Router();
  admin.use(requireAdmin);
  admin.use('/products', productsRouter);
  admin.use('/categories', categoriesRouter);
  admin.use('/orders', ordersRouter);
  admin.use('/settings', settingsRouter);
  app.use('/api', admin);

  // Bot: requiere x-bot-key
  app.use('/bot', requireBot, botRouter);

  // En producción la API sirve también el panel compilado (una sola URL, sin CORS).
  const webDist = resolve(env.WEB_DIST);
  if (existsSync(webDist)) {
    app.use(express.static(webDist, { index: false, maxAge: '1y', immutable: true }));
    // Cualquier otra ruta GET que no sea de la API devuelve el index del panel (rutas de React Router)
    app.get(/^\/(?!api\/|auth\/|bot\/|assets\/|health$).*/, (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(resolve(webDist, 'index.html'));
    });
  }

  app.use((_req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });
  app.use(errorHandler);
  return app;
}
