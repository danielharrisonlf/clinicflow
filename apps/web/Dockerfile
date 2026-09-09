# -------- Production Builder --------
FROM node:22-alpine AS builder

RUN corepack enable pnpm && corepack install -g pnpm@10.11.1

WORKDIR /app

# Copy manifests
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/
COPY packages/config/package.json packages/config/

# Install workspace deps
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/web apps/web
COPY packages packages

# Build packages and Web
RUN pnpm turbo build --filter=web

# -------- Production (Nginx) --------
FROM nginx:alpine AS prod

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# -------- Dev --------
FROM node:22-alpine AS dev

RUN apk add --no-cache curl

RUN corepack enable pnpm && corepack install -g pnpm@10.11.1

WORKDIR /app

EXPOSE 5173

CMD ["pnpm", "turbo", "start:dev", "--filter=web"]
