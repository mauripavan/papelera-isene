import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../env.ts';

/**
 * Cliente mínimo de WhatsApp Cloud API (Graph API de Meta).
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

export interface ReplyButton {
  id: string;
  /** Máximo 20 caracteres (límite de Meta) */
  title: string;
}

/** Lo que el bot necesita para responder. En los tests se reemplaza por uno falso. */
export interface Messenger {
  text(to: string, body: string): Promise<void>;
  buttons(to: string, body: string, buttons: ReplyButton[]): Promise<void>;
}

export class WhatsAppError extends Error {
  constructor(
    message: string,
    public code?: number,
    public details?: unknown,
  ) {
    super(message);
  }
}

const GRAPH = 'https://graph.facebook.com';

function graphUrl(path: string) {
  return `${GRAPH}/${env.WHATSAPP_API_VERSION}/${path}`;
}

async function graph<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(graphUrl(path), {
    ...init,
    headers: { authorization: `Bearer ${env.WHATSAPP_TOKEN}`, 'content-type': 'application/json', ...init.headers },
  });
  const body = (await res.json().catch(() => ({}))) as { error?: { message?: string; code?: number; error_data?: unknown } };
  if (!res.ok || body.error) {
    throw new WhatsAppError(body.error?.message ?? `HTTP ${res.status}`, body.error?.code, body.error?.error_data);
  }
  return body as T;
}

/**
 * En Argentina, WhatsApp manda el número como 549 + área + número, pero la API a veces
 * solo acepta enviarle a 54 + área + número (sin el 9). Probamos tal cual y, si Meta
 * rechaza el destinatario, reintentamos sin el 9.
 */
function argentinaWithout9(phone: string) {
  return /^549\d{10}$/.test(phone) ? `54${phone.slice(3)}` : null;
}

const RECIPIENT_ERRORS = new Set([131030, 131026]);

async function sendMessage(to: string, payload: Record<string, unknown>) {
  const send = (recipient: string) =>
    graph(`${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: recipient, ...payload }),
    });
  try {
    await send(to);
  } catch (e) {
    const alt = argentinaWithout9(to);
    if (alt && e instanceof WhatsAppError && e.code && RECIPIENT_ERRORS.has(e.code)) {
      await send(alt);
      return;
    }
    throw e;
  }
}

export const whatsapp: Messenger & {
  mediaInfo(id: string): Promise<{ url: string; mime_type: string }>;
  downloadMedia(url: string): Promise<Response>;
} = {
  async text(to, body) {
    // Límite de Meta: 4096 caracteres por mensaje de texto
    for (const chunk of splitText(body, 4000)) {
      await sendMessage(to, { type: 'text', text: { body: chunk, preview_url: true } });
    }
  },

  async buttons(to, body, buttons) {
    await sendMessage(to, {
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: body.slice(0, 1024) },
        action: { buttons: buttons.slice(0, 3).map((b) => ({ type: 'reply', reply: { id: b.id, title: b.title.slice(0, 20) } })) },
      },
    });
  },

  mediaInfo(id) {
    return graph<{ url: string; mime_type: string }>(id);
  },

  downloadMedia(url) {
    return fetch(url, { headers: { authorization: `Bearer ${env.WHATSAPP_TOKEN}` } });
  },
};

/** Parte un texto largo en pedazos, cortando en saltos de línea. */
export function splitText(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const chunks: string[] = [];
  let current = '';
  for (const line of text.split('\n')) {
    if ((current + '\n' + line).length > max && current) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/** Valida la firma X-Hub-Signature-256 del webhook. */
export function validSignature(rawBody: Buffer, header: string | undefined, appSecret: string): boolean {
  if (!header?.startsWith('sha256=')) return false;
  const expected = Buffer.from('sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex'));
  const given = Buffer.from(header);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
