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
/** Número que tipea en la web alguien que después confirma desde PHONE */
const OTHER = '5491155550000';
const outbox: string[] = [];
const outboxLog: string[] = [];

const fake: Messenger = {
  async text(to, body) {
    outbox.push(`[texto → ${to}]\n${body}`);
    outboxLog.push(body);
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

async function post(path: string, body: unknown) {
  const res = await fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

async function main() {
  // Limpieza de los teléfonos de prueba
  for (const phone of [PHONE, OTHER]) {
    const customer = await prisma.customer.findUnique({ where: { phone } });
    if (customer) {
      await prisma.outboundMessage.deleteMany({ where: { order: { customerId: customer.id } } });
      await prisma.order.deleteMany({ where: { customerId: customer.id } });
      await prisma.customer.delete({ where: { id: customer.id } });
    }
    await prisma.outboundMessage.deleteMany({ where: { phone } });
    await prisma.botSession.deleteMany({ where: { phone } });
    await prisma.inboundMessage.deleteMany({ where: { phone } });
  }

  const sample = await prisma.product.findMany({ where: { active: true, price: { gt: 0 } }, take: 3, orderBy: { code: 'asc' } });
  const [a, b, c] = sample.map((p) => p.code);

  // Verificación del webhook
  const verify = await fetch(`${base}/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${env.WHATSAPP_VERIFY_TOKEN}&hub.challenge=123`);
  console.log(`Verificación del webhook: HTTP ${verify.status} → ${await verify.text()}`);

  // ── 1. Desde el bot: el link lleva el número firmado ──
  await text('Hola');
  await button('MENU_ORDER', 'Hacer un pedido');
  const sent = outboxLog.at(-1) ?? '';
  const t = decodeURIComponent(sent.match(/[?&]t=([^\s&]+)/)?.[1] ?? '');
  const who = await (await fetch(`${base}/public/whoami?t=${encodeURIComponent(t)}`)).json();
  console.log(`\n🌐 /public/whoami → ${JSON.stringify(who)}`);

  // Mínimo para envío: no llega
  const prevSettings = await prisma.settings.findUniqueOrThrow({ where: { id: 1 } });
  await prisma.settings.update({ where: { id: 1 }, data: { minOrderForDelivery: 999999999 } });
  const tooSmall = await post('/public/orders', { t, name: 'Juan Pérez', paymentMethod: 'TRANSFERENCIA', deliveryMethod: 'ENVIO', address: 'Calle 1', items: [{ code: a, quantity: 2 }] });
  console.log(`\n🌐 Pedido por debajo del mínimo → HTTP ${tooSmall.status} ${tooSmall.body.error}`);
  await prisma.settings.update({ where: { id: 1 }, data: { minOrderForDelivery: prevSettings.minOrderForDelivery } });

  const web1 = await post('/public/orders', {
    t,
    name: 'Juan Pérez',
    paymentMethod: 'TRANSFERENCIA',
    deliveryMethod: 'ENVIO',
    address: 'Av. Siempreviva 742, San Justo',
    items: [{ code: a, quantity: 2 }, { code: c, quantity: 1 }],
  });
  console.log(`\n🌐 Pedido web con link del bot → HTTP ${web1.status} ${JSON.stringify(web1.body)}`);
  await flush('Aviso de pedido recibido');

  const order = await prisma.order.findUniqueOrThrow({ where: { id: Number(web1.body.id) }, include: { items: true, customer: true } });
  console.log(`\n🗂  Pedido #${order.id}: ${order.status}, ${order.source}, confirmado WA ${Boolean(order.waConfirmedAt)}, cliente ${order.customer.name} / ${order.customer.address}`);

  // Panel: el primero es parcial (pidió 2, hay 1), el resto disponible y el envío tiene costo
  await orders.setItemStatus(order.id, order.items[0]!.id, 'PARCIAL', 1);
  for (const it of order.items.slice(1)) await orders.setItemStatus(order.id, it.id, 'DISPONIBLE');
  await orders.setShipping(order.id, 'CON_COSTO', 1500);
  await orders.submitReview(order.id);
  await flush('Panel: revisión con parcial + envío con costo');

  await text('Si');
  await flush('Cliente aceptó');

  await send({ type: 'image', image: { id: 'MEDIA123', mime_type: 'image/jpeg' } }, '[imagen del comprobante]');
  await flush('Comprobante recibido');
  const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  console.log(`\n🗂  Pedido #${order.id}: ${after.status}, pago ${after.paymentStatus}, comprobante ${after.receiptRef}`);

  // ── 2. Entra directo a la web y tipea otro número; confirma desde su WhatsApp ──
  const web2 = await post('/public/orders', {
    name: 'Ana Gómez',
    phone: '11 5555-0000',
    paymentMethod: 'EFECTIVO',
    deliveryMethod: 'RETIRO',
    items: [{ code: b, quantity: 3 }],
  });
  console.log(`\n🌐 Pedido web sin link → HTTP ${web2.status} ${JSON.stringify(web2.body)}`);
  const o2 = await prisma.order.findUniqueOrThrow({ where: { id: Number(web2.body.id) }, include: { customer: true } });
  console.log(`🗂  Pedido #${o2.id} queda con ${o2.customer.phone}, sin confirmar (${o2.waConfirmedAt}), nombre en el pedido: ${o2.contactName}`);

  // El dueño revisa antes de que confirme: el aviso no le puede llegar todavía (queda en cola)
  await orders.markAllAvailable(o2.id);
  await orders.submitReview(o2.id);
  await flush('Antes de que confirme por WhatsApp (no tiene que salir nada)');

  await text(String(web2.body.confirmText));
  await flush('Avisos pendientes que ahora sí salen');
  const o2b = await prisma.order.findUniqueOrThrow({ where: { id: o2.id }, include: { customer: true } });
  console.log(`\n🗂  Pedido #${o2b.id}: ahora de ${o2b.customer.phone} (${o2b.customer.name}), confirmado ${Boolean(o2b.waConfirmedAt)}, ${o2b.status}`);

  await text('Hola! Hice el pedido web #999999 (código ZZZZZZ).');

  // ── 3. Manda códigos por chat como antes: lo mandamos a la web ──
  await text(`${a} 2`);

  // Trampa para bots y número inválido
  const spam = await post('/public/orders', { name: 'Bot', phone: '1155550000', website: 'x', paymentMethod: 'EFECTIVO', deliveryMethod: 'RETIRO', items: [{ code: a, quantity: 1 }] });
  const badPhone = await post('/public/orders', { name: 'Ana', phone: '1234', paymentMethod: 'EFECTIVO', deliveryMethod: 'RETIRO', items: [{ code: a, quantity: 1 }] });
  console.log(`\n🌐 Trampa → HTTP ${spam.status}; número inválido → HTTP ${badPhone.status} ${badPhone.body.error}`);

  // Duplicado: Meta reintenta el mismo id
  const dup = { type: 'text', text: { body: 'Hola' }, id: 'wamid.dup.1' };
  await prisma.inboundMessage.deleteMany({ where: { id: 'wamid.dup.1' } }).catch(() => {});
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
