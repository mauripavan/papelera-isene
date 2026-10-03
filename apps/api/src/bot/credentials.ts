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
