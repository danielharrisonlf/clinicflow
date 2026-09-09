# syntax=docker/dockerfile:1.18-labs
# -------- Production Builder --------
FROM node:22-alpine AS builder

RUN corepack enable pnpm && corepack install -g pnpm@10.11.1

WORKDIR /app

# Copy manifests
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/
COPY packages/config/package.json packages/config/

# Install workspace deps
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/api apps/api
COPY packages packages

# Prisma Client é gerado a partir do schema; sem isto o build do Nest
# não encontra os tipos de @prisma/client.
RUN pnpm --filter api db:generate

# Build packages and API
RUN pnpm turbo build --filter=api

# Prune to runtime-only
RUN pnpm -F api deploy --prod /out

# O engine e o client gerados não sobrevivem ao deploy --prod: são copiados
# do estágio de build para o pacote enxuto.
RUN cp -r /app/node_modules/.pnpm/@prisma+client*/node_modules/.prisma /out/node_modules/.prisma || true
RUN cp -r /app/apps/api/prisma /out/prisma

# -------- Production --------
FROM node:22-alpine AS prod

WORKDIR /app

# dumb-init como PID 1: sem ele, o SIGTERM do orquestrador não chega ao Node
# e o contêiner morre por timeout, cortando requisições em andamento e
# deixando conexões do Prisma penduradas.
RUN apk add --no-cache curl dumb-init

COPY --from=builder /out ./

# Nunca como root.
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:3000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]

# `migrate deploy` (nunca `migrate dev`) aplica as migrations pendentes e sai;
# só então o servidor sobe.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]

# -------- Dev (with hot reload) --------
FROM node:22-alpine AS dev

RUN apk add --no-cache curl

RUN corepack enable pnpm && corepack install -g pnpm@10.11.1

WORKDIR /app

CMD ["pnpm", "turbo", "start:dev", "--filter=api"]
