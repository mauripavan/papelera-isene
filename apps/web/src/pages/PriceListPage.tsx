import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Checkout, Stepper, WhatsAppGlyph } from '../components/Checkout.tsx';
import { ProductIcon } from '../components/ProductIcon.tsx';
import { api } from '../lib/api.ts';
import { ars } from '../lib/format.ts';
import {
  cartLines,
  cartTotals,
  useCart,
  useStep,
  useStored,
  type CheckoutData,
  type PriceList,
  type PublicInfo,
  type PublicProduct,
  type WebOrderResult,
} from '../lib/shop.ts';

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const EMPTY_CHECKOUT: CheckoutData = { address: '', name: '', phone: '' };

/**
 * Lista de precios pública y pedido web. Se abre desde el link que manda el bot
 * (que trae el WhatsApp del cliente firmado en ?t=) o directo.
 */
export function PriceListPage() {
  const token = useMemo(() => new URLSearchParams(window.location.search).get('t'), []);
  const [q, setQ] = useState('');
  const [step, go] = useStep();
  const { cart, setQty, clear } = useCart();
  const [checkout, setCheckout] = useStored<CheckoutData>('checkout', EMPTY_CHECKOUT);
  const [result, setResult] = useState<WebOrderResult | null>(null);

  const list = useQuery({ queryKey: ['public', 'price-list'], queryFn: () => api<PriceList>('/public/price-list') });
  const info = useQuery({ queryKey: ['public', 'info'], queryFn: () => api<PublicInfo>('/public/info') });
  const who = useQuery({
    queryKey: ['public', 'whoami', token],
    queryFn: () => api<{ phone: string | null; display?: string }>(`/public/whoami?t=${encodeURIComponent(token!)}`),
    enabled: Boolean(token),
    staleTime: Infinity,
  });
  const linked = who.data?.phone ? { phone: who.data.phone, display: who.data.display ?? who.data.phone } : null;

  const byCode = useMemo(() => new Map((list.data?.products ?? []).map((p) => [p.code, p])), [list.data]);
  const lines = useMemo(() => (list.data ? cartLines(cart, byCode) : []), [cart, byCode, list.data]);
  const totals = cartTotals(lines);

  // Productos que ya no están en la lista: se sacan del carrito
  useEffect(() => {
    if (!list.data) return;
    for (const code of Object.keys(cart)) if (!byCode.has(code)) setQty(code, 0);
  }, [list.data, byCode, cart, setQty]);

  // Sin productos no hay pasos del pedido (salvo la pantalla final)
  useEffect(() => {
    if (list.data && step && step !== 'listo' && !lines.length) go(null, true);
    if (step === 'listo' && !result) go(null, true);
  }, [list.data, step, lines.length, result, go]);

  const groups = useMemo(() => {
    const term = normalize(q.trim());
    const filtered = (list.data?.products ?? []).filter(
      (p) => !term || normalize(`${p.code} ${p.name} ${p.unit} ${p.category}`).includes(term),
    );
    const map = new Map<string, PublicProduct[]>();
    for (const p of filtered) map.set(p.category, [...(map.get(p.category) ?? []), p]);
    return [...map.entries()];
  }, [list.data, q]);

  if (step === 'listo' && result) {
    return <Done result={result} businessName={info.data?.businessName ?? list.data?.businessName} onNew={() => go(null, true)} />;
  }

  if (step && step !== 'listo' && lines.length) {
    return (
      <Checkout
        step={step}
        go={go}
        lines={lines}
        setQty={setQty}
        info={info.data}
        data={checkout}
        setData={setCheckout}
        linked={linked}
        token={linked ? token : null}
        onDone={(r) => {
          setResult(r);
          clear();
          setCheckout({ ...EMPTY_CHECKOUT, name: checkout.name, phone: checkout.phone, address: checkout.address });
          go('listo', true);
        }}
      />
    );
  }

  return (
    <div className={`pl${lines.length ? ' with-bar' : ''}`}>
      <header className="pl-head">
        <div className="pl-top">
          <div className="brand">
            <span className="brand-mark" aria-hidden>
              ✎
            </span>
            {list.data?.businessName ?? 'Lista de precios'}
          </div>
          {linked && (
            <span className="pl-linked" title="Te avisamos por este WhatsApp">
              <WhatsAppGlyph size={15} /> {linked.display}
            </span>
          )}
        </div>
        <p className="pl-how">
          Agregá productos y confirmá tu pedido. <b>Te avisamos todo por WhatsApp.</b>
        </p>
        {token && who.data && !who.data.phone && (
          <p className="pl-expired small">El link de WhatsApp venció: al final te pedimos tu número. (O escribile *PEDIDO* al bot y te manda uno nuevo.)</p>
        )}
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
            {products.map((p) => {
              const qty = cart[p.code] ?? 0;
              return (
                <li key={p.code} className={`pl-item${qty ? ' in-cart' : ''}`}>
                  <ProductIcon name={p.name} category={p.category} />
                  <div className="pl-name">
                    {p.name}
                    <span className="muted small">
                      {p.unit} · <span className="mono">{p.code}</span>
                    </span>
                    <span className="pl-prices">
                      <span className="pl-cash">{ars(p.priceCash)}</span>
                      {p.priceTransfer !== p.priceCash && <span className="muted small">Transf. {ars(p.priceTransfer)}</span>}
                    </span>
                  </div>
                  <div className="pl-add">
                    {qty ? (
                      <Stepper value={qty} onChange={(n) => setQty(p.code, n)} />
                    ) : (
                      <button className="btn sm pl-add-btn" onClick={() => setQty(p.code, 1)}>
                        Agregar
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {list.data && (
        <footer className="pl-foot muted small">
          Precios en efectivo. Si figura precio de transferencia, es el que corresponde pagando por transferencia.
          {list.data.pickupAddress && <> Retiro en {list.data.pickupAddress}.</>}
        </footer>
      )}

      {lines.length > 0 && (
        <div className="pl-bar">
          <div className="pl-bar-text">
            <b>
              {totals.items} {totals.items === 1 ? 'producto' : 'productos'}
            </b>
            <span>{ars(totals.cash)} en efectivo</span>
          </div>
          <button className="btn primary" onClick={() => go('pedido')}>
            Ver pedido →
          </button>
        </div>
      )}
    </div>
  );
}

function Done({ result, businessName, onNew }: { result: WebOrderResult; businessName?: string; onNew: () => void }) {
  if (result.whatsappConfirmed) {
    return (
      <div className="co done">
        <div className="done-mark ok">✓</div>
        <h1>¡Recibimos tu pedido #{result.id}!</h1>
        <p>
          Te mandamos la confirmación por WhatsApp a <b>{result.phoneDisplay}</b>. Revisamos que tengamos todo y seguimos por ahí: si falta algo, el
          costo del envío, los datos para transferir y la fecha.
        </p>
        <button className="btn" onClick={onNew}>
          Volver a la lista
        </button>
      </div>
    );
  }
  return (
    <div className="co done">
      <div className="done-mark">1</div>
      <h1>Último paso: confirmalo por WhatsApp</h1>
      <p>
        Tu pedido <b>#{result.id}</b> ya nos llegó. Para que te podamos avisar, mandanos el mensaje que te armamos desde tu WhatsApp (
        {result.phoneDisplay}). Así sabemos que el número es tuyo.
      </p>
      {result.confirmUrl ? (
        <a className="btn wa lg" href={result.confirmUrl} target="_blank" rel="noreferrer">
          <WhatsAppGlyph /> Confirmar por WhatsApp
        </a>
      ) : (
        <div className="done-text">
          <p className="small muted">Mandale este mensaje al WhatsApp de {businessName ?? 'la papelera'}:</p>
          <pre className="bubble">{result.confirmText}</pre>
        </div>
      )}
      <p className="small muted">Si no lo confirmás, el pedido nos llega igual pero no te van a llegar los avisos.</p>
      <button className="btn ghost" onClick={onNew}>
        Volver a la lista
      </button>
    </div>
  );
}
