import { createApp } from './app.ts';
import { prisma } from './db.ts';
import { startOutboxWorker } from './bot/worker.ts';
import { loadCredentials } from './bot/credentials.ts';
import { env, publicUrl } from './env.ts';

const credentials = await loadCredentials();
const server = createApp().listen(env.PORT, () => {
  console.log(`API escuchando en http://localhost:${env.PORT}`);
  // El worker corre siempre: si WhatsApp no está configurado, no manda nada
  startOutboxWorker();
  if (credentials) {
    const origin = credentials.source === 'connection' ? 'número conectado desde el panel' : 'variables de entorno';
    console.log(`Bot de WhatsApp activo (${origin}). Webhook: ${publicUrl}/whatsapp/webhook`);
  } else {
    console.log('Bot de WhatsApp apagado: conectá un número desde Ajustes o cargá WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID');
  }
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
