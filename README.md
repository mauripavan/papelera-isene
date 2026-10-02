# Papelera Isene

Digitalización de la papelera: catálogo con precios, pedidos por WhatsApp y panel web.

```
apps/
  api/      Express + Prisma + Postgres. Panel (/api, con login) y bot (/bot, con API key)
  web/      Panel: Vite + React + TanStack Query
  bot/      (próximo) bot de WhatsApp
packages/
  shared/   Reglas de negocio compartidas: precios con/sin IVA, estados, etiquetas
```

## Arrancar

Requisitos: Node 22+, pnpm 10, Docker (para Postgres).

```bash
pnpm install
cp apps/api/.env.example apps/api/.env     # completá JWT_SECRET, BOT_API_KEY y ADMIN_PASSWORD
pnpm db:up                                 # Postgres en Docker
pnpm db:migrate --name init                # crea las tablas (primera vez)
pnpm db:seed                               # crea el usuario admin
pnpm dev                                   # API en :3100 y panel en :5173
```

Para cargar productos de ejemplo: `SEED_SAMPLE=1 pnpm db:seed`.

Tests de reglas de precio: `pnpm test`. Chequeo de tipos: `pnpm typecheck`.

## Reglas de negocio

**Precios.** Cada producto tiene un precio en efectivo y un check *Discrimina IVA*.

| Discrimina IVA | Efectivo | Transferencia |
|---|---|---|
| Sí | precio cargado (sin IVA) | precio + IVA (21% por defecto, configurable en Ajustes) |
| No | precio cargado | el mismo |

El cálculo vive en `packages/shared/src/pricing.ts`. Cada ítem de un pedido guarda una copia del precio al momento de pedir, así los pedidos viejos no cambian cuando se actualiza la lista.

**Pedidos.**

```
PENDIENTE_REVISION ──(todo disponible)──────────────▶ CONFIRMADO ──(fecha)──▶ PROGRAMADO ──▶ ENTREGADO
      │                                                   ▲
      └──(hay faltantes)──▶ ESPERANDO_CLIENTE ──(acepta)──┘
                                    └──(rechaza)──▶ CANCELADO
```

1. El bot toma teléfono, productos, medio de pago (efectivo/transferencia) y envío o retiro, informa el monto (`POST /bot/quote`) y crea el pedido (`POST /bot/orders`).
2. Desde el panel se marca cada producto como **Hay** o **Falta** y se confirma la revisión:
   - Si está todo, el pedido queda confirmado y el bot avisa al cliente. Si paga por transferencia, le pasa los datos y le pide el comprobante.
   - Si falta algo, el bot informa los faltantes con el nuevo total y espera **SI**/**NO** (`POST /bot/orders/:id/customer-response`).
3. El comprobante entra por `POST /bot/orders/:id/receipt`.
4. Desde el panel se asigna la fecha de envío o retiro y el bot se la informa al cliente.

**Mensajes al cliente.** La API no habla con WhatsApp. Cada cambio que hay que avisar se guarda en una cola (`outbound_messages`). El bot consulta `GET /bot/messages/pending`, envía cada mensaje y confirma con `POST /bot/messages/:id/sent` (o `/failed`). Si el bot se cae, los mensajes quedan esperando y no se pierden. Los textos están en `apps/api/src/services/messages.ts`.

## Seguridad

- **Panel:** login con usuario y contraseña (bcrypt) y token JWT. Todas las rutas `/api/*` lo requieren. El login tiene límite de intentos. La contraseña se cambia desde Ajustes.
- **Bot:** header `x-bot-key` con el valor de `BOT_API_KEY`.

## Endpoints

| Panel (`Authorization: Bearer …`) | |
|---|---|
| `POST /auth/login`, `GET /auth/me`, `POST /auth/password` | sesión |
| `GET/POST /api/products`, `PATCH/DELETE /api/products/:id` | catálogo (DELETE desactiva) |
| `POST /api/products/bulk-price` `{percent, categoryId?}` | aumento masivo |
| `GET/POST/PATCH/DELETE /api/categories` | categorías |
| `GET /api/orders?status=A,B&q=`, `GET /api/orders/counts`, `GET /api/orders/:id` | pedidos |
| `PATCH /api/orders/:id/items/:itemId` `{status}`, `POST …/items/all-available` | revisión de stock |
| `POST /api/orders/:id/review` | cierra la revisión y avisa al cliente |
| `POST /api/orders/:id/schedule` `{scheduledFor}` | fecha de envío/retiro |
| `POST /api/orders/:id/payment` `{paymentStatus}`, `/deliver`, `/cancel` | |
| `GET/PATCH /api/settings` | IVA, datos de transferencia, dirección |

| Bot (`x-bot-key: …`) | |
|---|---|
| `GET /bot/products`, `GET /bot/settings` | lista de precios y datos del negocio |
| `GET /bot/customers/:phone`, `GET /bot/customers/:phone/open-orders` | cliente y pedidos abiertos |
| `POST /bot/quote`, `POST /bot/orders` | cotizar y crear pedido |
| `POST /bot/orders/:id/customer-response` `{accept}` | respuesta a faltantes |
| `POST /bot/orders/:id/receipt` `{receiptRef}` | comprobante |
| `GET /bot/messages/pending`, `POST /bot/messages/:id/sent|failed` | cola de mensajes |
