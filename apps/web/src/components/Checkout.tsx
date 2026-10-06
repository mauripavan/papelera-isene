import { formatArPhone, normalizeArPhone } from '@papelera/shared';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { api, ApiError } from '../lib/api.ts';
import { ars } from '../lib/format.ts';
import type { CartLine, CheckoutData, PublicInfo, Step, WebOrderResult } from '../lib/shop.ts';
import { cartTotals } from '../lib/shop.ts';
import { ProductIcon } from './ProductIcon.tsx';

interface Props {
  step: Exclude<Step, null | 'listo'>;
  go: (s: Step, replace?: boolean) => void;
  lines: CartLine[];
  setQty: (code: string, qty: number) => void;
  info: PublicInfo | undefined;
  data: CheckoutData;
  setData: (d: CheckoutData) => void;
  /** Teléfono que vino firmado en el link del bot */
  linked: { phone: string; display: string } | null;
  token: string | null;
  onDone: (r: WebOrderResult) => void;
}

const STEP_TITLE = { pedido: 'Tu pedido', pago: '¿Cómo vas a pagar?', entrega: '¿Lo retirás o te lo enviamos?', datos: 'Tus datos', resumen: 'Revisá y confirmá' };
const STEP_N = { pedido: 1, pago: 2, entrega: 3, datos: 4, resumen: 5 };

/** Las mismas preguntas que hacía el bot, en pasos. Al confirmar, sigue por WhatsApp. */
export function Checkout({ step, go, lines, setQty, info, data, setData, linked, token, onDone }: Props) {
  const totals = cartTotals(lines);
  const method = data.paymentMethod;
  const total = method === 'TRANSFERENCIA' ? totals.transfer : totals.cash;
  const min = info?.minOrderForDelivery ?? 0;
  const belowMin = min > 0 && total < min;
  const phone = linked?.phone ?? normalizeArPhone(data.phone);
  const [phoneTouched, setPhoneTouched] = useState(false);

  const submit = useMutation({
    mutationFn: () =>
      api<WebOrderResult>('/public/orders', {
        method: 'POST',
        json: {
          items: lines.map((l) => ({ code: l.product.code, quantity: l.quantity })),
          paymentMethod: data.paymentMethod,
          deliveryMethod: data.deliveryMethod,
          address: data.deliveryMethod === 'ENVIO' ? data.address.trim() : undefined,
          name: data.name.trim(),
          phone: linked ? undefined : data.phone,
          t: token ?? undefined,
          website: (document.getElementById('co-website') as HTMLInputElement | null)?.value || undefined,
        },
      }),
    onSuccess: onDone,
  });

  const Back = ({ to }: { to: Step }) => (
    <button className="btn ghost co-back" onClick={() => go(to)}>
      ← Volver
    </button>
  );

  return (
    <div className="co">
      <header className="co-head">
        <button className="btn ghost co-close" onClick={() => go(null)} aria-label="Volver a la lista">
          ← Lista
        </button>
        <div className="co-progress" aria-label={`Paso ${STEP_N[step]} de 5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={n <= STEP_N[step] ? 'on' : ''} />
          ))}
        </div>
      </header>

      <div className="co-body">
        <h1 className="co-title">{STEP_TITLE[step]}</h1>

        {step === 'pedido' && (
          <>
            <ul className="co-lines">
              {lines.map((l) => (
                <li key={l.product.code}>
                  <ProductIcon name={l.product.name} category={l.product.category} size={40} />
                  <div className="co-line-name">
                    {l.product.name}
                    <span className="muted small">
                      {l.product.unit} · {ars(l.product.priceCash)} c/u
                    </span>
                  </div>
                  <Stepper value={l.quantity} onChange={(q) => setQty(l.product.code, q)} />
                </li>
              ))}
            </ul>
            {!lines.length && <p className="muted">Tu pedido está vacío.</p>}
            <div className="co-total">
              <span>Total en efectivo</span>
              <b>{ars(totals.cash)}</b>
            </div>
            <div className="co-actions">
              <button className="btn" onClick={() => go(null)}>
                Seguir comprando
              </button>
              <button className="btn primary" disabled={!lines.length} onClick={() => go('pago')}>
                Continuar
              </button>
            </div>
          </>
        )}

        {step === 'pago' && (
          <>
            <div className="co-options">
              <Option
                selected={method === 'EFECTIVO'}
                onClick={() => setData({ ...data, paymentMethod: 'EFECTIVO' })}
                title="Efectivo"
                detail="Al retirar o al recibir el pedido"
                amount={totals.cash}
              />
              <Option
                selected={method === 'TRANSFERENCIA'}
                onClick={() => setData({ ...data, paymentMethod: 'TRANSFERENCIA' })}
                title="Transferencia"
                detail="Te pasamos los datos cuando confirmemos el pedido"
                amount={totals.transfer}
              />
            </div>
            {totals.transfer > totals.cash && <p className="muted small">En efectivo algunos productos salen más baratos.</p>}
            <div className="co-actions">
              <Back to="pedido" />
              <button className="btn primary" disabled={!method} onClick={() => go('entrega')}>
                Continuar
              </button>
            </div>
          </>
        )}

        {step === 'entrega' && (
          <>
            <div className="co-options">
              <Option
                selected={data.deliveryMethod === 'RETIRO'}
                onClick={() => setData({ ...data, deliveryMethod: 'RETIRO' })}
                title="Retiro en el local"
                detail={info?.pickupAddress ? info.pickupAddress : 'Te avisamos cuándo está listo'}
              />
              <Option
                selected={data.deliveryMethod === 'ENVIO'}
                disabled={belowMin}
                onClick={() => !belowMin && setData({ ...data, deliveryMethod: 'ENVIO' })}
                title="Envío a domicilio"
                detail={
                  belowMin
                    ? `Hacemos envíos en compras desde ${ars(min)}. Te faltan ${ars(min - total)}.`
                    : 'El costo depende de la zona: te lo confirmamos cuando revisemos el pedido.'
                }
              />
            </div>
            {min > 0 && !belowMin && <p className="ok-note small">✓ Tu pedido supera la compra mínima para envío ({ars(min)}).</p>}
            {belowMin && (
              <button className="btn sm" onClick={() => go(null)}>
                Seguir comprando para llegar al mínimo
              </button>
            )}
            {data.deliveryMethod === 'ENVIO' && !belowMin && (
              <label className="co-field">
                Dirección de envío
                <textarea
                  rows={3}
                  value={data.address}
                  onChange={(e) => setData({ ...data, address: e.target.value })}
                  placeholder="Calle, número, piso/depto, localidad y alguna referencia"
                  autoComplete="street-address"
                />
              </label>
            )}
            <div className="co-actions">
              <Back to="pago" />
              <button
                className="btn primary"
                disabled={!data.deliveryMethod || (data.deliveryMethod === 'ENVIO' && (belowMin || data.address.trim().length < 5))}
                onClick={() => go('datos')}
              >
                Continuar
              </button>
            </div>
          </>
        )}

        {step === 'datos' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPhoneTouched(true);
              if (data.name.trim().length >= 2 && phone) go('resumen');
            }}
          >
            <label className="co-field">
              Nombre
              <input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} autoComplete="name" required minLength={2} />
            </label>
            {linked ? (
              <div className="co-field">
                <span className="co-label">WhatsApp</span>
                <div className="co-linked">
                  <b>{linked.display}</b>
                  <span className="muted small">Te vamos a avisar por este WhatsApp.</span>
                </div>
              </div>
            ) : (
              <label className="co-field">
                Tu WhatsApp
                <input
                  type="tel"
                  inputMode="tel"
                  value={data.phone}
                  onChange={(e) => setData({ ...data, phone: e.target.value })}
                  onBlur={() => setPhoneTouched(true)}
                  placeholder="11 2345 6789"
                  autoComplete="tel-national"
                  required
                />
                {phone ? (
                  <span className="muted small">Te vamos a avisar a {formatArPhone(phone)}</span>
                ) : (
                  phoneTouched && <span className="field-error">Poné el código de área sin 0 ni 15. Ej: 11 2345 6789</span>
                )}
              </label>
            )}
            {/* Trampa para bots: oculto para personas */}
            <input id="co-website" name="website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden />
            <div className="co-actions">
              <Back to="entrega" />
              <button className="btn primary" disabled={data.name.trim().length < 2 || !phone}>
                Continuar
              </button>
            </div>
          </form>
        )}

        {step === 'resumen' && (
          <>
            <ul className="co-summary">
              {lines.map((l) => {
                const unit = method === 'TRANSFERENCIA' ? l.product.priceTransfer : l.product.priceCash;
                return (
                  <li key={l.product.code}>
                    <span>
                      {l.quantity} × {l.product.name}
                    </span>
                    <span className="num">{ars(unit * l.quantity)}</span>
                  </li>
                );
              })}
            </ul>
            <div className="co-total">
              <span>Total ({method === 'TRANSFERENCIA' ? 'transferencia' : 'efectivo'})</span>
              <b>{ars(total)}</b>
            </div>
            <dl className="co-facts">
              <dt>Pago</dt>
              <dd>{method === 'TRANSFERENCIA' ? 'Transferencia (te pasamos los datos al confirmar)' : 'Efectivo'}</dd>
              <dt>Entrega</dt>
              <dd>{data.deliveryMethod === 'ENVIO' ? `Envío a ${data.address.trim()} · costo a confirmar` : 'Retiro en el local'}</dd>
              <dt>Nombre</dt>
              <dd>{data.name.trim()}</dd>
              <dt>WhatsApp</dt>
              <dd>{linked?.display ?? (phone ? formatArPhone(phone) : '')}</dd>
            </dl>
            <div className="co-wa">
              <WhatsAppGlyph />
              <p>
                Cuando confirmes, revisamos que tengamos todo y <b>te avisamos por WhatsApp</b>: si falta algo, el costo del envío, los datos para
                transferir y la fecha de entrega.
              </p>
            </div>
            {submit.error && <p className="error">{orderError(submit.error)}</p>}
            <div className="co-actions">
              <Back to="datos" />
              <button className="btn primary lg" disabled={submit.isPending} onClick={() => submit.mutate()}>
                {submit.isPending ? 'Enviando…' : 'Confirmar pedido'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function orderError(e: Error) {
  if (e instanceof ApiError && e.status === 422 && Array.isArray((e.details as { unknownCodes?: string[] })?.unknownCodes)) {
    return `Algunos productos ya no están disponibles (${(e.details as { unknownCodes: string[] }).unknownCodes.join(', ')}). Sacalos del pedido y volvé a confirmar.`;
  }
  if (e instanceof ApiError) return e.message.replace(/ \(.*\)$/, '');
  return 'No pudimos enviar el pedido. Revisá tu conexión y probá de nuevo.';
}

function Option(props: { selected: boolean; disabled?: boolean; onClick: () => void; title: string; detail: string; amount?: number }) {
  return (
    <button
      type="button"
      className={`co-option${props.selected ? ' on' : ''}`}
      onClick={props.onClick}
      disabled={props.disabled}
      aria-pressed={props.selected}
    >
      <span className="co-radio" aria-hidden />
      <span className="co-option-text">
        <b>{props.title}</b>
        <span className="small muted">{props.detail}</span>
      </span>
      {props.amount != null && <span className="co-option-amount">{ars(props.amount)}</span>}
    </button>
  );
}

export function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(value - 1)} aria-label="Uno menos">
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        onFocus={(e) => e.target.select()}
        aria-label="Cantidad"
      />
      <button type="button" onClick={() => onChange(value + 1)} aria-label="Uno más">
        +
      </button>
    </div>
  );
}

export function WhatsAppGlyph({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20l1.3-3.8A8 8 0 1 1 8 19z" />
      <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2z" />
    </svg>
  );
}
