import { createApp } from './app.ts';
import { prisma } from './db.ts';
import { env } from './env.ts';

const server = createApp().listen(env.PORT, () => {
  console.log(`API escuchando en http://localhost:${env.PORT}`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
