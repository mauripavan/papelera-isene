import { round2 } from '@papelera/shared';
import { useRef, useState, type FormEvent } from 'react';
import { ArticlePicker, type DraftLine } from './ArticlePicker.tsx';
import { ErrorNote } from './Badges.tsx';
import { MoneyInput } from './MoneyInput.tsx';
import { ars } from '../lib/format.ts';
import type { InvoiceSale } from '../lib/types.ts';

export interface SalePayload {
  customerName: string;
  customerCuit: string;
  note: string;
  total: number;
  items: {
    productId: number | null;
    quantity: number;
    unitPrice: number;
    productCode: string;
    productName: string;
    unit: string;
  }[];
}

function lineKey(lines: DraftLine[]): string {
  return lines.map((line) => `${line.key}:${line.quantity}:${line.unitPrice}`).join('|');
}

function linesFromSale(sale?: InvoiceSale | null): DraftLine[] {
  if (!sale) return [];
  return sale.items.map((item) => ({
    key: item.productId != null ? `p-${item.productId}` : `gone-${item.id}`,
    productId: item.productId,
    code: item.productCode,
    name: item.productName,
    unit: item.unit,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  }));
}

export function SaleForm({
  initial,
  submitLabel,
  autoFocus = false,
  resetOnSuccess = false,
  onSubmit,
}: {
  initial?: InvoiceSale | null;
  submitLabel: string;
  autoFocus?: boolean;
  resetOnSuccess?: boolean;
  onSubmit: (payload: SalePayload) => Promise<void>;
}) {
  const [lines, setLines] = useState<DraftLine[]>(() => linesFromSale(initial));
  const [customerName, setCustomerName] = useState(initial?.customerName ?? '');
  const [customerCuit, setCustomerCuit] = useState(initial?.customerCuit ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [manual, setManual] = useState<{ key: string; total: number } | null>(() => {
    const key = lineKey(linesFromSale(initial));
    if (initial && Math.abs(initial.total - initial.itemsTotal) > 0.009) return { key, total: initial.total };
    return null;
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const linesKey = lineKey(lines);
  const computed = round2(lines.reduce((acc, line) => acc + line.unitPrice * line.quantity, 0));
  const manualTotal = manual?.key === linesKey ? manual.total : null;
  const total = manualTotal ?? computed;
  const adjusted = manualTotal != null && Math.abs(manualTotal - computed) > 0.009;
  const [customerOpen, setCustomerOpen] = useState(
    Boolean(initial?.customerName || initial?.customerCuit || initial?.note),
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!lines.length || pending) return;
    setPending(true);
    setError(null);
    try {
      await onSubmit({
        customerName: customerName.trim(),
        customerCuit: customerCuit.trim(),
        note: note.trim(),
        total,
        items: lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          productCode: line.code,
          productName: line.name,
          unit: line.unit,
        })),
      });
      if (resetOnSuccess) {
        setLines([]);
        setManual(null);
        setCustomerName('');
        setCustomerCuit('');
        setNote('');
        searchRef.current?.focus();
      }
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="touch-form sale-form" onSubmit={submit}>
      <ArticlePicker lines={lines} onChange={setLines} showPrices autoFocus={autoFocus} inputRef={searchRef} />
      <p className="muted small">El precio es el de transferencia. Podés cambiarlo en cada artículo.</p>
      <label>
        Total a facturar
        <MoneyInput
          className="total-input"
          label="Total a facturar"
          value={total}
          onChange={(value) => setManual({ key: linesKey, total: value })}
        />
      </label>
      {adjusted && (
        <p className="muted small">
          La suma de los artículos es {ars(computed)}.
          <button type="button" className="btn ghost sm" onClick={() => setManual(null)}>
            Usar la suma
          </button>
        </p>
      )}
      <details className="optional" open={customerOpen} onToggle={(event) => setCustomerOpen(event.currentTarget.open)}>
        <summary>Cliente y nota (opcional)</summary>
        <div className="optional-fields">
          <label>
            Nombre
            <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} autoComplete="name" />
          </label>
          <label>
            CUIT
            <input
              value={customerCuit}
              onChange={(event) => setCustomerCuit(event.target.value)}
              inputMode="numeric"
              placeholder="20-12345678-9"
              autoComplete="off"
            />
          </label>
          <label className="span-2">
            Nota
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Transferencia, seña…" />
          </label>
        </div>
      </details>
      <ErrorNote error={error} />
      <button className="btn primary" disabled={pending || lines.length === 0}>
        {pending ? 'Guardando…' : submitLabel}
      </button>
    </form>
  );
}
