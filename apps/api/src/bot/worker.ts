import { prisma } from '../db.ts';
import { env } from '../env.ts';
import { isWhatsappEnabled } from './credentials.ts';
import { whatsapp, WhatsAppError, type Messenger } from './whatsapp.ts';

/**
 * Manda los mensajes encolados (outbound_messages) que genera la API cuando cambia un pedido:
 * confirmación, faltantes, fecha de entrega, cancelación, etc.
 *
 * Fuera de la ventana de 24 h desde el último mensaje del cliente, WhatsApp no deja mandar
 * texto libre (error 131047): hace falta una plantilla aprobada. En ese caso el mensaje queda
 * como FAILED con el motivo, y se ve en el panel.
 */

const MAX_ATTEMPTS = 5;
const OUTSIDE_WINDOW = 131047;

export async function flushOutbox(wa: Messenger = whatsapp) {
  if (wa === whatsapp && !isWhatsappEnabled()) return 0;
  const pending = await prisma.outboundMessage.findMany({
    where: {
      status: 'PENDING',
      attempts: { lt: MAX_ATTEMPTS },
      // Pedidos web sin confirmar desde el WhatsApp del cliente: el número lo tipeó alguien
      // y puede ser de otra persona. Los avisos esperan hasta que lo confirme.
      OR: [{ orderId: null }, { order: { source: 'WHATSAPP' } }, { order: { waConfirmedAt: { not: null } } }],
    },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });
  for (const msg of pending) {
    try {
      await wa.text(msg.phone, msg.body);
      await prisma.outboundMessage.update({
        where: { id: msg.id },
        data: { status: 'SENT', sentAt: new Date(), attempts: { increment: 1 }, lastError: null },
      });
    } catch (e) {
      const outsideWindow = e instanceof WhatsAppError && e.code === OUTSIDE_WINDOW;
      const error = outsideWindow
        ? 'Pasaron más de 24 h desde el último mensaje del cliente: WhatsApp exige una plantilla aprobada.'
        : (e as Error).message;
      const attempts = msg.attempts + 1;
      await prisma.outboundMessage.update({
        where: { id: msg.id },
        data: { attempts, lastError: error, status: outsideWindow || attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING' },
      });
      console.error(`[bot] no se pudo enviar el mensaje ${msg.id}: ${error}`);
    }
  }
  return pending.length;
}

export function startOutboxWorker() {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await flushOutbox();
    } catch (e) {
      console.error('[bot] error en la cola de mensajes', e);
    } finally {
      running = false;
    }
  }, env.WHATSAPP_OUTBOX_INTERVAL_MS);
  timer.unref();
  return () => clearInterval(timer);
}
