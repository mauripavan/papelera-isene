import { DELIVERY_METHOD_LABEL, ORDER_STATUS_LABEL, type ItemStatus } from '@papelera/shared';
import type { Order, OrderItem } from '../lib/types.ts';

/** Cantidad a juntar en el depósito. Los faltantes no se preparan. */
function pickQuantity(item: OrderItem): number {
  switch (item.status) {
    case 'FALTANTE':
      return 0;
    case 'PARCIAL':
      return item.deliveredQuantity;
    case 'PENDIENTE':
    case 'DISPONIBLE':
      return item.quantity;
    default: {
      const exhaustive: never = item.status;
      return exhaustive;
    }
  }
}

function pickNote(status: ItemStatus, ordered: number, ready: number): string | null {
  switch (status) {
    case 'FALTANTE':
      return 'Faltante — no preparar';
    case 'PARCIAL':
      return `Hay ${ready} de ${ordered}`;
    case 'PENDIENTE':
    case 'DISPONIBLE':
      return null;
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function printDate(iso: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

/** Hoja en blanco y negro para llevar al depósito y tildar lo que se junta. */
export function OrderPrintSheet({ order }: { order: Order }) {
  const name = order.contactName ?? order.customer.name ?? 'Sin nombre';
  const address = order.deliveryAddress ?? order.customer.address;

  return (
    <div className="print-sheet">
      <div className="print-intro">
        <p className="print-brand">Papelera Isene</p>
        <p className="print-kicker">Pedido para armar</p>
        <h1>Pedido #{order.id}</h1>
        <p className="print-meta">
          Recibido: {printDate(order.createdAt)} · {ORDER_STATUS_LABEL[order.status]}
        </p>
        <dl className="print-facts">
          <dt>Cliente</dt>
          <dd>{name}</dd>
          <dt>Teléfono</dt>
          <dd>{order.customer.phone}</dd>
          <dt>Entrega</dt>
          <dd>
            {DELIVERY_METHOD_LABEL[order.deliveryMethod]}
            {order.scheduledFor ? ` · ${printDate(order.scheduledFor)}` : ''}
          </dd>
          {address && (
            <>
              <dt>Dirección</dt>
              <dd>{address}</dd>
            </>
          )}
          {order.notes && (
            <>
              <dt>Notas</dt>
              <dd>{order.notes}</dd>
            </>
          )}
        </dl>
      </div>

      <table className="print-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Descripción</th>
            <th className="num">Cantidad</th>
            <th className="pick-check">Listo</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => {
            const note = pickNote(item.status, item.quantity, item.deliveredQuantity);
            return (
              <tr key={item.id}>
                <td className="code">{item.productCode}</td>
                <td>
                  <span className={item.status === 'FALTANTE' ? 'print-skip' : undefined}>{item.productName}</span>
                  {note && <span className="print-note">{note}</span>}
                </td>
                <td className="num">{pickQuantity(item)}</td>
                <td className="pick-check">
                  <span className="tick-box" aria-hidden="true" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
