import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.ts';
import { badRequest, unauthorized } from '../lib/http.ts';
import { rateLimit, requireAdmin, signToken } from '../middleware/auth.ts';

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

authRouter.post('/login', rateLimit({ windowMs: 15 * 60_000, max: 10 }), async (req, res) => {
  const { username, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { username } });
  // Comparamos igual aunque no exista el usuario para no filtrar cuáles existen por tiempo de respuesta.
  const ok = await bcrypt.compare(password, user?.passwordHash ?? '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva');
  if (!user || !ok) throw unauthorized('Usuario o contraseña incorrectos');
  res.json({ token: signToken({ id: user.id, username: user.username }), user: { id: user.id, username: user.username } });
});

authRouter.get('/me', requireAdmin, (req, res) => {
  res.json({ user: req.user });
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'La contraseña nueva tiene que tener al menos 8 caracteres'),
});

authRouter.post('/password', requireAdmin, async (req, res) => {
  const { currentPassword, newPassword } = passwordSchema.parse(req.body);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) throw badRequest('La contraseña actual no es correcta');
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 10) } });
  res.status(204).end();
});
