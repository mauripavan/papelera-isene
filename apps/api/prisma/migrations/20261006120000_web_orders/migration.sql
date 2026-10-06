-- Pedidos desde la web
CREATE TYPE "OrderSource" AS ENUM ('WHATSAPP', 'WEB');

ALTER TABLE "orders"
  ADD COLUMN "source" "OrderSource" NOT NULL DEFAULT 'WHATSAPP',
  ADD COLUMN "contactName" TEXT,
  ADD COLUMN "webCode" TEXT,
  ADD COLUMN "waConfirmedAt" TIMESTAMP(3);
