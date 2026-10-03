import { formatARS, PAYMENT_METHOD_LABEL, productPrices, type DeliveryMethod, type PaymentMethod } from '@papelera/shared';
import { prisma } from '../db.ts';
import { publicUrl } from '../env.ts';
import { HttpError } from '../lib/http.ts';
import * as orders from '../services/orders.ts';
import { getSettings } from '../services/settings.ts';
import { isNo, isYes, normalize, parseItems } from './parse.ts';
import type { Messenger } from './whatsapp.ts';

/**
 * Conversación del bot. Cada teléfono tiene una sesión con un estado:
 *
 *   IDLE ──(Hacer pedido / manda códigos)──▶ ORDERING ──(LISTO)──▶ ASK_PAYMENT ──▶ ASK_DELIVERY
 *                                                                                  │
 *                       ┌───────────── RETIRO ────────────────────────────────────┤
 *                       │                     ENVÍO ──▶ CONFIRM_ADDRESS / ASK_ADDRESS
 *                       ▼                                         │
 *                 CONFIRM_ORDER ◀─────────────────────────────────┘
 *                       │ Confirmar → se crea el pedido (queda "Para revisar" en el panel)
 *                       ▼
 *                     IDLE
 *
 * Además, en cualquier estado:
 *  - si el cliente tiene un pedido esperando respuesta por faltantes, SI/NO se aplica a ese pedido
 *  - si manda una imagen o PDF y tiene un pedido por transferencia sin pagar, se toma como comprobante
 *  - CANCELAR, MENU y LISTA funcionan siempre
 */

type State = 'IDLE' | 'ORDERING' | 'ASK_PAYMENT' | 'ASK_DELIVERY' | 'ASK_ADDRESS' | 'CONFIRM_ADDRESS' | 'CONFIRM_ORDER';

interface SessionData {
  /** código → cantidad */
  cart?: Record<string, number>;
  paymentMethod?: PaymentMethod;
  deliveryMethod?: DeliveryMethod;
  address?: string;
}

export type Inbound =
  | { kind: 'text'; text: string }
  | { kind: 'button'; id: string; title: string }
  | { kind: 'media'; mediaId: string; mimeType?: string; filename?: string }
  | { kind: 'other' };

export interface InboundContext {
  phone: string;
  profileName?: string;
  message: Inbound;
}

/** Si una conversación quedó a medias más de este tiempo, se arranca de cero. */
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const BTN = {
  LIST: 'MENU_LIST',
  ORDER: 'MENU_ORDER',
  CASH: 'PAY_EFECTIVO',
  TRANSFER: 'PAY_TRANSFERENCIA',
  PICKUP: 'DEL_RETIRO',
  DELIVERY: 'DEL_ENVIO',
  ADDR_OK: 'ADDR_OK',
  ADDR_OTHER: 'ADDR_OTHER',
  CONFIRM: 'ORDER_CONFIRM',
  CANCEL: 'ORDER_CANCEL',
  YES: 'MISSING_YES',
  NO: 'MISSING_NO',
} as const;

export function listUrl() {
  return `${publicUrl}/lista`;
}

export async function handleInbound(ctx: InboundContext, wa: Messenger) {
  const { phone, message } = ctx;

  // Ventana de 24 h: la abre cada mensaje del cliente
  await prisma.customer.updateMany({ where: { phone }, data: { lastInboundAt: new Date() } });

  const text = message.kind === 'text' ? message.text : message.kind === 'button' ? message.title : '';
  const buttonId = message.kind === 'button' ? message.id : null;
  const word = normalize(text);
  const pausedUntil = (await prisma.botSession.findUnique({ where: { phone }, select: { pausedUntil: true } }))?.pausedUntil;
  const paused = Boolean(pausedUntil && pausedUntil > new Date());

  // 1. Respuesta a un pedido con faltantes
  const waiting = await prisma.order.findFirst({
    where: { customer: { phone }, status: 'ESPERANDO_CLIENTE' },
    orderBy: { createdAt: 'desc' },
  });
  if (waiting && (buttonId === BTN.YES || buttonId === BTN.NO || isYes(text) || isNo(text))) {
    const accept = buttonId === BTN.YES || (buttonId !== BTN.NO && isYes(text));
    // La API encola la confirmación (o la cancelación) y el worker la manda
    await orders.customerResponse(waiting.id, accept);
    return;
  }

  // 2. Comprobante de transferencia
  if (message.kind === 'media') {
    const unpaid = await prisma.order.findFirst({
      where: {
        customer: { phone },
        paymentMethod: 'TRANSFERENCIA',
        paymentStatus: 'PENDIENTE',
        status: { in: ['CONFIRMADO', 'PROGRAMADO'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (unpaid) {
      await orders.attachReceipt(unpaid.id, `wa:${message.mediaId}`);
      return;
    }
    if (!paused) await wa.text(phone, 'Recibimos tu archivo 👍 Si querías hacer un pedido, escribí *MENU*.');
    return;
  }

  // 3. Borrado de datos: funciona siempre, aunque el bot esté en pausa
  if (word === 'BORRAR MIS DATOS') {
    await forgetCustomer(phone);
    await wa.text(
      phone,
      'Listo, borramos tu nombre, tu dirección y la conversación con el bot. ' +
        'Los pedidos que ya hiciste se conservan sin esos datos porque los necesitamos para la contabilidad.',
    );
    return;
  }
  // 4. Si el dueño está atendiendo este chat a mano, el bot no conversa (salvo que pidan MENU)
  if (paused) {
    if (word !== 'MENU') return;
    await prisma.botSession.update({ where: { phone }, data: { pausedUntil: null } });
  }

  // 5. Comandos que funcionan siempre
  if (word === 'CANCELAR') {
    await saveSession(phone, 'IDLE', {});
    await wa.text(phone, 'Listo, cancelé el pedido que estabas armando. Cuando quieras, escribí *MENU*.');
    return;
  }
  if (word === 'LISTA' || word === 'PRECIOS' || buttonId === BTN.LIST) {
    await sendList(phone, wa);
    return;
  }

  let { state, data } = await loadSession(phone);
  if (word === 'MENU' || word === 'HOLA' || word === 'INICIO') {
    if (state !== 'IDLE' && Object.keys(data.cart ?? {}).length) {
      // No perdemos el carrito por un "hola" en el medio
      await wa.text(phone, `Tenés un pedido a medio armar. Seguí agregando productos o escribí *LISTO*. Para empezar de cero, escribí *CANCELAR*.`);
      return;
    }
    state = 'IDLE';
  }

  switch (state) {
    case 'IDLE': {
      if (buttonId === BTN.ORDER || word === 'PEDIDO' || word === 'HACER PEDIDO') {
        await saveSession(phone, 'ORDERING', { cart: {} });
        await sendOrderingHelp(phone, wa);
        return;
      }
      // Atajo: si ya manda códigos, arrancamos el pedido directo
      const parsed = parseItems(text);
      if (parsed.items.length) {
        await addToCart(phone, { cart: {} }, parsed, wa);
        return;
      }
      await sendMenu(phone, ctx.profileName, wa);
      return;
    }

    case 'ORDERING': {
      if (word === 'LISTO' || word === 'TERMINE' || word === 'FIN') {
        if (!Object.keys(data.cart ?? {}).length) {
          await wa.text(phone, 'Todavía no agregaste productos. Mandá *CÓDIGO CANTIDAD*, por ejemplo: BOL-001 2');
          return;
        }
        await saveSession(phone, 'ASK_PAYMENT', data);
        await askPayment(phone, wa);
        return;
      }
      if (word === 'VER' || word === 'CARRITO') {
        await wa.text(phone, (await cartText(data.cart ?? {})) + '\n\nSeguí agregando o escribí *LISTO*.');
        return;
      }
      const remove = word.match(/^(?:BORRAR|SACAR|QUITAR)\s+(.+)$/);
      if (remove) {
        const code = parseItems(remove[1]!).items[0]?.code;
        const cart = { ...(data.cart ?? {}) };
        if (code && cart[code]) {
          delete cart[code];
          await saveSession(phone, 'ORDERING', { ...data, cart });
          await wa.text(phone, `Saqué ${code}.\n\n${await cartText(cart)}`);
        } else {
          await wa.text(phone, `No encontré ese código en tu pedido.`);
        }
        return;
      }
      const parsed = parseItems(text);
      if (!parsed.items.length) {
        await wa.text(
          phone,
          'No entendí 🤔 Mandá un producto por línea con *CÓDIGO CANTIDAD* (ej: BOL-001 2).\n' +
            '*VER* muestra tu pedido, *BORRAR CÓDIGO* saca uno y *LISTO* lo termina.',
        );
        return;
      }
      await addToCart(phone, data, parsed, wa);
      return;
    }

    case 'ASK_PAYMENT': {
      const method: PaymentMethod | null =
        buttonId === BTN.CASH || /^(1|EFECTIVO|EFE)$/.test(word)
          ? 'EFECTIVO'
          : buttonId === BTN.TRANSFER || /^(2|TRANSFERENCIA|TRANSF|TRANSFER)$/.test(word)
            ? 'TRANSFERENCIA'
            : null;
      if (!method) return askPayment(phone, wa);
      data = { ...data, paymentMethod: method };
      await saveSession(phone, 'ASK_DELIVERY', data);
      await askDelivery(phone, wa);
      return;
    }

    case 'ASK_DELIVERY': {
      const delivery: DeliveryMethod | null =
        buttonId === BTN.PICKUP || /^(1|RETIRO|RETIRAR|RETIRO EN LOCAL|LO RETIRO|PASO A BUSCAR)$/.test(word)
          ? 'RETIRO'
          : buttonId === BTN.DELIVERY || /^(2|ENVIO|ENVIO A DOMICILIO|DOMICILIO)$/.test(word)
            ? 'ENVIO'
            : null;
      if (!delivery) return askDelivery(phone, wa);
      data = { ...data, deliveryMethod: delivery };
      if (delivery === 'RETIRO') {
        await saveSession(phone, 'CONFIRM_ORDER', data);
        await askConfirm(phone, data, wa);
        return;
      }
      const customer = await prisma.customer.findUnique({ where: { phone } });
      if (customer?.address) {
        await saveSession(phone, 'CONFIRM_ADDRESS', { ...data, address: customer.address });
        await wa.buttons(phone, `¿Te lo enviamos a *${customer.address}*?`, [
          { id: BTN.ADDR_OK, title: 'Sí, ahí' },
          { id: BTN.ADDR_OTHER, title: 'Otra dirección' },
        ]);
        return;
      }
      await saveSession(phone, 'ASK_ADDRESS', data);
      await wa.text(phone, '¿A qué dirección te lo enviamos? Incluí calle, número, localidad y alguna referencia.');
      return;
    }

    case 'CONFIRM_ADDRESS': {
      if (buttonId === BTN.ADDR_OK || isYes(text)) {
        await saveSession(phone, 'CONFIRM_ORDER', data);
        await askConfirm(phone, data, wa);
        return;
      }
      if (buttonId === BTN.ADDR_OTHER || isNo(text)) {
        await saveSession(phone, 'ASK_ADDRESS', data);
        await wa.text(phone, 'Dale, escribí la dirección de envío.');
        return;
      }
      // Escribió una dirección directamente
      if (text.trim().length >= 6) {
        data = { ...data, address: text.trim() };
        await saveSession(phone, 'CONFIRM_ORDER', data);
        await askConfirm(phone, data, wa);
        return;
      }
      await wa.buttons(phone, `¿Te lo enviamos a *${data.address}*?`, [
        { id: BTN.ADDR_OK, title: 'Sí, ahí' },
        { id: BTN.ADDR_OTHER, title: 'Otra dirección' },
      ]);
      return;
    }

    case 'ASK_ADDRESS': {
      if (text.trim().length < 6) {
        await wa.text(phone, 'Necesito la dirección completa: calle, número y localidad.');
        return;
      }
      data = { ...data, address: text.trim() };
      await saveSession(phone, 'CONFIRM_ORDER', data);
      await askConfirm(phone, data, wa);
      return;
    }

    case 'CONFIRM_ORDER': {
      if (buttonId === BTN.CANCEL || isNo(text)) {
        await saveSession(phone, 'IDLE', {});
        await wa.text(phone, 'Listo, no enviamos el pedido. Cuando quieras, escribí *MENU*.');
        return;
      }
      if (!(buttonId === BTN.CONFIRM || isYes(text))) {
        await askConfirm(phone, data, wa);
        return;
      }
      try {
        const order = await orders.createOrder({
          phone,
          customerName: ctx.profileName,
          paymentMethod: data.paymentMethod!,
          deliveryMethod: data.deliveryMethod!,
          deliveryAddress: data.deliveryMethod === 'ENVIO' ? data.address : undefined,
          items: Object.entries(data.cart ?? {}).map(([code, quantity]) => ({ code, quantity })),
        });
        await saveSession(phone, 'IDLE', {});
        await prisma.customer.update({ where: { phone }, data: { lastInboundAt: new Date() } });
        await wa.text(
          phone,
          `¡Recibimos tu pedido *#${order.id}*! ✅\n\nAhora revisamos que tengamos todo y te confirmamos por acá.` +
            (data.paymentMethod === 'TRANSFERENCIA' ? ' Esperá nuestra confirmación antes de transferir.' : ''),
        );
      } catch (e) {
        if (e instanceof HttpError && e.status === 422) {
          // Algún producto se desactivó mientras armaba el pedido
          const unknown = (e.details as { unknownCodes?: string[] } | undefined)?.unknownCodes ?? [];
          const cart = { ...(data.cart ?? {}) };
          for (const c of unknown) delete cart[c];
          await saveSession(phone, 'ORDERING', { cart });
          await wa.text(
            phone,
            `Perdón, ${unknown.length ? `estos productos ya no están disponibles: ${unknown.join(', ')}` : 'hubo un problema con el pedido'}. ` +
              'Los saqué del pedido. Revisalo con *VER* y escribí *LISTO* para seguir.',
          );
          return;
        }
        throw e;
      }
      return;
    }
  }
}

// ─── Sesión ──────────────────────────────────────────────────────────────────

/** Pedido de borrado de datos (lo pide Meta y está explicado en /eliminar-datos). */
export async function forgetCustomer(phone: string) {
  await prisma.botSession.deleteMany({ where: { phone } });
  await prisma.customer.updateMany({ where: { phone }, data: { name: null, address: null } });
  const customer = await prisma.customer.findUnique({ where: { phone }, select: { id: true } });
  if (customer) await prisma.order.updateMany({ where: { customerId: customer.id }, data: { deliveryAddress: null } });
}

async function loadSession(phone: string): Promise<{ state: State; data: SessionData }> {
  const s = await prisma.botSession.findUnique({ where: { phone } });
  if (!s) return { state: 'IDLE', data: {} };
  if (s.state !== 'IDLE' && Date.now() - s.updatedAt.getTime() > SESSION_TTL_MS) return { state: 'IDLE', data: {} };
  return { state: s.state as State, data: (s.data ?? {}) as SessionData };
}

async function saveSession(phone: string, state: State, data: SessionData) {
  await prisma.botSession.upsert({
    where: { phone },
    create: { phone, state, data: data as object },
    update: { state, data: data as object },
  });
}

// ─── Mensajes ────────────────────────────────────────────────────────────────

async function sendMenu(phone: string, name: string | undefined, wa: Messenger) {
  const s = await getSettings();
  await wa.buttons(phone, `¡Hola${name ? ` ${name.split(' ')[0]}` : ''}! 👋 Somos *${s.businessName}*. ¿Qué querés hacer?`, [
    { id: BTN.ORDER, title: 'Hacer un pedido' },
    { id: BTN.LIST, title: 'Ver precios' },
  ]);
}

async function sendList(phone: string, wa: Messenger) {
  await wa.text(
    phone,
    `📋 Lista de precios actualizada:\n${listUrl()}\n\n` +
      'Cada producto tiene un *código* (ej: BOL-001). Para pedir, mandá *CÓDIGO CANTIDAD*, uno por línea.',
  );
}

async function sendOrderingHelp(phone: string, wa: Messenger) {
  await wa.text(
    phone,
    '🛒 Mandame los productos, *uno por línea*, con el código y la cantidad:\n\n' +
      'BOL-001 2\nDES-014 1\n\n' +
      `Los códigos están en la lista: ${listUrl()}\n\n` +
      'Cuando termines, escribí *LISTO*. Para ver lo que llevás, *VER*.',
  );
}

async function addToCart(phone: string, data: SessionData, parsed: ReturnType<typeof parseItems>, wa: Messenger) {
  const codes = parsed.items.map((i) => i.code);
  const found = await prisma.product.findMany({ where: { code: { in: codes }, active: true }, select: { code: true } });
  const valid = new Set(found.map((p) => p.code));
  const cart = { ...(data.cart ?? {}) };
  const unknown: string[] = [];
  for (const i of parsed.items) {
    if (valid.has(i.code)) cart[i.code] = (cart[i.code] ?? 0) + i.quantity;
    else unknown.push(i.code);
  }
  await saveSession(phone, 'ORDERING', { ...data, cart });

  const parts: string[] = [];
  if (unknown.length) parts.push(`⚠️ No encontré estos códigos: ${unknown.join(', ')}. Revisalos en la lista: ${listUrl()}`);
  if (parsed.invalid.length) parts.push(`⚠️ No entendí: ${parsed.invalid.map((l) => `"${l}"`).join(', ')}`);
  if (Object.keys(cart).length) parts.push(await cartText(cart));
  parts.push('Seguí agregando o escribí *LISTO* para terminar.');
  await wa.text(phone, parts.join('\n\n'));
}

async function cartLines(cart: Record<string, number>) {
  const products = await prisma.product.findMany({ where: { code: { in: Object.keys(cart) } } });
  const byCode = new Map(products.map((p) => [p.code, p]));
  return Object.entries(cart).map(([code, quantity]) => ({ code, quantity, product: byCode.get(code) }));
}

async function cartText(cart: Record<string, number>) {
  const lines = await cartLines(cart);
  if (!lines.length) return 'Tu pedido está vacío.';
  return '🧾 *Tu pedido:*\n' + lines.map((l) => `• ${l.quantity} x ${l.product?.name ?? l.code} (${l.product?.unit ?? ''}) — ${l.code}`).join('\n');
}

async function askPayment(phone: string, wa: Messenger) {
  await wa.buttons(phone, '¿Cómo vas a pagar?\n\nEn *efectivo* algunos productos salen más baratos.', [
    { id: BTN.CASH, title: 'Efectivo' },
    { id: BTN.TRANSFER, title: 'Transferencia' },
  ]);
}

async function askDelivery(phone: string, wa: Messenger) {
  await wa.buttons(phone, '¿Lo retirás por el local o te lo enviamos?', [
    { id: BTN.PICKUP, title: 'Retiro en local' },
    { id: BTN.DELIVERY, title: 'Envío' },
  ]);
}

async function askConfirm(phone: string, data: SessionData, wa: Messenger) {
  const settings = await getSettings();
  const lines = await cartLines(data.cart ?? {});
  let total = 0;
  let totalCash = 0;
  const rows = lines.map((l) => {
    const p = l.product!;
    const prices = productPrices(
      { price: Number(p.price), discriminaIva: p.discriminaIva, priceTransfer: p.priceTransfer == null ? null : Number(p.priceTransfer) },
      settings.ivaRate,
    );
    const unit = data.paymentMethod === 'EFECTIVO' ? prices.cash : prices.transfer;
    total += unit * l.quantity;
    totalCash += prices.cash * l.quantity;
    return `• ${l.quantity} x ${p.name} — ${formatARS(unit * l.quantity)}`;
  });
  const method = PAYMENT_METHOD_LABEL[data.paymentMethod!].toLowerCase();
  const delivery = data.deliveryMethod === 'RETIRO' ? 'Retiro en el local' : `Envío a ${data.address}`;
  const savings = data.paymentMethod === 'TRANSFERENCIA' && totalCash < total - 0.01 ? `\n(En efectivo saldría ${formatARS(totalCash)})` : '';

  const summary = `🧾 *Resumen del pedido*\n${rows.join('\n')}\n\n*Total (${method}): ${formatARS(total)}*${savings}\n📦 ${delivery}`;
  const question = '¿Confirmás el pedido?';
  const buttons = [
    { id: BTN.CONFIRM, title: 'Confirmar' },
    { id: BTN.CANCEL, title: 'Cancelar' },
  ];
  // El cuerpo de los botones admite hasta 1024 caracteres
  if (summary.length + question.length > 1000) {
    await wa.text(phone, summary);
    await wa.buttons(phone, question, buttons);
  } else {
    await wa.buttons(phone, `${summary}\n\n${question}`, buttons);
  }
}
