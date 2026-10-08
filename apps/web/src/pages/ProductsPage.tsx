import { productPrices } from '@papelera/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ErrorNote } from '../components/Badges.tsx';
import { Modal } from '../components/Modal.tsx';
import { api } from '../lib/api.ts';
import { ars } from '../lib/format.ts';
import type { Category, Product, Settings } from '../lib/types.ts';

type ProductPatch = Partial<
  Pick<Product, 'code' | 'name' | 'unit' | 'price' | 'discriminaIva' | 'priceTransferFixed' | 'active' | 'needsReview' | 'categoryId'>
>;

const PAGE = 150;

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
/** Para los códigos: "bol001", "BOL 001" y "BOL-001" son lo mismo */
const compact = (s: string) => norm(s).replace(/[\s\-_./]/g, '');

function matches(p: Product, words: string[]) {
  const name = norm(`${p.name} ${p.unit}`);
  const code = compact(p.code);
  return words.every((w) => name.includes(w) || code.includes(compact(w)));
}

export function ProductsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const dq = useDeferredValue(q);
  const [categoryId, setCategoryId] = useState<string>('');
  const [showInactive, setShowInactive] = useState(false);
  const [onlyReview, setOnlyReview] = useState(false);
  const [modal, setModal] = useState<'new' | 'bulk' | null>(null);
  /** Sube cuando se agrega un producto: hay que volver a armar la vista */
  const [version, setVersion] = useState(0);

  const settings = useQuery({
    queryKey: ['settings'],
    queryFn: () => api<Settings>('/api/settings'),
  });
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('/api/categories'),
  });
  // Se traen todos una sola vez (son ~1000) y se filtra en el navegador: la búsqueda es instantánea.
  const products = useQuery({
    queryKey: ['products', 'all'],
    queryFn: () => api<Product[]>('/api/products?active=all'),
    refetchOnWindowFocus: false,
  });
  const byId = useMemo(() => new Map((products.data ?? []).map((p) => [p.id, p])), [products.data]);

  /**
   * La vista (qué productos y en qué orden) se arma solo cuando cambian los filtros.
   * Al editar un producto se actualizan sus datos pero no se mueve ni desaparece,
   * aunque deje de cumplir el filtro (por ejemplo, al marcarlo "Listo" en "Solo para revisar").
   */
  const filterKey = JSON.stringify([dq.trim(), categoryId, showInactive, onlyReview, version]);
  const [view, setView] = useState<{ key: string; ids: number[] } | null>(null);
  useEffect(() => {
    if (!products.data || view?.key === filterKey) return;
    const words = norm(dq.trim()).split(/\s+/).filter(Boolean);
    const ids = products.data
      .filter((p) => {
        if (onlyReview && !p.needsReview) return false;
        // "Para revisar" y las búsquedas muestran también los inactivos (la mayoría son productos sin precio)
        if (!p.active && !showInactive && !onlyReview && !words.length) return false;
        if (categoryId && String(p.categoryId ?? '') !== categoryId) return false;
        return !words.length || matches(p, words);
      })
      .map((p) => p.id);
    setView({ key: filterKey, ids });
  }, [products.data, filterKey, view?.key, dq, categoryId, showInactive, onlyReview]);

  // Se dibujan de a tandas a medida que se baja: mil filas con inputs juntas hacen lenta la página
  const [limit, setLimit] = useState(PAGE);
  useEffect(() => setLimit(PAGE), [filterKey]);
  const sentinel = useRef<HTMLDivElement>(null);
  const total = view?.ids.length ?? 0;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || limit >= total) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && setLimit((l) => l + PAGE), { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [limit, total]);

  const replaceInCache = (p: Product) =>
    qc.setQueryData<Product[]>(['products', 'all'], (list) => list?.map((x) => (x.id === p.id ? p : x)));

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: ProductPatch }) =>
      api<Product>(`/api/products/${id}`, { method: 'PATCH', json: patch }),
    onSuccess: (p) => {
      replaceInCache(p);
      qc.invalidateQueries({ queryKey: ['review-count'] });
    },
  });
  const remove = useMutation({
    mutationFn: (id: number) => api<void>(`/api/products/${id}`, { method: 'DELETE' }),
    onSuccess: (_r, id) => {
      qc.setQueryData<Product[]>(['products', 'all'], (list) => list?.filter((x) => x.id !== id));
      setView((v) => (v ? { ...v, ids: v.ids.filter((x) => x !== id) } : v));
      qc.invalidateQueries({ queryKey: ['review-count'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
  const onSave = useCallback((id: number, patch: ProductPatch) => update.mutate({ id, patch }), [update.mutate]);
  const onDelete = useCallback(
    (p: Product) => {
      const msg =
        `¿Eliminar "${p.name}" (${p.code})?\n\nNo se puede deshacer. Los pedidos viejos lo conservan.` +
        (p.active ? '\n\nSi solo querés que no aparezca en la lista de precios, desmarcá "Activo".' : '');
      if (window.confirm(msg)) remove.mutate(p.id);
    },
    [remove.mutate],
  );

  const reviewCount = useQuery({
    queryKey: ['review-count'],
    queryFn: () => api<{ count: number }>('/api/products/review-count'),
  });

  const ivaRate = settings.data?.ivaRate ?? 0.21;
  const ivaPct = Math.round(ivaRate * 1000) / 10;
  const cats = categories.data ?? EMPTY;
  const visible = (view?.ids ?? []).slice(0, limit);

  return (
    <section>
      <div className="page-head">
        <h1>Productos</h1>
        <div className="row">
          <button className="btn" onClick={() => setModal('bulk')}>
            Actualizar precios por %
          </button>
          <button className="btn primary" onClick={() => setModal('new')}>
            + Nuevo producto
          </button>
        </div>
      </div>

      <div className="filters row">
        <input className="search" placeholder="Buscar por código o nombre" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="inline">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Ver inactivos
        </label>
        <label className="inline">
          <input type="checkbox" checked={onlyReview} onChange={(e) => setOnlyReview(e.target.checked)} />
          Solo para revisar
          {!!reviewCount.data?.count && <span className="count">{reviewCount.data.count}</span>}
        </label>
        {view && <span className="muted small">{total} productos</span>}
      </div>

      <p className="muted small">
        El precio que cargás es el de <b>efectivo</b>. Si el producto <b>discrimina IVA</b>, en transferencia se le suma el {ivaPct}%. Si
        no, cuesta lo mismo en los dos medios. Si cargás un precio de transferencia a mano, se usa ese en lugar del cálculo. Los productos
        sin precio quedan inactivos y el bot no los ofrece. Al buscar se muestran también los inactivos.
      </p>

      <Modal open={modal === 'new'} onClose={() => setModal(null)} title="Nuevo producto">
        <NewProductForm
          categories={cats}
          onDone={() => {
            setModal(null);
            setVersion((v) => v + 1);
          }}
        />
      </Modal>
      <Modal open={modal === 'bulk'} onClose={() => setModal(null)} title="Actualizar precios por %">
        <BulkPriceForm categories={cats} />
      </Modal>

      <ErrorNote error={products.error ?? update.error ?? remove.error} />
      {products.isLoading && <p className="muted">Cargando…</p>}
      <div className="table-wrap">
        <table className="table products">
          <colgroup>
            <col className="c-code" />
            <col className="c-name" />
            <col className="c-unit" />
            <col className="c-cat" />
            <col className="c-price" />
            <col className="c-iva" />
            <col className="c-price" />
            <col className="c-flag" />
            <col className="c-flag" />
            <col className="c-del" />
          </colgroup>
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto</th>
              <th>Presentación</th>
              <th>Categoría</th>
              <th className="num">Efectivo</th>
              <th className="center">IVA</th>
              <th className="num">Transferencia</th>
              <th className="center">Activo</th>
              <th className="center">Revisión</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.map((id) => {
              const p = byId.get(id);
              return p ? <ProductRow key={id} product={p} categories={cats} ivaRate={ivaRate} onSave={onSave} onDelete={onDelete} /> : null;
            })}
          </tbody>
        </table>
        {view && total === 0 && <div className="empty">No hay productos con ese filtro.</div>}
        {limit < total && (
          <div ref={sentinel} className="empty">
            <button className="btn sm" onClick={() => setLimit((l) => l + PAGE)}>
              Mostrar más ({total - limit})
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

const EMPTY: Category[] = [];

const ProductRow = memo(function ProductRow({
  product: p,
  categories,
  ivaRate,
  onSave: save,
  onDelete,
}: {
  product: Product;
  categories: Category[];
  ivaRate: number;
  onSave: (id: number, patch: ProductPatch) => void;
  onDelete: (p: Product) => void;
}) {
  const onSave = (patch: ProductPatch) => save(p.id, patch);
  const priceText = (n: number) => (n > 0 ? String(n) : '');
  const [name, setName] = useState(p.name);
  const [unit, setUnit] = useState(p.unit);
  // Sin precio: el campo queda vacío para escribir directo (no un 0 que haya que borrar)
  const [price, setPrice] = useState(priceText(p.price));
  const [transfer, setTransfer] = useState(p.priceTransferFixed == null ? '' : String(p.priceTransferFixed));
  // Si el dato cambia en el servidor (ej. aumento por %), se refleja en la fila
  useEffect(() => setName(p.name), [p.name]);
  useEffect(() => setUnit(p.unit), [p.unit]);
  useEffect(() => setPrice(priceText(p.price)), [p.price]);
  useEffect(() => setTransfer(p.priceTransferFixed == null ? '' : String(p.priceTransferFixed)), [p.priceTransferFixed]);

  const priceNum = price.trim() === '' ? 0 : Number(price.replace(',', '.'));
  const computed = productPrices(
    {
      price: Number.isFinite(priceNum) ? priceNum : p.price,
      discriminaIva: p.discriminaIva,
    },
    ivaRate,
  );

  const commit = (field: 'name' | 'unit' | 'price' | 'transfer') => {
    if (field === 'name') {
      if (!name.trim()) return setName(p.name);
      if (name.trim() !== p.name) onSave({ name: name.trim() });
    }
    if (field === 'unit') {
      if (!unit.trim()) return setUnit(p.unit);
      if (unit.trim() !== p.unit) onSave({ unit: unit.trim() });
    }
    if (field === 'price') {
      if (!Number.isFinite(priceNum) || priceNum < 0) return setPrice(priceText(p.price));
      if (priceNum !== p.price)
        onSave({
          price: priceNum,
          // Un producto que no tenía precio se activa al cargarle uno; si se le borra el precio, se desactiva
          ...(p.price === 0 && priceNum > 0 ? { active: true } : {}),
          ...(priceNum === 0 && p.active ? { active: false } : {}),
        });
    }
    if (field === 'transfer') {
      const t = transfer.trim() === '' ? null : Number(transfer.replace(',', '.'));
      if (t !== null && (!Number.isFinite(t) || t < 0))
        return setTransfer(p.priceTransferFixed == null ? '' : String(p.priceTransferFixed));
      if (t !== p.priceTransferFixed) onSave({ priceTransferFixed: t });
    }
  };
  const onEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur();
  };

  return (
    <tr className={p.active ? '' : 'inactive'}>
      <td className="mono">{p.code}</td>
      <td>
        <input className="cell" value={name} title={name} onChange={(e) => setName(e.target.value)} onBlur={() => commit('name')} onKeyDown={onEnter} />
        {p.needsReview && p.reviewNote && <div className="review-note">{p.reviewNote}</div>}
      </td>
      <td>
        <input className="cell" value={unit} onChange={(e) => setUnit(e.target.value)} onBlur={() => commit('unit')} onKeyDown={onEnter} />
      </td>
      <td>
        <select
          className="cell"
          value={p.categoryId ?? ''}
          onChange={(e) =>
            onSave({
              categoryId: e.target.value ? Number(e.target.value) : null,
            })
          }
        >
          <option value="">—</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </td>
      <td className="num">
        <input
          className="cell num"
          inputMode="decimal"
          value={price}
          placeholder="Sin precio"
          onChange={(e) => setPrice(e.target.value)}
          onBlur={() => commit('price')}
          onKeyDown={onEnter}
        />
      </td>
      <td className="center">
        <input type="checkbox" checked={p.discriminaIva} onChange={(e) => onSave({ discriminaIva: e.target.checked })} />
      </td>
      <td className="num">
        <input
          className="cell num"
          inputMode="decimal"
          value={transfer}
          placeholder={computed.transfer > 0 ? ars(computed.transfer) : ''}
          title="Vacío: se calcula con el IVA. Cargá un valor para fijarlo."
          onChange={(e) => setTransfer(e.target.value)}
          onBlur={() => commit('transfer')}
          onKeyDown={onEnter}
        />
      </td>
      <td className="center">
        <input
          type="checkbox"
          checked={p.active}
          disabled={!p.active && p.price <= 0}
          title={!p.active && p.price <= 0 ? 'Cargale un precio para activarlo' : undefined}
          onChange={(e) => onSave({ active: e.target.checked })}
        />
      </td>
      <td className="center">
        {p.needsReview ? (
          <button
            className="btn sm"
            title="Marcar como revisado"
            onClick={() =>
              onSave({
                needsReview: false,
                ...(p.price > 0 ? { active: true } : {}),
              })
            }
          >
            Listo
          </button>
        ) : (
          <span className="muted small">✓</span>
        )}
      </td>
      <td className="center">
        <button className="icon-btn danger" title="Eliminar producto" aria-label={`Eliminar ${p.name}`} onClick={() => onDelete(p)}>
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10M9 9v5M11 9v5" />
          </svg>
        </button>
      </td>
    </tr>
  );
});

function NewProductForm({ categories, onDone }: { categories: Category[]; onDone: () => void }) {
  const qc = useQueryClient();
  const empty = {
    code: '',
    name: '',
    unit: 'unidad',
    price: '',
    discriminaIva: false,
    categoryId: '',
  };
  const [form, setForm] = useState(empty);
  const create = useMutation({
    mutationFn: () =>
      api<Product>('/api/products', {
        method: 'POST',
        json: {
          code: form.code,
          name: form.name,
          unit: form.unit,
          price: Number(form.price.replace(',', '.')),
          discriminaIva: form.discriminaIva,
          categoryId: form.categoryId ? Number(form.categoryId) : null,
        },
      }),
    onSuccess: () => {
      setForm(empty);
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
      onDone();
    },
  });
  const newCategory = useMutation({
    mutationFn: (name: string) => api<Category>('/api/categories', { method: 'POST', json: { name } }),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      setForm((f) => ({ ...f, categoryId: String(c.id) }));
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <label>
        Código
        <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="R-A4" required />
      </label>
      <label>
        Nombre
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Resma A4 75g" required />
      </label>
      <label>
        Presentación
        <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="resma x 500" required />
      </label>
      <label>
        Precio efectivo
        <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} inputMode="decimal" required />
      </label>
      <label>
        Categoría
        <select
          value={form.categoryId}
          onChange={(e) => {
            if (e.target.value === '__new') {
              const name = window.prompt('Nombre de la nueva categoría');
              if (name?.trim()) newCategory.mutate(name.trim());
              return;
            }
            setForm({ ...form, categoryId: e.target.value });
          }}
        >
          <option value="">—</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value="__new">+ Nueva categoría…</option>
        </select>
      </label>
      <label className="inline">
        <input type="checkbox" checked={form.discriminaIva} onChange={(e) => setForm({ ...form, discriminaIva: e.target.checked })} />
        Discrimina IVA
      </label>
      <ErrorNote error={create.error ?? newCategory.error} />
      <button className="btn primary" disabled={create.isPending}>
        Agregar
      </button>
    </form>
  );
}

function BulkPriceForm({ categories }: { categories: Category[] }) {
  const qc = useQueryClient();
  const [percent, setPercent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const bulk = useMutation({
    mutationFn: () =>
      api<{ updated: number }>('/api/products/bulk-price', {
        method: 'POST',
        json: {
          percent: Number(percent.replace(',', '.')),
          categoryId: categoryId ? Number(categoryId) : undefined,
        },
      }),
    onSuccess: (r) => {
      setResult(`Se actualizaron ${r.updated} productos.`);
      setPercent('');
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setResult(null);
    const scope = categoryId
      ? `la categoría "${categories.find((c) => String(c.id) === categoryId)?.name}"`
      : 'TODOS los productos activos';
    if (window.confirm(`¿Aplicar ${percent}% a ${scope}?`)) bulk.mutate();
  };

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <p className="muted small span-2">Usá un número negativo para bajar precios. Se redondea a centavos.</p>
      <label>
        Porcentaje
        <input value={percent} onChange={(e) => setPercent(e.target.value)} inputMode="decimal" placeholder="10" required />
      </label>
      <label>
        Aplicar a
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Todos los productos</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <ErrorNote error={bulk.error} />
      {result && <p className="success span-2">{result}</p>}
      <button className="btn" disabled={bulk.isPending}>
        Aplicar aumento
      </button>
    </form>
  );
}
