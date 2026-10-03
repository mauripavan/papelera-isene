import { Router } from 'express';
import { z } from 'zod';
import { encrypt, getCredentials, loadCredentials } from '../bot/credentials.ts';
import { graph, whatsapp, WhatsAppError } from '../bot/whatsapp.ts';
import { prisma } from '../db.ts';
import { env } from '../env.ts';
import { badRequest } from '../lib/http.ts';

/**
 * Conexión del número real con Embedded Signup (panel → Ajustes → WhatsApp).
 *
 * El panel abre el flujo de Meta con el SDK de Facebook (modo coexistencia: el número sigue
 * en la app WhatsApp Business del celular) y nos manda el `code`. Acá:
 *  1. canjeamos el code por el token del usuario del sistema de la integración
 *  2. buscamos el número de la cuenta (WABA)
 *  3. suscribimos nuestra app a la WABA (sin esto no llegan los webhooks)
 *  4. pedimos la sincronización de contactos e historial (Meta da 24 h para hacerlo)
 *  5. guardamos todo con el token cifrado y el bot empieza a usar ese número
 */
export const whatsappAdminRouter = Router();

async function status() {
  const conn = await prisma.whatsappConnection.findUnique({ where: { id: 1 } });
  const creds = getCredentials();
  return {
    mode: creds?.source ?? 'off',
    connection: conn
      ? {
          wabaId: conn.wabaId,
          phoneNumberId: conn.phoneNumberId,
          displayPhone: conn.displayPhone,
          verifiedName: conn.verifiedName,
          coexistence: conn.coexistence,
          connectedAt: conn.connectedAt,
        }
      : null,
    /** Lo que necesita el panel para abrir el Embedded Signup. null = falta configurar META_APP_ID / META_CONFIG_ID */
    signup:
      env.META_APP_ID && env.META_CONFIG_ID && env.WHATSAPP_APP_SECRET
        ? { appId: env.META_APP_ID, configId: env.META_CONFIG_ID, apiVersion: env.WHATSAPP_API_VERSION }
        : null,
  };
}

whatsappAdminRouter.get('/status', async (_req, res) => {
  res.json(await status());
});

const connectBody = z.object({
  code: z.string().min(1),
  wabaId: z.string().min(1),
  /** En coexistencia a veces no viene en el evento; si falta, se busca en la WABA */
  phoneNumberId: z.string().min(1).optional(),
  coexistence: z.boolean().default(true),
});

whatsappAdminRouter.post('/connect', async (req, res) => {
  const body = connectBody.parse(req.body);
  if (!env.META_APP_ID || !env.WHATSAPP_APP_SECRET) throw badRequest('Faltan META_APP_ID y WHATSAPP_APP_SECRET en el servidor');

  // 1. code → token (el code es de un solo uso y dura poco)
  const tokenRes = await fetch(
    `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/oauth/access_token?` +
      new URLSearchParams({ client_id: env.META_APP_ID, client_secret: env.WHATSAPP_APP_SECRET, code: body.code }),
  );
  const tokenBody = (await tokenRes.json().catch(() => ({}))) as { access_token?: string; error?: { message?: string } };
  if (!tokenRes.ok || !tokenBody.access_token) {
    throw badRequest(`Meta no aceptó el código de conexión: ${tokenBody.error?.message ?? tokenRes.status}`);
  }
  const token = tokenBody.access_token;

  // 2. número de la cuenta
  const phones = await graph<{ data: { id: string; display_phone_number: string; verified_name: string }[] }>(
    `${body.wabaId}/phone_numbers?fields=id,display_phone_number,verified_name`,
    {},
    token,
  );
  const phone = phones.data.find((p) => p.id === body.phoneNumberId) ?? phones.data[0];
  if (!phone) throw badRequest('La cuenta de WhatsApp Business no tiene ningún número');

  // 3. suscribir la app a la cuenta
  await graph(`${body.wabaId}/subscribed_apps`, { method: 'POST' }, token);

  // 4. sincronización de contactos e historial (solo coexistencia). Si falla no frenamos la conexión.
  const warnings: string[] = [];
  if (body.coexistence) {
    for (const syncType of ['smb_app_state_sync', 'history']) {
      try {
        await graph(
          `${phone.id}/smb_app_data`,
          { method: 'POST', body: JSON.stringify({ messaging_product: 'whatsapp', sync_type: syncType }) },
          token,
        );
      } catch (e) {
        warnings.push(`No se pudo pedir la sincronización ${syncType}: ${(e as Error).message}`);
      }
    }
  }

  // 5. guardar y empezar a usarlo
  const data = {
    wabaId: body.wabaId,
    phoneNumberId: phone.id,
    displayPhone: phone.display_phone_number,
    verifiedName: phone.verified_name,
    tokenEnc: encrypt(token),
    coexistence: body.coexistence,
  };
  await prisma.whatsappConnection.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: { ...data, connectedAt: new Date() } });
  await loadCredentials();
  console.log(`[bot] WhatsApp conectado: ${phone.display_phone_number} (${phone.verified_name})`);
  for (const w of warnings) console.warn(`[bot] ${w}`);

  res.json({ ...(await status()), warnings });
});

/** Desconecta el número guardado. El bot vuelve a usar las variables de entorno, si están. */
whatsappAdminRouter.delete('/connection', async (_req, res) => {
  await prisma.whatsappConnection.deleteMany({ where: { id: 1 } });
  await loadCredentials();
  res.json(await status());
});

/** Manda un mensaje de prueba desde el número conectado. */
whatsappAdminRouter.post('/test', async (req, res) => {
  const { to } = z.object({ to: z.string().transform((s) => s.replace(/\D/g, '')).pipe(z.string().min(8)) }).parse(req.body);
  try {
    await whatsapp.text(to, '✅ Mensaje de prueba del bot de la papelera.');
    res.json({ ok: true });
  } catch (e) {
    if (e instanceof WhatsAppError) throw badRequest(`WhatsApp rechazó el mensaje: ${e.message}`);
    throw e;
  }
});
