import { PAYMENT_METHOD_LABEL, formatARS } from '@papelera/shared';
import type { AppSettings } from './settings.ts';
import type { SerializedOrder } from './serializers.ts';

/**
 * Textos que el bot le manda al cliente. Están todos acá para poder ajustarlos
 * sin tocar la lógica de pedidos.
 */

const TZ = 'America/Argentina/Buenos_Aires';

function hello(o: SerializedOrder) {
  const first = o.customer.name?.trim().split(/\s+/)[0];
  return first ? `¡Hola ${first}!` : '¡Hola!';
}

function itemLines(o: SerializedOrder, filter: 'DISPONIBLE' | 'FALTANTE') {
  return o.items
    .filter((i) => (filter === 'FALTANTE' ? i.status === 'FALTANTE' : i.status !== 'FALTANTE'))
    .map((i) => `• ${i.quantity} x ${i.productName}`)
    .join('\n');
}

function paymentInstructions(o: SerializedOrder, s: AppSettings) {
  if (o.paymentMethod === 'TRANSFERENCIA') {
    const data = s.transferInfo.trim() ? `\n\nDatos para transferir:\n${s.transferInfo.trim()}` : '';
    return `Total a transferir: *${formatARS(o.total)}*${data}\n\nCuando transfieras, mandanos el comprobante por acá. 🧾`;
  }
  const when = o.deliveryMethod === 'RETIRO' ? 'al retirar' : 'al recibirlo';
  return `Total a abonar en efectivo ${when}: *${formatARS(o.total)}*`;
}

export function formatSchedule(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('es-AR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'numeric' })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const day = `${parts.weekday} ${parts.day}/${parts.month}`;
  const time = new Intl.DateTimeFormat('es-AR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
  return time === '00:00' ? day : `${day} a las ${time} hs`;
}

export const messages = {
  confirmed(o: SerializedOrder, s: AppSettings) {
    return [
      `${hello(o)} Confirmamos tu pedido #${o.id} ✅`,
      itemLines(o, 'DISPONIBLE'),
      paymentInstructions(o, s),
      `Te avisamos cuando tengamos la fecha de ${o.deliveryMethod === 'RETIRO' ? 'retiro' : 'envío'}.`,
    ].join('\n\n');
  },

  missingItems(o: SerializedOrder) {
    return [
      `${hello(o)} Revisamos tu pedido #${o.id} y no tenemos stock de:`,
      itemLines(o, 'FALTANTE'),
      `Sin esos productos, el total queda en *${formatARS(o.total)}* (${PAYMENT_METHOD_LABEL[o.paymentMethod].toLowerCase()}).`,
      'Respondé *SI* para confirmar el pedido con lo que hay, o *NO* para cancelarlo.',
    ].join('\n\n');
  },

  nothingAvailable(o: SerializedOrder) {
    return `${hello(o)} Lamentablemente no tenemos stock de ningún producto de tu pedido #${o.id}, así que lo cancelamos. Disculpá las molestias.`;
  },

  rejectedByCustomer(o: SerializedOrder) {
    return `Listo, cancelamos tu pedido #${o.id}. ¡Cuando quieras volvés a pedir!`;
  },

  scheduled(o: SerializedOrder, s: AppSettings) {
    const when = formatSchedule(o.scheduledFor!);
    if (o.deliveryMethod === 'RETIRO') {
      const where = s.pickupAddress.trim() ? ` en ${s.pickupAddress.trim()}` : '';
      return `${hello(o)} Tu pedido #${o.id} va a estar listo para retirar el ${when}${where}. 📦`;
    }
    const to = o.deliveryAddress ? ` a ${o.deliveryAddress}` : '';
    return `${hello(o)} Tu pedido #${o.id} sale para entregar el ${when}${to}. 🚚`;
  },

  receiptReceived(o: SerializedOrder) {
    return `¡Gracias! Recibimos el comprobante del pedido #${o.id}. En breve lo verificamos.`;
  },

  cancelledByStore(o: SerializedOrder, reason?: string) {
    return `${hello(o)} Tuvimos que cancelar tu pedido #${o.id}.${reason ? ` Motivo: ${reason}.` : ''} Disculpá las molestias.`;
  },
};
