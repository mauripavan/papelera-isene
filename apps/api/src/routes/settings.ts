import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.ts';
import { getSettings } from '../services/settings.ts';

export const settingsRouter = Router();

settingsRouter.get('/', async (_req, res) => {
  res.json(await getSettings());
});

const body = z.object({
  businessName: z.string().trim().min(1),
  ivaRate: z.number().min(0).max(1),
  transferInfo: z.string(),
  pickupAddress: z.string(),
  /** Compra mínima para hacer envíos (0 = sin mínimo) */
  minOrderForDelivery: z.number().min(0),
});

settingsRouter.patch('/', async (req, res) => {
  const data = body.partial().parse(req.body);
  await getSettings(); // asegura que exista la fila
  await prisma.settings.update({ where: { id: 1 }, data });
  res.json(await getSettings());
});
