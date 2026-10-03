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
  /** Precio de transferencia fijo. Si viene, pisa el cálculo con IVA. */
  priceTransfer?: number | null;
}

export interface ProductPrices {
  cash: number;
  transfer: number;
}

export function productPrices(product: PriceableProduct, ivaRate = DEFAULT_IVA_RATE): ProductPrices {
  const cash = round2(product.price);
  if (product.priceTransfer != null) return { cash, transfer: round2(product.priceTransfer) };
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
  /** Cuando el ítem es PARCIAL: cuántos hay */
  availableQuantity?: number | null;
}

/** Cantidad que efectivamente se entrega (y se cobra) de un ítem. */
export function deliveredQuantity(item: Pick<TotalableItem, 'quantity' | 'status' | 'availableQuantity'>): number {
  if (item.status === 'FALTANTE') return 0;
  if (item.status === 'PARCIAL') return Math.max(0, Math.min(item.quantity, item.availableQuantity ?? 0));
  return item.quantity;
}

/** Total de los productos. Los faltantes no se cobran y los parciales se cobran por lo que hay. */
export function orderTotal(items: TotalableItem[]): number {
  return round2(items.reduce((acc, i) => acc + i.unitPrice * deliveredQuantity(i), 0));
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
