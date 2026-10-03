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

/** Lo que se entrega: los parciales con la cantidad que hay. */
function itemLines(o: SerializedOrder) {
  return o.items
    .filter((i) => i.deliveredQuantity > 0)
    .map((i) => `• ${i.deliveredQuantity} x ${i.productName}`)
    .join('\n');
}

function shippingLine(o: SerializedOrder) {
  if (o.shippingStatus === 'GRATIS') return '🚚 Envío: *gratis*';
  if (o.shippingStatus === 'CON_COSTO') return `🚚 Envío: ${formatARS(o.shippingCost)}`;
  return '';
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
      itemLines(o),
      shippingLine(o),
      paymentInstructions(o, s),
      `Te avisamos cuando tengamos la fecha de ${o.deliveryMethod === 'RETIRO' ? 'retiro' : 'envío'}.`,
    ]
      .filter(Boolean)
      .join('\n\n');
  },

  /** Faltantes, parciales, costo de envío o fuera de zona: el cliente tiene que aceptar. */
  changesToApprove(o: SerializedOrder, s: AppSettings) {
    const missing = o.items.filter((i) => i.status === 'FALTANTE');
    const partial = o.items.filter((i) => i.status === 'PARCIAL');
    const blocks = [`${hello(o)} Revisamos tu pedido #${o.id} y hay algunos cambios:`];
    if (missing.length) blocks.push('❌ No tenemos:\n' + missing.map((i) => `• ${i.productName} (pediste ${i.quantity})`).join('\n'));
    if (partial.length)
      blocks.push('⚠️ Tenemos menos de lo que pediste:\n' + partial.map((i) => `• ${i.productName}: pediste ${i.quantity}, tenemos ${i.availableQuantity}`).join('\n'));
    if (o.shippingStatus === 'CON_COSTO') blocks.push(`🚚 El envío a tu dirección tiene un costo de *${formatARS(o.shippingCost)}*.`);
    if (o.shippingStatus === 'FUERA_ZONA') {
      const where = s.pickupAddress.trim() ? ` en ${s.pickupAddress.trim()}` : ' en el local';
      blocks.push(`📍 No llegamos con envío a tu zona. Podés retirar el pedido${where}.`);
    }
    blocks.push(`El pedido queda así:\n${itemLines(o)}`);
    const shipping = shippingLine(o);
    blocks.push(`${shipping ? shipping + '\n' : ''}*Total (${PAYMENT_METHOD_LABEL[o.paymentMethod].toLowerCase()}): ${formatARS(o.total)}*`);
    blocks.push('Respondé *SI* para confirmar el pedido así, o *NO* para cancelarlo.');
    return blocks.join('\n\n');
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
