import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { prisma } from '../db.ts';
import { env } from '../env.ts';

/**
 * De dónde saca el bot el número y el token de WhatsApp:
 *  1. la conexión guardada con el botón "Conectar WhatsApp" (Embedded Signup), o
 *  2. las variables WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID (número de prueba).
 */

export interface Credentials {
  token: string;
  phoneNumberId: string;
  source: 'connection' | 'env';
}

let current: Credentials | null = null;

export function getCredentials(): Credentials | null {
  return current;
}

export function isWhatsappEnabled() {
  return current !== null;
}

/** Recarga las credenciales (al arrancar y cuando se conecta o desconecta un número). */
export async function loadCredentials(): Promise<Credentials | null> {
  const conn = await prisma.whatsappConnection.findUnique({ where: { id: 1 } }).catch(() => null);
  if (conn) {
    try {
      current = { token: decrypt(conn.tokenEnc), phoneNumberId: conn.phoneNumberId, source: 'connection' };
      return current;
    } catch {
      console.error('[bot] no se pudo descifrar el token guardado (¿cambió JWT_SECRET o TOKEN_ENCRYPTION_KEY?). Hay que volver a conectar WhatsApp.');
    }
  }
  current =
    env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID
      ? { token: env.WHATSAPP_TOKEN, phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID, source: 'env' }
      : null;
  return current;
}

// ─── Cifrado del token (AES-256-GCM) ────────────────────────────────────────

function key() {
  return createHash('sha256')
    .update(env.TOKEN_ENCRYPTION_KEY ?? `papelera:${env.JWT_SECRET}`)
    .digest();
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64')).join('.');
}

export function decrypt(payload: string): string {
  const [iv, tag, data] = payload.split('.').map((p) => Buffer.from(p, 'base64'));
  const decipher = createDecipheriv('aes-256-gcm', key(), iv!);
  decipher.setAuthTag(tag!);
  return Buffer.concat([decipher.update(data!), decipher.final()]).toString('utf8');
}

// ─── Número de la papelera (para los links wa.me de la web) ─────────────────

let numberCache: { phoneNumberId: string; number: string | null; at: number } | null = null;

/** Número de WhatsApp del negocio, solo dígitos (ej. 5491123983428). null si no hay WhatsApp configurado. */
export async function getBusinessNumber(): Promise<string | null> {
  const creds = current;
  if (!creds) return null;
  if (numberCache && numberCache.phoneNumberId === creds.phoneNumberId && Date.now() - numberCache.at < 60 * 60_000) {
    return numberCache.number;
  }
  let display: string | null = null;
  const conn = await prisma.whatsappConnection.findUnique({ where: { id: 1 } }).catch(() => null);
  if (conn?.phoneNumberId === creds.phoneNumberId && conn.displayPhone) display = conn.displayPhone;
  if (!display) {
    try {
      const { graph } = await import('./whatsapp.ts');
      display = (await graph<{ display_phone_number?: string }>(`/${creds.phoneNumberId}?fields=display_phone_number`)).display_phone_number ?? null;
    } catch (e) {
      console.error('[bot] no se pudo obtener el número del negocio:', (e as Error).message);
      return numberCache?.number ?? null; // no cacheamos el error
    }
  }
  const number = display ? display.replace(/\D/g, '') || null : null;
  numberCache = { phoneNumberId: creds.phoneNumberId, number, at: Date.now() };
  return number;
}
