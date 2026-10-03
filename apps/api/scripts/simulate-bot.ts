/**
 * Simula conversaciones de WhatsApp contra la base local, sin Meta:
 * manda webhooks falsos a la app y muestra lo que respondería el bot.
 *
 *   pnpm --filter @papelera/api exec tsx --env-file=.env scripts/simulate-bot.ts
 *
 * Usa un teléfono de prueba y borra sus datos al empezar.
 */
import { createHmac } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app.ts';
import { flushOutbox } from '../src/bot/worker.ts';
import type { Messenger, ReplyButton } from '../src/bot/whatsapp.ts';
import { prisma } from '../src/db.ts';
import { env } from '../src/env.ts';
import { drainWhatsappQueues } from '../src/routes/whatsapp.ts';
import * as orders from '../src/services/orders.ts';

const PHONE = '5491100000000';
const outbox: string[] = [];

const fake: Messenger = {
  async text(to, body) {
    outbox.push(`[texto → ${to}]\n${body}`);
  },
  async buttons(to, body, buttons: ReplyButton[]) {
    outbox.push(`[botones → ${to}]\n${body}\n${buttons.map((b) => `  ( ${b.title} )  id=${b.id}`).join('\n')}`);
  },
};

const server = createApp({ messenger: fake }).listen(0);
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
let seq = 0;

async function send(message: Record<string, unknown>, label: string) {
  const body = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [
      {
        changes: [
          {
            field: 'messages',
            value: {
              contacts: [{ wa_id: PHONE, profile: { name: 'Juan Pérez' } }],
              messages: [{ from: PHONE, id: `wamid.sim.${Date.now()}.${seq++}`, timestamp: `${Date.now()}`, ...message }],
            },
          },
        ],
      },
    ],
  });
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (env.WHATSAPP_APP_SECRET) headers['x-hub-signature-256'] = 'sha256=' + createHmac('sha256', env.WHATSAPP_APP_SECRET).update(body).digest('hex');
  const res = await fetch(`${base}/whatsapp/webhook`, { method: 'POST', headers, body });
  await drainWhatsappQueues();
  console.log(`\n👤 ${label}   (HTTP ${res.status})`);
  for (const m of outbox.splice(0)) console.log('🤖 ' + m.replace(/\n/g, '\n   '));
}

const text = (t: string) => send({ type: 'text', text: { body: t } }, t);
const button = (id: string, title: string) => send({ type: 'interactive', interactive: { type: 'button_reply', button_reply: { id, title } } }, `[botón] ${title}`);

async function flush(label: string) {
  await flushOutbox(fake);
  console.log(`\n📤 ${label}`);
  for (const m of outbox.splice(0)) console.log('🤖 ' + m.replace(/\n/g, '\n   '));
}

async function main() {
  // Limpieza del teléfono de prueba
  const customer = await prisma.customer.findUnique({ where: { phone: PHONE } });
  if (customer) {
    await prisma.outboundMessage.deleteMany({ where: { phone: PHONE } });
    await prisma.order.deleteMany({ where: { customerId: customer.id } });
    await prisma.customer.delete({ where: { id: customer.id } });
  }
  await prisma.botSession.deleteMany({ where: { phone: PHONE } });
  await prisma.inboundMessage.deleteMany({ where: { phone: PHONE } });

  const sample = await prisma.product.findMany({ where: { active: true }, take: 3, orderBy: { code: 'asc' } });
  const [a, b, c] = sample.map((p) => p.code);

  // Verificación del webhook
  const verify = await fetch(`${base}/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${env.WHATSAPP_VERIFY_TOKEN}&hub.challenge=123`);
  console.log(`Verificación del webhook: HTTP ${verify.status} → ${await verify.text()}`);

  await text('Hola');
  await button('MENU_LIST', 'Ver precios');
  await button('MENU_ORDER', 'Hacer un pedido');
  await text(`${a} 2\n${b?.toLowerCase().replace('-', '')} x3\nZZZ-999 1\nquiero algo rico`);
  await text('hola'); // no tiene que perder el carrito
  await text(`borrar ${b}`);
  await text(`${c}: 1`);
  await text('VER');
  await text('LISTO');
  await text('no sé');
  await button('PAY_TRANSFERENCIA', 'Transferencia');
  await button('DEL_ENVIO', 'Envío');
  await text('Av. Siempreviva 742, San Justo');
  await button('ORDER_CONFIRM', 'Confirmar');

  const order = await prisma.order.findFirstOrThrow({ where: { customer: { phone: PHONE } }, include: { items: true }, orderBy: { id: 'desc' } });
  console.log(`\n🗂  Pedido #${order.id} creado: ${order.status}, ${order.items.length} ítems, ${order.paymentMethod}, ${order.deliveryMethod} a ${order.deliveryAddress}`);

  // Panel: el primero es parcial (pidió 2, hay 1), el resto disponible y el envío tiene costo
  await orders.setItemStatus(order.id, order.items[0]!.id, 'PARCIAL', 1);
  for (const it of order.items.slice(1)) await orders.setItemStatus(order.id, it.id, 'DISPONIBLE');
  try {
    await orders.submitReview(order.id);
  } catch (e) {
    console.log(`\n⛔ Revisión sin definir envío: ${(e as Error).message}`);
  }
  await orders.setShipping(order.id, 'CON_COSTO', 1500);
  await orders.submitReview(order.id);
  await flush('Panel: revisión con parcial + envío con costo');

  await text('Si');
  await flush('Cliente aceptó');

  await send({ type: 'image', image: { id: 'MEDIA123', mime_type: 'image/jpeg' } }, '[imagen del comprobante]');
  await flush('Comprobante recibido');
  const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  console.log(`\n🗂  Pedido #${order.id}: ${after.status}, pago ${after.paymentStatus}, comprobante ${after.receiptRef}`);

  // Segundo pedido: compra mínima para envío que no se alcanza
  const prevSettings = await prisma.settings.findUniqueOrThrow({ where: { id: 1 } });
  await prisma.settings.update({ where: { id: 1 }, data: { minOrderForDelivery: 999999999 } });
  await text(`${a} 1`);
  await text('listo');
  await text('efectivo');
  await text('envio'); // no se permite: vuelve a avisar el mínimo
  await button('DEL_SEGUIR', 'Seguir comprando');
  await text(`${b} 1`);
  await text('listo');
  await text('efectivo');
  // Baja el mínimo: ahora sí lo supera
  await prisma.settings.update({ where: { id: 1 }, data: { minOrderForDelivery: 1 } });
  await button('DEL_ENVIO', 'Envío');
  await button('ADDR_OK', 'Sí, ahí');
  await text('si');
  await prisma.settings.update({ where: { id: 1 }, data: { minOrderForDelivery: prevSettings.minOrderForDelivery } });

  // Panel: fuera de zona → pasa a retiro y el cliente tiene que aceptar
  const order2 = await prisma.order.findFirstOrThrow({ where: { customer: { phone: PHONE } }, include: { items: true }, orderBy: { id: 'desc' } });
  await orders.markAllAvailable(order2.id);
  await orders.setShipping(order2.id, 'FUERA_ZONA');
  await orders.submitReview(order2.id);
  await flush('Panel: fuera de zona');
  await text('si');
  await flush('Cliente aceptó retirar');
  const o2 = await prisma.order.findUniqueOrThrow({ where: { id: order2.id } });
  console.log(`\n🗂  Pedido #${o2.id}: ${o2.status}, ${o2.deliveryMethod}, envío ${o2.shippingStatus}`);

  // Duplicado: Meta reintenta el mismo id
  const dup = { type: 'text', text: { body: 'Hola' }, id: 'wamid.dup.1' };
  await send(dup, 'Hola (1ra vez)');
  await send(dup, 'Hola (reintento de Meta, no debería responder)');

  // Firma inválida
  if (env.WHATSAPP_APP_SECRET) {
    const res = await fetch(`${base}/whatsapp/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-hub-signature-256': 'sha256=deadbeef' },
      body: '{}',
    });
    console.log(`\nFirma inválida: HTTP ${res.status}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    server.close();
    await prisma.$disconnect();
  });
