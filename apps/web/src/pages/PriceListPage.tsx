import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { api } from '../lib/api.ts';
import { ars } from '../lib/format.ts';

interface PublicProduct {
  code: string;
  name: string;
  unit: string;
  category: string;
  priceCash: number;
  priceTransfer: number;
}

interface PriceList {
  businessName: string;
  pickupAddress: string;
  updatedAt: string;
  products: PublicProduct[];
}

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Lista de precios pública. Pensada para abrirse desde el celular, con el link que manda el bot. */
export function PriceListPage() {
  const [q, setQ] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const list = useQuery({ queryKey: ['public', 'price-list'], queryFn: () => api<PriceList>('/public/price-list') });

  const groups = useMemo(() => {
    const term = normalize(q.trim());
    const filtered = (list.data?.products ?? []).filter(
      (p) => !term || normalize(`${p.code} ${p.name} ${p.unit} ${p.category}`).includes(term),
    );
    const map = new Map<string, PublicProduct[]>();
    for (const p of filtered) map.set(p.category, [...(map.get(p.category) ?? []), p]);
    return [...map.entries()];
  }, [list.data, q]);

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied((c) => (c === code ? null : c)), 1500);
    } catch {
      /* sin permiso de portapapeles: no pasa nada */
    }
  };

  return (
    <div className="pl">
      <header className="pl-head">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            ✎
          </span>
          {list.data?.businessName ?? 'Lista de precios'}
        </div>
        <p className="pl-how">
          Para pedir por WhatsApp mandá <b>CÓDIGO CANTIDAD</b>, un producto por línea. Ej: <span className="mono">BOL-001 2</span>
        </p>
        <input
          className="pl-search"
          type="search"
          placeholder="Buscar producto o código"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar"
        />
      </header>

      {list.isLoading && <p className="muted pl-pad">Cargando…</p>}
      {list.error && <p className="error pl-pad">No pudimos cargar la lista. Probá de nuevo en un rato.</p>}
      {list.data && !groups.length && <p className="muted pl-pad">No encontramos productos con “{q}”.</p>}

      {groups.map(([category, products]) => (
        <section key={category} className="pl-group">
          <h2 className="pl-cat">{category}</h2>
          <ul className="pl-list">
            {products.map((p) => (
              <li key={p.code} className="pl-item">
                <button className="pl-code mono" onClick={() => copy(p.code)} title="Copiar código">
                  {copied === p.code ? 'Copiado' : p.code}
                </button>
                <div className="pl-name">
                  {p.name}
                  <span className="muted small">{p.unit}</span>
                </div>
                <div className="pl-prices">
                  <span className="pl-cash">{ars(p.priceCash)}</span>
                  {p.priceTransfer !== p.priceCash && <span className="muted small">Transf. {ars(p.priceTransfer)}</span>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {list.data && (
        <footer className="pl-foot muted small">
          Precios en efectivo. Si figura precio de transferencia, es el que corresponde pagando por transferencia.
          {list.data.pickupAddress && <> Retiro en {list.data.pickupAddress}.</>}
        </footer>
      )}
    </div>
  );
}
