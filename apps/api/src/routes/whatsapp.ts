import type { Request } from 'express';
import { Router } from 'express';
import { handleInbound, type Inbound } from '../bot/flow.ts';
import { validSignature, whatsapp, type Messenger } from '../bot/whatsapp.ts';
import { prisma } from '../db.ts';
import { env } from '../env.ts';

/**
 * Webhook de WhatsApp Cloud API.
 *  GET  /whatsapp/webhook  → verificación inicial de Meta (hub.challenge)
 *  POST /whatsapp/webhook  → mensajes entrantes
 *
 * Respondemos 200 enseguida y procesamos después: si tardamos, Meta reintenta.
 */
export function whatsappRouter(wa: Messenger = whatsapp) {
  const router = Router();

  router.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && env.WHATSAPP_VERIFY_TOKEN && token === env.WHATSAPP_VERIFY_TOKEN) {
      res.status(200).send(String(challenge));
      return;
    }
    res.sendStatus(403);
  });

  router.post('/webhook', (req: Request & { rawBody?: Buffer }, res) => {
    if (env.WHATSAPP_APP_SECRET) {
      const ok = req.rawBody && validSignature(req.rawBody, req.header('x-hub-signature-256'), env.WHATSAPP_APP_SECRET);
      if (!ok) {
        console.warn('[bot] webhook rechazado: la firma no coincide (revisá WHATSAPP_APP_SECRET)');
        res.sendStatus(401);
        return;
      }
    }
    res.sendStatus(200);
    const messages = extractMessages(req.body);
    const statuses = countStatuses(req.body);
    const echoes = extractEchoes(req.body);
    console.log(
      `[bot] webhook recibido: ${messages.length} mensaje(s), ${echoes.length} respuesta(s) desde la app, ${statuses.length} aviso(s) de estado`,
    );
    // El dueño contestó a mano desde WhatsApp Business: el bot se calla en ese chat por un rato
    for (const to of new Set(echoes)) enqueue(to, () => pauseBot(to));
    for (const s of statuses.filter((s) => s.status === 'failed')) console.warn(`[bot] WhatsApp no pudo entregar un mensaje a ${s.recipient}: ${s.error}`);
    for (const msg of messages) enqueue(msg.phone, () => processMessage(msg, wa));
  });

  return router;
}

interface WaMessage {
  id: string;
  phone: string;
  profileName?: string;
  message: Inbound;
}

/** Saca los mensajes del payload de Meta (ignora los avisos de estado: enviado, leído, etc.). */
export function extractMessages(body: unknown): WaMessage[] {
  const out: WaMessage[] = [];
  const entries = (body as { entry?: unknown[] })?.entry ?? [];
  for (const entry of entries as { changes?: { value?: Record<string, unknown> }[] }[]) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      const contacts = (value.contacts as { wa_id: string; profile?: { name?: string } }[] | undefined) ?? [];
      for (const m of (value.messages as Record<string, any>[] | undefined) ?? []) {
        const profileName = contacts.find((c) => c.wa_id === m.from)?.profile?.name;
        let message: Inbound = { kind: 'other' };
        if (m.type === 'text') message = { kind: 'text', text: String(m.text?.body ?? '') };
        else if (m.type === 'interactive' && m.interactive?.button_reply)
          message = { kind: 'button', id: m.interactive.button_reply.id, title: m.interactive.button_reply.title };
        else if (m.type === 'button') message = { kind: 'button', id: m.button?.payload ?? '', title: m.button?.text ?? '' };
        else if (m.type === 'image') message = { kind: 'media', mediaId: m.image.id, mimeType: m.image.mime_type };
        else if (m.type === 'document')
          message = { kind: 'media', mediaId: m.document.id, mimeType: m.document.mime_type, filename: m.document.filename };
        out.push({ id: m.id, phone: m.from, profileName, message });
      }
    }
  }
  return out;
}

/** Mensajes que el dueño mandó desde la app WhatsApp Business (coexistencia). Devuelve a quién. */
export function extractEchoes(body: unknown): string[] {
  const out: string[] = [];
  for (const entry of ((body as { entry?: any[] })?.entry ?? []) as any[]) {
    for (const change of entry.changes ?? []) {
      for (const echo of change.value?.message_echoes ?? []) if (echo?.to) out.push(String(echo.to));
    }
  }
  return out;
}

async function pauseBot(phone: string) {
  const pausedUntil = new Date(Date.now() + env.WHATSAPP_HUMAN_PAUSE_MINUTES * 60_000);
  await prisma.botSession.upsert({ where: { phone }, create: { phone, pausedUntil }, update: { pausedUntil } });
  console.log(`[bot] respuesta manual a ${phone}: bot en pausa en ese chat hasta ${pausedUntil.toISOString()}`);
}

/** Avisos de estado de mensajes enviados (sent, delivered, read, failed). */
function countStatuses(body: unknown) {
  const out: { status: string; recipient: string; error?: string }[] = [];
  for (const entry of ((body as { entry?: any[] })?.entry ?? []) as any[]) {
    for (const change of entry.changes ?? []) {
      for (const st of change.value?.statuses ?? []) {
        out.push({ status: st.status, recipient: st.recipient_id, error: st.errors?.map((e: any) => `${e.code} ${e.title}`).join('; ') });
      }
    }
  }
  return out;
}

async function processMessage(msg: WaMessage, wa: Messenger) {
  // Meta puede mandar el mismo mensaje más de una vez
  try {
    await prisma.inboundMessage.create({ data: { id: msg.id, phone: msg.phone } });
  } catch {
    return;
  }
  console.log(`[bot] mensaje de ${msg.phone}: ${msg.message.kind === 'text' ? JSON.stringify(msg.message.text.slice(0, 80)) : msg.message.kind}`);
  try {
    if (msg.message.kind === 'other') {
      await wa.text(msg.phone, 'Por ahora solo entiendo mensajes de texto 🙏 Escribí *MENU* para empezar.');
      return;
    }
    await handleInbound({ phone: msg.phone, profileName: msg.profileName, message: msg.message }, wa);
  } catch (e) {
    console.error(`[bot] error procesando el mensaje ${msg.id} de ${msg.phone}`, e);
    await wa.text(msg.phone, 'Uy, tuvimos un problema 😓 Probá de nuevo en un rato o escribí *MENU*.').catch(() => {});
  }
}

/** Procesa los mensajes de un mismo teléfono de a uno, en orden. */
const queues = new Map<string, Promise<void>>();
function enqueue(phone: string, job: () => Promise<void>) {
  const prev = queues.get(phone) ?? Promise.resolve();
  const next = prev.then(job, job).finally(() => {
    if (queues.get(phone) === next) queues.delete(phone);
  });
  queues.set(phone, next);
}

/** Para los tests: espera a que se terminen de procesar los mensajes pendientes. */
export async function drainWhatsappQueues() {
  while (queues.size) await Promise.all([...queues.values()]);
}
