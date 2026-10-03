import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(3000),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET tiene que tener al menos 16 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  BOT_API_KEY: z.string().min(8, 'BOT_API_KEY tiene que tener al menos 8 caracteres'),
  /** Carpeta del panel compilado. Si no existe (desarrollo), la API no lo sirve. */
  WEB_DIST: z.string().default('../web/dist'),

  /** URL pública (para los links que manda el bot). En Railway se arma sola con RAILWAY_PUBLIC_DOMAIN. */
  PUBLIC_URL: z.string().optional(),
  RAILWAY_PUBLIC_DOMAIN: z.string().optional(),

  // WhatsApp Cloud API. Si faltan, el bot queda apagado y el resto funciona igual.
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  /** Para validar la firma de los webhooks (App settings → Basic → App secret) */
  WHATSAPP_APP_SECRET: z.string().optional(),
  WHATSAPP_API_VERSION: z.string().default('v25.0'),
  /** Si el dueño responde a mano desde la app, el bot se calla en ese chat durante estos minutos */
  WHATSAPP_HUMAN_PAUSE_MINUTES: z.coerce.number().default(240),

  // Embedded Signup (botón "Conectar WhatsApp" del panel)
  /** ID de la app de Meta (Configuración de la app → Básica) */
  META_APP_ID: z.string().optional(),
  /** ID de la configuración de Facebook Login for Business con Embedded Signup */
  META_CONFIG_ID: z.string().optional(),
  /** Clave para cifrar el token guardado en la base. Si falta, se deriva de JWT_SECRET. */
  TOKEN_ENCRYPTION_KEY: z.string().optional(),
  /** Cada cuántos ms el bot revisa la cola de mensajes a enviar */
  WHATSAPP_OUTBOX_INTERVAL_MS: z.coerce.number().default(5000),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Variables de entorno inválidas:');
  for (const issue of parsed.error.issues) console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}

export const env = parsed.data;

export const publicUrl =
  env.PUBLIC_URL?.replace(/\/$/, '') ?? (env.RAILWAY_PUBLIC_DOMAIN ? `https://${env.RAILWAY_PUBLIC_DOMAIN}` : `http://localhost:${env.PORT}`);

