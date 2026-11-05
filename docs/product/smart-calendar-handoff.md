# Tela 2 — Smart Calendar & Intelligent Agenda · Handoff de engenharia (Fase 4)

Fonte da verdade visual: protótipo interativo `screens/02-smart-calendar.html` (React 18 + Tailwind + lucide-react, arquivo único, mesma base da tela 1). Tudo que não está aqui — tokens de cor, tipografia, raios, bordas, sombras, motion, mapeamento Tailwind v4, mudanças em `index.css` — está em `cockpit-handoff.md` §1 e **não se repete**. Lacunas do backend estão marcadas com **[GAP]**.

Rota alvo: `/agenda` (substitui a tela atual de agenda em `apps/web/src/App.tsx`; a rota antiga vira `/agenda-legada` até a Fase 5). Perfis: `RECEPCAO` e `GESTOR` completos; `PROFISSIONAL` entra direto na visão **Médico** travada no próprio id.

---

## 1. Tokens e classes-chave desta tela

### 1.1 Status da consulta → tom, rótulo, ícone (uma única tabela alimenta bloco, chip da semana, legenda e drawer)

| `status` (UI) | Rótulo | Tom | Ícone | Classes do bloco | Origem no backend |
|---|---|---|---|---|---|
| `agendada` | A confirmar | `warn` | `Clock` | `border-dashed border-warn/40 bg-warn/[0.06]` | `AGENDADA` |
| `confirmada` | Confirmada | `ai` | `CheckCheck` | `border-ai/30 bg-ai/[0.08]` | `CONFIRMADA` (Copilot confirmou) |
| `checkin` | Na clínica | `fg` | `ScanLine` | `border-fg/20 bg-fg/[0.06]` | `CHECK_IN` |
| `consulta` | Em atendimento | `ok` + `Pulse` | `Activity` | `border-ok/40 bg-ok/[0.10]` | `EM_ATENDIMENTO` |
| `concluida` | Concluída | `muted` | `CircleCheck` | `border-fg/[0.08] bg-sunken text-muted` | `CONCLUIDA` |
| `cancelada` | Desmarcada | `bad` | `CalendarX2` | nunca vira bloco: aparece riscada **dentro** da vaga livre que abriu (`border-bad/30`) ou dentro do bloco `smartfill` que a repôs | `CANCELADA` |
| `smartfill` | Smart Waitlist | `ai` + `Zap` | `Zap` | `border-ai/50 bg-ai/[0.10]` + callout abaixo do bloco | `CONFIRMADA` com `smartFillAt` **[GAP]** |
| `encaixe` | Encaixe aberto | `ai` | `ListPlus` | `border-dashed border-ai/40 bg-ai/[0.05] text-ai` | **[GAP]** reserva local (3.4) |

`REAGENDADA` não aparece na grade (a consulta nova aparece no destino). `derivedState = ATRASADA` não muda o bloco — é tratado no Cockpit.

### 1.2 Escala da grade

| Constante | Valor | Observação |
|---|---|---|
| `GRID_START` / `GRID_END` | 07:00 / 19:00 | 12 h visíveis; fora disso o backend não devolve nada hoje |
| `HOUR_PX` | 80 | 30 min = 40 px, 20 min = 26,7 px (dermato); bloco = `height - 3px`, `top + 1px` |
| Gutter de horas | 56 px | `font-mono 11px text-faint`, rótulo centrado na linha (`-translate-y-1/2`) |
| Coluna mínima | 190 px (Dia) · 150 px (Médico) · 920 px total (Semana) | tudo dentro de `overflow-auto`; o `body` nunca rola na horizontal |
| Altura do scroll interno | `max-h-[calc(100vh-280px)] min-h-[420px]` | abre com `scrollTop = y(now) - 180` |
| Linha "agora" | `h-px bg-bad` + bolinha 7 px + etiqueta `bg-bad text-bg font-mono 11px` no gutter | só nas colunas com `isToday`; move a cada tick |
| Horário fechado | `bg-sunken/80` + `repeating-linear-gradient(135deg, rgb(var(--fg)/0.025) 0 6px, transparent 6px 12px)` | hachura, sem cor |
| Linha de hora / meia hora | `border-t border-fg/[0.06]` / `border-dashed border-fg/[0.04]` | |

### 1.3 Mapa de calor (Semana)

Fundo da célula = `rgb(var(--ok) / (ratio × 0.42))`; `ratio` = minutos ocupados ÷ minutos de capacidade na hora (soma das janelas dos profissionais). `null` (ninguém atende) = hachura. Legenda com 0 / 25 / 50 / 75 / 100 % e "fechado". Percentual da hora sempre escrito no canto (`font-mono 11px text-muted`) — a cor nunca é o único sinal. Cabeçalho do dia: `%` em `text-ok` ≥ 85, `text-fg` ≥ 60, `text-warn` abaixo, mais `Meter` e "filled/capacity · N livres · N desm.".

### 1.4 Classes novas (não existem na tela 1)

| Elemento | Classes |
|---|---|
| Segmented switch Dia/Semana/Médico | `rounded-lg border-fg/[0.08] bg-surface p-0.5`; ativo `bg-fg text-bg` com `Kbd` invertido; `role=radiogroup` + `aria-checked` |
| Botão "Hoje" | ativo (já é hoje) `border-fg/[0.08] text-muted` · fora de hoje `border-ai/30 bg-ai/[0.06] text-ai` + `aria-pressed` |
| Bloco selecionado | `ring-[3px] ring-ai/25 border-ai/60 z-[3]` (hover `border-fg/30`) |
| Vaga livre | `border-dashed border-fg/[0.14] text-faint`; hover/foco `border-ai/50 bg-ai/[0.05] text-ai` + ícone `Plus` surge; passada: `border-fg/[0.06] text-faint/70 disabled` |
| Callout Smart Waitlist | `rounded-lg border-ai/40 bg-surface p-2 shadow-[0_24px_60px_-28px_rgb(var(--ai)/0.55)] anim-pop`, título `11px uppercase tracking-[0.06em] text-ai` com `Pulse ai` + `Zap`; posicionado em `y(fim do bloco) + 4px` na mesma coluna (a grade deixa 16:00–17:00 livre de propósito) |
| Chip da semana | `h-[18px] rounded-[5px] text-[11px]` + ponto do profissional 6 px + hora mono + primeiro nome; máx. 3 por célula + "+N mais" |
| Drawer | `fixed right-0 w-full sm:w-[420px] border-l border-fg/[0.1] bg-surface shadow-overlay`, `translate-x-full → 0` em 300 ms `cubic-bezier(.2,.8,.2,1)`; wrapper `fixed inset-0 overflow-hidden` com `visibility` atrasada 320 ms ao fechar; scrim `bg-black/40` **só** `< sm` |
| Bolhas do WhatsApp | Copilot `self-start rounded-xl rounded-bl-[4px] border-fg/[0.08] bg-surface` · paciente `self-end rounded-br-[4px] bg-ok/[0.12]`; `max-w-[88%]`, 12,5 px |
| Thumbnails de exame | 56 px, `rounded-md bg-sunken`; ECG = SVG `polyline stroke rgb(var(--ok))`; laboratório = barras `bg-fg/20` + `bg-ok`/`bg-warn`; dermatoscopia = `radial-gradient` com `warn`/`bad`/`fg` sobre `sunken`. Sem imagem externa até existir `GET /documents/:id/thumbnail` **[GAP]** |

---

## 2. Anatomia

Container igual à tela 1 (`main max-w-[1680px] px-4 sm:px-6 pt-4 pb-24 gap-4`). Header linha 1 idêntico (nav com **Agenda** ativa).

### 2.1 Header linha 2 (`flex-wrap gap-x-3 gap-y-2`)

Segmented switch `Dia 1 · Semana 2 · Médico 3` → navegação `‹ rótulo ›` (Dia: `sexta-feira, 9 de outubro`; Semana/Médico: `05/10 – 10/10 · outubro`; passo 1 ou 7 dias) → `Hoje T` → **só em Médico**: radiogroup de profissionais (ponto colorido + nome curto) → `ao vivo · HH:MM:SS` à direita (`ml-auto`).

### 2.2 Resumo (Dia e Semana; em Médico vira o painel de utilização)

`section[aria-label="Resumo da agenda"]`, mesma grade `grid-cols-2 lg:grid-cols-4 gap-px` dos vitais, valor em 24 px mono.

| # | Ícone | Rótulo | Valor | Sub |
|---|---|---|---|---|
| 1 | `Gauge` | Ocupação do dia | `round(filled/capacity)` % | "60 de 78 horários · 1 reposto pelo Copilot" |
| 2 | `CalendarRange` | Vagas livres | vagas futuras do dia (tom `ok` se > 0) | "próxima 13:00 · Dr. Ramos" |
| 3 | `Zap` | Encaixes possíveis | Σ por profissional `min(vagas futuras, lista de espera)` (tom `ai`) | "vagas com paciente compatível na lista" |
| 4 | `ListOrdered` | Lista de espera | `N pacientes` | "Cardio 3 · Orto 2 · Derm 2" + link **Comms ↗** |

Na Semana o resumo mostra **hoje** (não a semana) — é o painel de ação da recepção.

### 2.3 Visão Dia

`TimeGrid` com uma coluna por profissional: cabeçalho sticky (`h-12`, ponto colorido, nome curto 13/600, "especialidade · sala", chip `hoje`, contagem mono). Dentro de cada coluna, em ordem de camada: hachura de fechado → vagas livres (`z-[1]`) → blocos (`z-[2]`, selecionado `z-[3]`) → callout Smart Waitlist (`z-[4]`) → linha agora (`z-[5]`). Rodapé = legenda de status + "agora".

Bloco (`button[data-aid]`): linha 1 = hora mono 11 + nome 12/500 `truncate` + `Pulse` (em atendimento) ou `Zap` (smartfill); ≥ 54 px mostra linha 2 = ícone + rótulo do status + tipo (`text-faint`). Bloco `smartfill` mostra na linha 2 o nome da desmarcada riscado (`line-through decoration-bad/60`).

### 2.4 Visão Semana

Grade `56px + 6 colunas` (seg–sáb), 12 linhas de hora, célula `min-h-[64px]`; cabeçalho do dia é um botão que abre o dia na visão Dia. Célula = fundo do heat map + `%` + até 3 chips + "+N mais" (também abre o dia). Hora atual recebe `shadow-[inset_3px_0_0_rgb(var(--bad))]` na coluna de hoje. Desmarcadas não viram chip (contam na linha "N desm." do cabeçalho).

### 2.5 Visão Médico

Painel de utilização da semana (`grid-cols-2 lg:grid-cols-4`): utilização % + `Meter` (`ok` ≥ 80 %, senão `warn`) · Livres na semana · A confirmar · Desmarcações repostas `sf/cancel` (+ "% das vagas recuperadas"). Abaixo, o mesmo `TimeGrid` com uma coluna por dia (`seg 5` + janelas "09:00–12:30 · 13:30–19:00" ou "não atende"), blocos compactos (`Nome S.`), vagas livres clicáveis em qualquer dia.

### 2.6 Drawer da consulta (`section[role=dialog][aria-modal]`)

Cabeçalho: `Avatar 40` + nome 15/600 + "36 anos · Particular · R$ 520 · (11) 98628-9929" + chips (status, `sex 09/10 · 07:30–08:00`, `DocTag`) + "tipo · sala · ETA". Aviso contextual: `smartfill` (índigo) ou `cancelada` (carmim). Corpo rolável: **Resumo do histórico** (`Stethoscope`, 4 bullets, chips `Alergia: X` em `bad`/`muted` + "última visita dd/mm") → **Anexos de exames** (`Paperclip`, grid 2 col, thumbnail + título + "dd/mm/aaaa · PDF") → **Conversa no WhatsApp** (`MessageCircle`, status à direita no tom do fluxo: "Confirmado 08:05" `ok`, "Sem resposta · 3º lembrete às 12:00" `warn`, "Desmarcada 10:39" `bad`, "Vaga aceita 10:47 · lista de espera" `ai`; 2–3 bolhas; botão "Abrir conversa no Comms"). Rodapé fixo: ação primária `bg-fg text-bg h-9` com `Kbd ↵` + "Reagendar" secundário quando aplicável.

| Status | Ação primária (`primaryAction`) | Efeito no protótipo |
|---|---|---|
| `agendada` | Confirmar (`CheckCheck`) | → `confirmada`, toast com undo |
| `confirmada` / `smartfill` | Fazer check-in (`LogIn`) | → `checkin`, toast com undo, fecha o drawer |
| `concluida` | Agendar retorno (`CalendarPlus`) | toast `ai` (Copilot propõe pelo WhatsApp) |
| `encaixe` | Oferecer à lista de espera (`Zap`) | toast `ai`, fecha |
| `checkin` / `consulta` / `cancelada` | Reagendar (`CalendarClock`) | toast `ai` (Copilot manda 3 horários) |

### 2.7 Responsivo

| Breakpoint | Mudanças |
|---|---|
| `< 640` | Drawer ocupa 100 % com scrim; busca só ícone; sem avatar; resumo 2×2; segmented e navegação quebram em 3 linhas; grades rolam dentro do próprio container |
| `sm ≥ 640` | Drawer 420 px sem scrim (grade continua visível e **não se move**); rótulo de data `min-w-[14rem]` |
| `md ≥ 768` | Nav; rodapé de atalhos |
| `lg ≥ 1024` | Resumo em 4 colunas; "/ Clínica" |

---

## 3. Arquitetura de estado

### 3.1 `apps/web/src/features/agenda/types/calendar.ts`

```ts
import type { AppointmentStatus, AppointmentType } from "../../../lib/api/types";

export type CalendarView = "day" | "week" | "doctor";
/** Status da UI: agrega AppointmentStatus + dois sinais do Copilot. */
export type AgendaStatus =
  | "agendada" | "confirmada" | "checkin" | "consulta" | "concluida" | "cancelada"
  | "smartfill"   // CONFIRMADA cuja vaga veio da lista de espera
  | "encaixe";    // reserva de vaga para a lista de espera (ainda sem paciente)

export interface AgendaProfessional {
  id: string; name: string; shortName: string; specialty: string;
  room: string | null; colorIndex: number;          // igual ao CockpitProfessional
  slotMinutes: number;                               // Professional.defaultDurationMinutes
  /** Janelas do dia pedido, já resolvidas de ScheduleWindow por weekday. */
  windows: { startsAt: string; endsAt: string }[];
}

export type Payer =
  | { kind: "conv"; label: string }
  | { kind: "part"; label: "Particular"; valueCents: number };

export interface AgendaAppointment {
  id: string; code: number; patientId: string; patientName: string;
  professionalId: string;
  date: string;                 // AAAA-MM-DD no fuso da clínica
  startsAt: string; endsAt: string; durationMinutes: number;
  type: AppointmentType; typeLabel: string;
  status: AgendaStatus; rawStatus: AppointmentStatus;
  payer: Payer | null;
  confirmedAt: string | null; checkedInAt: string | null; cancelledAt: string | null;
  smartFillAt: string | null;                      // [GAP]
  replacesPatientName: string | null;              // nome da desmarcada que esta consulta repôs [GAP]
  eta: string | null;                              // [GAP]
}

export interface FreeSlot { professionalId: string; startsAt: string; durationMinutes: number; cancelledPatientName: string | null; }

export interface AgendaDay {
  date: string; serverNow: string;
  professionals: AgendaProfessional[];
  appointments: AgendaAppointment[];
  freeSlots: FreeSlot[];
  stats: { capacity: number; filled: number; free: number; cancelled: number; smartFilled: number };
}

export interface HeatCell { hour: number; ratio: number | null; count: number; }
export interface AgendaWeekDay { date: string; weekdayLabel: string; stats: AgendaDay["stats"]; heat: HeatCell[]; appointments: AgendaAppointment[]; }
export interface AgendaWeek { from: string; to: string; days: AgendaWeekDay[]; }

export interface AgendaSummary {
  date: string;
  occupancy: { filled: number; capacity: number; smartFilled: number };
  freeSlots: { count: number; next: { startsAt: string; professionalId: string } | null };
  possibleFills: number;
  waitlist: { total: number; byProfessional: Record<string, number> };
}

export interface AppointmentDossier {       // conteúdo do drawer
  appointment: AgendaAppointment;
  patient: { id: string; name: string; age: number | null; phone: string; lastVisitAt: string | null };
  history: { bullets: string[]; allergies: string[] };                      // [GAP] prontuário
  exams: { documentId: string; title: string; type: string; issuedAt: string; thumbnailKind: "ecg" | "lab" | "image" | "pdf"; thumbnailUrl: string | null }[];
  whatsapp: { status: { tone: "ok" | "warn" | "bad" | "ai"; text: string }; messages: { from: "copilot" | "patient"; at: string; text: string }[] } | null;
}
```

Mapeamento `rawStatus → status`: `AGENDADA→agendada`, `CONFIRMADA→confirmada` (ou `smartfill` se `smartFillAt`), `CHECK_IN→checkin`, `EM_ATENDIMENTO→consulta`, `CONCLUIDA→concluida`, `CANCELADA→cancelada`; `REAGENDADA` é filtrada pelo servidor.

### 3.2 Layout de arquivos

```
apps/web/src/features/agenda/
├─ agenda-page.tsx                 # rota /agenda; view, cursor, doctor, drawer, keymap
├─ types/calendar.ts
├─ api/agenda-api.ts               # agendaApi.day/week/summary/dossier/holdSlot/releaseSlot
├─ hooks/use-agenda-day.ts · use-agenda-week.ts · use-agenda-summary.ts · use-dossier.ts
│         use-agenda-actions.ts · use-agenda-keymap.ts · use-agenda-navigation.ts · use-clock.ts (reuso da tela 1)
├─ lib/status.ts (STATUS, primaryAction) · grid.ts (y(), HOUR_PX, janelas→fechado) · heat.ts
├─ components/agenda-header.tsx · summary-strip.tsx · time-grid.tsx · appointment-block.tsx · free-slot.tsx
│   smart-fill-callout.tsx · week-heatmap.tsx · doctor-stats.tsx · appointment-drawer.tsx (+ drawer-{history,exams,whatsapp}.tsx · exam-thumb.tsx)
│   command-palette.tsx · shortcuts-dialog.tsx (reuso da tela 1 via components/atoms)
└─ agenda.test.tsx                 # Vitest: mapStatus, primaryAction, heatHour, y(), move()
```

### 3.3 Query keys (`apps/web/src/lib/query.ts`)

```ts
agenda: {
  all: ["agenda"] as const,
  day: (date: string) => ["agenda", "day", { date }] as const,
  week: (from: string, professionalId?: string) => ["agenda", "week", { from, professionalId }] as const,
  summary: (date: string) => ["agenda", "summary", { date }] as const,
  dossier: (appointmentId: string) => ["agenda", "dossier", appointmentId] as const,
},
```

### 3.4 Hooks e mutações (TanStack Query v5)

```ts
export function useAgendaDay(date: string) {
  return useQuery({ queryKey: qk.agenda.day(date), queryFn: () => agendaApi.day(date),
    refetchInterval: 20_000, refetchIntervalInBackground: false, placeholderData: keepPreviousData });
}
// useAgendaWeek(from, professionalId?)  → agendaApi.week(from, addDays(from, 5), professionalId); refetchInterval 60_000
// useAgendaSummary(date)                → refetchInterval 20_000 (só montado em Dia/Semana)
// useDossier(id | null)                 → enabled: !!id, staleTime 60_000; prefetch no onFocus do bloco (hover/seta) para o drawer abrir cheio
```

Pré-carregar os dias vizinhos: `qc.prefetchQuery(qk.agenda.day(±1))` após o dia atual resolver (setas ←/→ ficam instantâneas).

Mutações otimistas sobre `qk.agenda.day(date)` (mesmo `useBoardMutation` da tela 1, trocando a chave):

| Ação | `mutationFn` | `apply` otimista | Toast |
|---|---|---|---|
| Confirmar | `appointmentsApi.confirm(id)` | `status = confirmada`, `confirmedAt = now` | "{nome} confirmado manualmente · Copilot para de lembrar" (undo) |
| Fazer check-in | `appointmentsApi.checkIn(id)` | `status = checkin`, `checkedInAt = now` | "{nome} fez check-in · aparece no Cockpit em Na recepção" (undo) |
| Reagendar | `appointmentsApi.reschedule(id, body)` | remove do dia de origem; invalida destino | "Copilot enviou 3 horários…" (`ai`) — Fase 4: abre o `RescheduleDialog` da tela 1 |
| Agendar retorno | `appointmentsApi.scheduleFollowUp(id, body)` (cockpit §4.8) | — | "Copilot vai propor retorno…" (`ai`) |
| Reservar vaga (clique em "livre") | `agendaApi.holdSlot({ professionalId, startsAt, durationMinutes })` **[GAP]** | insere `AgendaAppointment` sintético `status = encaixe`, `patientName = "Lista de espera"` | "Encaixe 14:30 · Dr. Ramos reservado. Copilot oferece à lista de espera." (undo = `releaseSlot`) |
| Oferecer à lista | `agendaApi.offerSlot(holdId)` **[GAP]** | — | "Vaga oferecida a N pacientes · acompanhe no Comms" (`ai`) |

`onSettled` invalida `qk.agenda.all`, `qk.appointments.all`, `qk.cockpit.all`, `qk.dashboard.all`. Undo (`Z`): snapshot local por 6 s + `POST /appointments/:id/undo` (cockpit §3.4); para `holdSlot` o undo chama `releaseSlot`.

SSE: reutilizar `/cockpit/stream` (cockpit §3.5) — ao receber `kind: "board"`, invalidar `qk.agenda.day(hoje)` e `qk.agenda.summary(hoje)`. Não criar um segundo stream.

---

## 4. Contratos REST

Prefixo `api/v1`. Módulo novo `apps/api/src/modules/agenda/` (`agenda.controller.ts`, `services/get-agenda-day.service.ts`, `get-agenda-week.service.ts`, `get-agenda-summary.service.ts`, `get-appointment-dossier.service.ts`, `hold-slot.service.ts`, `requests/*.request.ts` Zod com `DATE_PATTERN` de `list-slots.request.ts`). Guard JWT; `@Roles("RECEPCAO","GESTOR","PROFISSIONAL")` com filtro forçado de `professionalId` para `PROFISSIONAL`.

### 4.1 Reuso do que existe

| Necessidade | Endpoint atual | Serve? |
|---|---|---|
| Blocos da semana (chips) | `GET /appointments/calendar?from&to&professionalId` (`CalendarDayDto[]`) | **Parcial**: tem `time/durationMinutes/patientName/professionalId/status/derivedState`; faltam `type`, `payer`, `confirmedAt`, `smartFillAt`. A Semana pode nascer com ele + `GET /agenda/week` só para heat/stats, mas é mais simples o `week` novo devolver tudo |
| Vagas livres por profissional/dia | `GET /appointments/slots?professionalId&date` (`TimeSlotDto[]`) | **Sim** para 1 profissional; a visão Dia precisa de 4 chamadas → o `day` novo agrega |
| Agenda de um profissional | `GET /professionals/:id/appointments?from&to` | Igual ao calendar filtrado; a visão Médico usa `GET /agenda/week?professionalId=` |
| Confirmar / check-in / reagendar / undo | `PATCH /appointments/:id/{confirm,check-in,reschedule}`, `POST /appointments/:id/undo` | **Sim**, sem mudança |
| Detalhe + documentos | `GET /appointments/:id`, `GET /patients/:id/documents` | Sim para o cabeçalho e anexos; o `dossier` novo só agrega e acrescenta WhatsApp |

### 4.2 `GET /agenda/day?date=`

```json
{
  "date": "2026-10-09", "serverNow": "2026-10-09T10:42:00-03:00",
  "professionals": [
    { "id": "…okada", "name": "Dra. Beatriz Okada", "shortName": "Dra. Okada", "specialty": "Cardiologia", "room": "Sala 3", "colorIndex": 2, "slotMinutes": 30,
      "windows": [{ "startsAt": "2026-10-09T09:00:00-03:00", "endsAt": "2026-10-09T12:30:00-03:00" }, { "startsAt": "2026-10-09T13:30:00-03:00", "endsAt": "2026-10-09T19:00:00-03:00" }] }
  ],
  "appointments": [
    { "id": "…a1", "code": 1042, "patientId": "…", "patientName": "Eduardo Brandão", "professionalId": "…okada", "date": "2026-10-09",
      "startsAt": "2026-10-09T15:30:00-03:00", "endsAt": "2026-10-09T16:00:00-03:00", "durationMinutes": 30,
      "type": "CONSULTA", "typeLabel": "Consulta · palpitações", "status": "smartfill", "rawStatus": "CONFIRMADA",
      "payer": { "kind": "conv", "label": "Unimed" },
      "confirmedAt": "2026-10-09T10:42:00-03:00", "checkedInAt": null, "cancelledAt": null,
      "smartFillAt": "2026-10-09T10:42:00-03:00", "replacesPatientName": "Cláudia Reis", "eta": null },
    { "id": "…a0", "code": 1031, "patientName": "Cláudia Reis", "professionalId": "…okada", "startsAt": "2026-10-09T15:30:00-03:00",
      "status": "cancelada", "rawStatus": "CANCELADA", "cancelledAt": "2026-10-09T10:39:00-03:00", "…": "…" }
  ],
  "freeSlots": [
    { "professionalId": "…ramos", "startsAt": "2026-10-09T13:00:00-03:00", "durationMinutes": 30, "cancelledPatientName": null },
    { "professionalId": "…okada", "startsAt": "2026-10-08T09:30:00-03:00", "durationMinutes": 30, "cancelledPatientName": "Paulo Vasques" }
  ],
  "stats": { "capacity": 78, "filled": 60, "free": 18, "cancelled": 1, "smartFilled": 1 }
}
```

Regras: `freeSlots` = mesma lógica de `ListSlotsService` para cada profissional com janela no dia (slots passados incluídos — o front desabilita); `cancelledPatientName` = consulta `CANCELADA` que começa no mesmo instante e não foi reposta; `replacesPatientName` = consulta `CANCELADA` do mesmo profissional/horário quando a nova foi criada depois do cancelamento **[GAP** até existir Smart Fill, derivar por coincidência de horário**]**. `status` já vem mapeado pelo servidor (tabela 1.1) para a UI não reimplementar a regra.

### 4.3 `GET /agenda/week?from=&professionalId?=`

`from` deve ser segunda-feira (`422 VALIDATION_FAILED` caso contrário); cobre `from..from+5`.

```json
{
  "from": "2026-10-05", "to": "2026-10-10",
  "days": [
    { "date": "2026-10-09", "weekdayLabel": "Sex",
      "stats": { "capacity": 78, "filled": 60, "free": 18, "cancelled": 1, "smartFilled": 1 },
      "heat": [{ "hour": 7, "ratio": 1, "count": 3 }, { "hour": 8, "ratio": 0.67, "count": 7 }, { "hour": 12, "ratio": 1, "count": 1 }, { "hour": 18, "ratio": null, "count": 0 }],
      "appointments": [ { "…": "AgendaAppointment, mesmo shape de 4.2" } ] }
  ]
}
```

`heat[].ratio` = minutos ocupados por consultas não canceladas ÷ minutos de janela na hora (todos os profissionais, ou só o filtrado); `null` quando a janela é 0. Com `professionalId`, `stats` e `heat` são do profissional (visão Médico) e o front calcula "utilização da semana" somando os dias.

### 4.4 `GET /agenda/summary?date=`

```json
{ "date": "2026-10-09",
  "occupancy": { "filled": 60, "capacity": 78, "smartFilled": 1 },
  "freeSlots": { "count": 10, "next": { "startsAt": "2026-10-09T13:00:00-03:00", "professionalId": "…ramos" } },
  "possibleFills": 7,
  "waitlist": { "total": 7, "byProfessional": { "…okada": 3, "…ramos": 2, "…helena": 2, "…menezes": 0 } } }
```

`freeSlots.count` só conta slots **futuros** (`startsAt > serverNow`). `possibleFills = Σ min(freeSlots futuros do profissional, waitlist do profissional)`. **[GAP]** sem lista de espera, `waitlist = { total: 0, byProfessional: {} }` e `possibleFills = 0`; o card mostra "—" e o link para o Comms some.

### 4.5 `GET /agenda/appointments/:id/dossier`

```json
{
  "appointment": { "…": "AgendaAppointment" },
  "patient": { "id": "…", "name": "Ana Ribeiro", "age": 36, "phone": "(11) 98628-9929", "lastVisitAt": "2026-09-12T10:00:00-03:00" },
  "history": { "bullets": ["Dermatite atópica em controle desde 2023; última crise em jun/2026.", "Mapeamento de nevos anual: 2 lesões em acompanhamento (dorso)."], "allergies": ["Penicilina"] },
  "exams": [
    { "documentId": "…d1", "title": "Dermatoscopia · dorso", "type": "EXAME_IMAGEM", "issuedAt": "2026-09-22", "thumbnailKind": "image", "thumbnailUrl": null },
    { "documentId": "…d2", "title": "Hemograma + VHS", "type": "EXAME_LABORATORIAL", "issuedAt": "2026-09-15", "thumbnailKind": "lab", "thumbnailUrl": null }
  ],
  "whatsapp": {
    "status": { "tone": "ok", "text": "Confirmado 08:14" },
    "messages": [
      { "from": "copilot", "at": "2026-10-09T07:30:00-03:00", "text": "Olá, Ana. Sua consulta com Dra. Helena é sex 09/10 às 11:30. Responde SIM para confirmar…" },
      { "from": "patient", "at": "2026-10-09T08:13:00-03:00", "text": "SIM" },
      { "from": "copilot", "at": "2026-10-09T08:14:00-03:00", "text": "Perfeito, confirmado para sex 09/10 às 11:30. Sala 1, chegue 10 min antes." }
    ] }
}
```

Fontes: `patient.age` de `Patient.birthDate`; `lastVisitAt` = última `CONCLUIDA` do paciente; `exams` = `Document` do paciente com `type IN (EXAME_*, LAUDO)` ordenados por `createdAt desc`, limite 4, `thumbnailKind` por `type` + `mimeType` (`image/*` → `image`, laboratorial → `lab`, laudo cardio → `ecg`, resto → `pdf`); `history` **[GAP]** sem prontuário: devolver `bullets: []` e `allergies: []` → o drawer mostra "Sem resumo clínico integrado" + `Patient.notes`; `whatsapp` = `Notification` da consulta (`channel = WHATSAPP`) + resposta **[GAP** só a mensagem enviada existe; `messages` com 1 item e `status` derivado de `NotificationStatus`: `ENVIADA`→`warn "Enviado HH:MM, sem resposta"`, `RESPONDIDA`→`ok`, `FALHOU`→`bad`**]**.

### 4.6 `POST /agenda/slots/hold` e `DELETE /agenda/slots/hold/:id` **[GAP]**

```json
// POST body
{ "professionalId": "…ramos", "startsAt": "2026-10-09T13:00:00-03:00", "durationMinutes": 30 }
// 201
{ "id": "…h1", "professionalId": "…ramos", "startsAt": "…", "endsAt": "…", "expiresAt": "2026-10-09T13:00:00-03:00", "status": "HELD", "offeredTo": [] }
```

Modelo expand-only `slot_holds(id, professional_id, starts_at, ends_at, created_by_id, status HELD|OFFERED|FILLED|RELEASED, expires_at)`; a `ListSlotsService` passa a descontar holds ativos; `409 APPOINTMENT_SLOT_CONFLICT` se o horário já tiver consulta. Fase 4 pode nascer sem isso: o front mantém o `encaixe` só em memória (comportamento do protótipo) e o toast avisa "reserva local".

### 4.7 Erros

Mesmo envelope do `AllExceptionsFilter`: `VALIDATION_FAILED` 400 (`from` não é segunda; `date` inválida), `RESOURCE_NOT_FOUND` 404 (dossier), `INVALID_STATUS_TRANSITION` 422 (confirmar algo já `CHECK_IN`), `APPOINTMENT_SLOT_CONFLICT` 409 (hold/reschedule), `FORBIDDEN_ROLE` 403 (`PROFISSIONAL` pedindo outro `professionalId`).

---

## 5. Atalhos e acessibilidade

### 5.1 Keymap global (ordem exata do protótipo)

| Tecla | Condição | Efeito |
|---|---|---|
| `Ctrl/Cmd+K` | sempre | alterna a paleta |
| — | paleta ou atalhos abertos · `input`/`textarea` · modificador | retorna |
| `/` · `?` | — | paleta · atalhos |
| `Esc` | drawer aberto → fecha e devolve o foco ao bloco; senão desseleciona |
| `Z` | — | undo do toast ativo |
| `T` | — | `cursor = hoje` |
| `1` `2` `3` | — | Dia / Semana / Médico (troca instantânea; `cursor` e `selectedId` sobrevivem) |
| `←` `→` | — | ±1 dia em Dia, ±7 em Semana/Médico |
| `↑` `↓` | — | consulta anterior/seguinte na lista ordenada da visão (`date, startsAt, índice do profissional`; desmarcadas ficam fora); com o drawer aberto, **troca o conteúdo do drawer** sem fechá-lo |
| `Enter` | foco em `button`/`a` → deixa o clique nativo agir | sem drawer: abre o drawer do selecionado; com drawer: executa a ação primária |

Dentro do drawer: `Tab`/`Shift+Tab` ciclam entre os focáveis (trap manual no `onKeyDown` do painel); foco inicial no botão primário (`data-autofocus`) 30 ms após abrir (depois da transição começar). Paleta: `↑↓ Enter Esc`. Atalhos: `Esc ?`.

### 5.2 ARIA

| Elemento | Atributos |
|---|---|
| Segmented switch / seletor de profissional | `role=radiogroup aria-label` + `role=radio aria-checked` |
| Bloco | `button[data-aid] aria-label="{nome}, {HH:MM}, {profissional}, {status}"`, `aria-current="true"` no selecionado |
| Vaga livre | `aria-label="Horário livre HH:MM com Dr. X[, Fulano desmarcou][, já passou | , reservar para encaixe]"`; passada = `disabled` |
| Callout Smart Waitlist | `button aria-label="Vaga ociosa preenchida automaticamente via Smart Waitlist, paciente Mariana Costa. Abrir detalhes."` |
| Célula da semana | `role=group aria-label="sex 10:00, 81% ocupado, 7 consultas"` |
| Cabeçalho do dia (Semana) | `button aria-label="Abrir sexta-feira, 9 de outubro na visão Dia"` |
| Drawer | `section[role=dialog][aria-modal=true][aria-label="Consulta de {nome}"] tabindex=-1`; wrapper `aria-hidden` + `visibility:hidden` quando fechado (sai da ordem de Tab) |
| Linha "agora" | `aria-hidden`; a hora já está no relógio do header (`aria-live=off`) |
| Botão "Hoje" | `aria-pressed` quando o cursor já é hoje |
| Thumbnails | `aria-hidden`; o título do exame é o texto do botão |

### 5.3 Cor nunca sozinha

Status = borda/fundo **+** ícone **+** rótulo escrito (bloco ≥ 54 px, chip da semana via `aria-label`, drawer sempre). Heat map = cor **+** `%` escrito em cada célula e no cabeçalho. Vaga aberta por desmarcação = borda carmim **+** nome riscado **+** ícone `CalendarX2`. Smart Waitlist = índigo **+** `Zap` **+** texto do callout. Linha "agora" = cor **+** etiqueta `10:42`.

### 5.4 Contraste a confirmar no PR

Além da tabela da tela 1: texto `text-faint` sobre o heat map a 42 % de esmeralda (célula cheia) — medir; se < 4.5:1, trocar o `%` para `text-fg/70`. Bloco `concluida` (`text-muted` sobre `bg-sunken`) ≈ 6:1 ok. Bloco `agendada` dashed `warn/40` no escuro: borda ≈ 3:1 ok para componente.

---

## 6. Checklist de craft

- [ ] Troca de visão `1/2/3` sem refetch bloqueante (`placeholderData: keepPreviousData`) e sem perder `cursor`/`selectedId`.
- [ ] Drawer abre/fecha em 300 ms com `transform` apenas; a grade **não** muda de largura (`position: fixed`, nada de `margin-right`). Medir CLS = 0 ao abrir/fechar 10 vezes.
- [ ] Drawer fechado não recebe foco por `Tab` (`visibility: hidden` após 320 ms) e não gera `scrollWidth` extra (wrapper `overflow-hidden`).
- [ ] `body` sem scroll horizontal em 400 px nas três visões; grades rolam no próprio container (`overflow-auto`).
- [ ] Linha "agora" deriva de `useClock` (1 tick/s) e `serverNow`; nunca refetch para mover a linha. Grade abre rolada para `now - 180px`.
- [ ] Bloco de 20 min (26 px) mostra só hora + nome; ≥ 54 px mostra status + tipo. Nada abaixo de 11 px, e 11 px só em hora/rótulo redundante.
- [ ] Desmarcada **nunca** é desenhada como bloco por baixo de outro elemento: ou riscada dentro da vaga livre, ou riscada dentro do bloco `smartfill`.
- [ ] Callout Smart Waitlist não cobre nenhuma vaga clicável (o servidor devolve `freeSlots` normalmente; o front esconde as vagas sob o callout **só** na altura dele — ou, como no protótipo, a grade garante espaço).
- [ ] Vagas passadas aparecem `disabled` e sem hover; futuras mostram `Plus` no hover/foco.
- [ ] `↑↓` com drawer aberto troca o paciente e re-foca o botão primário; `Esc` devolve o foco ao bloco de origem.
- [ ] `Enter` em botão focado não dispara duas vezes (handler global ignora `button`/`a`).
- [ ] Heat map recalcula a partir de `heat[]` do servidor, não de contagem local; legenda e `%` coincidem.
- [ ] `tabular-nums` em horas dos blocos, `%`, contagens, telefone, valores em R$, relógio.
- [ ] Toast 6 s, `Z` desfaz confirmar/check-in/reserva; depois disso `Z` é no-op.
- [ ] Escuro: hachura de fechado visível mas discreta; heat map legível; `color-scheme: dark` em inputs.
- [ ] `prefers-reduced-motion`: sem slide do drawer (aparece no lugar), sem `ping`, sem `anim-pop` no callout.
- [ ] Vitest: `mapStatus`, `primaryAction`, `heatHour` (janela parcial, zero capacidade), `y()`/`HOUR_PX`, `move()` pulando desmarcadas e mantendo o drawer.

### 6.1 Teste visual Playwright (compatível com `apps/web/e2e-tests/visual.spec.ts`)

```ts
test("captura a agenda", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-09T13:42:00.000Z") }); // 10:42 em -03:00
  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    const json = (body: unknown) => route.fulfill({ json: body });
    if (url.includes("/auth/me")) return json(user);
    if (url.includes("/stream")) return route.abort();
    if (url.includes("/agenda/day")) return json(agendaDay);          // fixture = 4.2 completo (hoje, 4 profissionais)
    if (url.includes("/agenda/week")) return json(agendaWeek);        // 4.3, seg 05/10 – sáb 10/10
    if (url.includes("/agenda/summary")) return json(agendaSummary);  // 4.4
    if (url.includes("/dossier")) return json(dossierMariana);        // 4.5
    if (url.includes("/settings")) return json(settings);
    return json({ data: [], meta: {} });
  });
  await page.addInitScript(() => { localStorage.setItem("clinicflow.access", "fake"); localStorage.setItem("clinicflow.refresh", "fake"); });

  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.goto("/agenda");
  await expect(page.getByRole("button", { name: /Mariana Costa, 14:00/ })).toBeVisible();
  await page.screenshot({ path: "shots/21-agenda-dia.png", fullPage: true });

  // Drawer sem deslocar a grade.
  const grid = page.getByRole("button", { name: /Dra. Helena/ }).first();
  const before = await grid.boundingBox();
  await page.getByRole("button", { name: /Vaga ociosa preenchida/ }).click();
  await expect(page.getByRole("dialog", { name: /Consulta de Mariana Costa/ })).toBeVisible();
  await page.waitForTimeout(400);
  expect((await grid.boundingBox())?.x).toBe(before?.x);
  await page.screenshot({ path: "shots/22-agenda-drawer.png" });
  await page.keyboard.press("Escape");

  await page.keyboard.press("2"); await page.waitForTimeout(400);
  await page.screenshot({ path: "shots/23-agenda-semana.png", fullPage: true });
  await page.keyboard.press("3"); await page.waitForTimeout(400);
  await page.screenshot({ path: "shots/24-agenda-medico.png", fullPage: true });

  await page.setViewportSize({ width: 400, height: 900 });
  await page.keyboard.press("1"); await page.waitForTimeout(400);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  await page.screenshot({ path: "shots/25-agenda-mobile.png", fullPage: true });

  await page.evaluate(() => localStorage.setItem("clinicflow.theme", "dark"));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.reload();
  await page.keyboard.press("Control+k"); await page.keyboard.type("ana"); await page.waitForTimeout(300);
  await page.screenshot({ path: "shots/26-agenda-escuro-paleta.png" });
  await page.evaluate(() => localStorage.removeItem("clinicflow.theme"));
});
```

Fixtures em `apps/web/e2e-tests/fixtures/agenda-api.ts` (ao lado de `cockpit-api.ts`), gerados com a mesma semente determinística do protótipo (`rng(date + professionalId)`) para a semana 05–10/10/2026.

---

## Apêndice — Discrepâncias com a API atual

| # | Protótipo | API hoje | Decisão nesta spec |
|---|---|---|---|
| 1 | Visão Dia com 4 colunas, vagas livres e janelas de todos os profissionais numa resposta | `GET /appointments/calendar` (sem vagas, sem janelas) + `GET /appointments/slots` por profissional | `GET /agenda/day` agrega; `calendar` e `slots` continuam para as telas antigas |
| 2 | Heat map por hora e `%` por dia | Nenhum cálculo de capacidade | `heat[]` + `stats` em `GET /agenda/week` (mesma regra do `heat` do cockpit, por hora em vez de meia hora) |
| 3 | Status `smartfill` com "Cláudia Reis · desmarcou" e callout | Sem Smart Fill; `CONFIRMADA` não guarda origem | `smartFillAt`/`replacesPatientName` derivados por coincidência de horário com uma `CANCELADA`; modelo real na Fase 4b |
| 4 | Status `encaixe` ao clicar numa vaga | Não existe reserva de vaga | `slot_holds` + `POST /agenda/slots/hold` (4.6); até lá, reserva só em memória |
| 5 | Resumo "Encaixes possíveis" e "Lista de espera (7)" | Sem lista de espera | `summary.waitlist = { total: 0 }` → card mostra "—" |
| 6 | Resumo do histórico + alergias | Só `Patient.notes` | `history.bullets = []`, drawer cai para `Patient.notes` |
| 7 | Thumbnails de ECG / laboratório / dermatoscopia | `Document` sem miniatura | `thumbnailKind` decide o mock SVG; `thumbnailUrl` quando existir `GET /documents/:id/thumbnail` |
| 8 | Thread de 3 bolhas do WhatsApp | `Notification` só com a mensagem enviada e `status` | `messages` com 1 item e `status` por `NotificationStatus`; conversa completa vem com a tela 3 (Comms) |
| 9 | Pagador (convênio / particular) | Inexistente (igual à tela 1) | `payer: null` → drawer omite |
| 10 | Idade e telefone no drawer | `Patient.birthDate` opcional, `phone` obrigatório | `age: null` quando sem data |
| 11 | Dermato com slots de 20 min | `Professional.defaultDurationMinutes` existe | `slotMinutes` por profissional já sai sem migração |
| 12 | Janela semanal `from` = segunda | `calendar` aceita qualquer intervalo ≤ 31 dias | `week` valida segunda-feira; o front sempre manda `mondayOf(cursor)` |
| 13 | Semana sem domingo (seg–sáb) | `ScheduleWindow.weekday` 0..6 | Front oculta domingo; se algum profissional tiver janela em `weekday = 0`, a semana vira 7 colunas (flag `includeSunday` no `week`) |
| 14 | `PROFISSIONAL` vê só a própria agenda | Sem regra por perfil no `calendar` | Guard força `professionalId = user.professionalId` em `day`/`week`/`summary` |
