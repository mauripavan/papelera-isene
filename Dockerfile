# Imagen única: API + panel compilado. La usa Railway.
FROM node:22-slim

# OpenSSL lo necesita el motor de migraciones de Prisma
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable

WORKDIR /app

# Primero solo los manifiestos, para aprovechar la caché de dependencias
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY apps/api/prisma apps/api/prisma
COPY apps/api/prisma.config.ts apps/api/
# El postinstall corre prisma generate, que no necesita una base real
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" pnpm install --frozen-lockfile

COPY . .
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" pnpm --filter @papelera/api db:generate \
  && pnpm --filter @papelera/web build

ENV NODE_ENV=production
WORKDIR /app/apps/api
CMD ["node", "scripts/start-prod.mjs"]
