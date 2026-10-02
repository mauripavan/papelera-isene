import type { ItemStatus, PaymentMethod } from './enums.ts';

export const DEFAULT_IVA_RATE = 0.21;

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface PriceableProduct {
  /** Precio en efectivo. Si el producto discrimina IVA, es el precio SIN IVA. */
  price: number;
  /** true: en transferencia se le suma el IVA. false: mismo precio en ambos medios. */
  discriminaIva: boolean;
}

export interface ProductPrices {
  cash: number;
  transfer: number;
}

export function productPrices(product: PriceableProduct, ivaRate = DEFAULT_IVA_RATE): ProductPrices {
  const cash = round2(product.price);
  const transfer = product.discriminaIva ? round2(product.price * (1 + ivaRate)) : cash;
  return { cash, transfer };
}

export function unitPriceFor(
  product: PriceableProduct,
  method: PaymentMethod,
  ivaRate = DEFAULT_IVA_RATE,
): number {
  const prices = productPrices(product, ivaRate);
  return method === 'EFECTIVO' ? prices.cash : prices.transfer;
}

export interface TotalableItem {
  unitPrice: number;
  quantity: number;
  status?: ItemStatus;
}

/** Total del pedido. Los ítems marcados como FALTANTE no se cobran. */
export function orderTotal(items: TotalableItem[]): number {
  return round2(
    items
      .filter((i) => i.status !== 'FALTANTE')
      .reduce((acc, i) => acc + i.unitPrice * i.quantity, 0),
  );
}

/** Aplica un aumento (o baja, si es negativo) porcentual a un precio. */
export function applyPercent(price: number, percent: number): number {
  return round2(price * (1 + percent / 100));
}

export function formatARS(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(n);
}
