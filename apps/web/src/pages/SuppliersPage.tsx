import {
  PURCHASE_ORDER_STATUSES,
  PURCHASE_ORDER_STATUS_LABEL,
  formatArPhone,
  normalizeArPhone,
  type PurchaseOrderStatus,
} from '@papelera/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';
import { ArticlePicker, type DraftLine } from '../components/ArticlePicker.tsx';
import { ErrorNote } from '../components/Badges.tsx';
import { Modal } from '../components/Modal.tsx';
import { api } from '../lib/api.ts';
import { dateTime } from '../lib/format.ts';
import { emailShare, purchaseListText, whatsappShare } from '../lib/share.ts';
import type { PurchaseOrder, PurchaseOrderItem, Supplier } from '../lib/types.ts';

type Tab = 'pedidos' | 'proveedores';
type SupplierFilter = 'all' | 'none' | number;

const STATUS_TONE: Record<PurchaseOrderStatus, string> = {
  PENDIENTE: 'warn',
  PEDIDO: 'info',
  RECIBIDO: 'ok',
};

const PREVIEW = 6;

function showPhone(phone: string | null): string {
  if (!phone) return '—';
  const normalized = normalizeArPhone(phone);
  return normalized ? formatArPhone(normalized) : phone;
}

function linesFromOrder(order: PurchaseOrder | null): DraftLine[] {
  if (!order) return [];
  return order.items.map((item) => ({
    key: item.productId != null ? `p-${item.productId}` : `gone-${item.id}`,
    productId: item.productId,
    code: item.productCode,
    name: item.productName,
    unit: item.unit,
    quantity: item.quantity,
    unitPrice: 0,
  }));
}

export function SuppliersPage() {
  const [tab, setTab] = useState<Tab>('pedidos');
  const [supplierFilter, setSupplierFilter] = useState<SupplierFilter>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | PurchaseOrderStatus>('all');
  const [supplierModal, setSupplierModal] = useState<Supplier | null | undefined>(undefined);
  const [orderModal, setOrderModal] = useState<{ order: PurchaseOrder | null; supplierId: number | null } | null>(null);

  const suppliers = useQuery({ queryKey: ['suppliers'], queryFn: () => api<Supplier[]>('/api/suppliers') });
  const orders = useQuery({ queryKey: ['purchase-orders'], queryFn: () => api<PurchaseOrder[]>('/api/purchase-orders') });

  const visible = useMemo(() => {
    return (orders.data ?? []).filter((order) => {
      if (statusFilter !== 'all' && order.status !== statusFilter) return false;
      if (supplierFilter === 'none') return order.supplierId == null;
      if (supplierFilter === 'all') return true;
      return order.supplierId === supplierFilter;
    });
  }, [orders.data, statusFilter, supplierFilter]);

  const pendingCount = (orders.data ?? []).filter((order) => order.status === 'PENDIENTE').length;

  return (
    <section>
      <div className="page-head">
        <h1>Proveedores</h1>
        <div className="row">
          <button className="btn" onClick={() => setSupplierModal(null)}>
            Nuevo proveedor
          </button>
          <button className="btn primary" onClick={() => setOrderModal({ order: null, supplierId: null })}>
            Nuevo pedido
          </button>
        </div>
      </div>
      <p className="muted small">Listas de faltantes para encargar. Se pueden compartir por WhatsApp o email.</p>

      <div className="tabs">
        <button type="button" className={tab === 'pedidos' ? 'tab active' : 'tab'} onClick={() => setTab('pedidos')}>
          Pedidos {pendingCount > 0 && <span className="count">{pendingCount}</span>}
        </button>
        <button type="button" className={tab === 'proveedores' ? 'tab active' : 'tab'} onClick={() => setTab('proveedores')}>
          Proveedores {!!suppliers.data?.length && <span className="count">{suppliers.data.length}</span>}
        </button>
      </div>

      {tab === 'pedidos' ? (
        <>
          <div className="filters row">
            <select
              aria-label="Filtrar por proveedor"
              value={supplierFilter === 'all' ? 'all' : supplierFilter === 'none' ? 'none' : String(supplierFilter)}
              onChange={(event) => {
                const value = event.target.value;
                setSupplierFilter(value === 'all' || value === 'none' ? value : Number(value));
              }}
            >
              <option value="all">Todos los proveedores</option>
              <option value="none">Sin proveedor</option>
              {suppliers.data?.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.legalName}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtrar por estado"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | PurchaseOrderStatus)}
            >
              <option value="all">Todos los estados</option>
              {PURCHASE_ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {PURCHASE_ORDER_STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </div>
          <ErrorNote error={orders.error} />
          {orders.isLoading && <p className="muted">Cargando…</p>}
          {!orders.isLoading && visible.length === 0 && (
            <div className="empty">
              {orders.data?.length ? 'Ningún pedido coincide con el filtro.' : 'Todavía no hay pedidos a proveedores.'}
            </div>
          )}
          <div className="po-grid">
            {visible.map((order) => (
              <OrderCard key={order.id} order={order} onEdit={() => setOrderModal({ order, supplierId: order.supplierId })} />
            ))}
          </div>
        </>
      ) : (
        <>
          <ErrorNote error={suppliers.error} />
          {suppliers.isLoading && <p className="muted">Cargando…</p>}
          {!suppliers.isLoading && suppliers.data?.length === 0 && (
            <div className="empty">Todavía no hay proveedores. Cargá el primero para poder encargarles faltantes.</div>
          )}
          <div className="supplier-grid">
            {suppliers.data?.map((supplier) => (
              <article key={supplier.id} className="card">
                <div className="card-head">
                  <h2>{supplier.legalName}</h2>
                </div>
                <dl className="facts">
                  <dt>Contacto</dt>
                  <dd>{supplier.contactName || '—'}</dd>
                  <dt>Teléfono</dt>
                  <dd>{showPhone(supplier.phone)}</dd>
                  <dt>Email</dt>
                  <dd>{supplier.email || '—'}</dd>
                </dl>
                <div className="row actions-row">
                  <button className="btn sm" onClick={() => setOrderModal({ order: null, supplierId: supplier.id })}>
                    Nuevo pedido
                  </button>
                  <button className="btn sm" onClick={() => setSupplierModal(supplier)}>
                    Editar
                  </button>
                  <DeleteSupplierButton supplier={supplier} />
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      <Modal
        open={supplierModal !== undefined}
        onClose={() => setSupplierModal(undefined)}
        title={supplierModal ? 'Editar proveedor' : 'Nuevo proveedor'}
      >
        {supplierModal !== undefined && <SupplierForm supplier={supplierModal} onDone={() => setSupplierModal(undefined)} />}
      </Modal>
      <Modal
        wide
        open={orderModal != null}
        onClose={() => setOrderModal(null)}
        title={orderModal?.order ? 'Editar pedido' : 'Nuevo pedido'}
      >
        {orderModal && (
          <OrderForm
            order={orderModal.order}
            presetSupplierId={orderModal.supplierId}
            suppliers={suppliers.data ?? []}
            onDone={() => setOrderModal(null)}
          />
        )}
      </Modal>
    </section>
  );
}

function OrderCard({ order, onEdit }: { order: PurchaseOrder; onEdit: () => void }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const setStatus = useMutation({
    mutationFn: (status: PurchaseOrderStatus) =>
      api<PurchaseOrder>(`/api/purchase-orders/${order.id}`, { method: 'PATCH', json: { status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
  });
  const remove = useMutation({
    mutationFn: () => api<void>(`/api/purchase-orders/${order.id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
  });

  const text = purchaseListText({
    contactName: order.supplier?.contactName,
    items: order.items.map((item) => ({
      code: item.productCode,
      name: item.productName,
      unit: item.unit,
      quantity: item.quantity,
    })),
  });
  const wa = order.supplier ? whatsappShare(order.supplier.phone, text) : null;
  const mail = order.supplier ? emailShare(order.supplier.email, 'Pedido Papelera Isene', text) : null;
  const waMissing = !order.supplier
    ? 'Asigná un proveedor para compartir la lista'
    : order.supplier.phone
      ? 'El teléfono no es un celular argentino. Cargalo como 11 2345-6789.'
      : 'Este proveedor no tiene teléfono';
  const mailMissing = !order.supplier ? 'Asigná un proveedor para compartir la lista' : 'Este proveedor no tiene email';
  const shown = expanded ? order.items : order.items.slice(0, PREVIEW);

  return (
    <article className="card">
      <div className="card-head">
        <div>
          <h2>{order.supplier?.legalName ?? 'Sin proveedor'}</h2>
          <p className="muted small">
            {dateTime(order.createdAt)} · {order.items.length} {order.items.length === 1 ? 'artículo' : 'artículos'}
          </p>
        </div>
      </div>
      {order.notes && <p className="note">{order.notes}</p>}
      <ul className="po-items">
        {shown.map((item) => (
          <OrderLine key={item.id} item={item} />
        ))}
      </ul>
      {order.items.length > PREVIEW && (
        <button type="button" className="btn ghost sm" onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'Ver menos' : `Ver los ${order.items.length}`}
        </button>
      )}
      <div className="row actions-row">
        <div className="segmented" role="group" aria-label="Estado del pedido">
          {PURCHASE_ORDER_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              className={order.status === status ? `on ${STATUS_TONE[status]}` : undefined}
              disabled={setStatus.isPending}
              onClick={() => {
                if (order.status !== status) setStatus.mutate(status);
              }}
            >
              {PURCHASE_ORDER_STATUS_LABEL[status]}
            </button>
          ))}
        </div>
      </div>
      <ErrorNote error={setStatus.error ?? remove.error} />
      <div className="row actions-row">
        <ShareLink href={wa} className="btn wa sm" missing={waMissing}>
          WhatsApp
        </ShareLink>
        <ShareLink href={mail} className="btn sm" missing={mailMissing}>
          Email
        </ShareLink>
        <button type="button" className="btn sm" onClick={onEdit}>
          Editar
        </button>
        <button
          type="button"
          className="btn sm danger"
          disabled={remove.isPending}
          onClick={() => {
            const who = order.supplier?.legalName ?? 'Sin proveedor';
            if (window.confirm(`¿Eliminar el pedido a ${who}?\n\nNo se puede deshacer.`)) remove.mutate();
          }}
        >
          Eliminar
        </button>
      </div>
    </article>
  );
}

function OrderLine({ item }: { item: PurchaseOrderItem }) {
  return (
    <li>
      <span className="name">
        <span className="mono">{item.productCode}</span> {item.productName}
        <span className="muted"> · {item.unit}</span>
      </span>
      <span className="qty">× {item.quantity}</span>
    </li>
  );
}

function ShareLink({
  href,
  className,
  missing,
  children,
}: {
  href: string | null;
  className: string;
  missing: string;
  children: string;
}) {
  if (!href) {
    return (
      <button type="button" className={className} disabled title={missing}>
        {children}
      </button>
    );
  }
  return (
    <a className={className} href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

function DeleteSupplierButton({ supplier }: { supplier: Supplier }) {
  const qc = useQueryClient();
  const remove = useMutation({
    mutationFn: () => api<void>(`/api/suppliers/${supplier.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
  return (
    <button
      type="button"
      className="btn sm danger"
      disabled={remove.isPending}
      onClick={() => {
        if (window.confirm(`¿Eliminar a "${supplier.legalName}"?\n\nLos pedidos que tenía quedan como Sin proveedor.`)) {
          remove.mutate();
        }
      }}
    >
      Eliminar
    </button>
  );
}

function SupplierForm({ supplier, onDone }: { supplier: Supplier | null; onDone: () => void }) {
  const qc = useQueryClient();
  const [legalName, setLegalName] = useState(supplier?.legalName ?? '');
  const [contactName, setContactName] = useState(supplier?.contactName ?? '');
  const [phone, setPhone] = useState(supplier?.phone ?? '');
  const [email, setEmail] = useState(supplier?.email ?? '');
  const save = useMutation({
    mutationFn: () => {
      const json = { legalName, contactName, phone, email };
      return supplier
        ? api<Supplier>(`/api/suppliers/${supplier.id}`, { method: 'PATCH', json })
        : api<Supplier>('/api/suppliers', { method: 'POST', json });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      onDone();
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  return (
    <form className="touch-form form-grid" onSubmit={submit}>
      <label className="span-2">
        Razón social
        <input value={legalName} onChange={(event) => setLegalName(event.target.value)} required autoFocus />
      </label>
      <label className="span-2">
        Nombre de contacto
        <input value={contactName} onChange={(event) => setContactName(event.target.value)} />
      </label>
      <label>
        Teléfono
        <input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" placeholder="11 2345-6789" />
      </label>
      <label>
        Email
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" inputMode="email" />
      </label>
      <ErrorNote error={save.error} />
      <button className="btn primary" disabled={save.isPending}>
        {save.isPending ? 'Guardando…' : 'Guardar'}
      </button>
    </form>
  );
}

function OrderForm({
  order,
  presetSupplierId,
  suppliers,
  onDone,
}: {
  order: PurchaseOrder | null;
  presetSupplierId: number | null;
  suppliers: Supplier[];
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [step, setStep] = useState<'items' | 'supplier'>('items');
  const [lines, setLines] = useState<DraftLine[]>(() => linesFromOrder(order));
  const [supplierId, setSupplierId] = useState(
    order?.supplierId != null ? String(order.supplierId) : presetSupplierId != null ? String(presetSupplierId) : 'none',
  );
  const [notes, setNotes] = useState(order?.notes ?? '');
  const save = useMutation({
    mutationFn: () => {
      const json = {
        supplierId: supplierId === 'none' ? null : Number(supplierId),
        notes,
        items: lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          productCode: line.code,
          productName: line.name,
          unit: line.unit,
        })),
      };
      return order
        ? api<PurchaseOrder>(`/api/purchase-orders/${order.id}`, { method: 'PATCH', json })
        : api<PurchaseOrder>('/api/purchase-orders', { method: 'POST', json });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      onDone();
    },
  });

  if (step === 'items') {
    return (
      <div className="touch-form">
        <p className="muted small">Buscá los artículos que faltan y cargá la cantidad. Enter agrega el primero de la lista.</p>
        <ArticlePicker lines={lines} onChange={setLines} autoFocus />
        <div className="actions">
          <button type="button" className="btn primary" disabled={lines.length === 0} onClick={() => setStep('supplier')}>
            Elegir proveedor
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="touch-form">
      <p className="muted small">
        {lines.length} {lines.length === 1 ? 'artículo' : 'artículos'}. ¿A quién se lo pedimos?
      </p>
      <label>
        Proveedor
        <select value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
          <option value="none">Sin proveedor</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.legalName}
            </option>
          ))}
        </select>
      </label>
      {suppliers.length === 0 && (
        <p className="muted small">Todavía no hay proveedores cargados. Podés guardarlo como Sin proveedor y asignarlo después.</p>
      )}
      <label>
        Nota (opcional)
        <textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Para el lunes, urgente…" />
      </label>
      <ErrorNote error={save.error} />
      <div className="actions">
        <button type="button" className="btn ghost" onClick={() => setStep('items')}>
          Volver
        </button>
        <button type="button" className="btn primary" disabled={save.isPending || lines.length === 0} onClick={() => save.mutate()}>
          {save.isPending ? 'Guardando…' : 'Guardar pedido'}
        </button>
      </div>
    </div>
  );
}
