import { DELIVERY_METHODS, PAYMENT_METHODS, formatArPhone, normalizeArPhone, productPrices } from '@papelera/shared';
import { Router } from 'express';
import { z } from 'zod';
import { getBusinessNumber, isWhatsappEnabled } from '../bot/credentials.ts';
import { prisma } from '../db.ts';
import { tooManyRequests, unprocessable } from '../lib/http.ts';
import { verifyPhoneToken } from '../lib/phone-token.ts';
import { rateLimit } from '../middleware/auth.ts';
import { messages } from '../services/messages.ts';
import * as orders from '../services/orders.ts';
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

/** Datos del negocio para las páginas públicas (pedido web, privacidad, borrado de datos). */
publicRouter.get('/info', async (_req, res) => {
  const s = await getSettings();
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.json({
    businessName: s.businessName,
    pickupAddress: s.pickupAddress,
    minOrderForDelivery: s.minOrderForDelivery,
    whatsappNumber: await getBusinessNumber(),
  });
});

/** El link que manda el bot trae el WhatsApp del cliente firmado. La web lo valida acá. */
publicRouter.get('/whoami', (req, res) => {
  const phone = verifyPhoneToken(typeof req.query.t === 'string' ? req.query.t : null);
  res.setHeader('Cache-Control', 'no-store');
  res.json(phone ? { phone, display: formatArPhone(phone) } : { phone: null });
});

const orderBody = z.object({
  items: z
    .array(z.object({ code: z.string().trim().min(1).max(40), quantity: z.number().int().min(1).max(9999) }))
    .min(1, 'El pedido está vacío')
    .max(150),
  paymentMethod: z.enum(PAYMENT_METHODS),
  deliveryMethod: z.enum(DELIVERY_METHODS),
  address: z.string().trim().max(300).optional(),
  name: z.string().trim().min(2, 'Poné tu nombre').max(80),
  /** WhatsApp tipeado (si no vino del link del bot) */
  phone: z.string().max(40).optional(),
  /** Link firmado del bot */
  t: z.string().max(200).optional(),
  /** Trampa para bots: los humanos no lo ven */
  website: z.string().optional(),
});

/** Pedidos que todavía no se confirmaron por WhatsApp, por número. Evita que llenen el panel con un número ajeno. */
const MAX_UNCONFIRMED_PER_PHONE = 3;

publicRouter.post('/orders', rateLimit({ windowMs: 10 * 60_000, max: 8 }), async (req, res) => {
  const body = orderBody.parse(req.body);
  if (body.website) throw unprocessable('Pedido inválido');

  const linkedPhone = verifyPhoneToken(body.t);
  const phone = linkedPhone ?? normalizeArPhone(body.phone ?? '');
  if (!phone) throw unprocessable('Revisá tu número de WhatsApp: poné el código de área sin 0 ni 15 (ej: 11 2345 6789)');
  if (body.deliveryMethod === 'ENVIO' && !body.address) throw unprocessable('Poné la dirección de envío');

  const settings = await getSettings();
  if (body.deliveryMethod === 'ENVIO' && settings.minOrderForDelivery > 0) {
    const q = await orders.quote(body);
    if (q.total < settings.minOrderForDelivery) {
      throw unprocessable('El pedido no llega a la compra mínima para envío', { minOrderForDelivery: settings.minOrderForDelivery, total: q.total });
    }
  }
  if (!linkedPhone) {
    const unconfirmed = await prisma.order.count({
      where: { source: 'WEB', waConfirmedAt: null, status: { in: ['PENDIENTE_REVISION', 'ESPERANDO_CLIENTE'] }, customer: { phone } },
    });
    if (unconfirmed >= MAX_UNCONFIRMED_PER_PHONE) {
      throw tooManyRequests('Ya hay pedidos esperando que los confirmes por WhatsApp. Confirmalos antes de hacer otro.');
    }
  }

  const order = await orders.createOrder({
    phone,
    customerName: body.name,
    paymentMethod: body.paymentMethod,
    deliveryMethod: body.deliveryMethod,
    deliveryAddress: body.deliveryMethod === 'ENVIO' ? body.address : undefined,
    items: body.items,
    source: 'WEB',
    verified: Boolean(linkedPhone),
  });

  // Vino del link del bot: el chat está abierto, le confirmamos por WhatsApp en el momento
  if (linkedPhone) {
    await prisma.outboundMessage.create({ data: { orderId: order.id, phone, body: messages.received(order, true) } });
  }

  const businessNumber = await getBusinessNumber();
  const full = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, select: { webCode: true } });
  const confirmText = full.webCode ? `Hola! Hice el pedido web #${order.id} (código ${full.webCode}). Quiero recibir los avisos por acá.` : null;
  res.status(201).json({
    id: order.id,
    total: order.subtotal,
    phoneDisplay: formatArPhone(phone),
    whatsappConfirmed: Boolean(linkedPhone),
    whatsappEnabled: isWhatsappEnabled(),
    confirmUrl: confirmText && businessNumber ? `https://wa.me/${businessNumber}?text=${encodeURIComponent(confirmText)}` : null,
    confirmText,
  });
});
