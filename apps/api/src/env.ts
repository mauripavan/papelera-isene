import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(3000),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET tiene que tener al menos 16 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  BOT_API_KEY: z.string().min(8, 'BOT_API_KEY tiene que tener al menos 8 caracteres'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Variables de entorno inválidas:');
  for (const issue of parsed.error.issues) console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}

export const env = parsed.data;
