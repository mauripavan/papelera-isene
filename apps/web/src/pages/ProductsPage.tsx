import { productPrices } from '@papelera/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ErrorNote } from '../components/Badges.tsx';
import { api } from '../lib/api.ts';
import { ars } from '../lib/format.ts';
import type { Category, Product, Settings } from '../lib/types.ts';

type ProductPatch = Partial<
  Pick<Product, 'code' | 'name' | 'unit' | 'price' | 'discriminaIva' | 'priceTransferFixed' | 'active' | 'needsReview' | 'categoryId'>
>;

export function ProductsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [showInactive, setShowInactive] = useState(false);
  const [onlyReview, setOnlyReview] = useState(false);

  const settings = useQuery({ queryKey: ['settings'], queryFn: () => api<Settings>('/api/settings') });
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => api<Category[]>('/api/categories') });
  const products = useQuery({
    queryKey: ['products', q, categoryId, showInactive, onlyReview],
    queryFn: () => {
      // "Para revisar" muestra también los inactivos: la mayoría son productos sin precio.
      const sp = new URLSearchParams({ active: showInactive || onlyReview ? 'all' : 'true' });
      if (onlyReview) sp.set('review', 'true');
      if (q.trim()) sp.set('q', q.trim());
      if (categoryId) sp.set('categoryId', categoryId);
      return api<Product[]>(`/api/products?${sp}`);
    },
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: ProductPatch }) =>
      api<Product>(`/api/products/${id}`, { method: 'PATCH', json: patch }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['review-count'] });
    },
  });

  const reviewCount = useQuery({
    queryKey: ['review-count'],
    queryFn: () => api<{ count: number }>('/api/products/review-count'),
  });

  const ivaPct = Math.round((settings.data?.ivaRate ?? 0.21) * 1000) / 10;

  return (
    <section>
      <div className="page-head">
        <h1>Productos</h1>
        <div className="row">
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
        </div>
      </div>

      <p className="muted small">
        El precio que cargás es el de <b>efectivo</b>. Si el producto <b>discrimina IVA</b>, en transferencia se le suma
        el {ivaPct}%. Si no, cuesta lo mismo en los dos medios. Si cargás un precio de transferencia a mano, se usa ese
        en lugar del cálculo. Los productos sin precio quedan inactivos y el bot no los ofrece.
      </p>

      <div className="grid-2">
        <NewProductForm categories={categories.data ?? []} />
        <BulkPriceForm categories={categories.data ?? []} />
      </div>

      <ErrorNote error={products.error ?? update.error} />
      <div className="table-wrap">
        <table className="table products">
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto</th>
              <th>Presentación</th>
              <th>Categoría</th>
              <th className="num">Precio efectivo</th>
              <th className="center">Discrimina IVA</th>
              <th className="num">Transferencia</th>
              <th className="center">Activo</th>
              <th className="center">Revisión</th>
            </tr>
          </thead>
          <tbody>
            {products.data?.map((p) => (
              <ProductRow
                key={`${p.id}-${p.price}-${p.priceTransferFixed}-${p.name}-${p.unit}`}
                product={p}
                categories={categories.data ?? []}
                ivaRate={settings.data?.ivaRate ?? 0.21}
                onSave={(patch) => update.mutate({ id: p.id, patch })}
              />
            ))}
          </tbody>
        </table>
        {products.data?.length === 0 && <div className="empty">No hay productos con ese filtro.</div>}
      </div>
    </section>
  );
}

function ProductRow({
  product: p,
  categories,
  ivaRate,
  onSave,
}: {
  product: Product;
  categories: Category[];
  ivaRate: number;
  onSave: (patch: ProductPatch) => void;
}) {
  const [name, setName] = useState(p.name);
  const [unit, setUnit] = useState(p.unit);
  const [price, setPrice] = useState(String(p.price));
  const [transfer, setTransfer] = useState(p.priceTransferFixed == null ? '' : String(p.priceTransferFixed));

  const priceNum = Number(price.replace(',', '.'));
  const computed = productPrices(
    { price: Number.isFinite(priceNum) ? priceNum : p.price, discriminaIva: p.discriminaIva },
    ivaRate,
  );

  const commit = (field: 'name' | 'unit' | 'price' | 'transfer') => {
    if (field === 'name' && name.trim() && name !== p.name) onSave({ name: name.trim() });
    if (field === 'unit' && unit.trim() && unit !== p.unit) onSave({ unit: unit.trim() });
    if (field === 'price') {
      if (!Number.isFinite(priceNum) || priceNum < 0) return setPrice(String(p.price));
      // Un producto que no tenía precio se activa al cargarle uno
      if (priceNum !== p.price) onSave({ price: priceNum, ...(p.price === 0 && priceNum > 0 ? { active: true } : {}) });
    }
    if (field === 'transfer') {
      const t = transfer.trim() === '' ? null : Number(transfer.replace(',', '.'));
      if (t !== null && (!Number.isFinite(t) || t < 0)) return setTransfer(p.priceTransferFixed == null ? '' : String(p.priceTransferFixed));
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
        <input className="cell" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => commit('name')} onKeyDown={onEnter} />
        {p.needsReview && p.reviewNote && <div className="review-note">{p.reviewNote}</div>}
      </td>
      <td>
        <input className="cell" value={unit} onChange={(e) => setUnit(e.target.value)} onBlur={() => commit('unit')} onKeyDown={onEnter} />
      </td>
      <td>
        <select
          className="cell"
          value={p.categoryId ?? ''}
          onChange={(e) => onSave({ categoryId: e.target.value ? Number(e.target.value) : null })}
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
          placeholder={ars(computed.transfer)}
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
            onClick={() => onSave({ needsReview: false, ...(p.price > 0 ? { active: true } : {}) })}
          >
            Listo
          </button>
        ) : (
          <span className="muted small">✓</span>
        )}
      </td>
    </tr>
  );
}

function NewProductForm({ categories }: { categories: Category[] }) {
  const qc = useQueryClient();
  const empty = { code: '', name: '', unit: 'unidad', price: '', discriminaIva: false, categoryId: '' };
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
    <form className="card form-grid" onSubmit={onSubmit}>
      <h2>Nuevo producto</h2>
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
        json: { percent: Number(percent.replace(',', '.')), categoryId: categoryId ? Number(categoryId) : undefined },
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
    const scope = categoryId ? `la categoría "${categories.find((c) => String(c.id) === categoryId)?.name}"` : 'TODOS los productos activos';
    if (window.confirm(`¿Aplicar ${percent}% a ${scope}?`)) bulk.mutate();
  };

  return (
    <form className="card form-grid" onSubmit={onSubmit}>
      <h2>Actualizar precios por %</h2>
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
