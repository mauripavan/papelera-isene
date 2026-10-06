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

Para cargar el catálogo real: `pnpm db:import` (ver abajo). Para productos de ejemplo: `SEED_SAMPLE=1 pnpm db:seed`.

## Catálogo

El catálogo inicial sale de las fotos de las listas de precios (`apps/listas/`) y está en
`apps/api/prisma/data/catalogo.csv`, con un código corto por producto (`BOL-001`, `DES-014`…)
que es el que el cliente usa para pedir por WhatsApp.

```bash
pnpm db:import                       # crea o actualiza todos los productos por código
pnpm db:import -- --solo-nuevos      # solo agrega los que faltan, no pisa cambios hechos en el panel
```

Cada fila tiene un estado de revisión:

- **ok**: precio legible y actualizado. Queda activo.
- **revisar + activo**: tiene precio pero hay alguna duda (dígito borroso, etiqueta corrida, presentación no clara). Se vende igual.
- **revisar + inactivo**: sin precio o con un precio viejo de la lista impresa. Queda con precio 0 y el bot no lo ofrece hasta que alguien le cargue precio.

En el panel, *Productos → Solo para revisar* muestra la nota de cada uno y la foto de donde salió.
Al cargarle precio a un producto sin precio se activa solo. El botón **Listo** lo saca de revisión.

Algunos productos tienen un precio de transferencia fijo que no sale de sumar el 21% (por ejemplo,
los que en la lista tenían precio contado y precio con IVA por separado). Ese valor se carga en la
columna *Transferencia*. Si se deja vacía, se calcula con el IVA.

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
PENDIENTE_REVISION ──(todo como lo pidió)──────────▶ CONFIRMADO ──(fecha)──▶ PROGRAMADO ──▶ ENTREGADO
      │                                                   ▲
      └──(hay cambios)───▶ ESPERANDO_CLIENTE ──(acepta)──┘
                                    └──(rechaza)──▶ CANCELADO
```

1. El cliente arma el pedido en la web (`/lista`): productos, medio de pago (efectivo/transferencia), retiro o envío, dirección, nombre y WhatsApp, y confirma (`POST /public/orders`). Desde ahí sigue todo por WhatsApp.
   - Si llegó con el link del bot, el link trae su número firmado (`?t=`, vale 24 h): no se lo pedimos y el bot le confirma el pedido en el momento.
   - Si entró directo, tipea su WhatsApp y al final un botón le abre el chat con *"Pedido web #N (código X)"*. Al mandarlo, el pedido queda vinculado a su número (aunque haya tipeado otro). Hasta entonces el pedido aparece en el panel como **Web · sin confirmar**, no se guardan su nombre ni su dirección para ese número y los avisos quedan en espera (nunca se le escribe a un número que no confirmó).
   Si en *Ajustes* hay una **compra mínima para envío**, el bot la avisa al preguntar retiro/envío y no deja elegir envío por debajo del mínimo (ofrece retirar o seguir comprando).
2. Desde el panel se marca cada producto como **Hay**, **Parcial** (cuántos hay de lo pedido) o **Falta**. Si es con envío, además se define si el envío es **gratis**, **con costo** (se suma al total) o **fuera de zona** (pasa a retiro). Después se confirma la revisión:
   - Si está todo como lo pidió (y el envío es gratis), el pedido queda confirmado y el bot avisa al cliente. Si paga por transferencia, le pasa los datos y le pide el comprobante.
   - Si hay faltantes, parciales, costo de envío o fuera de zona, el bot informa los cambios con el nuevo total y espera **SI**/**NO** (`POST /bot/orders/:id/customer-response`).
   - Si no hay nada, se cancela y se le avisa.
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
| `PATCH /api/orders/:id/items/:itemId` `{status, availableQuantity?}`, `POST …/items/all-available` | revisión de stock (parcial: cuántos hay) |
| `POST /api/orders/:id/shipping` `{shippingStatus, shippingCost?}` | envío gratis / con costo / fuera de zona |
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

## Deploy (Railway)

Un solo servicio: la imagen del `Dockerfile` compila el panel y la API lo sirve en la misma URL.
Al arrancar (`apps/api/scripts/start-prod.mjs`) aplica las migraciones pendientes, crea el usuario
admin si no existe y levanta la API.

Variables del servicio:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (referencia al Postgres del proyecto) |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `BOT_API_KEY` | `openssl rand -hex 24` |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | usuario inicial del panel |
| `IMPORT_CATALOG` | `1` solo en el primer deploy (importa el catálogo con `--solo-nuevos`); después borrarla |

La base de producción es la fuente de verdad: los cambios de datos en local no se suben.
Para traer los datos reales a local: `pg_dump` de prod y `pg_restore` en local, nunca al revés.

## Bot de WhatsApp

Vive dentro de la API (`apps/api/src/bot/`), así que no suma otro servicio:

- `POST /whatsapp/webhook` recibe los mensajes de Meta (valida la firma con `WHATSAPP_APP_SECRET`
  y descarta reintentos duplicados). `GET /whatsapp/webhook` es la verificación inicial.
- `src/bot/flow.ts` es la conversación. El bot ya no toma pedidos por chat: *Hacer un pedido*,
  *Ver precios* o mandar códigos responden con el link a la web con el número del cliente firmado.
- Después del pedido: `SI`/`NO` responde a un pedido con cambios, una imagen o PDF se toma como
  comprobante de transferencia, *"Pedido web #N (código X)"* vincula un pedido web, y `MENU`
  muestra el menú.
- Los avisos que salen del panel (confirmación, faltantes, fecha, cancelación) se encolan en
  `outbound_messages` y un worker los manda cada 5 segundos.
- La lista de precios y el pedido web están en `/lista` (sin login). Cada producto muestra una
  ilustración genérica según su tipo (`apps/web/src/components/ProductIcon.tsx`).
- **Descuento por bulto cerrado:** se carga como otro producto, con la presentación y el precio del
  bulto y el mismo código con una B al final (ej. `BOL-001B`).

Fuera de las 24 h desde el último mensaje del cliente, WhatsApp no deja mandar texto libre. Esos
avisos quedan como *Falló* en el pedido, con el motivo. Para cubrirlos hay que sumar plantillas
aprobadas por Meta.

Para probar sin Meta: `pnpm --filter @papelera/api bot:simulate` simula una conversación completa
contra la base local y muestra lo que respondería el bot.

Variables: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`,
`WHATSAPP_APP_SECRET` (ver `apps/api/.env.example`). Sin ellas el bot queda apagado.

### Número real (coexistencia)

En *Ajustes → WhatsApp* del panel está el botón **Conectar WhatsApp de la papelera**. Abre el
Embedded Signup de Meta en modo coexistencia: el número sigue funcionando en la app WhatsApp
Business del celular y además lo atiende el bot. El servidor canjea el código por un token
permanente (se guarda cifrado en `whatsapp_connection`), suscribe la app a la cuenta y pide la
sincronización de contactos e historial. Desde ese momento el bot usa ese número en lugar de las
variables `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID`.

Requisitos en Meta: ser Tech Provider (verificación del negocio + revisión de la app con
`whatsapp_business_messaging` y `whatsapp_business_management`), una configuración de Facebook
Login for Business para Embedded Signup (`META_CONFIG_ID`), la app en modo Live y suscribirse a los
campos de webhook `messages`, `smb_message_echoes`, `history` y `smb_app_state_sync`.

- Si el dueño responde a mano desde la app, el bot se calla en ese chat durante
  `WHATSAPP_HUMAN_PAUSE_MINUTES` (4 h por defecto). Si el cliente escribe MENU, vuelve.
- Hay que abrir WhatsApp Business en el celular al menos una vez cada 14 días o Meta corta la conexión.
- Páginas públicas que pide Meta: `/privacidad` y `/eliminar-datos`. El cliente puede escribir
  `BORRAR MIS DATOS` y el bot borra su nombre, dirección y conversación.
- `scripts/test-connection.ts` prueba la conexión y la pausa con la Graph API simulada.
