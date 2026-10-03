-- AlterTable
ALTER TABLE "bot_sessions" ADD COLUMN "pausedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "whatsapp_connection" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "wabaId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "displayPhone" TEXT,
    "verifiedName" TEXT,
    "tokenEnc" TEXT NOT NULL,
    "coexistence" BOOLEAN NOT NULL DEFAULT true,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_connection_pkey" PRIMARY KEY ("id")
);
