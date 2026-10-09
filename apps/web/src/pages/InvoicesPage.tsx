import { round2, type InvoiceSaleStatus } from '@papelera/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { ErrorNote } from '../components/Badges.tsx';
import { Modal } from '../components/Modal.tsx';
import { SaleForm, type SalePayload } from '../components/SaleForm.tsx';
import { api } from '../lib/api.ts';
import { arDay, arDayLabel, ars, dateTime, todayAr } from '../lib/format.ts';
import type { InvoiceSale } from '../lib/types.ts';

type Tab = 'pendiente' | 'facturadas';
type DayFilter = 'all' | string;

function groupSales(sales: InvoiceSale[]) {
  const map = new Map<string, InvoiceSale[]>();
  for (const sale of sales) {
    const day = arDay(sale.createdAt);
    map.set(day, [...(map.get(day) ?? []), sale]);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([day, list]) => ({
      day,
      sales: list,
      total: round2(list.reduce((acc, sale) => acc + sale.total, 0)),
    }));
}

export function InvoicesPage() {
  const qc = useQueryClient();
  const today = todayAr();
  const [tab, setTab] = useState<Tab>('pendiente');
  const [date, setDate] = useState<DayFilter>('all');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<InvoiceSale | null>(null);

  const pending = useQuery({
    queryKey: ['invoice-sales', 'PENDIENTE'],
    queryFn: () => api<InvoiceSale[]>('/api/invoice-sales?status=PENDIENTE'),
  });
  const invoiced = useQuery({
    queryKey: ['invoice-sales', 'FACTURADA', date],
    queryFn: () => api<InvoiceSale[]>(`/api/invoice-sales?status=FACTURADA${date === 'all' ? '' : `&date=${date}`}`),
    enabled: tab === 'facturadas',
  });

  useEffect(() => setSelected(new Set()), [tab, date]);

  const pendingSales = pending.data ?? [];
  const visiblePending = date === 'all' ? pendingSales : pendingSales.filter((sale) => arDay(sale.createdAt) === date);
  const hiddenPending = date === 'all' ? 0 : pendingSales.length - visiblePending.length;
  const todayTotal = round2(pendingSales.filter((sale) => arDay(sale.createdAt) === today).reduce((acc, sale) => acc + sale.total, 0));
  const source = tab === 'pendiente' ? visiblePending : (invoiced.data ?? []);
  const groups = useMemo(() => groupSales(source), [source]);
  const visibleTotal = round2(source.reduce((acc, sale) => acc + sale.total, 0));
  const visibleIds = visiblePending.map((sale) => sale.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  const mark = useMutation({
    mutationFn: (input: { ids: number[]; status: InvoiceSaleStatus }) =>
      api<{ updated: number }>('/api/invoice-sales/mark', { method: 'POST', json: input }),
    onSuccess: () => {
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['invoice-sales'] });
    },
  });
  const remove = useMutation({
    mutationFn: (id: number) => api<void>(`/api/invoice-sales/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoice-sales'] }),
  });

  const saveNew = async (payload: SalePayload) => {
    await api<InvoiceSale>('/api/invoice-sales', { method: 'POST', json: payload });
    await qc.invalidateQueries({ queryKey: ['invoice-sales'] });
  };

  const saveEdit = async (payload: SalePayload) => {
    if (!editing) return;
    await api<InvoiceSale>(`/api/invoice-sales/${editing.id}`, { method: 'PATCH', json: payload });
    await qc.invalidateQueries({ queryKey: ['invoice-sales'] });
    setEditing(null);
  };

  const toggle = (id: number) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(visibleIds));
  };

  const listError = tab === 'pendiente' ? pending.error : invoiced.error;
  const loading = tab === 'pendiente' ? pending.isLoading : invoiced.isLoading;
  const dayLabel = date === 'all' ? (tab === 'pendiente' ? 'Total pendiente' : 'Total en pantalla') : `Total ${arDayLabel(date, today)}`;

  return (
    <section>
      <div className="page-head">
        <h1>Facturas</h1>
      </div>
      <p className="muted small">Anotá cada transferencia cuando entra. Al final del día marcás las que ya facturaste.</p>

      <div className="card quick-sale">
        <h2>Nueva venta a facturar</h2>
        <SaleForm submitLabel="Anotar venta" resetOnSuccess onSubmit={saveNew} />
      </div>

      <div className="tabs">
        <button type="button" className={tab === 'pendiente' ? 'tab active' : 'tab'} onClick={() => setTab('pendiente')}>
          A facturar {pendingSales.length > 0 && <span className="count">{pendingSales.length}</span>}
        </button>
        <button type="button" className={tab === 'facturadas' ? 'tab active' : 'tab'} onClick={() => setTab('facturadas')}>
          Facturadas
        </button>
      </div>

      <div className="filters row">
        <input
          type="date"
          aria-label="Día de la venta"
          value={date === 'all' ? '' : date}
          onChange={(event) => setDate(event.target.value || 'all')}
        />
        <button type="button" className={date === today ? 'btn sm primary' : 'btn sm'} onClick={() => setDate(today)}>
          Hoy
        </button>
        <button type="button" className={date === 'all' ? 'btn sm primary' : 'btn sm'} onClick={() => setDate('all')}>
          Todas
        </button>
        {tab === 'pendiente' && visibleIds.length > 0 && (
          <label className="inline">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            Seleccionar
          </label>
        )}
        {tab === 'pendiente' && selected.size > 0 && (
          <button
            type="button"
            className="btn primary sm"
            disabled={mark.isPending}
            onClick={() => mark.mutate({ ids: [...selected], status: 'FACTURADA' })}
          >
            Marcar facturadas ({selected.size})
          </button>
        )}
      </div>

      <div className="summary-bar">
        <div>
          <div className="muted small">{dayLabel}</div>
          <div className="figure">{ars(visibleTotal)}</div>
        </div>
        {tab === 'pendiente' && date !== today && (
          <div>
            <div className="muted small">Hoy, todavía sin facturar</div>
            <div className="figure">{ars(todayTotal)}</div>
          </div>
        )}
      </div>

      {hiddenPending > 0 && (
        <p className="warn-note">
          Hay {hiddenPending} {hiddenPending === 1 ? 'venta pendiente' : 'ventas pendientes'} de otros días.
        </p>
      )}
      {tab === 'facturadas' && date === 'all' && (invoiced.data?.length ?? 0) >= 200 && (
        <p className="muted small">Se muestran las últimas 200. Elegí un día para ver ese total.</p>
      )}
      <ErrorNote error={listError ?? mark.error ?? remove.error} />
      {loading && <p className="muted">Cargando…</p>}
      {!loading && !listError && source.length === 0 && (
        <div className="empty">{tab === 'pendiente' ? 'No hay ventas para facturar.' : 'No hay facturadas en esta vista.'}</div>
      )}

      {groups.map((group) => (
        <section key={group.day}>
          <div className="day-head">
            <h2>{arDayLabel(group.day, today)}</h2>
            <strong>{ars(group.total)}</strong>
          </div>
          <div className="po-grid">
            {group.sales.map((sale) => (
              <SaleCard
                key={sale.id}
                sale={sale}
                selectable={tab === 'pendiente'}
                selected={selected.has(sale.id)}
                onToggle={() => toggle(sale.id)}
                onEdit={() => setEditing(sale)}
                onDelete={() => {
                  const who = sale.customerName ? ` de ${sale.customerName}` : '';
                  if (window.confirm(`¿Eliminar la venta${who} de ${ars(sale.total)}?\n\nNo se puede deshacer.`)) remove.mutate(sale.id);
                }}
                onMark={() =>
                  mark.mutate({
                    ids: [sale.id],
                    status: sale.status === 'PENDIENTE' ? 'FACTURADA' : 'PENDIENTE',
                  })
                }
                marking={mark.isPending}
              />
            ))}
          </div>
        </section>
      ))}

      <Modal wide open={editing != null} onClose={() => setEditing(null)} title="Editar venta">
        {editing && <SaleForm key={editing.id} initial={editing} submitLabel="Guardar cambios" onSubmit={saveEdit} />}
      </Modal>
    </section>
  );
}

function SaleCard({
  sale,
  selectable,
  selected,
  onToggle,
  onEdit,
  onDelete,
  onMark,
  marking,
}: {
  sale: InvoiceSale;
  selectable: boolean;
  selected: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMark: () => void;
  marking: boolean;
}) {
  const preview = sale.items.slice(0, 4);
  const rest = sale.items.length - preview.length;
  return (
    <article className="card">
      <div className="sale-top">
        {selectable && <input type="checkbox" checked={selected} onChange={onToggle} aria-label={`Seleccionar venta ${sale.id}`} />}
        <div className="grow">
          <div className="card-head">
            <div>
              <h2>{sale.customerName || 'Sin cliente'}</h2>
              <p className="muted small">
                {dateTime(sale.createdAt)}
                {sale.customerCuit ? ` · CUIT ${sale.customerCuit}` : ''}
                {sale.invoicedAt ? ` · Facturada ${dateTime(sale.invoicedAt)}` : ''}
              </p>
            </div>
            <strong className="sale-total">{ars(sale.total)}</strong>
          </div>
          <ul className="po-items">
            {preview.map((item) => (
              <li key={item.id}>
                <span className="name">
                  <span className="mono">{item.productCode}</span> {item.productName}
                  <span className="muted"> × {item.quantity}</span>
                </span>
                <span className="qty">{ars(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          {rest > 0 && <p className="muted small">y {rest} más</p>}
          {sale.note && <p className="note">{sale.note}</p>}
          {sale.total !== sale.itemsTotal && <p className="muted small">Suma de artículos: {ars(sale.itemsTotal)}</p>}
        </div>
      </div>
      <div className="row actions-row">
        <button type="button" className={sale.status === 'PENDIENTE' ? 'btn sm primary' : 'btn sm'} disabled={marking} onClick={onMark}>
          {sale.status === 'PENDIENTE' ? 'Facturada' : 'Volver a pendiente'}
        </button>
        <button type="button" className="btn sm" onClick={onEdit}>
          Editar
        </button>
        <button type="button" className="btn sm danger" onClick={onDelete}>
          Eliminar
        </button>
      </div>
    </article>
  );
}
