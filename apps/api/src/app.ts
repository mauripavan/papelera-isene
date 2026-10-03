import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import { env } from './env.ts';
import { requireAdmin, requireBot } from './middleware/auth.ts';
import type { Messenger } from './bot/whatsapp.ts';
import { errorHandler } from './middleware/error.ts';
import { authRouter } from './routes/auth.ts';
import { publicRouter } from './routes/public.ts';
import { whatsappAdminRouter } from './routes/whatsapp-admin.ts';
import { whatsappRouter } from './routes/whatsapp.ts';
import { botRouter } from './routes/bot.ts';
import { ordersRouter } from './routes/orders.ts';
import { categoriesRouter, productsRouter } from './routes/products.ts';
import { settingsRouter } from './routes/settings.ts';

export function createApp(opts: { messenger?: Messenger } = {}) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(
    helmet({
      // El botón "Conectar WhatsApp" usa el SDK de Facebook: carga su script y abre un popup
      // que nos habla con postMessage (por eso COOP permite popups).
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      contentSecurityPolicy: {
        directives: {
          'script-src': ["'self'", 'https://connect.facebook.net'],
          'frame-src': ["'self'", 'https://www.facebook.com', 'https://web.facebook.com', 'https://*.facebook.com'],
          'connect-src': ["'self'", 'https://*.facebook.com', 'https://graph.facebook.com'],
          'img-src': ["'self'", 'data:', 'blob:', 'https:'],
        },
      },
    }),
  );
  app.use(cors({ origin: env.WEB_ORIGIN.split(',').map((s) => s.trim()) }));
  // Guardamos el body crudo para validar la firma de los webhooks de WhatsApp
  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        (req as typeof req & { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/auth', authRouter);
  app.use('/public', publicRouter);
  app.use('/whatsapp', whatsappRouter(opts.messenger));

  // Panel: todo requiere login
  const admin = Router();
  admin.use(requireAdmin);
  admin.use('/products', productsRouter);
  admin.use('/categories', categoriesRouter);
  admin.use('/orders', ordersRouter);
  admin.use('/settings', settingsRouter);
  admin.use('/whatsapp', whatsappAdminRouter);
  app.use('/api', admin);

  // Bot: requiere x-bot-key
  app.use('/bot', requireBot, botRouter);

  // En producción la API sirve también el panel compilado (una sola URL, sin CORS).
  const webDist = resolve(env.WEB_DIST);
  if (existsSync(webDist)) {
    app.use(express.static(webDist, { index: false, maxAge: '1y', immutable: true }));
    // Cualquier otra ruta GET que no sea de la API devuelve el index del panel (rutas de React Router)
    app.get(/^\/(?!api\/|auth\/|bot\/|public\/|whatsapp\/|assets\/|health$).*/, (_req, res) => {
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
