import { DELIVERY_METHOD_LABEL, PAYMENT_METHOD_LABEL, type OrderStatus } from '@papelera/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ErrorNote, PaymentBadge, StatusBadge } from '../components/Badges.tsx';
import { api } from '../lib/api.ts';
import { ars, dateTime } from '../lib/format.ts';
import type { Order } from '../lib/types.ts';

const TABS: { key: string; label: string; statuses: OrderStatus[] }[] = [
  { key: 'revisar', label: 'Para revisar', statuses: ['PENDIENTE_REVISION'] },
  { key: 'cliente', label: 'Esperando cliente', statuses: ['ESPERANDO_CLIENTE'] },
  { key: 'confirmados', label: 'Confirmados', statuses: ['CONFIRMADO'] },
  { key: 'programados', label: 'Con fecha', statuses: ['PROGRAMADO'] },
  { key: 'historial', label: 'Historial', statuses: ['ENTREGADO', 'CANCELADO'] },
];

export function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t.key === params.get('tab')) ?? TABS[0]!;
  const [q, setQ] = useState('');

  const counts = useQuery({
    queryKey: ['orders', 'counts'],
    queryFn: () => api<Record<string, number>>('/api/orders/counts'),
    refetchInterval: 15_000,
  });

  const orders = useQuery({
    queryKey: ['orders', 'list', tab.key, q],
    queryFn: () => {
      const sp = new URLSearchParams({ status: tab.statuses.join(',') });
      if (q.trim()) sp.set('q', q.trim());
      return api<Order[]>(`/api/orders?${sp}`);
    },
    refetchInterval: 15_000,
  });

  return (
    <section>
      <div className="page-head">
        <h1>Pedidos</h1>
        <input className="search" placeholder="Buscar por #, nombre o teléfono" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => {
          const n = t.statuses.reduce((a, s) => a + (counts.data?.[s] ?? 0), 0);
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={t.key === tab.key}
              className={t.key === tab.key ? 'tab active' : 'tab'}
              onClick={() => setParams({ tab: t.key })}
            >
              {t.label}
              {t.key !== 'historial' && n > 0 && <span className="count">{n}</span>}
            </button>
          );
        })}
      </div>

      <ErrorNote error={orders.error} />
      {orders.isLoading ? (
        <p className="muted">Cargando…</p>
      ) : !orders.data?.length ? (
        <div className="empty">No hay pedidos acá.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Recibido</th>
                <th>Pago</th>
                <th>Entrega</th>
                <th className="num">Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {orders.data.map((o) => (
                <tr key={o.id}>
                  <td className="mono">
                    <Link to={`/pedidos/${o.id}`}>#{o.id}</Link>
                  </td>
                  <td>
                    <Link to={`/pedidos/${o.id}`} className="row-link">
                      {o.customer.name ?? 'Sin nombre'}
                      <span className="muted small">{o.customer.phone}</span>
                    </Link>
                  </td>
                  <td>{dateTime(o.createdAt)}</td>
                  <td>
                    {PAYMENT_METHOD_LABEL[o.paymentMethod]}
                    {o.paymentMethod === 'TRANSFERENCIA' && (
                      <div>
                        <PaymentBadge status={o.paymentStatus} />
                      </div>
                    )}
                  </td>
                  <td>
                    {DELIVERY_METHOD_LABEL[o.deliveryMethod]}
                    {o.scheduledFor && <div className="muted small">{dateTime(o.scheduledFor)}</div>}
                  </td>
                  <td className="num">{ars(o.total)}</td>
                  <td>
                    <StatusBadge status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
