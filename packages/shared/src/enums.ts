export const PAYMENT_METHODS = ['EFECTIVO', 'TRANSFERENCIA'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const DELIVERY_METHODS = ['RETIRO', 'ENVIO'] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

/**
 * Ciclo de vida de un pedido:
 *
 *  PENDIENTE_REVISION ──(todo disponible)──────────────▶ CONFIRMADO ──(fecha)──▶ PROGRAMADO ──▶ ENTREGADO
 *        │                                                   ▲
 *        └──(hay faltantes)──▶ ESPERANDO_CLIENTE ──(acepta)──┘
 *                                      └──(rechaza)──▶ CANCELADO
 *
 * Cualquier pedido no entregado puede pasar a CANCELADO desde el panel.
 */
export const ORDER_STATUSES = [
  'PENDIENTE_REVISION',
  'ESPERANDO_CLIENTE',
  'CONFIRMADO',
  'PROGRAMADO',
  'ENTREGADO',
  'CANCELADO',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ITEM_STATUSES = ['PENDIENTE', 'DISPONIBLE', 'FALTANTE'] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const PAYMENT_STATUSES = ['PENDIENTE', 'COMPROBANTE_RECIBIDO', 'PAGADO'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDIENTE_REVISION: 'Para revisar',
  ESPERANDO_CLIENTE: 'Esperando al cliente',
  CONFIRMADO: 'Confirmado',
  PROGRAMADO: 'Con fecha',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
};

export const DELIVERY_METHOD_LABEL: Record<DeliveryMethod, string> = {
  RETIRO: 'Retiro en local',
  ENVIO: 'Envío',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDIENTE: 'Pendiente',
  COMPROBANTE_RECIBIDO: 'Comprobante recibido',
  PAGADO: 'Pagado',
};

/** Estados en los que el pedido todavía se puede cancelar desde el panel. */
export const CANCELLABLE_STATUSES: OrderStatus[] = [
  'PENDIENTE_REVISION',
  'ESPERANDO_CLIENTE',
  'CONFIRMADO',
  'PROGRAMADO',
];

/** Estados en los que se puede asignar (o cambiar) la fecha de envío/retiro. */
export const SCHEDULABLE_STATUSES: OrderStatus[] = ['CONFIRMADO', 'PROGRAMADO'];
