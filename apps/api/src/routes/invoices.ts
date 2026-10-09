import { INVOICE_SALE_STATUSES, round2 } from '@papelera/shared';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.ts';
import { arDayRange } from '../lib/ar-day.ts';
import { badRequest, notFound, parseId } from '../lib/http.ts';
import { pricedLines } from '../services/catalog-lines.ts';
import type { Prisma } from '../generated/prisma/client.ts';

export const invoiceSalesRouter = Router();

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

const money = z.number().finite().nonnegative().max(1_000_000_000);

const lineBody = z.object({
  productId: z.number().int().positive().nullable(),
  quantity: z.number().int().positive().max(100_000),
  unitPrice: money.optional(),
  productCode: z.string().trim().min(1).max(40).optional(),
  productName: z.string().trim().min(1).max(300).optional(),
  unit: z.string().trim().min(1).max(80).optional(),
});

const saleFields = {
  customerName: optionalText(120),
  customerCuit: optionalText(20),
  note: optionalText(500),
  total: money.optional(),
  items: z.array(lineBody).min(1, 'Agregá al menos un artículo'),
};

const createSaleBody = z.object(saleFields);

const patchSaleBody = z.object({
  customerName: saleFields.customerName.optional(),
  customerCuit: saleFields.customerCuit.optional(),
  note: saleFields.note.optional(),
  total: money.optional(),
  items: saleFields.items.optional(),
  status: z.enum(INVOICE_SALE_STATUSES).optional(),
});

const listQuery = z.object({
  status: z.enum(INVOICE_SALE_STATUSES).default('PENDIENTE'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

const markBody = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(200),
  status: z.enum(INVOICE_SALE_STATUSES),
});

const saleInclude = {
  items: { orderBy: { id: 'asc' as const } },
} satisfies Prisma.InvoiceSaleInclude;

type FullSale = Prisma.InvoiceSaleGetPayload<{ include: typeof saleInclude }>;

function serializeSale(sale: FullSale) {
  const items = sale.items.map((item) => {
    const unitPrice = Number(item.unitPrice);
    return {
      id: item.id,
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      unit: item.unit,
      unitPrice,
      quantity: item.quantity,
      lineTotal: round2(unitPrice * item.quantity),
    };
  });
  return {
    id: sale.id,
    status: sale.status,
    customerName: sale.customerName,
    customerCuit: sale.customerCuit,
    note: sale.note,
    total: Number(sale.total),
    itemsTotal: round2(items.reduce((acc, item) => acc + item.lineTotal, 0)),
    invoicedAt: sale.invoicedAt,
    createdAt: sale.createdAt,
    items,
  };
}

function dayFilter(date: string | undefined): Prisma.InvoiceSaleWhereInput {
  if (!date) return {};
  try {
    return { createdAt: arDayRange(date) };
  } catch {
    throw badRequest('Fecha inválida');
  }
}

invoiceSalesRouter.get('/', async (req, res) => {
  const { status, date } = listQuery.parse(req.query);
  const sales = await prisma.invoiceSale.findMany({
    where: { status, ...dayFilter(date) },
    include: saleInclude,
    orderBy: { createdAt: 'desc' },
    // Sin fecha, el historial de facturadas se corta para no traer años enteros.
    ...(!date && status === 'FACTURADA' ? { take: 200 } : {}),
  });
  res.json(sales.map(serializeSale));
});

invoiceSalesRouter.get('/pending-count', async (_req, res) => {
  res.json({ count: await prisma.invoiceSale.count({ where: { status: 'PENDIENTE' } }) });
});

invoiceSalesRouter.post('/', async (req, res) => {
  const body = createSaleBody.parse(req.body);
  const items = await pricedLines(body.items);
  const itemsTotal = round2(items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0));
  const sale = await prisma.invoiceSale.create({
    data: {
      customerName: body.customerName,
      customerCuit: body.customerCuit,
      note: body.note,
      total: body.total ?? itemsTotal,
      items: { create: items },
    },
    include: saleInclude,
  });
  res.status(201).json(serializeSale(sale));
});

invoiceSalesRouter.post('/mark', async (req, res) => {
  const { ids, status } = markBody.parse(req.body);
  const result = await prisma.invoiceSale.updateMany({
    where: {
      id: { in: ids },
      status: status === 'FACTURADA' ? 'PENDIENTE' : 'FACTURADA',
    },
    data:
      status === 'FACTURADA'
        ? { status: 'FACTURADA', invoicedAt: new Date() }
        : { status: 'PENDIENTE', invoicedAt: null },
  });
  res.json({ updated: result.count });
});

invoiceSalesRouter.patch('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const body = patchSaleBody.parse(req.body);
  const exists = await prisma.invoiceSale.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw notFound('Venta no encontrada');
  const items = body.items ? await pricedLines(body.items) : null;
  const itemsTotal = items ? round2(items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0)) : null;

  const sale = await prisma.$transaction(async (tx) => {
    if (items) {
      await tx.invoiceSaleItem.deleteMany({ where: { saleId: id } });
      await tx.invoiceSaleItem.createMany({ data: items.map((item) => ({ ...item, saleId: id })) });
    }
    return tx.invoiceSale.update({
      where: { id },
      data: {
        ...(body.customerName !== undefined ? { customerName: body.customerName } : {}),
        ...(body.customerCuit !== undefined ? { customerCuit: body.customerCuit } : {}),
        ...(body.note !== undefined ? { note: body.note } : {}),
        ...(body.total !== undefined ? { total: round2(body.total) } : itemsTotal != null ? { total: itemsTotal } : {}),
        ...(body.status === 'FACTURADA' ? { status: 'FACTURADA' as const, invoicedAt: new Date() } : {}),
        ...(body.status === 'PENDIENTE' ? { status: 'PENDIENTE' as const, invoicedAt: null } : {}),
      },
      include: saleInclude,
    });
  });
  res.json(serializeSale(sale));
});

invoiceSalesRouter.delete('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const exists = await prisma.invoiceSale.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw notFound('Venta no encontrada');
  await prisma.invoiceSale.delete({ where: { id } });
  res.status(204).end();
});
