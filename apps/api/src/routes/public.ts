import { productPrices } from '@papelera/shared';
import { Router } from 'express';
import { prisma } from '../db.ts';
import { getSettings } from '../services/settings.ts';

/** Datos públicos (sin login): la lista de precios que el bot comparte por link. */
export const publicRouter = Router();

publicRouter.get('/price-list', async (_req, res) => {
  const [settings, products] = await Promise.all([
    getSettings(),
    prisma.product.findMany({
      where: { active: true },
      include: { category: true },
      orderBy: [{ category: { sortOrder: 'asc' } }, { code: 'asc' }],
    }),
  ]);
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.json({
    businessName: settings.businessName,
    pickupAddress: settings.pickupAddress,
    updatedAt: products.reduce((max, p) => (p.updatedAt > max ? p.updatedAt : max), new Date(0)),
    products: products.map((p) => {
      const prices = productPrices(
        { price: Number(p.price), discriminaIva: p.discriminaIva, priceTransfer: p.priceTransfer == null ? null : Number(p.priceTransfer) },
        settings.ivaRate,
      );
      return { code: p.code, name: p.name, unit: p.unit, category: p.category?.name ?? 'Otros', priceCash: prices.cash, priceTransfer: prices.transfer };
    }),
  });
});

/** Datos del negocio para las páginas públicas (privacidad, borrado de datos). */
publicRouter.get('/info', async (_req, res) => {
  const s = await getSettings();
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json({ businessName: s.businessName, pickupAddress: s.pickupAddress });
});
