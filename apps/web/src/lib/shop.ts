import { useCallback, useEffect, useState } from 'react';

/** Producto tal como lo publica /public/price-list */
export interface PublicProduct {
  code: string;
  name: string;
  unit: string;
  category: string;
  priceCash: number;
  priceTransfer: number;
}

export interface PriceList {
  businessName: string;
  pickupAddress: string;
  updatedAt: string;
  products: PublicProduct[];
}

export interface PublicInfo {
  businessName: string;
  pickupAddress: string;
  minOrderForDelivery: number;
  whatsappNumber: string | null;
}

export interface WebOrderResult {
  id: number;
  total: number;
  phoneDisplay: string;
  whatsappConfirmed: boolean;
  whatsappEnabled: boolean;
  confirmUrl: string | null;
  confirmText: string | null;
}

export type Cart = Record<string, number>;

export interface CheckoutData {
  paymentMethod?: 'EFECTIVO' | 'TRANSFERENCIA';
  deliveryMethod?: 'RETIRO' | 'ENVIO';
  address: string;
  name: string;
  phone: string;
}

const CART_KEY = 'papelera.cart';
const CHECKOUT_KEY = 'papelera.checkout';

/** localStorage puede no estar (modo privado, bloqueado): el carrito igual funciona en memoria. */
function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}

export function useStored<T>(key: 'cart' | 'checkout', fallback: T) {
  const storageKey = key === 'cart' ? CART_KEY : CHECKOUT_KEY;
  const [value, setValue] = useState<T>(() => load(storageKey, fallback));
  useEffect(() => save(storageKey, value), [storageKey, value]);
  return [value, setValue] as const;
}

export function useCart() {
  const [cart, setCart] = useStored<Cart>('cart', {});
  const setQty = useCallback(
    (code: string, qty: number) =>
      setCart((c) => {
        const next = { ...c };
        if (qty > 0) next[code] = Math.min(9999, Math.floor(qty));
        else delete next[code];
        return next;
      }),
    [setCart],
  );
  const clear = useCallback(() => setCart({}), [setCart]);
  return { cart, setQty, clear, setCart };
}

/** Pasos del pedido, en el hash de la URL para que el botón "atrás" del celular funcione. */
export const STEPS = ['pedido', 'pago', 'entrega', 'datos', 'resumen'] as const;
export type Step = (typeof STEPS)[number] | 'listo' | null;

export function useStep(): [Step, (s: Step, replace?: boolean) => void] {
  const read = (): Step => {
    const h = window.location.hash.replace('#', '');
    return (STEPS as readonly string[]).includes(h) || h === 'listo' ? (h as Step) : null;
  };
  const [step, setStep] = useState<Step>(read);
  useEffect(() => {
    const on = () => setStep(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = useCallback((s: Step, replace = false) => {
    const url = `${window.location.pathname}${window.location.search}${s ? `#${s}` : ''}`;
    if (replace) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
    setStep(s);
    window.scrollTo({ top: 0 });
  }, []);
  return [step, go];
}

export interface CartLine {
  product: PublicProduct;
  quantity: number;
}

export function cartLines(cart: Cart, byCode: Map<string, PublicProduct>): CartLine[] {
  return Object.entries(cart)
    .map(([code, quantity]) => ({ product: byCode.get(code)!, quantity }))
    .filter((l) => l.product);
}

export function cartTotals(lines: CartLine[]) {
  const r = (n: number) => Math.round(n * 100) / 100;
  return {
    items: lines.reduce((a, l) => a + l.quantity, 0),
    cash: r(lines.reduce((a, l) => a + l.product.priceCash * l.quantity, 0)),
    transfer: r(lines.reduce((a, l) => a + l.product.priceTransfer * l.quantity, 0)),
  };
}
