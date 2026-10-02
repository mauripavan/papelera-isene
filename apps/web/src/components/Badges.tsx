import {
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  type OrderStatus,
  type PaymentStatus,
} from '@papelera/shared';

const tone: Record<OrderStatus, string> = {
  PENDIENTE_REVISION: 'warn',
  ESPERANDO_CLIENTE: 'info',
  CONFIRMADO: 'ok',
  PROGRAMADO: 'ok',
  ENTREGADO: 'neutral',
  CANCELADO: 'danger',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge ${tone[status]}`}>{ORDER_STATUS_LABEL[status]}</span>;
}

const payTone: Record<PaymentStatus, string> = {
  PENDIENTE: 'neutral',
  COMPROBANTE_RECIBIDO: 'info',
  PAGADO: 'ok',
};

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <span className={`badge ${payTone[status]}`}>{PAYMENT_STATUS_LABEL[status]}</span>;
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  return <p className="error">{error instanceof Error ? error.message : 'Ocurrió un error'}</p>;
}
