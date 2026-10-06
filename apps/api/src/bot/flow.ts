import { prisma } from '../db.ts';
import { publicUrl } from '../env.ts';
import { signPhoneToken } from '../lib/phone-token.ts';
import * as orders from '../services/orders.ts';
import { getSettings } from '../services/settings.ts';
import { isNo, isYes, normalize, parseItems } from './parse.ts';
import type { Messenger } from './whatsapp.ts';

/**
 * Conversación del bot.
 *
 * Los pedidos se arman en la web (/lista): productos, forma de pago, retiro o envío,
 * mínimo para envío y dirección. El bot le manda al cliente un link que ya lleva su
 * número firmado, así la web sabe a qué WhatsApp avisarle.
 *
 * Después de que el cliente confirma en la web, todo sigue por acá:
 *  - "Recibimos tu pedido", confirmación, faltantes (SI/NO), datos para transferir, fecha
 *  - una imagen o PDF con un pedido por transferencia sin pagar se toma como comprobante
 *  - "Pedido web #N (código X)": vincula un pedido hecho en la web sin el link del bot
 *  - BORRAR MIS DATOS borra nombre, dirección y la sesión
 *  - si el dueño responde a mano desde la app, el bot se pausa en ese chat (MENU lo reactiva)
 */

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

const BTN = {
  LIST: 'MENU_LIST',
  ORDER: 'MENU_ORDER',
  YES: 'MISSING_YES',
  NO: 'MISSING_NO',
} as const;

/** "pedido", "hacer un pedido", "quiero hacer un pedido", "pedir", "nuevo pedido"… */
const ORDER_WORDS = /^(QUIERO )?((HACER|ARMAR) (UN )?|NUEVO )?PEDIDO$|^(QUIERO )?PEDIR$/;
/** "Hola! Hice el pedido web #123 (código K7P2QX)…" (ya normalizado: mayúsculas, sin tildes) */
const WEB_ORDER_LINK = /PEDIDO WEB #?(\d+)\D*?CODIGO:? ?([A-Z0-9]{6})/;

/** Link a la lista/pedido web con el número del cliente firmado (vale 24 h). */
export function orderUrl(phone: string) {
  return `${publicUrl}/lista?t=${encodeURIComponent(signPhoneToken(phone))}`;
}

export async function handleInbound(ctx: InboundContext, wa: Messenger) {
  const { phone, message } = ctx;

  // Ventana de 24 h: la abre cada mensaje del cliente
  await prisma.customer.updateMany({ where: { phone }, data: { lastInboundAt: new Date() } });

  const text = message.kind === 'text' ? message.text : message.kind === 'button' ? message.title : '';
  const buttonId = message.kind === 'button' ? message.id : null;
  const word = normalize(text);
  const bare = word.replace(/[¡!¿?.,]/g, '').trim();
  const pausedUntil = (await prisma.botSession.findUnique({ where: { phone }, select: { pausedUntil: true } }))?.pausedUntil;
  const paused = Boolean(pausedUntil && pausedUntil > new Date());

  // 1. Respuesta a un pedido con cambios (faltantes, parciales, costo de envío…)
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

  // 4. Pedido hecho en la web que se confirma desde este WhatsApp (funciona aunque el bot esté en pausa)
  const link = word.match(WEB_ORDER_LINK);
  if (link) {
    const order = await orders.linkWebOrder(Number(link[1]), link[2]!, phone);
    if (!order) {
      await wa.text(phone, 'No encontramos ese pedido 🤔 Revisá que el mensaje sea el que te armó la página, sin cambios.');
      return;
    }
    const first = order.customer.name?.trim().split(/\s+/)[0];
    await wa.text(
      phone,
      `¡Listo${first ? ` ${first}` : ''}! Tu pedido *#${order.id}* quedó asociado a este WhatsApp ✅\n\n` +
        (order.status === 'PENDIENTE_REVISION'
          ? 'Ahora revisamos que tengamos todo y te confirmamos por acá.' +
            (order.paymentMethod === 'TRANSFERENCIA' ? ' Esperá nuestra confirmación antes de transferir.' : '')
          : 'Te mandamos por acá las novedades del pedido.'),
    );
    return;
  }

  // 5. Si el dueño está atendiendo este chat a mano, el bot no conversa (salvo que pidan MENU)
  if (paused) {
    if (word !== 'MENU') return;
    await prisma.botSession.update({ where: { phone }, data: { pausedUntil: null } });
  }

  // 6. Pedidos y precios: todo se arma en la web
  const sentCodes = message.kind === 'text' && parseItems(text).items.length > 0;
  if (buttonId === BTN.ORDER || ORDER_WORDS.test(bare) || sentCodes) {
    await sendOrderLink(phone, wa, sentCodes);
    return;
  }
  if (buttonId === BTN.LIST || ['LISTA', 'PRECIOS', 'VER PRECIOS', 'LISTA DE PRECIOS'].includes(bare)) {
    await sendList(phone, wa);
    return;
  }

  // 7. Tiene un pedido esperando su respuesta: se lo recordamos en vez de mandar el menú
  if (waiting && word !== 'MENU') {
    await wa.text(phone, `Tenemos tu pedido *#${waiting.id}* esperando tu respuesta: respondé *SI* para seguir o *NO* para cancelarlo.`);
    return;
  }

  await sendMenu(phone, ctx.profileName, wa);
}

// ─── Datos ───────────────────────────────────────────────────────────────────

/** Pedido de borrado de datos (lo pide Meta y está explicado en /eliminar-datos). */
export async function forgetCustomer(phone: string) {
  await prisma.botSession.deleteMany({ where: { phone } });
  await prisma.customer.updateMany({ where: { phone }, data: { name: null, address: null } });
  const customer = await prisma.customer.findUnique({ where: { phone }, select: { id: true } });
  if (customer) await prisma.order.updateMany({ where: { customerId: customer.id }, data: { deliveryAddress: null, contactName: null } });
}

// ─── Mensajes ────────────────────────────────────────────────────────────────

async function sendMenu(phone: string, name: string | undefined, wa: Messenger) {
  const s = await getSettings();
  await wa.buttons(phone, `¡Hola${name ? ` ${name.split(' ')[0]}` : ''}! 👋 Somos *${s.businessName}*. ¿Qué querés hacer?`, [
    { id: BTN.ORDER, title: 'Hacer un pedido' },
    { id: BTN.LIST, title: 'Ver precios' },
  ]);
}

async function sendOrderLink(phone: string, wa: Messenger, sentCodes: boolean) {
  await wa.text(
    phone,
    (sentCodes ? 'Ahora los pedidos se arman en la página, es más fácil 🙂\n\n' : '') +
      `🛒 Armá tu pedido acá:\n${orderUrl(phone)}\n\n` +
      'Elegís los productos, cómo pagás y si lo retirás o te lo enviamos. ' +
      'Tu número ya queda cargado: cuando lo confirmes, te avisamos todo por este chat.\n\n' +
      '_El link vale por 24 horas. Si vence, escribí *PEDIDO* y te mandamos otro._',
  );
}

async function sendList(phone: string, wa: Messenger) {
  await wa.text(
    phone,
    `📋 Lista de precios actualizada:\n${orderUrl(phone)}\n\n` + 'Desde ahí mismo podés armar tu pedido y te avisamos todo por este chat.',
  );
}
