import { orderTotal, productPrices, round2 } from '@papelera/shared';
import type { Prisma } from '../generated/prisma/client.ts';

type ProductWithCategory = Prisma.ProductGetPayload<{ include: { category: true } }>;

export function serializeProduct(p: ProductWithCategory, ivaRate: number) {
  const price = Number(p.price);
  const priceTransfer = p.priceTransfer == null ? null : Number(p.priceTransfer);
  const prices = productPrices({ price, discriminaIva: p.discriminaIva, priceTransfer }, ivaRate);
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    unit: p.unit,
    price,
    discriminaIva: p.discriminaIva,
    /** Precio de transferencia cargado a mano (null = se calcula) */
    priceTransferFixed: priceTransfer,
    active: p.active,
    needsReview: p.needsReview,
    reviewNote: p.reviewNote,
    categoryId: p.categoryId,
    category: p.category ? { id: p.category.id, name: p.category.name } : null,
    priceCash: prices.cash,
    priceTransfer: prices.transfer,
    updatedAt: p.updatedAt,
  };
}

export const orderInclude = {
  customer: true,
  items: { orderBy: { id: 'asc' } },
} satisfies Prisma.OrderInclude;

export type FullOrder = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export function serializeOrder(o: FullOrder) {
  const items = o.items.map((i) => {
    const unitPrice = Number(i.unitPrice);
    return {
      id: i.id,
      productId: i.productId,
      productCode: i.productCode,
      productName: i.productName,
      unitPrice,
      quantity: i.quantity,
      status: i.status,
      lineTotal: round2(unitPrice * i.quantity),
    };
  });
  return {
    id: o.id,
    status: o.status,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    deliveryMethod: o.deliveryMethod,
    deliveryAddress: o.deliveryAddress,
    scheduledFor: o.scheduledFor,
    receiptRef: o.receiptRef,
    notes: o.notes,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    customer: { id: o.customer.id, phone: o.customer.phone, name: o.customer.name, address: o.customer.address },
    items,
    /** Total original, sin descontar faltantes */
    subtotal: orderTotal(items.map((i) => ({ ...i, status: 'DISPONIBLE' as const }))),
    /** Total a cobrar: no incluye ítems faltantes */
    total: orderTotal(items),
  };
}

export type SerializedOrder = ReturnType<typeof serializeOrder>;
