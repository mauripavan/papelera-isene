import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../env.ts';

/**
 * Links firmados que manda el bot (lista de precios / armar pedido en la web).
 * Llevan el número de WhatsApp del cliente: así la web sabe a quién avisarle sin
 * pedirle el número, y sabemos que es suyo porque el link llegó a ese chat.
 * Duran 24 h, lo mismo que la ventana de WhatsApp para escribirle.
 */
const TTL_MS = 24 * 60 * 60 * 1000;

function sign(payload: string) {
  return createHmac('sha256', `phone-link:${env.JWT_SECRET}`).update(payload).digest('base64url').slice(0, 22);
}

export function signPhoneToken(phone: string, now = Date.now()): string {
  const payload = `${phone}.${Math.floor((now + TTL_MS) / 1000).toString(36)}`;
  return `${payload}.${sign(payload)}`;
}

/** Devuelve el teléfono si el token es válido y no venció. */
export function verifyPhoneToken(token: string | undefined | null, now = Date.now()): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [phone, exp, sig] = parts as [string, string, string];
  const expected = sign(`${phone}.${exp}`);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (parseInt(exp, 36) * 1000 < now) return null;
  return /^\d{8,15}$/.test(phone) ? phone : null;
}
