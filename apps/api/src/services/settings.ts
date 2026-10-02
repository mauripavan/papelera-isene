import { prisma, type Tx } from '../db.ts';

export async function getSettings(db: Tx | typeof prisma = prisma) {
  const s = await db.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  return { ...s, ivaRate: Number(s.ivaRate) };
}

export type AppSettings = Awaited<ReturnType<typeof getSettings>>;
