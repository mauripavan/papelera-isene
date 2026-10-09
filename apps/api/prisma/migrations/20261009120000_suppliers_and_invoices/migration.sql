-- Proveedores (listas de faltantes) y ventas pendientes de facturar

CREATE TYPE "PurchaseOrderStatus" AS ENUM ('PENDIENTE', 'PEDIDO', 'RECIBIDO');

CREATE TYPE "InvoiceSaleStatus" AS ENUM ('PENDIENTE', 'FACTURADA');

CREATE TABLE "suppliers" (
    "id" SERIAL NOT NULL,
    "legalName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "contactName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_orders" (
    "id" SERIAL NOT NULL,
    "supplierId" INTEGER,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'PENDIENTE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_order_items" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "productId" INTEGER,
    "productCode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'unidad',
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invoice_sales" (
    "id" SERIAL NOT NULL,
    "status" "InvoiceSaleStatus" NOT NULL DEFAULT 'PENDIENTE',
    "customerName" TEXT,
    "customerCuit" TEXT,
    "note" TEXT,
    "total" DECIMAL(12,2) NOT NULL,
    "invoicedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_sales_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invoice_sale_items" (
    "id" SERIAL NOT NULL,
    "saleId" INTEGER NOT NULL,
    "productId" INTEGER,
    "productCode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'unidad',
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "invoice_sale_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "purchase_orders_supplierId_idx" ON "purchase_orders"("supplierId");

CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

CREATE INDEX "purchase_order_items_orderId_idx" ON "purchase_order_items"("orderId");

CREATE INDEX "invoice_sales_status_createdAt_idx" ON "invoice_sales"("status", "createdAt");

CREATE INDEX "invoice_sale_items_saleId_idx" ON "invoice_sale_items"("saleId");

ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoice_sale_items" ADD CONSTRAINT "invoice_sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "invoice_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invoice_sale_items" ADD CONSTRAINT "invoice_sale_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
