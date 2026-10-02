import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env.ts';
import { unauthorized } from '../lib/http.ts';

export interface AuthUser {
  id: number;
  username: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ username: user.username }, env.JWT_SECRET, {
    subject: String(user.id),
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/** Protege las rutas del panel: requiere `Authorization: Bearer <token>`. */
export const requireAdmin: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw unauthorized();
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    req.user = { id: Number(payload.sub), username: String(payload.username) };
    next();
  } catch {
    throw unauthorized('Sesión vencida o inválida');
  }
};

/** Protege las rutas del bot: requiere el header `x-bot-key`. */
export const requireBot: RequestHandler = (req, _res, next) => {
  const given = Buffer.from(String(req.headers['x-bot-key'] ?? ''));
  const expected = Buffer.from(env.BOT_API_KEY);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw unauthorized();
  next();
};

/** Límite simple en memoria para frenar fuerza bruta en el login. */
export function rateLimit({ windowMs, max }: { windowMs: number; max: number }): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req, res, next) => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt < now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count++;
    if (entry.count > max) {
      res.status(429).json({ error: 'Demasiados intentos. Probá de nuevo en unos minutos.' });
      return;
    }
    next();
  };
}
