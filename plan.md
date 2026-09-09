# ClinicFlow AI — Plano de Backend (API NestJS)

> Derivado das **34 pranchetas do Penpot** (`Page 1`), de `docs/CLINICFLOW-CONTEXTO.md` e `DESIGN.md`.
> Alinhado às skills instaladas: `nestjs-architecture`, `nestjs-pagination`, `database-schema-migrations`,
> `nestjs-testing-suite`, `docker-nestjs-turborepo`.
> Padrões modernos herdados da API de referência em `Documents/app/api` (Prisma + guard global,
> `config` sem `@nestjs/config`, filtro de exceção padronizado, upload por URL assinada, Swagger no boot).

**Status: implementado.** As 13 fases da seção 10 foram executadas — 79 rotas mapeadas,
46 testes unitários verdes, build e lint limpos. Este documento continua sendo o mapa;
a seção 12 registra onde a implementação divergiu do plano original e por quê.

---

## 1. Método: das telas para as rotas

Cada prancheta foi lida via MCP do Penpot e decomposta em (a) **dados que a tela lê**,
(b) **ações que a tela dispara**, (c) **estados que a tela precisa representar**.
Toda rota abaixo existe porque uma tela concreta a consome — não há endpoint especulativo.

| # | Prancheta | Superfície | Módulo dono |
|---|---|---|---|
| 01 | Login (+ Tablet, Mobile) | Autenticação | `auth` |
| 02 | Painel do dia (+ 1280, Tablet, Mobile) | Lista + métricas + ações de linha | `appointments`, `dashboard` |
| 03 | Agenda semanal (+ Tablet, Mobile) | Grade cronológica | `appointments` |
| 04 | Detalhe da consulta (+ Tablet, Mobile) | Drawer + auditoria + documentos | `appointments`, `audit`, `documents` |
| 05 | Nova consulta (+ Tablet, Mobile) | Formulário + conflito de horário | `appointments` |
| 06 | Reagendar | Painel lateral com motivo | `appointments` |
| 07 | Cancelar | Painel lateral com motivo obrigatório | `appointments` |
| 08 | Sala de espera (+ Tablet, Mobile) | Fila em tempo real + chamador de TV | `waiting-room` |
| 09 | Pacientes | Tabela paginada + busca | `patients` |
| 10 | Ficha do paciente | Abas: consultas, documentos, pendências | `patients` |
| 11 | Novo paciente | Cadastro | `patients` |
| 12 | Profissionais | Tabela do corpo clínico | `professionals` |
| 13 | Agenda do profissional | Grade + janelas de atendimento | `professionals` |
| 14 | Documentos | Repositório central + upload | `documents` |
| 15 | Pendências e retornos | Funil operacional | `tasks` |
| 16 | Configurações | Parâmetros + perfis + log de auditoria | `settings`, `users`, `audit` |
| 17 | Estados de sistema | Loading / empty / erro | contrato de erro + `health` |
| 18 | Paleta de comandos (⌘K) | Busca unificada + ações | `search` |

As variantes Tablet/Mobile **não geram rotas novas**: consomem os mesmos endpoints com
`limit` menor. A densidade (Padrão/Compacto) da tela 02 é puramente cliente.

---

## 2. Decisões de arquitetura

| Decisão | Escolha | Porquê |
|---|---|---|
| ORM | **Prisma 6** + PostgreSQL 16 | Já declarado em `docs/CLINICFLOW-CONTEXTO.md` e no `DATABASE_URL` do `.env.example`. A skill de paginação exemplifica com QueryBuilder do TypeORM; os **DTOs e o envelope são mantidos idênticos**, só a execução é traduzida para Prisma (`skip`/`take`/`findMany` + `count` dentro de `$transaction`). |
| Camadas | **Arquitetura em camadas padrão do Nest**: Controller magro → Service de domínio → Prisma | Decisão do time. Sem camada de repositório: o `PrismaService` já é o acesso a dados, e um repositório por entidade só acrescentaria um arquivo de repasse. Nenhuma query dentro de controller. |
| IDs | **UUID v7** (`uuidv7`) | Ordenável no tempo, índice B-tree sem fragmentação, seguro para expor. |
| Nomenclatura | `camelCase` no TS, `snake_case` no banco via `@map`/`@@map` | `database-schema-migrations`. |
| Erros | `AllExceptionsFilter` global com corpo padronizado | A tela 17 exige mensagem legível + ação de recuperação; o corpo carrega um `code` estável para o front escolher a saída. |
| Auth | JWT Bearer + `JwtAuthGuard` **global** com `@Public()` | Espelha a API de referência. Identidade vem do token, nunca do corpo/query do cliente. |
| Autorização | `RolesGuard` + `@Roles(Role.RECEPCAO, ...)` | Três perfis reais: `RECEPCAO`, `PROFISSIONAL`, `GESTOR` (tela 16). |
| Jobs | **`@nestjs/schedule`** (cron no próprio processo) | Três rotinas curtas e idempotentes: confirmações, expurgo de arquivos, fechamento do dia. Exigir Redis no boot só para isso impediria a API de subir onde o banco já basta. Quando o volume pedir retentativa e DLQ, cada método vira um `WorkerHost` do `@nestjs/bullmq` — nunca `@nestjs/bull` (legado). |
| Tempo real | **SSE** (`text/event-stream`) na sala de espera e no painel | Um consumidor por balcão + o painel de TV; WebSocket é peso desnecessário aqui. |
| Documentação | Swagger em `/docs`, DTOs anotados | Entrega da disciplina + contrato para o `apps/web`. |
| Fuso | Tudo em **UTC** no banco (`timestamptz`); `America/Sao_Paulo` só na borda | Evita que "a agenda de hoje" vire na troca de horário. |

---

## 3. Estrutura de pastas

```text
apps/api/src/
├── main.ts                       # helmet, CORS, ValidationPipe, filtro e interceptors globais, Swagger, shutdown hooks
├── app.module.ts
├── common/
│   ├── config.ts                 # env tipado + requiredInProd(); sem @nestjs/config
│   ├── constants/
│   │   ├── app.constants.ts
│   │   └── error-codes.ts        # catálogo de `code` estáveis consumidos pela tela 17
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   ├── public.decorator.ts
│   │   ├── roles.decorator.ts
│   │   └── api-paginated-response.decorator.ts   # Swagger genérico para PageDto<T>
│   ├── dto/
│   │   ├── page-options.dto.ts   # page, limit, order, orderBy, search
│   │   ├── page.dto.ts           # PageDto<T> + PageMetaDto
│   │   └── cursor-page.dto.ts    # CursorOptionsDto, CursorPageDto, CursorMetaDto
│   ├── exceptions/app.exception.ts   # erro de domínio com `code` estável
│   ├── filters/all-exceptions.filter.ts   # + Prisma: P2002 → 409, P2025 → 404, P2003 → 422
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── interfaces/authenticated-user.interface.ts
│   └── utils/
│       ├── cursor.serializer.ts
│       ├── paginate.util.ts      # paginate() e paginateByCursor()
│       ├── clinic-time.util.ts   # toda a aritmética de fuso da clínica
│       └── cpf.validator.ts      # @IsCpf() customizado
├── shared/
│   ├── prisma/                   # PrismaModule (@Global) + PrismaService
│   ├── shared.module.ts          # @Global(): Clock, HttpClient, Audit
│   ├── http-client/              # HttpClientService: fetch nativo + retry + timeout
│   ├── storage/                  # módulo de upload global (local + S3, URL assinada)
│   ├── events/domain-events.ts   # nomes e payloads dos eventos de domínio
│   ├── audit/                    # AuditService — trilha administrativa
│   └── clock/                    # ClockService injetável (testes determinísticos)
└── modules/
    ├── auth/  users/  patients/  professionals/  appointments/
    ├── waiting-room/  documents/  tasks/  settings/  dashboard/
    ├── search/  notifications/  jobs/  health/
```

Cada módulo: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/` e `*.spec.ts` colado
ao arquivo testado. Módulos com regra rica ganham arquivos auxiliares puros —
`appointment-status.machine.ts` (máquina de estados), `appointment.mapper.ts` (DTOs de saída),
`availability.service.ts` (leitura de agenda) —, sempre dentro da mesma camada de serviço.

---

## 4. Camada compartilhada (o que precisa existir antes de qualquer rota)

### 4.1 Paginação — offset (padrão)

`PageOptionsDto` / `PageMetaDto` / `PageDto<T>` exatamente como na skill, com dois acréscimos
exigidos pelas telas:

```ts
export class PageOptionsDto {
  @IsInt() @Min(1) @Type(() => Number) @IsOptional() readonly page: number = 1;
  @IsInt() @Min(1) @Max(100) @Type(() => Number) @IsOptional() readonly limit: number = 10;
  @IsEnum(Order) @IsOptional() readonly order: Order = Order.ASC;
  @IsString() @IsOptional() readonly orderBy?: string;   // whitelist por módulo
  @IsString() @MaxLength(120) @IsOptional() readonly search?: string;
  get skip(): number { return (this.page - 1) * this.limit; }
}
```

`meta` devolve `page, limit, itemCount, pageCount, hasPreviousPage, hasNextPage` —
é literalmente o rodapé desenhado: *"Mostrando 1–12 de 1.248 pacientes"* + `‹ 1 2 3 … 104 ›`.

Execução em Prisma dentro de um `PaginationService` genérico:

```ts
async paginate<T>(model, args, opts: PageOptionsDto): Promise<PageDto<T>> {
  const [items, itemCount] = await this.prisma.$transaction([
    model.findMany({ ...args, skip: opts.skip, take: opts.limit }),
    model.count({ where: args.where }),
  ]);
  return new PageDto(items, new PageMetaDto({ pageOptionsDto: opts, itemCount }));
}
```

**Tie-breaker obrigatório** em toda listagem: o `orderBy` sempre termina em `{ id: order }`.
Sem isso, dois registros com o mesmo `startsAt` trocam de lugar entre páginas e uma linha
some do painel do dia.

### 4.2 Paginação — cursor (histórico e auditoria)

Token opaco Base64URL (`CursorSerializer`), regra do `limit + 1`, seek composto
(`(createdAt, id) < (:createdAt, :id)`). Usado onde o volume cresce sem teto e ninguém
pula para "página 40":

- `GET /appointments/:id/audit` (tela 04, timeline do drawer)
- `GET /patients/:id/appointments` (tela 10, histórico)
- `GET /settings/audit-log` (tela 16, aba Log de Auditoria)

Envelope: `{ data, meta: { hasNextPage, nextCursor } }`.

### 4.3 Cliente HTTP global (`shared/http-client`)

Para chamadas **de saída** (provedor de WhatsApp, futura classificação de documento por IA).
Sem axios: `fetch` nativo do Node 22 encapsulado em serviço injetável e mockável.

```ts
@Injectable()
export class HttpClientService {
  async request<T>(opts: {
    url: string; method?: HttpMethod; body?: unknown;
    headers?: Record<string, string>; timeoutMs?: number; retries?: number;
  }): Promise<T>;
}
```

Regras: timeout padrão de 8 s via `AbortSignal.timeout`; 2 retentativas com backoff
exponencial **apenas** em `5xx`/erro de rede (nunca em `4xx`); log estruturado sem corpo
sensível; erro traduzido para `UpstreamServiceException` → 502 com `code: UPSTREAM_UNAVAILABLE`.

No front (`apps/web`), o par simétrico é um `apiClient` fino sobre `fetch` que lê o mesmo
envelope de erro — um contrato, dois lados. Se virar pacote, `packages/api-client` com os
tipos de resposta gerados do Swagger.

### 4.4 Módulo de upload global (`shared/storage`)

Serve a tela 14 (repositório), a 04 (documentos da consulta) e a 17 (falha por limite de
tamanho). Estratégia: **URL assinada** — os bytes nunca passam pelo processo Node, então um
PDF de 8 MB não ocupa um worker do Nest.

| Rota | Papel |
|---|---|
| `POST /uploads/sign` | Recebe `{ purpose, fileName, contentType, byteSize }`, valida MIME contra lista fechada e tamanho contra o teto, devolve `{ uploadUrl, objectKey, expiresIn }` |
| `POST /uploads/confirm` | Cliente avisa que o PUT terminou; a API confere o objeto no bucket (`HEAD`) e devolve o `objectKey` validado |
| `GET /uploads/:objectKey/url` | URL assinada de leitura (TTL longo, para não invalidar o cache de preview a cada request) |

Limite de **10 MB** e a mensagem da tela 17 (*"passa do limite de 10 MB. Comprima o arquivo
ou envie as páginas separadamente"*) vêm daqui, não do módulo de documentos.
Adapter S3-compatível por trás de uma interface `StorageAdapter`: MinIO em dev, S3/R2 em
produção, disco local como fallback para rodar sem cloud.

### 4.5 Interfaces globais

```ts
interface AuthenticatedUser { id: string; email: string; name: string; role: Role; professionalId?: string }
interface PaginatedResult<T> { data: T[]; meta: PageMeta }
interface AuditEntry { actorId: string | null; action: string; entity: string; entityId: string; channel: Channel; reason?: string; at: Date }
interface DomainEvent<T> { name: string; payload: T; occurredAt: Date }
interface StorageAdapter { sign(p: SignParams): Promise<SignedUpload>; head(key: string): Promise<ObjectMeta>; remove(key: string): Promise<void> }
```

### 4.6 Contrato de erro (alimenta a tela 17)

```json
{
  "statusCode": 409,
  "code": "APPOINTMENT_SLOT_CONFLICT",
  "message": "A Dra. Helena já tem consulta às 14:30.",
  "details": { "conflictingAppointmentId": "...", "patientName": "Bruno Almeida", "durationMinutes": 30 },
  "path": "/api/v1/appointments",
  "timestamp": "2026-09-11T12:30:00.000Z"
}
```

Catálogo inicial de `code`: `APPOINTMENT_SLOT_CONFLICT`, `INVALID_STATUS_TRANSITION`,
`CANCEL_REASON_REQUIRED`, `PATIENT_CPF_DUPLICATE`, `FILE_TOO_LARGE`, `UNSUPPORTED_MIME`,
`PROFESSIONAL_OUTSIDE_SCHEDULE`, `UNDO_WINDOW_EXPIRED`, `UPSTREAM_UNAVAILABLE`,
`RESOURCE_NOT_FOUND`.

---

## 5. Modelo de dados (Prisma)

```prisma
enum Role              { RECEPCAO PROFISSIONAL GESTOR }
enum AppointmentStatus { AGENDADA CONFIRMADA CHECK_IN EM_ATENDIMENTO CONCLUIDA CANCELADA REAGENDADA }
enum AppointmentType   { PRIMEIRA_CONSULTA CONSULTA RETORNO AVALIACAO }
enum CancelReason      { PACIENTE_DESMARCOU NO_SHOW INDISPONIBILIDADE_CLINICA OUTRO }
enum DocumentType      { EXAME_LABORATORIAL EXAME_IMAGEM ATESTADO ENCAMINHAMENTO LAUDO RECEITA OUTRO }
enum TaskType          { RETORNO_A_AGENDAR CONFIRMACAO_PENDENTE RESGATE_NO_SHOW ENVIO_DOCUMENTO AGUARDANDO_EXAME OUTRO }
enum TaskStatus        { ABERTA EM_ANDAMENTO RESOLVIDA CANCELADA }
enum Channel           { WEB WHATSAPP TELEFONE SISTEMA }

model Clinic          { id; name; timezone @default("America/Sao_Paulo"); settings ClinicSettings? }
model User            { id; email @unique; passwordHash; name; role Role; isActive @default(true); professional Professional? }
model Patient         { id; name; cpf String? @unique; birthDate DateTime?; phone; email String?; notes String?; deletedAt DateTime? }
model Professional    { id; userId String? @unique; name; specialty; councilType; councilNumber; defaultDurationMinutes Int @default(30); isActive @default(true) }
model ScheduleWindow  { id; professionalId; weekday Int; startTime String; endTime String; room String? }        // tela 13
model Appointment     { id; code Int @default(autoincrement()); patientId; professionalId; startsAt; endsAt;
                        type AppointmentType; status AppointmentStatus; room String?; notes String?;
                        confirmedAt?; checkedInAt?; startedAt?; completedAt?; cancelledAt?;
                        cancelReason CancelReason?; cancelNote String?; rescheduledFromId String? }
model AppointmentEvent{ id; appointmentId; fromStatus?; toStatus; actorId String?; channel Channel;
                        reason String?; createdAt }                                                              // tela 04
model Document        { id; patientId; appointmentId String?; objectKey @unique; fileName; mimeType;
                        byteSize Int; type DocumentType; source String?; uploadedById; createdAt }
model Task            { id; patientId; appointmentId String?; type TaskType; status TaskStatus; title;
                        dueAt DateTime?; assigneeId String?; resolvedAt DateTime?; resolvedById String? }
model ClinicSettings  { id; clinicId @unique; defaultDurationMinutes Int @default(30);
                        confirmationLeadHours Int @default(48); returnWindowDays Int @default(30);
                        lateToleranceMinutes Int @default(15) }                                                  // tela 16, 1:1 com os 4 campos
model AuditLog        { id; actorId String?; action; entity; entityId; channel Channel;
                        before Json?; after Json?; ip String?; createdAt }
model RefreshToken    { id; userId; tokenHash @unique; expiresAt; revokedAt DateTime? }
```

Toda tabela com `createdAt`/`updatedAt`. `Appointment.code` é o "Consulta #1042" do drawer.

**Índices que sustentam as telas** (`database-schema-migrations`):

```sql
CREATE INDEX idx_appt_day        ON appointments (starts_at, id);                       -- painel do dia / agenda
CREATE INDEX idx_appt_prof_day   ON appointments (professional_id, starts_at);          -- filtro por profissional, conflito
CREATE INDEX idx_appt_patient    ON appointments (patient_id, starts_at DESC);          -- ficha do paciente
CREATE INDEX idx_appt_waiting    ON appointments (checked_in_at) WHERE status = 'CHECK_IN';   -- parcial: sala de espera
CREATE INDEX idx_patient_name_tg ON patients USING gin (name gin_trgm_ops);             -- busca ILIKE das telas 09 e 18
CREATE INDEX idx_patient_phone   ON patients (phone);
CREATE INDEX idx_task_open       ON tasks (due_at) WHERE status IN ('ABERTA','EM_ANDAMENTO');
CREATE INDEX idx_doc_patient     ON documents (patient_id, created_at DESC);
CREATE INDEX idx_event_appt      ON appointment_events (appointment_id, created_at DESC, id DESC);  -- cursor da auditoria
```

Restrição anti-overbooking no próprio banco (validação de aplicação não basta sob concorrência
— duas recepcionistas podem clicar ao mesmo tempo):

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE appointments ADD CONSTRAINT no_overlap
  EXCLUDE USING gist (professional_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
  WHERE (status NOT IN ('CANCELADA','REAGENDADA'));
```

O encaixe forçado da tela 05 (*"Deseja encaixar mesmo assim?"*) usa a flag `allowOverbooking`,
que cria a consulta com `EXCLUDE` diferido e grava um `AppointmentEvent` com motivo —
encaixe continua possível, mas nunca é silencioso.

**Migrations:** Expand/Contract, nunca `DROP` na mesma release.
`CREATE INDEX CONCURRENTLY` fora de transação. `prisma migrate deploy` em produção.

---

## 6. Catálogo completo de rotas

Prefixo global: `/api/v1`. Todas exigem Bearer, exceto as marcadas `@Public()`.

### 6.1 `auth` — tela 01

| Método | Rota | Descrição | Notas |
|---|---|---|---|
| POST | `/auth/login` | `{ email, password }` → `{ accessToken, refreshToken, user }` | `@Public()`, throttle 5/min por IP |
| POST | `/auth/refresh` | Rotação de refresh token | `@Public()` |
| POST | `/auth/logout` | Revoga o refresh atual | |
| GET | `/auth/me` | Perfil da sessão | Alimenta "Renata Souza / Recepção" da barra lateral de todas as telas |

Senha com **argon2id**. A resposta de erro não revela se o e-mail existe.

### 6.2 `appointments` — telas 02, 02b, 03, 04, 05, 06, 07

| Método | Rota | Descrição | Paginação |
|---|---|---|---|
| GET | `/appointments` | Painel do dia. Filtros: `date`, `from`/`to`, `professionalId`, `status[]`, `type`, `patientId`, `search` | **Offset**, `limit` 10 (1440) / 8 (1280) |
| GET | `/appointments/calendar` | Grade semanal ou diária: `from`, `to`, `professionalId`, `groupBy=day\|professional` | Sem paginação; intervalo limitado a 31 dias |
| GET | `/appointments/:id` | Detalhe do drawer (paciente, telefone, tipo, duração, profissional) | |
| GET | `/appointments/:id/audit` | "Histórico e auditoria" do drawer | **Cursor** |
| GET | `/appointments/:id/documents` | "Documentos — 2 vinculados" | Offset, `limit` 20 |
| POST | `/appointments` | Criar. Body: `patientId, professionalId, date, time, durationMinutes, type, notes, allowOverbooking?` | 201 / 409 `APPOINTMENT_SLOT_CONFLICT` |
| POST | `/appointments/availability` | Checagem de conflito **antes** do submit (alerta inline da tela 05) | Idempotente, sem efeito colateral |
| GET | `/appointments/slots` | Horários livres: `professionalId`, `date`, `durationMinutes` | `ScheduleWindow` − ocupados |
| PATCH | `/appointments/:id/confirm` | AGENDADA → CONFIRMADA. Ação "Confirmar" da linha | |
| PATCH | `/appointments/:id/check-in` | → CHECK_IN, grava `checkedInAt`. Ação "Check-in" / `[C]` | Entra na sala de espera |
| PATCH | `/appointments/:id/start` | → EM_ATENDIMENTO. Ação "Iniciar" / `[I]` | |
| PATCH | `/appointments/:id/complete` | → CONCLUIDA. Ação "Concluir" | Emite `appointment.completed` → gera pendência de retorno |
| PATCH | `/appointments/:id/reschedule` | Tela 06. Body: `date, time, reason` (**obrigatório**) | Cria a nova consulta e marca a antiga como `REAGENDADA` |
| PATCH | `/appointments/:id/cancel` | Tela 07. Body: `reasonCode` (**obrigatório**), `note?` | Irreversível; sem retorno a AGENDADA |
| POST | `/appointments/:id/undo` | Desfaz a última transição (toast "Desfazer [Z]") | Janela de **30 s**, só o próprio ator; gera evento de compensação |
| PATCH | `/appointments/:id` | Edita observação operacional / sala | |

**Máquina de estados** isolada num `AppointmentStateMachine` puro (sem I/O, 100 % testável).
Transição inválida → 422 `INVALID_STATUS_TRANSITION`. Toda transição bem-sucedida grava
`AppointmentEvent` **na mesma transação** e emite evento de domínio.

`ATRASADA` **não é status persistido** — é derivada
(`status ∈ {AGENDADA, CONFIRMADA} && now > startsAt + lateToleranceMinutes`) e devolvida como
`derivedState` no DTO, junto de `waitingMinutes` e `lateMinutes`. São os "Atrasada 27min" e
"Aguardando 18min" da tela 02, calculados no servidor para o balcão e a TV mostrarem o mesmo número.

### 6.3 `dashboard` — tela 02 (faixa de métricas)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/dashboard/today` | Os seis contadores desenhados: agendadas, confirmadas, aguardando, em atendimento, concluídas, atrasadas. Filtros `date`, `professionalId` |
| GET | `/dashboard/stream` | **SSE**: reemite o resumo a cada mudança de status; substitui polling |

Uma única query com `GROUP BY status` + derivação das atrasadas. Cache em memória de 10 s.

### 6.4 `waiting-room` — tela 08

| Método | Rota | Descrição | Paginação |
|---|---|---|---|
| GET | `/waiting-room` | Fila ordenada por espera decrescente: espera, paciente, tipo, profissional, check-in, consulta prevista, estado | Sem paginação (fila real ≤ 30); `limit` 50 de segurança |
| GET | `/waiting-room/metrics` | Na sala de espera, espera média, maior espera, em atendimento agora | |
| POST | `/waiting-room/call-next` | "Chamar próximo" / `[Espaço]` — registra chamada e publica no chamador de TV | |
| GET | `/waiting-room/stream` | **SSE** para o balcão | |
| GET | `/waiting-room/display` | Payload enxuto do painel de TV (nome abreviado + sala) | `@Public()` via **token de display**, sem dado sensível |

### 6.5 `patients` — telas 09, 10, 11

| Método | Rota | Descrição | Paginação |
|---|---|---|---|
| GET | `/patients` | Tabela. `search` (nome, CPF, telefone), `hasPendencies`, `orderBy=name\|lastVisitAt` | **Offset**, `limit` 12 (o desenho mostra 12 linhas e "de 1.248") |
| GET | `/patients/:id` | Cabeçalho da ficha: nome, idade, nascimento, telefone, e-mail | |
| GET | `/patients/:id/summary` | Os quatro contadores: consultas, canceladas, documentos, pendência ativa | |
| GET | `/patients/:id/appointments` | Aba "Histórico de Consultas" | **Cursor** |
| GET | `/patients/:id/documents` | Aba "Documentos Clínicos" | Offset |
| GET | `/patients/:id/tasks` | Aba "Pendências e Retornos" | Offset |
| POST | `/patients` | Tela 11: nome, nascimento, CPF, telefone/WhatsApp, e-mail, observações clínicas | 409 `PATIENT_CPF_DUPLICATE` |
| PATCH | `/patients/:id` | "Editar cadastro" | |
| DELETE | `/patients/:id` | Inativação lógica (`deletedAt`), nunca DELETE físico | `GESTOR` |
| GET | `/patients/export` | Botão "Exportar" → CSV via `StreamableFile` | Vai para fila se `> 5.000` linhas |

`age`, `lastVisitAt`, `nextVisitAt` e `openTasksCount` são calculados no DTO de resposta
(as colunas "Última consulta", "Próxima" e "Pendências" da tela 09), resolvidos com uma
lateral join única — **nada de N+1** numa listagem de 1.248 registros.

### 6.6 `professionals` — telas 12, 13

| Método | Rota | Descrição | Paginação |
|---|---|---|---|
| GET | `/professionals` | Corpo clínico: especialidade, conselho (CRM/CRN), dias de atendimento, consultas hoje, pendências | Offset, `limit` 20 |
| GET | `/professionals/:id` | Cabeçalho da tela 13 | |
| GET | `/professionals/:id/schedule` | "Grade de atendimento configurada" (janelas por dia da semana) | |
| PUT | `/professionals/:id/schedule` | Substitui as janelas em bloco | `GESTOR` |
| GET | `/professionals/:id/appointments` | Agenda do profissional: `from`, `to` | Sem paginação, intervalo limitado |
| POST | `/professionals` | "Novo profissional" (+ vínculo opcional com `User`) | `GESTOR` |
| PATCH | `/professionals/:id` | | `GESTOR` |
| PATCH | `/professionals/:id/status` | Ativar / desativar | `GESTOR` |

`todayAppointmentsCount` e `openTasksCount` chegam agregados na própria listagem
(`_count` filtrado), não em uma chamada por linha.

### 6.7 `documents` — telas 14 e 04

| Método | Rota | Descrição | Paginação |
|---|---|---|---|
| GET | `/documents` | Repositório. `search` (arquivo ou paciente), `type`, `patientId`, `from`/`to` | Offset, `limit` 15 |
| POST | `/documents` | Confirma o upload: `{ objectKey, patientId, appointmentId?, type?, fileName }` | Precedido de `POST /uploads/sign` |
| GET | `/documents/:id` | Metadados | |
| GET | `/documents/:id/download` | URL assinada de leitura (botão "Visualizar") | Registra o acesso na auditoria |
| PATCH | `/documents/:id` | Reclassificar tipo / revincular paciente ou consulta | |
| DELETE | `/documents/:id` | Remoção lógica + expurgo do objeto em job | `GESTOR` |
| POST | `/documents/:id/classify` | Classificação automática (RF08 / V2) | Enfileirado; `type` fica `OUTRO` até resolver |

Validação: MIME em lista fechada (`application/pdf`, `image/jpeg`, `image/png`), teto de 10 MB,
`byteSize` conferido contra o `HEAD` real do objeto — nunca contra o que o cliente declarou.

### 6.8 `tasks` — tela 15

| Método | Rota | Descrição | Paginação |
|---|---|---|---|
| GET | `/tasks` | Funil. `type`, `status`, `dueBefore`, `patientId`, `assigneeId` | Offset, `limit` 10 |
| GET | `/tasks/summary` | Os quatro cartões: retornos a agendar (15–30 dias), confirmações pendentes (24 h), no-show a resgatar, resolvidas hoje | |
| POST | `/tasks` | "Nova tarefa" | |
| PATCH | `/tasks/:id` | Editar prazo, responsável, título | |
| PATCH | `/tasks/:id/resolve` | Resolução com nota | Grava `resolvedById`/`resolvedAt` |
| POST | `/tasks/:id/contact` | Registra "Ligar / WhatsApp" como tentativa de contato | Entra na auditoria |

Pendências nascem de eventos, não de digitação: `appointment.completed` → `RETORNO_A_AGENDAR`
(prazo = `returnWindowDays`); cron horário → `CONFIRMACAO_PENDENTE` dentro de
`confirmationLeadHours`; `appointment.cancelled(NO_SHOW)` → `RESGATE_NO_SHOW`.
O rótulo "Urgente (Hoje)" é derivado de `dueAt` no DTO, não é coluna.

### 6.9 `settings` + `users` — tela 16

| Método | Rota | Descrição |
|---|---|---|
| GET | `/settings` | Aba "Horários e Grade": duração padrão, antecedência de confirmação, prazo de retorno, tolerância de atraso |
| PATCH | `/settings` | "Salvar alterações" — grava `before`/`after` no `AuditLog` |
| GET | `/settings/whatsapp` | Aba "Automação WhatsApp": template, janela de disparo, status da integração |
| PUT | `/settings/whatsapp` | |
| GET | `/settings/audit-log` | Aba "Log de Auditoria". Filtros `actorId`, `entity`, `action`, `from`/`to` — **cursor** |
| GET | `/users` | Aba "Perfis de Acesso" — offset |
| POST | `/users` | Criar acesso |
| PATCH | `/users/:id` | Nome, e-mail, ativo |
| PATCH | `/users/:id/role` | Trocar perfil (nunca o próprio) |
| POST | `/users/:id/reset-password` | O "Fale com a gestão" da tela 01 termina aqui |

Todas as escritas de `settings` e `users` exigem `@Roles(Role.GESTOR)`.

### 6.10 `search` — tela 18 (⌘K)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/search?q=&types=patient,professional,appointment,action` | Busca unificada. Resposta agrupada: `{ actions[], patients[], professionals[], appointments[] }` |

Sem paginação: teto fixo de 5 itens por grupo, ordenado por relevância (`pg_trgm similarity`)
e recência. `q` com menos de 2 caracteres devolve "PACIENTES RECENTES" (últimos tocados pelo
usuário atual). O debounce é do cliente; o servidor garante < 120 ms via índice GIN.
Cada item de paciente já traz telefone, profissional e estado da consulta de hoje — é
exatamente o que a linha da paleta desenha.

### 6.11 `notifications` — automação WhatsApp (tela 16, com efeito em 04 e 06)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/notifications/appointments/:id/confirmation` | Reenvio manual da mensagem de confirmação |
| POST | `/webhooks/whatsapp` | `@Public()` + verificação de assinatura HMAC. Resposta do paciente → `CONFIRMADA` com `channel: WHATSAPP` |
| GET | `/notifications` | Histórico de envios por consulta / paciente — offset |

O "Confirmação recebida — 09 set, 14:02 via WhatsApp automatizado" da tela 04 é exatamente
um `AppointmentEvent` com `channel = WHATSAPP` e `actorId = null`.

### 6.12 `health` — tela 17

| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | `@nestjs/terminus`: liveness — usado pelo `HEALTHCHECK` do Docker |
| GET | `/health/ready` | Readiness: Postgres + Redis + bucket |

O botão "Tentar reconectar" refaz a requisição original; o front distingue falha de rede
de erro de domínio pelo `code` do envelope.

---

## 7. Jobs e agendamentos (BullMQ + `@nestjs/schedule`)

| Rotina | Gatilho | Efeito |
|---|---|---|
| `confirmacoes-pendentes` | cron horário | Cria a pendência `CONFIRMACAO_PENDENTE` e dispara o WhatsApp para consultas dentro de `confirmationLeadHours` |
| `expurgo-documentos` | cron diário, 03:00 | Remove do armazenamento os arquivos apagados há mais de 30 dias (o metadado fica, para a auditoria) |
| `fechamento-do-dia` | cron diário, 02:00 | Consultas do dia anterior que nunca chegaram viram `RESGATE_NO_SHOW` no funil |
| pendência de retorno | evento `appointment.completed` | Cria `RETORNO_A_AGENDAR` com prazo `returnWindowDays` |
| resgate de no-show | evento `appointment.cancelled(NO_SHOW)` | Cria `RESGATE_NO_SHOW` |
| classificação de documento | evento `document.uploaded` | RF08 (V2) |

Toda criação de pendência é idempotente (`createSystemTask` ignora duplicata aberta), então
rodar o cron de hora em hora não empilha 24 linhas por consulta.
`JOBS_ENABLED=false` desliga os crons nos testes.

---

## 8. Testes (`nestjs-testing-suite`)

| Camada | Alvo | Ferramenta |
|---|---|---|
| Unitário | `AppointmentStateMachine` (todas as transições válidas e inválidas), `CursorSerializer`, `PageMetaDto`, cálculo de espera/atraso, validador de CPF | Jest + AAA, mocks por `useValue` |
| Unitário | Services com repositório mockado: conflito de horário, motivo obrigatório no cancelamento, janela de 30 s do undo | Jest |
| Integração | Repositórios + Prisma contra **Postgres real descartável** | Testcontainers |
| Integração | Constraint `EXCLUDE` de overbooking sob duas transações concorrentes | Testcontainers |
| E2E | Fluxo completo: login → criar paciente → agendar → confirmar → check-in → iniciar → concluir → pendência gerada | Supertest + `INestApplication` |
| E2E | Paginação: página 1 vs 2 sem item repetido nem perdido com inserção no meio (prova do tie-breaker) | Supertest |
| E2E | Guards: `RECEPCAO` recebe 403 em `PATCH /settings` | Supertest |

Meta: **≥ 85 %** de cobertura em `modules/*/**.service.ts` e **100 %** na máquina de estados.
`ClockService` injetável torna determinístico tudo que depende de "agora".

---

## 9. Docker (`docker-nestjs-turborepo`)

`docker-compose.yaml` e `apps/api/Dockerfile` já existem. Ajustes previstos:

- Dockerfile multi-stage com `turbo prune --scope=api --docker` no estágio de dependências.
- `USER node` no estágio final; `dumb-init` como PID 1 para o `SIGTERM` chegar ao Nest.
- `app.enableShutdownHooks()` no `main.ts` — Prisma e BullMQ precisam fechar limpo.
- `HEALTHCHECK` apontando para `/api/v1/health`.
- Serviço `minio` no compose, para exercitar o módulo de upload sem AWS.
- `prisma migrate deploy` no entrypoint de produção, nunca `migrate dev`.

---

## 10. Ordem de execução

Todas concluídas.

| Fase | Entrega | Destrava |
|---|---|---|
| **0** | `common/` + `shared/prisma` + `config` + filtros + Swagger + `/health` | Tela 17 |
| **1** | Schema Prisma + primeira migration + seed (2 profissionais, ~30 pacientes, agenda do dia) | Tudo |
| **2** | `auth` + `users` + guards globais | Tela 01 |
| **3** | `patients` + paginação offset genérica | Telas 09, 10, 11 |
| **4** | `professionals` + `ScheduleWindow` + `/slots` | Telas 12, 13 |
| **5** | `appointments` + máquina de estados + `AppointmentEvent` + conflito | Telas 02, 03, 04, 05, 06, 07 |
| **6** | `dashboard` + `waiting-room` + SSE | Telas 02, 08 |
| **7** | `shared/storage` + `documents` | Telas 14, 04 |
| **8** | `tasks` + jobs de geração | Tela 15 |
| **9** | `settings` + `audit` (cursor) | Tela 16 |
| **10** | `search` (⌘K) | Tela 18 |
| **11** | `notifications` + webhook WhatsApp | Automação da tela 16 |
| **12** | RF08 — classificação de documentos por IA | V2 |

**Total:** 12 módulos de domínio, 7 blocos compartilhados, **≈ 78 endpoints**,
cobrindo as 19 telas funcionais das 34 pranchetas.

---

## 11. Pontos que precisam de decisão sua

1. **Multi-tenant?** As telas mostram uma clínica só ("Clínica Viver"). O plano modela
   `Clinic` como entidade mas **sem** isolamento por tenant nas queries. Se a ideia é
   servir várias clínicas, isso muda todo `where` e vira um `TenantGuard` — decidir antes da fase 1.
2. **Provedor de WhatsApp.** Meta Cloud API, Twilio ou Z-API mudam o formato do webhook e do
   template. Até a fase 11 o `NotificationTransport` fica em modo `log`, como na API de referência.
3. **`ATRASADA` derivada vs persistida.** Optei por derivada, para não poluir a máquina de
   estados. Se o requisito da disciplina exigir os 7 estados literais no `enum` do banco,
   é uma migration e uma regra a mais.
4. **Sala de espera por SSE vs polling.** SSE é o certo, mas exige `keep-alive` configurado no
   proxy. Se o deploy da entrega for simples, `GET /waiting-room` a cada 15 s resolve.

---

## 12. O que mudou entre o plano e a implementação

| Ponto | Plano | Implementado | Motivo |
|---|---|---|---|
| Camadas | Controller → Service → Repository | **Controller → Service → Prisma** | Arquitetura em camadas padrão do Nest, a pedido. Um repositório por entidade seria só repasse do `PrismaService`. |
| Filas | BullMQ sobre Redis | **`@nestjs/schedule`** | Três crons idempotentes não justificam exigir Redis no boot. O caminho para BullMQ está descrito na seção 2. |
| Senha | argon2id | **bcrypt (12 rounds)** | `bcryptjs` é JS puro: instala e roda igual em Windows, Linux e no contêiner, sem `node-gyp`. Troca isolada em `users.service.ts`/`auth.service.ts`. |
| `ATRASADA` | derivada de AGENDADA/CONFIRMADA/CHECK_IN | **derivada só de AGENDADA/CONFIRMADA** | Um teste contra a tela 02 mostrou a divergência: Luiza fez check-in às 09:32 e o desenho a marca "Aguardando 18min", não "Atrasada". Quem chegou está na fila; a sala de espera (tela 08) tem a própria coluna de atraso. |
| Upload | presigned S3 | **dois drivers: `local` (padrão) e `s3`** | Atrás da mesma interface `StorageAdapter`. O `local` assina a própria URL por HMAC, então o fluxo completo roda sem AWS nem MinIO. |
| Undo | janela de 30 s | idem, **e só do próprio autor** | Desfazer alteração alheia não é correção de clique, é edição de histórico. |

### Ajustes de infraestrutura que a implementação exigiu

- **`@nestjs/jwt`, `terminus`, `schedule` e `event-emitter` fixados na linha 11/3/6.**
  As versões 12 são ESM puro e o build CJS do Nest 11 não consegue carregá-las — o app
  nem chegava a subir.
- **`unsafeParameterDecoratorsEnabled` no `biome.jsonc` da API.** Sem isso o parser do
  Biome falha em todo controller do Nest (`@Body`, `@Query`, `@Param`).
- **`express` como dependência direta.** O `main.ts` usa `express.raw` no prefixo de upload;
  sob o node_modules estrito do pnpm, dependência transitiva não resolve em runtime.
- **`prisma` fora do `tsconfig.build.json`.** Com o seed dentro, a saída ia para
  `dist/src/main.js` e quebrava o `start:prod`.
