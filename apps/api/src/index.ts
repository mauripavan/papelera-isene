import { createApp } from './app.ts';
import { prisma } from './db.ts';
import { startOutboxWorker } from './bot/worker.ts';
import { env, publicUrl, whatsappEnabled } from './env.ts';

const server = createApp().listen(env.PORT, () => {
  console.log(`API escuchando en http://localhost:${env.PORT}`);
  if (whatsappEnabled) {
    startOutboxWorker();
    console.log(`Bot de WhatsApp activo. Webhook: ${publicUrl}/whatsapp/webhook`);
  } else {
    console.log('Bot de WhatsApp apagado (faltan WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID)');
  }
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
