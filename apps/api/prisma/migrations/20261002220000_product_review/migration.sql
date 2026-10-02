-- Precio de transferencia fijo (cuando no sale de sumar IVA) y marca de revisión
ALTER TABLE "products" ADD COLUMN "priceTransfer" DECIMAL(12,2),
ADD COLUMN "needsReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "reviewNote" TEXT;

CREATE INDEX "products_needsReview_idx" ON "products"("needsReview");
