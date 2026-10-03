import { applyPercent } from '@papelera/shared';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.ts';
import { notFound, parseId, unprocessable } from '../lib/http.ts';
import { serializeProduct } from '../services/serializers.ts';
import { getSettings } from '../services/settings.ts';
import type { Prisma } from '../generated/prisma/client.ts';

export const productsRouter = Router();
export const categoriesRouter = Router();

// ─── Productos ───────────────────────────────────────────────────────────────

const listQuery = z.object({
  q: z.string().trim().optional(),
  categoryId: z.coerce.number().int().optional(),
  active: z.enum(['true', 'false', 'all']).default('all'),
  review: z.enum(['true', 'false', 'all']).default('all'),
});

productsRouter.get('/', async (req, res) => {
  const { q, categoryId, active, review } = listQuery.parse(req.query);
  const where: Prisma.ProductWhereInput = {
    ...(categoryId ? { categoryId } : {}),
    ...(active !== 'all' ? { active: active === 'true' } : {}),
    ...(review !== 'all' ? { needsReview: review === 'true' } : {}),
    ...(q
      ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { code: { contains: q, mode: 'insensitive' } }] }
      : {}),
  };
  const [products, settings] = await Promise.all([
    prisma.product.findMany({ where, include: { category: true }, orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }] }),
    getSettings(),
  ]);
  res.json(products.map((p) => serializeProduct(p, settings.ivaRate)));
});

// Ojo: los valores por defecto van SOLO en el alta. En Zod, `.partial()` conserva los
// `.default()`, y un PATCH con un solo campo pisaría presentación, IVA y activo.
const productFields = z.object({
  code: z.string().trim().min(1).max(20).transform((s) => s.toUpperCase()),
  name: z.string().trim().min(1),
  unit: z.string().trim().min(1),
  price: z.coerce.number().nonnegative(),
  discriminaIva: z.boolean(),
  /** Precio de transferencia fijo; null = se calcula con el IVA */
  priceTransferFixed: z.coerce.number().nonnegative().nullable(),
  active: z.boolean(),
  needsReview: z.boolean(),
  reviewNote: z.string().trim().nullable(),
  categoryId: z.number().int().nullable(),
});

const createProductBody = productFields.extend({
  unit: productFields.shape.unit.default('unidad'),
  discriminaIva: productFields.shape.discriminaIva.default(false),
  active: productFields.shape.active.default(true),
  priceTransferFixed: productFields.shape.priceTransferFixed.optional(),
  needsReview: productFields.shape.needsReview.optional(),
  reviewNote: productFields.shape.reviewNote.optional(),
  categoryId: productFields.shape.categoryId.optional(),
});

const updateProductBody = productFields.partial();

/** El panel habla de priceTransferFixed; en la base la columna es priceTransfer */
function toDb<T extends { priceTransferFixed?: number | null }>({ priceTransferFixed, ...rest }: T) {
  return { ...rest, ...(priceTransferFixed !== undefined ? { priceTransfer: priceTransferFixed } : {}) };
}

/** Cantidad de productos marcados para revisar */
productsRouter.get('/review-count', async (_req, res) => {
  res.json({ count: await prisma.product.count({ where: { needsReview: true } }) });
});

productsRouter.post('/', async (req, res) => {
  const data = toDb(createProductBody.parse(req.body));
  const p = await prisma.product.create({ data, include: { category: true } });
  res.status(201).json(serializeProduct(p, (await getSettings()).ivaRate));
});

productsRouter.patch('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const data = toDb(updateProductBody.parse(req.body));
  const exists = await prisma.product.findUnique({ where: { id }, select: { id: true, price: true, active: true } });
  if (!exists) throw notFound('Producto no encontrado');
  const finalPrice = data.price ?? Number(exists.price);
  const finalActive = data.active ?? exists.active;
  if (finalActive && finalPrice <= 0) throw unprocessable('No se puede activar un producto sin precio');
  const p = await prisma.product.update({ where: { id }, data, include: { category: true } });
  res.json(serializeProduct(p, (await getSettings()).ivaRate));
});

/** No borramos productos (están referenciados en pedidos viejos): se desactivan. */
productsRouter.delete('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  await prisma.product.update({ where: { id }, data: { active: false } });
  res.status(204).end();
});

const bulkPriceBody = z.object({
  /** Porcentaje a aplicar: 10 = +10%, -5 = -5% */
  percent: z.number().min(-90).max(1000).refine((n) => n !== 0, 'El porcentaje no puede ser 0'),
  /** Si se omite, aplica a todos los productos activos */
  categoryId: z.number().int().optional(),
  productIds: z.array(z.number().int()).optional(),
});

/** Aumento masivo por porcentaje (todo, por categoría o por selección). */
productsRouter.post('/bulk-price', async (req, res) => {
  const { percent, categoryId, productIds } = bulkPriceBody.parse(req.body);
  const products = await prisma.product.findMany({
    where: {
      active: true,
      ...(categoryId ? { categoryId } : {}),
      ...(productIds?.length ? { id: { in: productIds } } : {}),
    },
    select: { id: true, price: true, priceTransfer: true },
  });
  await prisma.$transaction(
    products.map((p) =>
      prisma.product.update({
        where: { id: p.id },
        data: {
          price: applyPercent(Number(p.price), percent),
          // Si tiene precio de transferencia fijo, también se actualiza
          ...(p.priceTransfer != null ? { priceTransfer: applyPercent(Number(p.priceTransfer), percent) } : {}),
        },
      }),
    ),
  );
  res.json({ updated: products.length });
});

// ─── Categorías ──────────────────────────────────────────────────────────────

categoriesRouter.get('/', async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { products: true } } },
  });
  res.json(categories.map((c) => ({ id: c.id, name: c.name, sortOrder: c.sortOrder, productCount: c._count.products })));
});

const categoryFields = z.object({ name: z.string().trim().min(1), sortOrder: z.number().int() });
const categoryBody = categoryFields.extend({ sortOrder: categoryFields.shape.sortOrder.default(0) });

categoriesRouter.post('/', async (req, res) => {
  res.status(201).json(await prisma.category.create({ data: categoryBody.parse(req.body) }));
});

categoriesRouter.patch('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  res.json(await prisma.category.update({ where: { id }, data: categoryFields.partial().parse(req.body) }));
});

categoriesRouter.delete('/:id', async (req, res) => {
  // Los productos quedan sin categoría (onDelete: SetNull)
  await prisma.category.delete({ where: { id: parseId(req.params.id) } });
  res.status(204).end();
});
