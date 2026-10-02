import { ORDER_STATUSES } from '@papelera/shared';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.ts';
import { notFound, parseId } from '../lib/http.ts';
import * as orders from '../services/orders.ts';
import { orderInclude, serializeOrder } from '../services/serializers.ts';

export const ordersRouter = Router();

const listQuery = z.object({
  status: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(',') : undefined))
    .pipe(z.array(z.enum(ORDER_STATUSES)).optional()),
  q: z.string().trim().optional(),
  take: z.coerce.number().int().min(1).max(200).default(100),
});

ordersRouter.get('/', async (req, res) => {
  const { status, q, take } = listQuery.parse(req.query);
  const list = await prisma.order.findMany({
    where: {
      ...(status ? { status: { in: status } } : {}),
      ...(q
        ? {
            OR: [
              ...(Number.isInteger(Number(q)) ? [{ id: Number(q) }] : []),
              { customer: { phone: { contains: q } } },
              { customer: { name: { contains: q, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    },
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
    take,
  });
  res.json(list.map(serializeOrder));
});

/** Cantidad de pedidos por estado, para los contadores del panel. */
ordersRouter.get('/counts', async (_req, res) => {
  const groups = await prisma.order.groupBy({ by: ['status'], _count: { _all: true } });
  res.json(Object.fromEntries(groups.map((g) => [g.status, g._count._all])));
});

ordersRouter.get('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const order = await prisma.order.findUnique({ where: { id }, include: orderInclude });
  if (!order) throw notFound('Pedido no encontrado');
  const messages = await prisma.outboundMessage.findMany({ where: { orderId: id }, orderBy: { createdAt: 'asc' } });
  res.json({ ...serializeOrder(order), messages });
});

const itemStatusBody = z.object({ status: z.enum(['PENDIENTE', 'DISPONIBLE', 'FALTANTE']) });

ordersRouter.patch('/:id/items/:itemId', async (req, res) => {
  const { status } = itemStatusBody.parse(req.body);
  res.json(await orders.setItemStatus(parseId(req.params.id), parseId(req.params.itemId), status));
});

ordersRouter.post('/:id/items/all-available', async (req, res) => {
  res.json(await orders.markAllAvailable(parseId(req.params.id)));
});

ordersRouter.post('/:id/review', async (req, res) => {
  res.json(await orders.submitReview(parseId(req.params.id)));
});

const scheduleBody = z.object({ scheduledFor: z.coerce.date() });

ordersRouter.post('/:id/schedule', async (req, res) => {
  const { scheduledFor } = scheduleBody.parse(req.body);
  res.json(await orders.schedule(parseId(req.params.id), scheduledFor));
});

const paymentBody = z.object({ paymentStatus: z.enum(['PENDIENTE', 'COMPROBANTE_RECIBIDO', 'PAGADO']) });

ordersRouter.post('/:id/payment', async (req, res) => {
  const { paymentStatus } = paymentBody.parse(req.body);
  res.json(await orders.setPaymentStatus(parseId(req.params.id), paymentStatus));
});

ordersRouter.post('/:id/deliver', async (req, res) => {
  res.json(await orders.markDelivered(parseId(req.params.id)));
});

const cancelBody = z.object({ reason: z.string().trim().optional(), notifyCustomer: z.boolean().default(true) });

ordersRouter.post('/:id/cancel', async (req, res) => {
  const { reason, notifyCustomer } = cancelBody.parse(req.body ?? {});
  res.json(await orders.cancelOrder(parseId(req.params.id), reason, notifyCustomer));
});
