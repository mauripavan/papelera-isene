import { unitPriceFor, type DeliveryMethod, type OrderStatus, type PaymentMethod } from '@papelera/shared';
import { prisma, type Tx } from '../db.ts';
import { conflict, notFound, unprocessable } from '../lib/http.ts';
import { messages } from './messages.ts';
import { orderInclude, serializeOrder, type FullOrder, type SerializedOrder } from './serializers.ts';
import { getSettings } from './settings.ts';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function loadOrder(tx: Tx, id: number): Promise<FullOrder> {
  const order = await tx.order.findUnique({ where: { id }, include: orderInclude });
  if (!order) throw notFound('Pedido no encontrado');
  return order;
}

function assertStatus(order: { status: OrderStatus }, allowed: OrderStatus[], action: string) {
  if (!allowed.includes(order.status)) {
    throw conflict(`No se puede ${action} un pedido en estado ${order.status}`, { status: order.status, allowed });
  }
}

/** Encola un mensaje para que el bot se lo mande al cliente. */
async function enqueue(tx: Tx, order: SerializedOrder, body: string) {
  await tx.outboundMessage.create({ data: { orderId: order.id, phone: order.customer.phone, body } });
}

async function update(tx: Tx, id: number, data: Parameters<Tx['order']['update']>[0]['data']) {
  return serializeOrder(await tx.order.update({ where: { id }, data, include: orderInclude }));
}

// ─── Cotización y alta (bot) ─────────────────────────────────────────────────

export interface OrderDraft {
  phone: string;
  customerName?: string;
  paymentMethod: PaymentMethod;
  deliveryMethod: DeliveryMethod;
  deliveryAddress?: string;
  notes?: string;
  items: { code: string; quantity: number }[];
}

/** Resuelve códigos → productos y calcula precios según el medio de pago. No escribe nada. */
export async function quote(draft: Pick<OrderDraft, 'paymentMethod' | 'items'>, tx: Tx | typeof prisma = prisma) {
  const settings = await getSettings(tx);
  // Si el cliente pidió el mismo código dos veces, se suman las cantidades.
  const merged = new Map<string, number>();
  for (const i of draft.items) {
    const code = i.code.trim().toUpperCase();
    merged.set(code, (merged.get(code) ?? 0) + i.quantity);
  }
  const codes = [...merged.keys()];
  const products = await tx.product.findMany({ where: { code: { in: codes }, active: true } });
  const byCode = new Map(products.map((p) => [p.code.toUpperCase(), p]));

  const unknownCodes = codes.filter((c) => !byCode.has(c));
  if (unknownCodes.length) {
    throw unprocessable('Hay códigos que no existen o no están activos', { unknownCodes });
  }

  const lines = codes.map((code) => {
    const p = byCode.get(code)!;
    const quantity = merged.get(code)!;
    const unitPrice = unitPriceFor({ price: Number(p.price), discriminaIva: p.discriminaIva }, draft.paymentMethod, settings.ivaRate);
    return { productId: p.id, productCode: p.code, productName: p.name, unit: p.unit, unitPrice, quantity, lineTotal: Math.round(unitPrice * quantity * 100) / 100 };
  });
  const total = Math.round(lines.reduce((a, l) => a + l.lineTotal, 0) * 100) / 100;
  return { paymentMethod: draft.paymentMethod, lines, total };
}

export async function createOrder(draft: OrderDraft) {
  return prisma.$transaction(async (tx) => {
    const q = await quote(draft, tx);

    const existing = await tx.customer.findUnique({ where: { phone: draft.phone } });
    const address = draft.deliveryAddress?.trim() || existing?.address || undefined;
    if (draft.deliveryMethod === 'ENVIO' && !address) {
      throw unprocessable('Para envío hace falta una dirección');
    }

    const customer = await tx.customer.upsert({
      where: { phone: draft.phone },
      create: { phone: draft.phone, name: draft.customerName, address: draft.deliveryMethod === 'ENVIO' ? address : undefined },
      update: {
        ...(draft.customerName ? { name: draft.customerName } : {}),
        ...(draft.deliveryMethod === 'ENVIO' && address ? { address } : {}),
      },
    });

    const order = await tx.order.create({
      data: {
        customerId: customer.id,
        paymentMethod: draft.paymentMethod,
        deliveryMethod: draft.deliveryMethod,
        deliveryAddress: draft.deliveryMethod === 'ENVIO' ? address : null,
        notes: draft.notes,
        items: {
          create: q.lines.map((l) => ({
            productId: l.productId,
            productCode: l.productCode,
            productName: l.productName,
            unitPrice: l.unitPrice,
            quantity: l.quantity,
          })),
        },
      },
      include: orderInclude,
    });
    return serializeOrder(order);
  });
}

// ─── Revisión de stock (panel) ───────────────────────────────────────────────

export async function setItemStatus(orderId: number, itemId: number, status: 'PENDIENTE' | 'DISPONIBLE' | 'FALTANTE') {
  return prisma.$transaction(async (tx) => {
    const order = await loadOrder(tx, orderId);
    assertStatus(order, ['PENDIENTE_REVISION'], 'modificar ítems de');
    if (!order.items.some((i) => i.id === itemId)) throw notFound('Ítem no encontrado en el pedido');
    await tx.orderItem.update({ where: { id: itemId }, data: { status } });
    return serializeOrder(await loadOrder(tx, orderId));
  });
}

/** Marca todos los ítems pendientes como disponibles (atajo para el caso feliz). */
export async function markAllAvailable(orderId: number) {
  return prisma.$transaction(async (tx) => {
    const order = await loadOrder(tx, orderId);
    assertStatus(order, ['PENDIENTE_REVISION'], 'modificar ítems de');
    await tx.orderItem.updateMany({ where: { orderId, status: 'PENDIENTE' }, data: { status: 'DISPONIBLE' } });
    return serializeOrder(await loadOrder(tx, orderId));
  });
}

/**
 * Cierra la revisión:
 *  - todo disponible → CONFIRMADO y el bot confirma (pidiendo comprobante si es transferencia)
 *  - algún faltante  → ESPERANDO_CLIENTE y el bot pregunta si sigue con lo que hay
 *  - nada disponible → CANCELADO y el bot avisa
 */
export async function submitReview(orderId: number) {
  return prisma.$transaction(async (tx) => {
    const order = await loadOrder(tx, orderId);
    assertStatus(order, ['PENDIENTE_REVISION'], 'revisar');
    if (order.items.some((i) => i.status === 'PENDIENTE')) {
      throw unprocessable('Marcá cada ítem como disponible o faltante antes de confirmar');
    }
    const settings = await getSettings(tx);
    const missing = order.items.filter((i) => i.status === 'FALTANTE').length;

    if (missing === order.items.length) {
      const updated = await update(tx, orderId, { status: 'CANCELADO' });
      await enqueue(tx, updated, messages.nothingAvailable(updated));
      return updated;
    }
    if (missing > 0) {
      const updated = await update(tx, orderId, { status: 'ESPERANDO_CLIENTE' });
      await enqueue(tx, updated, messages.missingItems(updated));
      return updated;
    }
    const updated = await update(tx, orderId, { status: 'CONFIRMADO' });
    await enqueue(tx, updated, messages.confirmed(updated, settings));
    return updated;
  });
}

// ─── Respuesta del cliente a faltantes (bot) ─────────────────────────────────

export async function customerResponse(orderId: number, accept: boolean) {
  return prisma.$transaction(async (tx) => {
    const order = await loadOrder(tx, orderId);
    assertStatus(order, ['ESPERANDO_CLIENTE'], 'responder');
    if (!accept) {
      const updated = await update(tx, orderId, { status: 'CANCELADO' });
      await enqueue(tx, updated, messages.rejectedByCustomer(updated));
      return updated;
    }
    const settings = await getSettings(tx);
    const updated = await update(tx, orderId, { status: 'CONFIRMADO' });
    await enqueue(tx, updated, messages.confirmed(updated, settings));
    return updated;
  });
}

// ─── Fecha de envío/retiro (panel) ───────────────────────────────────────────

export async function schedule(orderId: number, scheduledFor: Date) {
  return prisma.$transaction(async (tx) => {
    const order = await loadOrder(tx, orderId);
    assertStatus(order, ['CONFIRMADO', 'PROGRAMADO'], 'programar');
    const settings = await getSettings(tx);
    const updated = await update(tx, orderId, { status: 'PROGRAMADO', scheduledFor });
    await enqueue(tx, updated, messages.scheduled(updated, settings));
    return updated;
  });
}

// ─── Pagos ───────────────────────────────────────────────────────────────────

/** El bot registra que el cliente mandó el comprobante. */
export async function attachReceipt(orderId: number, receiptRef: string) {
  return prisma.$transaction(async (tx) => {
    const order = await loadOrder(tx, orderId);
    assertStatus(order, ['CONFIRMADO', 'PROGRAMADO'], 'adjuntar un comprobante a');
    if (order.paymentMethod !== 'TRANSFERENCIA') throw conflict('El pedido no es por transferencia');
    const updated = await update(tx, orderId, { receiptRef, paymentStatus: 'COMPROBANTE_RECIBIDO' });
    await enqueue(tx, updated, messages.receiptReceived(updated));
    return updated;
  });
}

export async function setPaymentStatus(orderId: number, paymentStatus: 'PENDIENTE' | 'COMPROBANTE_RECIBIDO' | 'PAGADO') {
  return prisma.$transaction(async (tx) => {
    const order = await loadOrder(tx, orderId);
    assertStatus(order, ['CONFIRMADO', 'PROGRAMADO', 'ENTREGADO'], 'cambiar el pago de');
    return update(tx, orderId, { paymentStatus });
  });
}

// ─── Cierre (panel) ──────────────────────────────────────────────────────────

export async function markDelivered(orderId: number) {
  return prisma.$transaction(async (tx) => {
    const order = await loadOrder(tx, orderId);
    assertStatus(order, ['CONFIRMADO', 'PROGRAMADO'], 'entregar');
    return update(tx, orderId, { status: 'ENTREGADO' });
  });
}

export async function cancelOrder(orderId: number, reason?: string, notifyCustomer = true) {
  return prisma.$transaction(async (tx) => {
    const order = await loadOrder(tx, orderId);
    assertStatus(order, ['PENDIENTE_REVISION', 'ESPERANDO_CLIENTE', 'CONFIRMADO', 'PROGRAMADO'], 'cancelar');
    const updated = await update(tx, orderId, { status: 'CANCELADO' });
    if (notifyCustomer) await enqueue(tx, updated, messages.cancelledByStore(updated, reason));
    return updated;
  });
}
