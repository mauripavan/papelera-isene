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

  app.use((_req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });
  app.use(errorHandler);
  return app;
}
