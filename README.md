# ClinicFlow AI — Monorepo

Plataforma moderna para organização da operação de pequenas e médias clínicas: do agendamento ao retorno.

## 📁 Estrutura do Monorepo

```text
.
├── apps/
│   ├── api/                  # Backend NestJS 11 (TypeScript, REST API, Jest)
│   └── web/                  # Frontend React 19 + Vite + Tailwind v4 + Playwright
├── packages/
│   └── config/               # Configurações compartilhadas (Biome, TypeScript, Jest)
├── docs/
│   ├── CLINICFLOW-CONTEXTO.md# Especificação de arquitetura e produto
│   └── GIT_FLOW.md           # Modelo de branches (main, qa, dev, pkg/*) e releases
├── docker-compose.yaml       # Infra local (PostgreSQL 16, Redis 7, API e Web)
├── turbo.json                # Pipelines de build e automação com Turborepo
├── pnpm-workspace.yaml       # Configuração de workspaces e catálogos do pnpm
└── biome.json                # Linter e formatador unificado de alto desempenho
```

---

## 🚀 Como Iniciar

### Pré-requisitos
- **Node.js**: >= 22.0.0
- **pnpm**: >= 10.0.0
- **Docker & Docker Compose** (para PostgreSQL e Redis)

### 1. Instalar Dependências
```bash
pnpm install
```

### 2. Subir Banco de Dados e Redis
```bash
docker compose up -d postgres redis

# Opcional: armazenamento S3-compatível para testar o upload com STORAGE_DRIVER=s3.
# Sem ele, o driver `local` (padrão) grava em disco e assina as próprias URLs.
docker compose up -d minio
```

### 3. Preparar o Banco
```bash
cp apps/api/.env.example apps/api/.env

pnpm --filter api db:generate    # gera o Prisma Client
pnpm --filter api db:migrate     # aplica as migrations
pnpm --filter api db:seed        # popula o dia desenhado nas telas do Penpot
```

O seed cria os acessos de demonstração (senha `clinicflow123`):

| Perfil | E-mail |
| :--- | :--- |
| Recepção | `renata.souza@clinicaviver.com.br` |
| Gestão | `gestao@clinicaviver.com.br` |

### 4. Executar em Modo de Desenvolvimento
```bash
# Executa todos os serviços (API e Web) em paralelo com hot-reload via Turborepo
pnpm start:dev

# Ou executar um app individualmente:
pnpm --filter api start:dev  # NestJS API em http://localhost:3000/api/v1
pnpm --filter web dev        # React Vite Web em http://localhost:5173
```

A documentação interativa da API fica em **http://localhost:3000/docs**, com as tags
numeradas conforme as telas do Penpot.

---

## 🛠️ Scripts Principais (Turborepo)

| Comando | Descrição |
| :--- | :--- |
| `pnpm build` | Compila os packages, frontend (Vite) e backend (NestJS) |
| `pnpm start:dev` | Inicia tanto a API quanto a Web em modo de desenvolvimento |
| `pnpm lint` | Executa o linter via Biome em todo o monorepo |
| `pnpm lint:fix` | Corrige problemas automáticos de lint |
| `pnpm format` | Verifica a formatação do código |
| `pnpm format:fix` | Aplica a formatação do código com Biome |
| `pnpm check` | Valida formatação, linter e organização de imports |
| `pnpm check:fix` | Autocorrige formatação e linter em todos os apps |
| `pnpm test` | Executa os testes unitários (Jest na API, Vitest na Web) |
| `pnpm test:e2e` | Executa os testes de ponta a ponta (Supertest na API, Playwright na Web) |

### Banco de dados (`apps/api`)

| Comando | Descrição |
| :--- | :--- |
| `pnpm --filter api db:generate` | Gera o Prisma Client a partir do schema |
| `pnpm --filter api db:migrate` | Aplica as migrations pendentes (`migrate deploy`) |
| `pnpm --filter api db:migrate:dev` | Cria uma migration a partir de alterações no schema |
| `pnpm --filter api db:seed` | Popula a Clínica Viver com o dia desenhado nas telas |
| `pnpm --filter api db:studio` | Abre o Prisma Studio |
| `pnpm --filter api db:reset` | Recria o banco do zero e roda o seed |

> Os testes E2E (`pnpm --filter api test:e2e`) exigem o Postgres no ar, com migrations
> e seed aplicados. Os testes unitários rodam sem infraestrutura nenhuma.

---

## 🧭 Arquitetura da API

Camadas padrão do NestJS: **Controller** (transporte HTTP e DTOs) → **Service**
(regra de negócio e transações) → **Prisma** (acesso a dados). Fora dos módulos de
domínio existem duas camadas transversais:

- `src/common/` — configuração por ambiente, DTOs de paginação (offset e cursor),
  filtro global de exceções com códigos de erro estáveis, guards de autenticação e perfil.
- `src/shared/` — Prisma, relógio injetável, cliente HTTP de saída, auditoria, eventos de
  domínio e o módulo global de upload (drivers `local` e `s3` atrás da mesma interface).

O planejamento completo, tela a tela e rota a rota, está em [`plan.md`](./plan.md).

---

## 📦 Stack e Tecnologias

- **Backend (`apps/api`):** NestJS 11, TypeScript, Prisma 6 + PostgreSQL 16, JWT, Swagger, Jest, Supertest.
- **Frontend (`apps/web`):** React 19, Vite, Tailwind CSS v4, Lucide React, Vitest, Testing Library, Playwright.
- **Shared Config (`packages/config`):** Configurações centralizadas de TSConfig, Jest e Biome com build em `tsup`.
- **Orquestração & Cache:** Turborepo 2 + pnpm Catalogs.
- **Qualidade de Código:** Biome 2.5 (execuções completas de lint/check em milissegundos).

---

## 🌿 Git Flow & Estrutura de Branches

O projeto segue um Git Flow estruturado por módulos e pacotes de release:
- `pkg/<modulo>`: Branches de implementação modular com commits semânticos atômicos.
- `dev`: Branch de integração contínua (recebe os merges de cada `pkg/*`).
- `qa`: Branch de validação e testes de homologação.
- `main`: Branch de produção protegida (recebe releases validadas de `qa` com versionamento semântico).

Consulte o documento detalhado com diagramas e boas práticas em [`docs/GIT_FLOW.md`](./docs/GIT_FLOW.md).
