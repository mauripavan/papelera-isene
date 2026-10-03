/**
 * Prueba la conexión con Embedded Signup y la pausa por respuesta manual, con la Graph API simulada.
 *   tsx --env-file=.env scripts/test-connection.ts
 * Necesita META_APP_ID, META_CONFIG_ID y WHATSAPP_APP_SECRET (cualquier valor sirve, no habla con Meta).
 */
import { createHmac } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import assert from 'node:assert/strict';

const graphCalls: string[] = [];
const sent: { to: string; body: string }[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (!url.startsWith('https://graph.facebook.com/')) return realFetch(input, init);
  const u = new URL(url);
  graphCalls.push(`${init?.method ?? 'GET'} ${u.pathname.replace(/^\/v[\d.]+/, '')} auth=${String((init?.headers as any)?.authorization ?? '').slice(0, 20)} proof=${u.searchParams.has('appsecret_proof')}`);
  const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } });
  if (u.pathname.endsWith('/oauth/access_token')) return json({ access_token: 'BISU_TOKEN_123', token_type: 'bearer' });
  if (u.pathname.endsWith('/phone_numbers')) return json({ data: [{ id: 'PHONE_REAL', display_phone_number: '+54 11 4652-4650', verified_name: 'Papelera Isene' }] });
  if (u.pathname.endsWith('/subscribed_apps')) return json({ success: true });
  if (u.pathname.endsWith('/smb_app_data')) return json({ success: true });
  if (u.pathname.endsWith('/messages')) {
    const body = JSON.parse(String(init?.body));
    sent.push({ to: body.to, body: body.text?.body ?? body.interactive?.body?.text });
    return json({ messages: [{ id: 'wamid.out' }] });
  }
  return json({});
}) as typeof fetch;

const { createApp } = await import('../src/app.ts');
const { loadCredentials, getCredentials } = await import('../src/bot/credentials.ts');
const { prisma } = await import('../src/db.ts');
const { env } = await import('../src/env.ts');
const { drainWhatsappQueues } = await import('../src/routes/whatsapp.ts');

const PHONE = '5491177777777';
await prisma.whatsappConnection.deleteMany();
await prisma.botSession.deleteMany({ where: { phone: PHONE } });
await prisma.inboundMessage.deleteMany({ where: { phone: PHONE } });
await prisma.customer.deleteMany({ where: { phone: PHONE, orders: { none: {} } } });
await loadCredentials();
console.log('credenciales al arrancar:', getCredentials()?.source ?? 'ninguna');

const server = createApp().listen(0);
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
const J = { 'content-type': 'application/json' };
const login = await (await fetch(`${base}/auth/login`, { method: 'POST', headers: J, body: JSON.stringify({ username: 'admin', password: process.env.TEST_ADMIN_PASSWORD ?? 'admin-test-123' }) })).json();
const H = { ...J, authorization: `Bearer ${login.token}` };

// Headers de seguridad para el SDK de Facebook
const page = await fetch(`${base}/ajustes`);
console.log('COOP:', page.headers.get('cross-origin-opener-policy'));
assert.match(page.headers.get('content-security-policy') ?? '', /script-src 'self' https:\/\/connect\.facebook\.net/);
for (const p of ['/privacidad', '/eliminar-datos']) assert.equal((await fetch(base + p)).status, 200);

let status = await (await fetch(`${base}/api/whatsapp/status`, { headers: H })).json();
console.log('estado antes:', status.mode, 'signup:', Boolean(status.signup));

const connected = await (
  await fetch(`${base}/api/whatsapp/connect`, { method: 'POST', headers: H, body: JSON.stringify({ code: 'CODE', wabaId: 'WABA_1' }) })
).json();
console.log('conectar:', connected.mode, connected.connection?.displayPhone, 'avisos:', connected.warnings);
assert.equal(connected.mode, 'connection');
assert.equal(getCredentials()?.token, 'BISU_TOKEN_123');
assert.equal(getCredentials()?.phoneNumberId, 'PHONE_REAL');
const row = await prisma.whatsappConnection.findUniqueOrThrow({ where: { id: 1 } });
assert.ok(!row.tokenEnc.includes('BISU_TOKEN_123'), 'el token se guarda cifrado');
console.log('llamadas a Graph:\n  ' + graphCalls.join('\n  '));

// Webhooks
async function hook(value: Record<string, unknown>) {
  const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: 'WABA_1', changes: [{ field: 'messages', value }] }] });
  const sig = 'sha256=' + createHmac('sha256', env.WHATSAPP_APP_SECRET!).update(body).digest('hex');
  await fetch(`${base}/whatsapp/webhook`, { method: 'POST', headers: { ...J, 'x-hub-signature-256': sig }, body });
  await drainWhatsappQueues();
}
let n = 0;
const msg = (text: string) => hook({ contacts: [{ wa_id: PHONE, profile: { name: 'Ana' } }], messages: [{ from: PHONE, id: `wamid.t${n++}`, type: 'text', text: { body: text } }] });

sent.length = 0;
await msg('hola');
console.log('\n"hola" →', sent.map((s) => s.body.split('\n')[0]));
assert.equal(sent.length, 1);

// El dueño responde desde la app
await hook({ message_echoes: [{ from: '541146524650', to: PHONE, id: 'wamid.echo1', type: 'text', text: { body: 'Hola Ana, ¿qué necesitás?' } }] });
const s = await prisma.botSession.findUniqueOrThrow({ where: { phone: PHONE } });
console.log('pausa hasta:', s.pausedUntil?.toISOString());
sent.length = 0;
await msg('quiero 2 resmas');
console.log('mensaje con el bot en pausa →', sent.length, 'respuestas');
assert.equal(sent.length, 0);

await msg('menu');
console.log('"menu" →', sent.map((s) => s.body.split('\n')[0]));
assert.equal(sent.length, 1);

sent.length = 0;
await msg('borrar mis datos');
console.log('"borrar mis datos" →', sent.map((s) => s.body.slice(0, 40)));
assert.equal(await prisma.botSession.count({ where: { phone: PHONE } }), 0);

// Desconectar vuelve a las variables de entorno
status = await (await fetch(`${base}/api/whatsapp/connection`, { method: 'DELETE', headers: H })).json();
console.log('\ndesconectar →', status.mode);

server.close();
await prisma.$disconnect();
console.log('\nOK');
