import { PURCHASE_ORDER_STATUSES } from '@papelera/shared';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.ts';
import { notFound, parseId, unprocessable } from '../lib/http.ts';
import { stockLines, type LineDraft } from '../services/catalog-lines.ts';
import type { Prisma } from '../generated/prisma/client.ts';

export const suppliersRouter = Router();
export const purchaseOrdersRouter = Router();

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

const optionalEmail = z
  .string()
  .trim()
  .max(200)
  .superRefine((value, ctx) => {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      ctx.addIssue({ code: 'custom', message: 'Email inválido' });
    }
  })
  .transform((value) => value || null);

const supplierFields = {
  legalName: z.string().trim().min(1, 'La razón social es obligatoria').max(200),
  email: optionalEmail,
  phone: optionalText(40),
  contactName: optionalText(120),
};

const createSupplierBody = z.object(supplierFields);
const patchSupplierBody = z.object({
  legalName: supplierFields.legalName.optional(),
  email: optionalEmail.optional(),
  phone: optionalText(40).optional(),
  contactName: optionalText(120).optional(),
});

function serializeSupplier(supplier: {
  id: number;
  legalName: string;
  email: string | null;
  phone: string | null;
  contactName: string | null;
  createdAt: Date;
}) {
  return {
    id: supplier.id,
    legalName: supplier.legalName,
    email: supplier.email,
    phone: supplier.phone,
    contactName: supplier.contactName,
    createdAt: supplier.createdAt,
  };
}

suppliersRouter.get('/', async (_req, res) => {
  const suppliers = await prisma.supplier.findMany({ orderBy: { legalName: 'asc' } });
  res.json(suppliers.map(serializeSupplier));
});

suppliersRouter.post('/', async (req, res) => {
  const data = createSupplierBody.parse(req.body);
  const supplier = await prisma.supplier.create({ data });
  res.status(201).json(serializeSupplier(supplier));
});

suppliersRouter.patch('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const data = patchSupplierBody.parse(req.body);
  const exists = await prisma.supplier.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw notFound('Proveedor no encontrado');
  const supplier = await prisma.supplier.update({ where: { id }, data });
  res.json(serializeSupplier(supplier));
});

suppliersRouter.delete('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const exists = await prisma.supplier.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw notFound('Proveedor no encontrado');
  // Los pedidos quedan como "Sin proveedor" (onDelete: SetNull).
  await prisma.supplier.delete({ where: { id } });
  res.status(204).end();
});

const lineBody = z.object({
  productId: z.number().int().positive().nullable(),
  quantity: z.number().int().positive().max(100_000),
  productCode: z.string().trim().min(1).max(40).optional(),
  productName: z.string().trim().min(1).max(300).optional(),
  unit: z.string().trim().min(1).max(80).optional(),
});

const createOrderBody = z.object({
  supplierId: z.number().int().positive().nullable(),
  notes: optionalText(1000),
  items: z.array(lineBody).min(1, 'Agregá al menos un artículo'),
});

const patchOrderBody = z.object({
  supplierId: z.number().int().positive().nullable().optional(),
  notes: optionalText(1000).optional(),
  status: z.enum(PURCHASE_ORDER_STATUSES).optional(),
  items: z.array(lineBody).min(1).optional(),
});

const purchaseInclude = {
  supplier: true,
  items: { orderBy: { id: 'asc' as const } },
} satisfies Prisma.PurchaseOrderInclude;

type FullPurchase = Prisma.PurchaseOrderGetPayload<{ include: typeof purchaseInclude }>;

function serializePurchase(order: FullPurchase) {
  return {
    id: order.id,
    status: order.status,
    supplierId: order.supplierId,
    notes: order.notes,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    supplier: order.supplier
      ? {
          id: order.supplier.id,
          legalName: order.supplier.legalName,
          email: order.supplier.email,
          phone: order.supplier.phone,
          contactName: order.supplier.contactName,
        }
      : null,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      unit: item.unit,
      quantity: item.quantity,
    })),
  };
}

async function assertSupplier(supplierId: number | null) {
  if (supplierId == null) return;
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId }, select: { id: true } });
  if (!supplier) throw unprocessable('El proveedor no existe');
}

const STATUS_RANK = { PENDIENTE: 0, PEDIDO: 1, RECIBIDO: 2 } as const;

purchaseOrdersRouter.get('/', async (_req, res) => {
  const orders = await prisma.purchaseOrder.findMany({ include: purchaseInclude, orderBy: { createdAt: 'desc' } });
  orders.sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.createdAt.getTime() - a.createdAt.getTime());
  res.json(orders.map(serializePurchase));
});

purchaseOrdersRouter.post('/', async (req, res) => {
  const body = createOrderBody.parse(req.body);
  await assertSupplier(body.supplierId);
  const items = await stockLines(body.items satisfies LineDraft[]);
  const order = await prisma.purchaseOrder.create({
    data: {
      supplierId: body.supplierId,
      notes: body.notes,
      items: { create: items },
    },
    include: purchaseInclude,
  });
  res.status(201).json(serializePurchase(order));
});

purchaseOrdersRouter.patch('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const body = patchOrderBody.parse(req.body);
  const exists = await prisma.purchaseOrder.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw notFound('Pedido no encontrado');
  if (body.supplierId !== undefined) await assertSupplier(body.supplierId);
  const items = body.items ? await stockLines(body.items) : null;

  const order = await prisma.$transaction(async (tx) => {
    if (items) {
      await tx.purchaseOrderItem.deleteMany({ where: { orderId: id } });
      await tx.purchaseOrderItem.createMany({ data: items.map((item) => ({ ...item, orderId: id })) });
    }
    return tx.purchaseOrder.update({
      where: { id },
      data: {
        ...(body.supplierId !== undefined ? { supplierId: body.supplierId } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
      },
      include: purchaseInclude,
    });
  });
  res.json(serializePurchase(order));
});

purchaseOrdersRouter.delete('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const exists = await prisma.purchaseOrder.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw notFound('Pedido no encontrado');
  await prisma.purchaseOrder.delete({ where: { id } });
  res.status(204).end();
});
