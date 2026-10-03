-- CreateEnum
CREATE TYPE "ShippingStatus" AS ENUM ('PENDIENTE', 'GRATIS', 'CON_COSTO', 'FUERA_ZONA');

-- AlterEnum
ALTER TYPE "ItemStatus" ADD VALUE 'PARCIAL' BEFORE 'FALTANTE';

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN "availableQuantity" INTEGER;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "shippingCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "shippingStatus" "ShippingStatus";

-- AlterTable
ALTER TABLE "settings" ADD COLUMN "minOrderForDelivery" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Los pedidos con envío que todavía no se revisaron quedan con el envío pendiente de definir
UPDATE "orders" SET "shippingStatus" = 'PENDIENTE' WHERE "deliveryMethod" = 'ENVIO' AND "status" = 'PENDIENTE_REVISION';
