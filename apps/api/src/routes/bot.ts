import { DELIVERY_METHODS, PAYMENT_METHODS } from '@papelera/shared';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.ts';
import { notFound, parseId } from '../lib/http.ts';
import * as orders from '../services/orders.ts';
import { orderInclude, serializeOrder, serializeProduct } from '../services/serializers.ts';
import { getSettings } from '../services/settings.ts';

/**
 * Endpoints que consume el bot de WhatsApp. Autenticados con el header x-bot-key.
 *
 * Flujo típico:
 *  1. GET  /bot/products                    → arma/manda la lista de precios
 *  2. GET  /bot/customers/:phone             → saluda por nombre y ofrece la dirección guardada
 *  3. POST /bot/quote                        → informa el monto antes de confirmar
 *  4. POST /bot/orders                       → crea el pedido (queda PENDIENTE_REVISION)
 *  5. GET  /bot/messages/pending             → cada pocos segundos, levanta mensajes a enviar
 *     POST /bot/messages/:id/sent|failed     → confirma el envío
 *  6. POST /bot/orders/:id/customer-response → el cliente respondió SI/NO a los faltantes
 *  7. POST /bot/orders/:id/receipt           → el cliente mandó el comprobante
 */
export const botRouter = Router();

const phoneSchema = z
  .string()
  .transform((s) => s.replace(/\D/g, ''))
  .pipe(z.string().min(8, 'Teléfono inválido').max(15, 'Teléfono inválido'));

botRouter.get('/products', async (_req, res) => {
  const [products, settings] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      include: { category: true },
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    }),
    getSettings(),
  ]);
  res.json(products.map((p) => serializeProduct(p, settings.ivaRate)));
});

botRouter.get('/settings', async (_req, res) => {
  const s = await getSettings();
  res.json({ businessName: s.businessName, pickupAddress: s.pickupAddress, transferInfo: s.transferInfo });
});

botRouter.get('/customers/:phone', async (req, res) => {
  const phone = phoneSchema.parse(req.params.phone);
  const customer = await prisma.customer.findUnique({ where: { phone } });
  if (!customer) throw notFound('Cliente no encontrado');
  res.json(customer);
});

/** Pedidos abiertos del cliente: sirve para saber a qué pedido corresponde un "SI"/"NO" o un comprobante. */
botRouter.get('/customers/:phone/open-orders', async (req, res) => {
  const phone = phoneSchema.parse(req.params.phone);
  const list = await prisma.order.findMany({
    where: { customer: { phone }, status: { in: ['PENDIENTE_REVISION', 'ESPERANDO_CLIENTE', 'CONFIRMADO', 'PROGRAMADO'] } },
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
  });
  res.json(list.map(serializeOrder));
});

const itemsSchema = z
  .array(z.object({ code: z.string().trim().min(1), quantity: z.number().int().positive() }))
  .min(1, 'El pedido no tiene productos');

const quoteBody = z.object({
  paymentMethod: z.enum(PAYMENT_METHODS),
  items: itemsSchema,
});

botRouter.post('/quote', async (req, res) => {
  res.json(await orders.quote(quoteBody.parse(req.body)));
});

const orderBody = quoteBody.extend({
  phone: phoneSchema,
  customerName: z.string().trim().min(1).optional(),
  deliveryMethod: z.enum(DELIVERY_METHODS),
  deliveryAddress: z.string().trim().min(1).optional(),
  notes: z.string().trim().optional(),
});

botRouter.post('/orders', async (req, res) => {
  res.status(201).json(await orders.createOrder(orderBody.parse(req.body)));
});

botRouter.post('/orders/:id/customer-response', async (req, res) => {
  const { accept } = z.object({ accept: z.boolean() }).parse(req.body);
  res.json(await orders.customerResponse(parseId(req.params.id), accept));
});

botRouter.post('/orders/:id/receipt', async (req, res) => {
  const { receiptRef } = z.object({ receiptRef: z.string().trim().min(1) }).parse(req.body);
  res.json(await orders.attachReceipt(parseId(req.params.id), receiptRef));
});

// ─── Outbox ──────────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 5;

botRouter.get('/messages/pending', async (_req, res) => {
  const pending = await prisma.outboundMessage.findMany({
    where: { status: 'PENDING', attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });
  res.json(pending);
});

botRouter.post('/messages/:id/sent', async (req, res) => {
  const id = parseId(req.params.id);
  res.json(await prisma.outboundMessage.update({ where: { id }, data: { status: 'SENT', sentAt: new Date(), attempts: { increment: 1 } } }));
});

botRouter.post('/messages/:id/failed', async (req, res) => {
  const id = parseId(req.params.id);
  const { error } = z.object({ error: z.string().optional() }).parse(req.body ?? {});
  const msg = await prisma.outboundMessage.update({
    where: { id },
    data: { attempts: { increment: 1 }, lastError: error ?? null },
  });
  // Después de varios intentos lo marcamos FAILED para que se vea en el panel.
  if (msg.attempts >= MAX_ATTEMPTS) {
    res.json(await prisma.outboundMessage.update({ where: { id }, data: { status: 'FAILED' } }));
    return;
  }
  res.json(msg);
});
