import {
  CANCELLABLE_STATUSES,
  DELIVERY_METHOD_LABEL,
  PAYMENT_METHOD_LABEL,
  SCHEDULABLE_STATUSES,
  type ItemStatus,
  type PaymentStatus,
} from '@papelera/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorNote, PaymentBadge, StatusBadge } from '../components/Badges.tsx';
import { api, tokenStore } from '../lib/api.ts';
import { ars, dateTime, longDate, toLocalInput, waLink } from '../lib/format.ts';
import type { Order, OrderDetail } from '../lib/types.ts';

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

  const setItem = (itemId: number, status: ItemStatus) =>
    action.mutate({ path: `/items/${itemId}`, method: 'PATCH', body: { status } });

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
              {o.subtotal !== o.total && <span className="muted small strike">{ars(o.subtotal)}</span>}
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
                  <td className="num">{i.quantity}</td>
                  <td className="num">{ars(i.unitPrice)}</td>
                  <td className="num">{ars(i.lineTotal)}</td>
                  <td>
                    {reviewing ? (
                      <div className="segmented">
                        <button
                          className={i.status === 'DISPONIBLE' ? 'on ok' : ''}
                          onClick={() => setItem(i.id, 'DISPONIBLE')}
                          disabled={action.isPending}
                        >
                          Hay
                        </button>
                        <button
                          className={i.status === 'FALTANTE' ? 'on danger' : ''}
                          onClick={() => setItem(i.id, 'FALTANTE')}
                          disabled={action.isPending}
                        >
                          Falta
                        </button>
                      </div>
                    ) : (
                      <span className={`badge ${i.status === 'FALTANTE' ? 'danger' : 'ok'}`}>
                        {i.status === 'FALTANTE' ? 'Faltante' : 'Disponible'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {reviewing && (
          <div className="actions">
            <p className="muted small">
              {pendingItems > 0
                ? `Faltan revisar ${pendingItems} producto(s).`
                : missingItems > 0
                  ? `Se le va a avisar al cliente que faltan ${missingItems} producto(s) y se le va a preguntar si sigue.`
                  : 'Se le va a confirmar el pedido al cliente' +
                    (o.paymentMethod === 'TRANSFERENCIA' ? ' y pedir el comprobante.' : '.')}
            </p>
            <button
              className="btn primary"
              disabled={pendingItems > 0 || action.isPending}
              onClick={() => action.mutate({ path: '/review' })}
            >
              {missingItems > 0 ? 'Avisar faltantes al cliente' : 'Confirmar pedido'}
            </button>
          </div>
        )}
        {o.status === 'ESPERANDO_CLIENTE' && (
          <p className="note">Esperando que el cliente responda si sigue con el pedido sin los faltantes.</p>
        )}
      </div>

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
