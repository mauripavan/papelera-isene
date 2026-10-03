import {
  CANCELLABLE_STATUSES,
  DELIVERY_METHOD_LABEL,
  PAYMENT_METHOD_LABEL,
  SCHEDULABLE_STATUSES,
  SHIPPING_STATUS_LABEL,
  type ItemStatus,
  type PaymentStatus,
} from '@papelera/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorNote, PaymentBadge, StatusBadge } from '../components/Badges.tsx';
import { api, tokenStore } from '../lib/api.ts';
import { ars, dateTime, longDate, toLocalInput, waLink } from '../lib/format.ts';
import type { Order, OrderDetail, OrderItem, ShippingStatus } from '../lib/types.ts';

/** El comprobante se pide con el token del panel y se abre en otra pestaña. */
async function openReceipt(orderId: number) {
  const tab = window.open('', '_blank');
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/orders/${orderId}/receipt`, {
      headers: { authorization: `Bearer ${tokenStore.get()}` },
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'No se pudo abrir el comprobante');
    const url = URL.createObjectURL(await res.blob());
    if (tab) tab.location.href = url;
    else window.location.href = url;
  } catch (e) {
    tab?.close();
    window.alert((e as Error).message);
  }
}

type SetItem = (itemId: number, status: ItemStatus, availableQuantity?: number) => void;

/** Hay / Parcial / Falta. "Parcial" pide cuántos hay (entre 1 y lo pedido − 1). */
function ItemStock({ item, setItem, busy }: { item: OrderItem; setItem: SetItem; busy: boolean }) {
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState(String(item.availableQuantity ?? ''));
  useEffect(() => setQty(String(item.availableQuantity ?? '')), [item.availableQuantity]);
  const canPartial = item.quantity > 1;
  const showInput = editing || item.status === 'PARCIAL';
  const n = Number(qty);
  const valid = Number.isInteger(n) && n >= 1 && n < item.quantity;
  const save = () => {
    if (!valid) return;
    setItem(item.id, 'PARCIAL', n);
    setEditing(false);
  };
  return (
    <div className="stock-cell">
      <div className="segmented">
        <button className={item.status === 'DISPONIBLE' ? 'on ok' : ''} onClick={() => (setEditing(false), setItem(item.id, 'DISPONIBLE'))} disabled={busy}>
          Hay
        </button>
        {canPartial && (
          <button className={item.status === 'PARCIAL' || editing ? 'on warn' : ''} onClick={() => setEditing(true)} disabled={busy}>
            Parcial
          </button>
        )}
        <button className={item.status === 'FALTANTE' ? 'on danger' : ''} onClick={() => (setEditing(false), setItem(item.id, 'FALTANTE'))} disabled={busy}>
          Falta
        </button>
      </div>
      {showInput && (
        <form
          className="partial"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <span className="small">Hay</span>
          <input
            type="number"
            min={1}
            max={item.quantity - 1}
            value={qty}
            autoFocus={editing}
            onChange={(e) => setQty(e.target.value)}
            onBlur={() => valid && n !== item.availableQuantity && save()}
          />
          <span className="small muted">de {item.quantity}</span>
          {editing && item.status !== 'PARCIAL' && (
            <button className="btn sm" disabled={!valid || busy}>
              OK
            </button>
          )}
        </form>
      )}
    </div>
  );
}

function stockBadge(i: OrderItem) {
  if (i.status === 'FALTANTE') return <span className="badge danger">Faltante</span>;
  if (i.status === 'PARCIAL') return <span className="badge warn">Parcial: {i.availableQuantity} de {i.quantity}</span>;
  return <span className="badge ok">Disponible</span>;
}

/** Para pedidos con envío: gratis, con costo o fuera de zona (pasa a retiro). */
function ShippingCard({ order, busy, onSave }: { order: Order; busy: boolean; onSave: (status: ShippingStatus, cost?: number) => void }) {
  const [cost, setCost] = useState(order.shippingCost ? String(order.shippingCost) : '');
  useEffect(() => setCost(order.shippingCost ? String(order.shippingCost) : ''), [order.shippingCost]);
  const [withCost, setWithCost] = useState(false);
  const st = order.shippingStatus;
  const showCost = withCost || st === 'CON_COSTO';
  const n = Number(cost.replace(',', '.'));
  const validCost = cost !== '' && n > 0;
  return (
    <div className="card">
      <h2>Envío</h2>
      <p className="muted small">
        Dirección: <strong>{order.deliveryAddress ?? order.customer.address ?? '—'}</strong>
      </p>
      <div className="segmented">
        <button className={st === 'GRATIS' ? 'on ok' : ''} onClick={() => (setWithCost(false), onSave('GRATIS'))} disabled={busy}>
          Gratis
        </button>
        <button className={st === 'CON_COSTO' || withCost ? 'on warn' : ''} onClick={() => setWithCost(true)} disabled={busy}>
          Con costo
        </button>
        <button className={st === 'FUERA_ZONA' ? 'on danger' : ''} onClick={() => (setWithCost(false), onSave('FUERA_ZONA'))} disabled={busy}>
          Fuera de zona
        </button>
      </div>
      {showCost && (
        <form
          className="row"
          style={{ marginTop: 12 }}
          onSubmit={(e) => {
            e.preventDefault();
            if (validCost) {
              onSave('CON_COSTO', n);
              setWithCost(false);
            }
          }}
        >
          <span className="small">Costo $</span>
          <input
            type="number"
            min={1}
            step="0.01"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            autoFocus={withCost}
            style={{ width: 140 }}
          />
          <button className="btn sm" disabled={!validCost || busy || (st === 'CON_COSTO' && n === order.shippingCost)}>
            Guardar costo
          </button>
        </form>
      )}
      {st === 'FUERA_ZONA' && <p className="note">El pedido pasa a retiro en el local. Se le avisa al cliente y tiene que aceptar.</p>}
      {st === 'PENDIENTE' && <p className="muted small">Definí el envío antes de confirmar el pedido.</p>}
    </div>
  );
}

export function OrderDetailPage() {
  const id = Number(useParams().id);
  const qc = useQueryClient();
  const key = ['orders', 'detail', id];

  const order = useQuery({
    queryKey: key,
    queryFn: () => api<OrderDetail>(`/api/orders/${id}`),
    refetchInterval: 15_000,
  });

  // Todas las acciones devuelven el pedido actualizado: refrescamos detalle y listados.
  const action = useMutation({
    mutationFn: ({ path, body, method = 'POST' }: { path: string; body?: unknown; method?: string }) =>
      api<Order>(`/api/orders/${id}${path}`, { method, json: body ?? {} }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const [scheduleValue, setScheduleValue] = useState('');
  useEffect(() => {
    if (order.data) setScheduleValue(toLocalInput(order.data.scheduledFor));
  }, [order.data?.scheduledFor]);

  if (order.isLoading) return <p className="muted">Cargando…</p>;
  if (!order.data) return <ErrorNote error={order.error} />;
  const o = order.data;

  const reviewing = o.status === 'PENDIENTE_REVISION';
  const pendingItems = o.items.filter((i) => i.status === 'PENDIENTE').length;
  const missingItems = o.items.filter((i) => i.status === 'FALTANTE').length;
  const partialItems = o.items.filter((i) => i.status === 'PARCIAL').length;
  const shippingPending = o.shippingStatus === 'PENDIENTE';
  const shippingChange = o.shippingStatus === 'CON_COSTO' || o.shippingStatus === 'FUERA_ZONA';
  const allMissing = missingItems === o.items.length;
  const needsApproval = missingItems > 0 || partialItems > 0 || shippingChange;

  const setItem: SetItem = (itemId, status, availableQuantity) =>
    action.mutate({ path: `/items/${itemId}`, method: 'PATCH', body: { status, availableQuantity } });

  const reviewHint = () => {
    if (pendingItems > 0) return `Faltan revisar ${pendingItems} producto(s).`;
    if (shippingPending) return 'Falta definir el envío (gratis, con costo o fuera de zona).';
    if (allMissing) return 'No hay ningún producto: el pedido se cancela y se le avisa al cliente.';
    if (needsApproval) {
      const parts = [];
      if (missingItems) parts.push(`${missingItems} faltante(s)`);
      if (partialItems) parts.push(`${partialItems} parcial(es)`);
      if (o.shippingStatus === 'CON_COSTO') parts.push(`envío de ${ars(o.shippingCost)}`);
      if (o.shippingStatus === 'FUERA_ZONA') parts.push('fuera de zona (pasa a retiro)');
      return `Se le avisa al cliente (${parts.join(', ')}) con el nuevo total y se le pregunta si sigue.`;
    }
    return 'Se le va a confirmar el pedido al cliente' + (o.paymentMethod === 'TRANSFERENCIA' ? ' y pedir el comprobante.' : '.');
  };

  const cancel = () => {
    const reason = window.prompt('¿Por qué se cancela? (se le informa al cliente, podés dejarlo vacío)');
    if (reason === null) return;
    action.mutate({ path: '/cancel', body: { reason: reason || undefined } });
  };

  return (
    <section>
      <Link to="/pedidos" className="back">
        ← Pedidos
      </Link>
      <div className="page-head">
        <h1>
          Pedido <span className="mono">#{o.id}</span>
        </h1>
        <StatusBadge status={o.status} />
      </div>
      <ErrorNote error={action.error} />

      <div className="grid-2">
        <div className="card">
          <h2>Cliente</h2>
          <dl className="facts">
            <dt>Nombre</dt>
            <dd>{o.customer.name ?? '—'}</dd>
            <dt>WhatsApp</dt>
            <dd>
              <a href={waLink(o.customer.phone)} target="_blank" rel="noreferrer">
                {o.customer.phone}
              </a>
            </dd>
            <dt>Entrega</dt>
            <dd>
              {DELIVERY_METHOD_LABEL[o.deliveryMethod]}
              {o.deliveryAddress && <div className="muted">{o.deliveryAddress}</div>}
              {o.shippingStatus && o.shippingStatus !== 'PENDIENTE' && (
                <div className="small">
                  {o.shippingStatus === 'CON_COSTO' ? `Envío: ${ars(o.shippingCost)}` : SHIPPING_STATUS_LABEL[o.shippingStatus]}
                </div>
              )}
            </dd>
            <dt>Recibido</dt>
            <dd>{dateTime(o.createdAt)}</dd>
            {o.notes && (
              <>
                <dt>Notas</dt>
                <dd>{o.notes}</dd>
              </>
            )}
          </dl>
        </div>

        <div className="card">
          <h2>Pago</h2>
          <dl className="facts">
            <dt>Medio</dt>
            <dd>{PAYMENT_METHOD_LABEL[o.paymentMethod]}</dd>
            <dt>Total</dt>
            <dd className="total">
              {ars(o.total)}
              {o.subtotal !== o.itemsTotal && <span className="muted small strike">{ars(o.subtotal)}</span>}
              {o.shippingCost > 0 && (
                <div className="muted small">
                  Productos {ars(o.itemsTotal)} + envío {ars(o.shippingCost)}
                </div>
              )}
            </dd>
            <dt>Estado</dt>
            <dd>
              <PaymentBadge status={o.paymentStatus} />
            </dd>
            {o.receiptRef && (
              <>
                <dt>Comprobante</dt>
                <dd>
                  {o.receiptRef.startsWith('wa:') ? (
                    <button className="btn sm" onClick={() => openReceipt(o.id)}>
                      Ver comprobante
                    </button>
                  ) : (
                    <span className="mono small">{o.receiptRef}</span>
                  )}
                </dd>
              </>
            )}
          </dl>
          {['CONFIRMADO', 'PROGRAMADO', 'ENTREGADO'].includes(o.status) && (
            <label className="inline">
              Marcar pago como
              <select
                value={o.paymentStatus}
                onChange={(e) => action.mutate({ path: '/payment', body: { paymentStatus: e.target.value as PaymentStatus } })}
              >
                <option value="PENDIENTE">Pendiente</option>
                <option value="COMPROBANTE_RECIBIDO">Comprobante recibido</option>
                <option value="PAGADO">Pagado</option>
              </select>
            </label>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Productos</h2>
          {reviewing && pendingItems > 0 && (
            <button className="btn sm" onClick={() => action.mutate({ path: '/items/all-available' })} disabled={action.isPending}>
              Marcar todo disponible
            </button>
          )}
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Producto</th>
                <th className="num">Cant.</th>
                <th className="num">Unitario</th>
                <th className="num">Subtotal</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {o.items.map((i) => (
                <tr key={i.id} className={i.status === 'FALTANTE' ? 'missing' : ''}>
                  <td className="mono">{i.productCode}</td>
                  <td>{i.productName}</td>
                  <td className="num">
                    {i.status === 'PARCIAL' ? (
                      <>
                        <span className="strike muted">{i.quantity}</span> {i.deliveredQuantity}
                      </>
                    ) : (
                      i.quantity
                    )}
                  </td>
                  <td className="num">{ars(i.unitPrice)}</td>
                  <td className="num">{ars(i.lineTotal)}</td>
                  <td>
                    {reviewing ? <ItemStock item={i} setItem={setItem} busy={action.isPending} /> : stockBadge(i)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {o.status === 'ESPERANDO_CLIENTE' && (
          <p className="note">Esperando que el cliente responda si acepta los cambios (SI / NO).</p>
        )}
      </div>

      {reviewing && o.shippingStatus && (
        <ShippingCard
          order={o}
          busy={action.isPending}
          onSave={(shippingStatus, shippingCost) => action.mutate({ path: '/shipping', body: { shippingStatus, shippingCost } })}
        />
      )}

      {reviewing && (
        <div className="actions">
          <p className="muted small">{reviewHint()}</p>
          <button
            className="btn primary"
            disabled={pendingItems > 0 || shippingPending || action.isPending}
            onClick={() => action.mutate({ path: '/review' })}
          >
            {allMissing && pendingItems === 0 ? 'Cancelar y avisar' : needsApproval ? 'Avisar cambios al cliente' : 'Confirmar pedido'}
          </button>
        </div>
      )}

      {SCHEDULABLE_STATUSES.includes(o.status) && (
        <div className="card">
          <h2>{o.deliveryMethod === 'RETIRO' ? 'Fecha de retiro' : 'Fecha de envío'}</h2>
          {o.scheduledFor && <p>Programado para el {longDate(o.scheduledFor)}.</p>}
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              if (scheduleValue) action.mutate({ path: '/schedule', body: { scheduledFor: new Date(scheduleValue).toISOString() } });
            }}
          >
            <input type="datetime-local" value={scheduleValue} onChange={(e) => setScheduleValue(e.target.value)} required />
            <button className="btn primary" disabled={action.isPending}>
              {o.scheduledFor ? 'Cambiar fecha y avisar' : 'Asignar fecha y avisar'}
            </button>
          </form>
        </div>
      )}

      <div className="actions spread">
        <div>
          {CANCELLABLE_STATUSES.includes(o.status) && (
            <button className="btn danger ghost" onClick={cancel} disabled={action.isPending}>
              Cancelar pedido
            </button>
          )}
        </div>
        {(o.status === 'CONFIRMADO' || o.status === 'PROGRAMADO') && (
          <button className="btn" onClick={() => action.mutate({ path: '/deliver' })} disabled={action.isPending}>
            Marcar como entregado
          </button>
        )}
      </div>

      {o.messages.length > 0 && (
        <div className="card">
          <h2>Mensajes al cliente</h2>
          <ul className="messages">
            {o.messages.map((m) => (
              <li key={m.id}>
                <div className="msg-meta">
                  <span className={`badge ${m.status === 'SENT' ? 'ok' : m.status === 'FAILED' ? 'danger' : 'neutral'}`}>
                    {m.status === 'SENT' ? 'Enviado' : m.status === 'FAILED' ? 'Falló' : 'En cola'}
                  </span>
                  <span className="muted small">{dateTime(m.sentAt ?? m.createdAt)}</span>
                </div>
                <pre className="bubble">{m.body}</pre>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
