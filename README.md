# ClinicFlow

Monorepo para gestao operacional de clinicas medicas, cobrindo agendamento, recepcao, sala de espera, prontuario e tarefas de retorno.

## Estrutura do projeto

```text
.
├── apps/
│   ├── api/                  # Backend NestJS 11 (TypeScript, Prisma, Jest)
│   └── web/                  # Frontend React 19 (Vite, Tailwind, Playwright)
├── packages/
│   └── config/               # Configuracoes compartilhadas de TypeScript, Biome e Jest
├── docs/
│   ├── CLINICFLOW-CONTEXTO.md# Contexto e regras de negocio
│   └── GIT_FLOW.md           # Modelo de branches (main, qa, dev, pkg/*) e releases
├── docker-compose.yaml       # Servicos locais (PostgreSQL 16, Redis 7 e MinIO)
├── turbo.json                # Configuracao de tarefas com Turborepo
├── pnpm-workspace.yaml       # Workspaces do pnpm
└── biome.json                # Linter e formatador de codigo
```

## Como rodar o ambiente local

### Pre-requisitos

- Node.js >= 22.0.0
- pnpm >= 10.0.0
- Docker e Docker Compose

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Subir o banco de dados e servicos auxiliares

```bash
docker compose up -d postgres redis

# Opcional: MinIO para validar armazenamento S3
docker compose up -d minio
```

### 3. Configurar variaveis e banco de dados

```bash
cp apps/api/.env.example apps/api/.env

pnpm --filter api db:generate    # gera o cliente Prisma
pnpm --filter api db:migrate     # roda as migrations no banco local
pnpm --filter api db:seed        # insere os dados iniciais de demonstracao
```

Credenciais criadas no seed (senha padrao: `clinicflow123`):

| Perfil | E-mail |
| :--- | :--- |
| Recepcao | `renata.souza@clinicaviver.com.br` |
| Gestao | `gestao@clinicaviver.com.br` |

### 4. Iniciar os aplicativos

```bash
# Executa API e Web simultaneamente em modo de desenvolvimento
pnpm start:dev

# Ou executar apenas um deles:
pnpm --filter api start:dev  # API NestJS em http://localhost:3000/api/v1
pnpm --filter web dev        # Frontend React em http://localhost:5173
```

A documentacao interativa Swagger fica disponivel em `http://localhost:3000/docs`.

## Scripts do Turborepo

| Comando | Descricao |
| :--- | :--- |
| `pnpm build` | Compila os pacotes e gera os builds de producao |
| `pnpm start:dev` | Inicia API e Web em modo watch |
| `pnpm lint` | Analisa o codigo com o Biome |
| `pnpm lint:fix` | Corrige problemas automaticos de lint |
| `pnpm format` | Valida a formatacao de arquivos |
| `pnpm format:fix` | Aplica a formatacao padrao com o Biome |
| `pnpm check` | Executa lint, formatacao e organizacao de imports |
| `pnpm check:fix` | Corrige formatacao e linter nos apps |
| `pnpm test` | Roda a suite de testes unitarios |
| `pnpm test:e2e` | Roda os testes ponta a ponta |

### Banco de dados (apps/api)

| Comando | Descricao |
| :--- | :--- |
| `pnpm --filter api db:generate` | Gera o cliente Prisma |
| `pnpm --filter api db:migrate` | Executa migrations pendentes |
| `pnpm --filter api db:migrate:dev` | Cria uma nova migration |
| `pnpm --filter api db:seed` | Popula o banco com os dados da Clinica Viver |
| `pnpm --filter api db:studio` | Abre o painel visual do Prisma Studio |
| `pnpm --filter api db:reset` | Recria o banco do zero e executa o seed |

Os testes de integracao e E2E da API (`pnpm --filter api test:e2e`) precisam do container Postgres em execucao. Os testes unitarios rodam direto em memoria, sem servicos externos.

## Arquitetura da API

Camadas da aplicacao:
- Controllers: recebem requisicoes HTTP, validam DTOs e controlam resposta.
- Services: concentram regras de negocio, transacoes e validacoes de dominio.
- Prisma: persistencia e queries no PostgreSQL.

Pastas compartilhadas da API:
- `src/common/`: filtros globais de excecao, guards de autenticacao JWT e perfis de acesso, validadores e DTOs de paginacao.
- `src/shared/`: modulo Prisma, servico de horario injetavel, cliente HTTP com retry e adapter de armazenamento (filesystem local ou S3).

## Stack e tecnologias

- Backend: NestJS 11, TypeScript, Prisma 6, PostgreSQL 16, JWT, Swagger, Jest e Supertest.
- Frontend: React 19, Vite, Tailwind CSS v4, Lucide React, Vitest, Testing Library e Playwright.
- Configuracao: presets compartilhados de TypeScript, Jest e Biome em `packages/config`.
- Build e monorepo: Turborepo e pnpm workspaces.
- Qualidade de codigo: Biome.

## Git Flow

O fluxo de trabalho no repositorio e organizado por modulos:
- `pkg/<modulo>`: branches para desenvolvimento de cada pacote ou funcionalidade, com commits semanticos.
- `dev`: branch de integracao continua onde os pacotes sao mesclados.
- `qa`: branch de homologacao e testes antes da liberacao.
- `main`: branch de producao estavel com tags de release semantica.

O guia com o diagrama do fluxo e o checklist antes do merge esta em [`docs/GIT_FLOW.md`](./docs/GIT_FLOW.md).