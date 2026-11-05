# ClinicFlow

Sistema monorepo para gestao operacional de clinicas medicas, integrando agendamento multiprofissional, recepcao, sala de espera com painel de chamada, prontuario de pacientes, gestao de documentos e automacao de tarefas de retorno.

Repositorio publico: https://github.com/danielharrisonlf/clinicflow

## Stack tecnologica

| Camada | Tecnologias |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query |
| Backend | NestJS 11, TypeScript, Prisma 6, PostgreSQL 16 |
| Servicos auxiliares | Redis 7 (filas e cache), MinIO (armazenamento de arquivos compativel com S3) |
| Testes | Jest, Supertest, Vitest, Testing Library e Playwright |
| Ferramentas e Monorepo | Turborepo, pnpm workspaces, Biome |

## Estrutura do monorepo

```text
.
|-- apps/
|   |-- api/                  # Backend NestJS 11, Prisma ORM, migrations e suites de teste
|   `-- web/                  # Frontend React 19 SPA, Tailwind CSS v4 e testes E2E
|-- packages/
|   `-- config/               # Configuracoes compartilhadas de TypeScript, Biome e Jest
|-- docs/
|   |-- CLINICFLOW-CONTEXTO.md# Especificacao de regras de negocio e dominios clinicos
|   `-- GIT_FLOW.md           # Modelo de branches (main, qa, dev, pkg/*) e politicas de release
|-- docker-compose.yaml       # Servicos locais conteinerizados (PostgreSQL, Redis e MinIO)
|-- turbo.json                # Pipeline de tarefas do Turborepo
|-- pnpm-workspace.yaml       # Declaracao dos workspaces do pnpm
`-- biome.json                # Padroes de lint e formatacao de codigo
```

## Pre-requisitos do ambiente

- Node.js >= 22.0.0
- pnpm >= 10.0.0
- Docker e Docker Compose

## Instalacao e configuracao local

### 1. Clonar o repositorio

```bash
git clone https://github.com/danielharrisonlf/clinicflow.git
cd clinicflow
```

### 2. Instalar as dependencias

```bash
pnpm install
```

### 3. Subir os servicos auxiliares via Docker

Inicie os containers do PostgreSQL e do Redis em segundo plano:

```bash
docker compose up -d postgres redis
```

Opcional: Caso deseje validar o armazenamento de arquivos com driver S3 localmente, suba tambem o MinIO:

```bash
docker compose up -d minio
```

### 4. Configurar variaveis de ambiente

Copie os arquivos de exemplo para os respectivos ambientes de execucao:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Por padrao, o arquivo `apps/api/.env.example` vem pre-configurado para conectar no PostgreSQL local (`localhost:5432`), utilizar o driver de armazenamento local em disco (`STORAGE_DRIVER=local`) e o servico de notificacoes em modo de simulacao (`WHATSAPP_TRANSPORT=log`), o que dispensa credenciais externas para o funcionamento completo do sistema.

## Banco de dados e seed

A aplicacao utiliza o Prisma ORM integrado ao PostgreSQL. Siga a ordem abaixo para preparar o schema e carregar os dados de demonstracao:

```bash
# 1. Gerar os artefatos do Prisma Client
pnpm --filter api db:generate

# 2. Executar as migracoes estruturais no PostgreSQL
pnpm --filter api db:migrate

# 3. Popular o banco com a massa de dados inicial (seed)
pnpm --filter api db:seed
```

Se precisar resetar o banco de dados e recriar toda a massa de dados do zero:

```bash
pnpm --filter api db:reset
```

Para inspecionar o banco de dados via interface grafica do Prisma Studio:

```bash
pnpm --filter api db:studio
```

### Credenciais de acesso dos usuarios semeados

O seed cria usuarios com diferentes niveis de acesso na Clinica Viver. Todos compartilham a mesma senha padrao de desenvolvimento:

Senha padrao: `clinicflow123`

| Perfil | Nome | E-mail | Escopo de acesso |
|---|---|---|---|
| Recepcao | Renata Souza | `renata.souza@clinicaviver.com.br` | Operacao de agenda, agendamento de consultas, realizacao de check-in, triagem e gestao da sala de espera. |
| Gestao | Marta Vasconcelos | `gestao@clinicaviver.com.br` | Visao executiva da clinica, relatorios operacionais, configuracao de parametros do sistema e auditoria. |
| Profissional | Dra. Helena Prado | `helena.prado@clinicaviver.com.br` | Medica de Clinica Geral (CRM 142.890). Acesso a prontuarios, atendimento da fila e anexacao de documentos. |
| Profissional | Dr. Rafael Antunes | `rafael.antunes@clinicaviver.com.br` | Medico Cardiologista (CRM 119.450). Acesso a prontuarios, atendimento da fila e anexacao de documentos. |

### Dados populados pelo seed

A execucao do comando `pnpm --filter api db:seed` popula o banco com:

1. Clinica: Clinica Viver, com fuso horario configurado para `America/Sao_Paulo`.
2. Profissionais de saude: 5 profissionais cadastrados com conselhos de classe (CRM e CRN) e grades de atendimento semanais configuradas:
   - Dra. Helena Prado (Clinica Geral)
   - Dr. Rafael Antunes (Cardiologia)
   - Dra. Camila Sousa (Dermatologia)
   - Dr. Bruno Almeida (Ortopedia)
   - Dra. Marina Reis (Nutricao Clinica)
3. Pacientes: 24 pacientes com dados cadastrais completos, telefones de contato, datas de nascimento e anotacoes clinicas (incluindo alertas de alergias).
4. Consultas do dia atual: Consultas distribuidas em todas as etapas do ciclo de vida:
   - Agendadas (aguardando confirmacao de presenca)
   - Confirmadas (simulacao de confirmacao por WhatsApp)
   - Com check-in realizado (pacientes aguardando na sala de espera com contagem de tempo em tempo real)
   - Em atendimento (pacientes em consulta com o medico)
   - Concluidas (consultas finalizadas com horario de encerramento)
   - Canceladas (com motivo de cancelamento registrado)
5. Consultas futuras: Agendamentos distribuidos ao longo da semana para demonstracao da navegacao da agenda.
6. Auditoria de eventos: Historico de transicoes de estado de cada consulta com registro do autor da alteracao e canal utilizado (Web ou WhatsApp).
7. Documentos clinicos: Exames laboratoriais, encaminhamentos e exames de imagem associados a pacientes e consultas.
8. Tarefas e follow-ups: Tarefas de resgate de faltas (no-show), retornos medicos a agendar e confirmacoes pendentes no funil operacional da recepcao.

## Execucao da aplicacao

### Executar frontend e backend simultaneamente

```bash
pnpm start:dev
```

### Executar servicos individualmente

Em terminais separados:

```bash
# Terminal 1 - Backend NestJS
pnpm --filter api start:dev

# Terminal 2 - Frontend React
pnpm --filter web dev
```

### Enderecos locais

| Servico | URL | Finalidade |
|---|---|---|
| Frontend Web | `http://localhost:5173` | Interface grafica do sistema |
| API Backend | `http://localhost:3000/api/v1` | Endpoints REST da aplicacao |
| Swagger OpenAPI | `http://localhost:3000/docs` | Documentacao interativa e teste dos endpoints |

## Fluxo de navegacao recomendado para teste

1. Acesse `http://localhost:5173` e faca login com a conta de recepcao (`renata.souza@clinicaviver.com.br` / `clinicflow123`).
2. Visualize o painel operacional com o resumo das consultas do dia e pendencias de retorno.
3. Acesse a agenda medica e observe a distribuicao dos horarios dos profissionais.
4. Tente agendar uma consulta em um horario ja ocupado para testar a validacao de conflito de agenda no backend.
5. Na listagem de consultas do dia, realize o check-in de um paciente e acesse a tela de sala de espera para acompanhar a fila.
6. Realize o logout e entre com o perfil de um profissional de saude (`helena.prado@clinicaviver.com.br` / `clinicflow123`) para iniciar e concluir o atendimento.

## Testes e qualidade de codigo

### Validacao de tipos e formatacao

```bash
# Analise estatica, formatacao e organizacao de imports em todo o monorepo
pnpm check

# Correcao automatica de problemas de formatacao e lint
pnpm check:fix
```

### Testes unitarios

```bash
# Executa testes unitarios de todos os pacotes
pnpm test

# Testes unitarios especificos do backend (Jest)
pnpm --filter api test

# Testes unitarios especificos do frontend (Vitest)
pnpm --filter web test
```

### Testes ponta a ponta (E2E)

```bash
# Testes E2E da API (exige container PostgreSQL ativo)
pnpm --filter api test:e2e

# Testes E2E do frontend via Playwright
pnpm --filter web exec playwright install chromium
pnpm --filter web test:e2e
```

### Build de producao

```bash
pnpm build
```

## Arquitetura do backend

A API segue principios de Clean Architecture e separacao estrita de responsabilidades:

- `src/modules/`: Modulos de dominio isolados (appointments, auth, dashboard, documents, health, jobs, notifications, patients, professionals, search, settings, tasks, users, waiting-room). Cada modulo contem seus controllers, services, DTOs de validacao com class-validator e interfaces.
- `src/common/`: Componentes transversais reutilizaveis, incluindo filtros globais de excecao para padronizacao de erros HTTP, guards de autenticacao JWT e controle de acesso baseado em roles (RBAC), interceptors e pipes de validacao.
- `src/shared/`: Adaptadores de infraestrutura desacoplados, tais como cliente Prisma, servico de relogio com suporte a timezone clinico, cliente HTTP com retry e adaptadores de armazenamento (disco local e S3 via MinIO/AWS).

## Modelo de Git Flow e commits semanticos

O repositorio segue o padrao Git Flow documentado em [`docs/GIT_FLOW.md`](./docs/GIT_FLOW.md):

- `pkg/<modulo>`: Branches de desenvolvimento por modulo ou funcionalidade com commits semanticos atomicos no formato Conventional Commits.
- `dev`: Branch de integracao continua onde as branches de pacotes sao mescladas com `--no-ff`.
- `qa`: Branch de homologacao para validacao de testes integrados e regressao.
- `main`: Branch de producao estavel associada a tags de versao semantica (ex: `v0.1.0`).

### Branches de modulos no repositorio

O historico do projeto esta estruturado nas seguintes branches por modulo:

- `pkg/infra-foundation`: Configuracao do monorepo, Turborepo, pnpm e pacotes de configuracao compartilhados.
- `pkg/database-schema`: Schema Prisma, migracoes, modelo relacional e rotina de seed.
- `pkg/shared-kernel`: Kernel compartilhado, utilitarios de data/hora da clinica e adapters de armazenamento.
- `pkg/auth-users`: Modulos de autenticacao JWT, refresh tokens e gestao de usuarios com RBAC.
- `pkg/professionals`: Modulo de profissionais, conselhos de classe e grades de atendimento semanais.
- `pkg/patients`: Modulo de pacientes, busca rapida e exportacao CSV.
- `pkg/appointments`: Modulo de agendamento, maquina de estados de consulta e deteccao de conflitos.
- `pkg/waiting-room`: Fila de recepcao, eventos Server-Sent Events (SSE) e painel de chamada.
- `pkg/documents`: Gestao de documentos clinicos com presigned URLs e upload seguro.
- `pkg/tasks`: Funil de pendencias operacionais, follow-up e resgate de no-show.
- `pkg/dashboard-search`: Metricas operacionais, busca global (command palette) e configuracoes da clinica.
- `pkg/notifications-jobs-health`: Integracao com WhatsApp (simulado/HTTP), rotinas cron de disparo e healthchecks.
- `pkg/frontend-core`: Estrutura base do frontend, tokens de design, layout e componentes reutilizaveis.
- `pkg/frontend-features`: Implementacao das telas de autenticacao, dashboard, agenda, pacientes e fila.
- `pkg/docs-and-ci`: Documentacao tecnica, guia de Git Flow e workflows de integracao continua.
- `pkg/repo-normalization`: Normalizacao de quebras de linha e regras de consistencia do Biome.
