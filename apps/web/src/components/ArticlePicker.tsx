import { useQuery } from '@tanstack/react-query';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Stepper } from './Checkout.tsx';
import { MoneyInput } from './MoneyInput.tsx';
import { api } from '../lib/api.ts';
import { ars } from '../lib/format.ts';
import { matchProduct, productQuery, productRank } from '../lib/search.ts';
import type { Product } from '../lib/types.ts';

export interface DraftLine {
  key: string;
  productId: number | null;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

export function lineFromProduct(product: Product, quantity = 1): DraftLine {
  return {
    key: `p-${product.id}`,
    productId: product.id,
    code: product.code,
    name: product.name,
    unit: product.unit,
    quantity,
    unitPrice: product.priceTransfer,
  };
}

export function ArticlePicker({
  lines,
  onChange,
  showPrices = false,
  autoFocus = false,
  inputRef,
}: {
  lines: DraftLine[];
  onChange: (lines: DraftLine[]) => void;
  showPrices?: boolean;
  autoFocus?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  const innerRef = useRef<HTMLInputElement>(null);
  const setInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      innerRef.current = node;
      if (inputRef) inputRef.current = node;
    },
    [inputRef],
  );
  const products = useQuery({
    queryKey: ['products', 'all'],
    queryFn: () => api<Product[]>('/api/products?active=all'),
    refetchOnWindowFocus: false,
  });
  const [q, setQ] = useState('');
  const deferred = useDeferredValue(q);
  const [hi, setHi] = useState(0);
  const words = productQuery(deferred);
  const qtyByProduct = useMemo(() => {
    const map = new Map<number, number>();
    for (const line of lines) if (line.productId != null) map.set(line.productId, line.quantity);
    return map;
  }, [lines]);

  const results = useMemo(() => {
    if (!words.length || !products.data) return [];
    return products.data
      .filter((product) => matchProduct(product, words))
      .sort((a, b) => productRank(a, deferred) - productRank(b, deferred) || a.name.localeCompare(b.name, 'es'))
      .slice(0, 8);
  }, [products.data, words, deferred]);

  useEffect(() => setHi(0), [deferred]);

  useEffect(() => {
    if (!autoFocus) return;
    const id = window.setTimeout(() => (inputRef?.current ?? innerRef.current)?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [autoFocus, inputRef]);

  const add = (product: Product) => {
    const existing = lines.find((line) => line.productId === product.id);
    if (existing) {
      onChange(lines.map((line) => (line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line)));
    } else {
      onChange([...lines, lineFromProduct(product)]);
    }
    setQ('');
    inputRef?.current?.focus();
  };

  const setQty = (key: string, quantity: number) => {
    onChange(lines.map((line) => (line.key === key ? { ...line, quantity: Math.max(1, quantity) } : line)));
  };

  const setPrice = (key: string, unitPrice: number) => {
    onChange(lines.map((line) => (line.key === key ? { ...line, unitPrice } : line)));
  };

  const remove = (key: string) => onChange(lines.filter((line) => line.key !== key));

  return (
    <div className="pick">
      <label>
        Artículo
        <input
          ref={setInputRef}
          className="search"
          placeholder="Código o nombre, ej. BOL-001"
          value={q}
          autoComplete="off"
          enterKeyHint="search"
          onChange={(event) => setQ(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setHi((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setHi((index) => Math.max(index - 1, 0));
            } else if (event.key === 'Enter') {
              event.preventDefault();
              const hit = results[hi];
              if (hit) add(hit);
            }
          }}
        />
      </label>
      {products.isLoading && <p className="muted small">Cargando artículos…</p>}
      {products.isError && <p className="error">No se pudo cargar el catálogo.</p>}
      {q.trim() && !products.isLoading && results.length === 0 && <p className="muted small">Ningún artículo coincide.</p>}
      {results.length > 0 && (
        <ul className="pick-results">
          {results.map((product, index) => {
            const added = qtyByProduct.get(product.id);
            return (
              <li key={product.id}>
                <button type="button" className={index === hi ? 'active' : undefined} onClick={() => add(product)}>
                  <span>
                    <span className="mono">{product.code}</span> {product.name}
                    <span className="muted"> · {product.unit}</span>
                    {!product.active && <span className="badge tiny neutral">inactivo</span>}
                  </span>
                  <span className="muted small">{added ? `× ${added}` : showPrices ? ars(product.priceTransfer) : 'Agregar'}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {lines.length > 0 && (
        <ul className="draft-lines">
          {lines.map((line) => (
            <li key={line.key} className={showPrices ? 'draft-line priced' : 'draft-line'}>
              <div className="who">
                <strong className="mono">{line.code}</strong>
                {line.name}
                <span className="muted"> · {line.unit}</span>
                {line.productId == null && <span className="badge tiny warn">ya no está en el catálogo</span>}
              </div>
              <div className="line-tools">
                <Stepper value={line.quantity} onChange={(quantity) => setQty(line.key, quantity)} />
                <button type="button" className="icon-btn danger" aria-label={`Quitar ${line.code}`} onClick={() => remove(line.key)}>
                  ✕
                </button>
              </div>
              {showPrices && (
                <label className="price-field">
                  Precio unitario
                  <MoneyInput label={`Precio de ${line.code}`} value={line.unitPrice} onChange={(price) => setPrice(line.key, price)} />
                </label>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
