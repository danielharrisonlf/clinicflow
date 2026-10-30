# Tela 3 — Centro de Resgate de Receita · Handoff de engenharia

Fonte da verdade visual: protótipo interativo `screens/03-revenue-rescue.html` (React 18 + Tailwind + lucide-react, arquivo único). Tokens, atoms, header, paleta, toast e regras de motion são **os mesmos do Cockpit** — este documento só descreve o que a tela 3 acrescenta e aponta para `cockpit-handoff.md` (seções 1.1–1.9) para o compartilhado. Lacunas no backend estão marcadas com **[GAP]**.

Rota alvo: `/comms` (entrada nova em `apps/web/src/App.tsx`). Perfil: `RECEPCAO` e `GESTOR`. Item de nav "Comms" com badge = conversas em aberto (`aguardando + humano`).

Tese da tela: **o Copilot confirma, remarca e repõe vagas sozinho; a recepção só entra quando ele chama.** Tudo na interface prova isso: a linha do tempo mostra cada decisão da IA como evento de sistema com horário, e o botão "Assumir conversa" é a única porta para o humano.

---

## 1. Tokens e classes-chave desta tela

Reaproveita integralmente 1.1 (cores), 1.2 (`@theme`), 1.4 (raios), 1.6 (sombras), 1.8 (motion) do Cockpit. Acréscimos:

### 1.1 Papéis de cor por estado de conversa

| Estado (`ConversationState`) | Chip | Tom | Ícone |
|---|---|---|---|
| `confirmado` | "Confirmado" | `ok` | `CalendarCheck` |
| `reagendado` | "Reagendado pela IA" | `ai` | `Sparkles` |
| `aguardando` | "Aguardando" | `muted` | `Clock` |
| `humano` (escalado) | "Precisa de humano" | `warn` | `Hand` |
| `human === true` (qualquer estado) | "Humano no controle" | `fg` (`border-fg/20 bg-fg/[0.06] text-fg`) | `UserRound` |

Carmim (`bad`) aparece só em eventos de desmarcação (`CalendarX2`) e na urgência "Alta" da fila. Índigo continua sendo "coisa que a IA fez".

### 1.2 Bolhas de chat (tinta WhatsApp a partir de tokens)

| Autor | Classes | Rótulo acima |
|---|---|---|
| Paciente (`in`) | `rounded-2xl rounded-bl-md border border-fg/[0.08] bg-surface text-fg` + `Avatar 24` à esquerda | primeiro nome, 11/500 `text-muted` |
| Copilot (`out`) | `rounded-2xl rounded-br-md border border-ok/15 bg-ok/[0.1] text-fg` (a "bolha verde" sem cor literal) | `Sparkles` + "Copilot", 11/500 `text-ai` |
| Humano (`human`) | `rounded-2xl rounded-br-md border border-fg/90 bg-fg text-bg` | `UserRound` + "Carla · recepção", 11/500 `text-fg` |
| Evento de sistema (`sys`) | linha `py-1 pl-1 text-[12px] text-muted`: ícone 20 px redondo (`border-fg/[0.08] bg-surface`, cor pelo `tone`) + texto + hora mono 11 faint | — |
| Digitando | mesma bolha do autor, `h-8`, três pontos `anim-dot` (1.2 s, delay 0/150/300 ms) | — |

Texto da bolha 13/400 `leading-snug`, `max-w-[82%]`. Hora mono 11 abaixo. Raciocínio da IA: `<details>` nativo `rounded-lg border-ai/20 bg-ai/[0.06]`, summary "Como a IA decidiu" 12/500 `text-ai` com `ChevronDown` que gira em `group-open`.

### 1.3 Novo keyframe

```css
@keyframes dot { 0%, 80%, 100% { opacity: .25; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-2px); } }
.anim-dot { animation: dot 1.2s ease-in-out infinite; }
```

Entra na lista de `prefers-reduced-motion` ao lado de `enter/flash/pop/ping/pulse`. Em v4: `--animate-dot: dot 1.2s ease-in-out infinite`.

### 1.4 Tipografia adicional

| Tamanho | Uso |
|---|---|
| 22 mono 500 | cronômetro do Smart Fill (menor que os 26 do Cockpit: o card é lateral) |
| 15 sans 600 | nome do paciente no cabeçalho da conversa |
| 13 sans 400 | corpo das bolhas; input do compositor |
| 11 sans 500 uppercase `tracking-[0.06em]` | separadores de dia na linha do tempo ("consulta de amanhã · sábado, 10 de outubro", "Copilot pausado · você responde") |

Piso 12 px mantido; 11 px apenas em horas, `Kbd`, iniciais, rótulos de autor (redundantes com a posição da bolha) e separadores.

### 1.5 Estados novos

| Elemento | Repouso | Hover | Foco visível | Selecionado |
|---|---|---|---|---|
| Linha de conversa (`li[data-cid]`) | `border-transparent` sobre `bg-sunken/60` | `border-fg/[0.1] bg-surface` | `border-ai/50 ring-[3px] ring-ai/15` | idem + `bg-surface` + `aria-current="true"` |
| Filtro | `border-fg/[0.1] bg-surface text-fg/80` | `bg-sunken` | `ring-2 ring-ai/40` | `border-fg/90 bg-fg text-bg` + `aria-pressed` (Kbd invertido) |
| Compositor | `border-fg/[0.08] bg-sunken`, input `disabled` | — | — | com humano: `border-fg/[0.14] bg-surface focus-within:border-ai/50 focus-within:ring-[3px] focus-within:ring-ai/15` |
| Item da fila (`li[data-wid]`) | `border-fg/[0.08] bg-surface` | `border-fg/[0.14]` | `border-ai/50 ring-[3px] ring-ai/15` | — |
| Botão "Enviar" | `bg-fg text-bg` 28 px | `bg-fg/85` | `ring-2 ring-ai/40` | `disabled:opacity-30` sem texto ou sem humano |

---

## 2. Anatomia

Container: `main max-w-[1680px] px-4 sm:px-6 pt-4 pb-24 flex-col gap-4`. Header idêntico ao Cockpit (2 linhas); a linha 2 troca o seletor de dia por um segmento **Hoje | Amanhã · sáb 10/10** (amanhã ativo, `aria-current`), a data por extenso, "ao vivo · HH:MM:SS" e o chip `Copilot ativo · N% resolvido sem humano` (`border-ai/20 bg-ai/[0.06]`).

### 2.1 KPIs de resgate (`section[aria-label="Resgate de receita de amanhã"]`)

Mesma estrutura dos vitais (`grid gap-px bg-fg/[0.08] rounded-2xl`), `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`:

| # | Ícone | Rótulo | Valor | Tom | Sub |
|---|---|---|---|---|---|
| 1 | `MessagesSquare` | Conversas de amanhã | `total` (34) | — | "sáb 10/10 · todas pelo WhatsApp" |
| 2 | `CalendarCheck` | Confirmadas | `confirmado` (29) | `ok` | "`85%` da agenda, sem ligação" |
| 3 | `Sparkles` | Reagendadas pela IA | `reagendado` (3 → 4 ao vivo) | `ai` | "vagas trocadas, nenhuma cadeira vazia" (flash ao subir) |
| 4 | `Clock` | Aguardando resposta | `aguardando + humano` (2 → 1) | `warn` se há escalação | "`1` precisa de humano" / "nenhuma escalação aberta" |
| 5 | `Wallet` | Receita protegida | `brl(revenue)` | `ok` | "confirmadas e remarcadas, por ticket" (flash ao subir) |

`revenue = Σ (particular → valor; convênio → ticket médio da clínica)` sobre `confirmado + reagendado`. **[GAP]** sem pagador nem ticket; ver apêndice.

### 2.2 Barra de filtros

`role=group`, botões `h-8` com `Kbd 1–5` + rótulo + contagem mono 11: Todas · Precisa de humano · Reagendadas · Confirmadas · Sem resposta. Filtro ≠ ordenação: a lista é sempre ordenada por `humano → aguardando → reagendado → confirmado`, depois `lastAt desc`.

### 2.3 Painel esquerdo — Conversas (`section[aria-label="Conversas de amanhã"]`)

`rounded-2xl border-fg/[0.06] bg-sunken/60`, altura `md:h-[calc(100dvh-262px)] md:min-h-[520px]`, lista `overflow-y-auto` (`max-h-[70dvh]` no telefone). Cabeçalho: `MessageCircle` + "Conversas" + filtro ativo em faint + contagem.

Linha (`li[tabindex=0][data-cid]`, `p-2.5 gap-2.5`): `Avatar 32` · nome 14/500 `truncate` + tempo relativo mono 11 faint ("agora", "há 12 min", "há 2 h") · hora mono 12 + `DocTag` + (se remarcada) `→ seg 12/10 · 15:00` mono `text-ai` · prévia 12 faint `truncate` **ou** "digitando" / "Copilot escrevendo" com `Dots` em `text-ai` · `StateChip`. Vazio (filtro sem resultados): tracejado com `CheckCheck` ok "Ninguém sem resposta. O Copilot está em dia."

### 2.4 Painel central — Linha do tempo (`section[aria-label="Conversa com {nome}"]`)

`rounded-2xl border-fg/[0.08] bg-surface shadow-card`, `flex-col overflow-hidden`, mesma altura do painel esquerdo.

**Cabeçalho** (`border-b px-3 sm:px-4 py-2.5`, `flex-wrap`): botão voltar (`ArrowLeft`, `md:hidden`) · `Avatar 36` · nome 15/600 + `StateChip` · linha de metadados 12 muted (`sáb 10/10 · 14:30`, `→ novo horário` em ai, `DocTag`, `Payer`, tipo em faint) · à direita **"Assumir conversa `T`"** (primário) ou, com humano, **"Devolver ao Copilot `Esc`"** (secundário).

**Timeline** (`ol[aria-live=polite][aria-relevant=additions]`, `flex-1 overflow-y-auto px-3 sm:px-4 py-3 gap-2`): separador de dia → mensagens em ordem cronológica, `sys` e bolhas intercalados (1.2) → `TypingRow` se `typing` → separador "Copilot pausado · você responde" se `human`. Rola para o fim a cada nova mensagem (`scrollTop = scrollHeight`).

Sequência canônica de uma remarcação autônoma (Paula Siqueira, toca ao vivo):

| t | Tipo | Ícone / tom | Conteúdo |
|---|---|---|---|
| 08:00 | sys | `Send` muted | Lembrete de confirmação enviado · modelo 24h |
| 08:00 | out | Copilot | "Olá, Paula! … Responda 1 para confirmar ou 2 para remarcar." |
| 08:14 | sys | `CheckCheck` muted | Lida pela paciente |
| +3 s | typing in | — | — |
| +6 s | in | Paula | "Oi, de tarde não vou conseguir. Tem algo de manhã?" |
| +6 s | sys | `MessageCircle` ai | Intenção detectada: remarcar · preferência: manhã |
| +8 s | typing out | — | — |
| +10 s | out + `reasoning` | Copilot + `Sparkles` | "Claro, Paula! Tenho dois horários de manhã… 09:00 ou … 08:30." / "Considerou: preferência por manhã, convênio Unimed, Dra. Helena tem 2 vagas…" |
| +17 s | in | Paula | "Sábado 9h, perfeito" |
| +19 s | sys | `CalendarCheck` ok | Consulta remarcada: 14:30 → 09:00 · sáb 10/10 |
| +19 s | sys | `Database` ai | Agenda atualizada · vaga 14:30 liberada para o Smart Fill · zero intervenção humana |
| +20 s | out | Copilot | "Pronto, Paula! Remarcado para sábado 10/10 às 09:00…" + toast `Sparkles` |

Escalação (Marcelo Tavares): confirmou → perguntou preço de crioterapia → `sys TriangleAlert warn` "Escalado para humano · motivo: pergunta sobre preço e cobertura (fora da política do Copilot)" → Copilot avisa que a recepção responde → estado `humano`. Smart Fill (Eduardo Brandão, hoje 15:30, aberto pelo botão do card): `CalendarX2 bad` desmarcação → `Zap ai` posição na fila → oferta com raciocínio → `CheckCheck` → aceite +28 s → `CalendarCheck ok` → confirmação.

**Compositor** (`form border-t p-2.5 sm:p-3`): caixa `rounded-xl` com ícone (`Sparkles` ai sem humano, `UserRound` com humano), `input h-10` 13 px, botão `Send` 28 px. Placeholder sem humano: "O Copilot responde sozinho. Assuma a conversa para escrever."; com humano: "Mensagem para {primeiro nome}…". Dica abaixo 12 faint: `T assume a conversa · o paciente não percebe a troca` / `↵ envia · Esc devolve ao Copilot`. Enviar faz eco local (`human` bubble) e atualiza prévia e `lastAt`.

Vazio (sem seleção): painel centrado "Selecione uma conversa para ver a linha do tempo do Copilot."

### 2.5 Painel direito — Fila de espera dinâmica (`aside[aria-label]`)

`rounded-2xl border-fg/[0.06] bg-sunken/60 p-2 flex-col gap-3`; `xl:h-[calc(100dvh-262px)] xl:overflow-y-auto`; em `md` ocupa a largura toda abaixo (`md:col-span-2`) e os grupos ficam em `md:grid-cols-3`. Cabeçalho: `ListOrdered` + título + contagem + dica `Alt ↑ ↓ reordena` (`sm+`).

**Smart Fill run** (`shrink-0`, `p-3.5`, glow ai/ok como no Cockpit): `Zap` + "Smart Fill · 15:30" + status (`Pulse ai` "Em andamento" / ok "Vaga reposta") · `DocTag` + "Cláudia Reis desmarcou às 10:39" · cronômetro 22 mono + "meta 08:00" · `Meter` (`elapsed/480`) · **timeline de ofertas** (linha vertical, ícone 20 px, texto 12, hora mono 11): desmarcou → oferta Eduardo (1º) → oferta Lívia (2ª) → Eduardo leu → *(+28 s)* Eduardo aceitou → Agenda atualizada · Lívia dispensada · candidatos numerados com status (`Lida`, `Respondendo…` com `Dots`, `Aceitou 15:30`, `Enviada`, `Na fila`, `Dispensada`) · botão "Ver conversa com Eduardo" (abre a conversa de hoje no painel central).

**Grupos** `Alta` (`bad`, "sintoma ativo ou prazo clínico") · `Média` (`warn`, "retorno ou procedimento eletivo") · `Flexível` (`muted`, "aceita qualquer data"), cada um `h3` + sub + contagem; vazio: "Fila vazia".

Item (`li[tabindex=0][data-wid]`, `rounded-xl bg-surface p-2.5 gap-2`): `Avatar 28` + nome 13/500 + "N dias" mono 11 · procedimento 12 muted · `DocTag` + "· período" · `Meter` do score (tom `bad ≥ .8`, `warn ≥ .5`, `muted`) + número mono 11 (`aria-label="Prioridade 92 de 100"`) · chips: pagador (`muted`), `ok Zap` "aceita encaixe", `ai Send` "oferta enviada HH:MM" (após ofertar) · botão `O Oferecer próxima vaga` (`h-7`, desabilita e vira "Oferta enviada") + setas `ChevronUp/Down` (28 px, `disabled` nos extremos). `Alt+↑/↓` no item focado reordena **dentro do grupo**; foco permanece no item.

### 2.6 Responsivo

| Breakpoint | Layout |
|---|---|
| `< 768` | Uma coluna. `view = "list"`: KPIs (2 col), filtros, lista (`max-h-[70dvh]`), fila abaixo. `view = "thread"`: só a conversa, com botão voltar; `Esc` volta. `Enter`/duplo clique numa linha abre |
| `md ≥ 768` | `grid-cols-[300px_minmax(0,1fr)]`: lista + conversa com altura fixa; fila em linha própria (`col-span-2`), grupos em 3 colunas; nav e footer de atalhos visíveis |
| `lg ≥ 1024` | KPIs em 5 colunas |
| `xl ≥ 1280` | `grid-cols-[320px_minmax(0,1fr)_340px]`: fila vira coluna direita rolável |

Sem scroll horizontal em 400 px (verificado: `scrollWidth - innerWidth = 0` nos três viewports).

---

## 3. Arquitetura de estado

### 3.1 `apps/web/src/features/comms/types/comms.ts`

```ts
import type { SmartFillRun, SmartFillCandidate, Payer, Tone } from "../../cockpit/types/cockpit"; // reuso

export type ConversationState = "confirmado" | "reagendado" | "aguardando" | "humano";
export type MessageKind = "in" | "out" | "human";
export type Channel = "WHATSAPP" | "WEB" | "TELEFONE" | "SISTEMA";

export interface Message {
  id: string;
  kind: MessageKind;
  at: string;                   // ISO com offset
  text: string;
  /** Só em `out`: explicação curta da decisão, exibida em <details>. */
  reasoning: string | null;
  /** WhatsApp: enviado / entregue / lido. */
  delivery: "sent" | "delivered" | "read" | null;
  providerMessageId: string | null;
}

export type AgentStepKind =
  | "reminder_sent" | "read" | "intent_detected" | "slots_offered" | "rescheduled"
  | "confirmed" | "agenda_updated" | "escalated" | "takeover" | "released"
  | "waitlist_opened" | "offer_sent" | "offer_accepted" | "offer_declined" | "resend_scheduled";

export interface AgentStep {
  id: string;
  kind: AgentStepKind;
  at: string;
  text: string;                 // já localizado pelo backend
  icon: string;                 // lucide: Send | CheckCheck | MessageCircle | Sparkles | CalendarCheck | Database | TriangleAlert | Hand | CalendarX2 | Zap
  tone: Tone;
  /** Dados estruturados do passo (slots oferecidos, novo horário, motivo da escalação). */
  payload: Record<string, unknown> | null;
}

export type TimelineItem = ({ type: "message" } & Message) | ({ type: "step" } & AgentStep);

export interface Escalation {
  id: string;
  reason: "price_question" | "coverage_question" | "clinical_question" | "complaint" | "unknown_intent" | "manual";
  openedAt: string;
  taskId: string;               // Task(type = CONTATO_HUMANO) [GAP]
  resolvedAt: string | null;
}

export interface Conversation {
  id: string;
  patientId: string;
  patientName: string;
  phone: string;                // mascarado: "+55 11 •••••-4321"
  appointmentId: string;
  professionalId: string;
  startsAt: string;             // horário vigente da consulta
  rescheduledFrom: string | null;
  typeLabel: string;
  payer: Payer | null;
  state: ConversationState;
  /** true quando um humano assumiu; o Copilot não responde até `release`. */
  humanInControl: { userId: string; userName: string; since: string } | null;
  escalation: Escalation | null;
  typing: "in" | "out" | null;  // via SSE
  lastMessageAt: string;
  preview: string;
  unread: number;
}

export interface ConversationDetail extends Conversation {
  timeline: TimelineItem[];
}

export type WaitlistUrgency = "alta" | "media" | "flex";
export interface WaitlistEntry {
  id: string;
  patientId: string;
  patientName: string;
  urgency: WaitlistUrgency;
  procedureLabel: string;
  professionalId: string | null;      // null = qualquer da especialidade
  specialty: string;
  preferredPeriod: "manha" | "tarde" | "qualquer";
  acceptsSqueeze: boolean;            // "aceita encaixe"
  payer: Payer | null;
  score: number;                      // 0..1, calculado no backend
  position: number;                   // dentro do grupo de urgência
  createdAt: string;                  // "esperando há N dias"
  lastOfferAt: string | null;
  lastOfferStatus: "sent" | "accepted" | "declined" | "expired" | null;
}

export interface CommsSummary {
  date: string;                       // AAAA-MM-DD (amanhã)
  total: number;
  confirmed: number;
  rescheduledByAi: number;
  waiting: number;
  needsHuman: number;
  revenueProtectedCents: number;
  autonomyPct: number;                // (confirmed + rescheduledByAi) / total
}

export type { SmartFillRun, SmartFillCandidate };
```

### 3.2 Chaves (`apps/web/src/lib/query.ts`)

```ts
comms: {
  all: ["comms"] as const,
  summary: (date: string) => ["comms", "summary", { date }] as const,
  conversations: (date: string, state?: ConversationState) => ["comms", "conversations", { date, state }] as const,
  conversation: (id: string) => ["comms", "conversation", id] as const,
  waitlist: ["comms", "waitlist"] as const,
  smartFill: ["cockpit", "smart-fill", "active"] as const, // mesma chave do Cockpit: um único cache
},
```

### 3.3 Hooks (`features/comms/hooks/`)

| Hook | Query | Observações |
|---|---|---|
| `useCommsSummary(date)` | `commsApi.summary(date)` | `refetchInterval: 60_000`; o KPI "Reagendadas" faz `anim-flash` quando o valor sobe acima do primeiro valor da sessão |
| `useConversations(date, state?)` | `commsApi.conversations(...)` | `placeholderData: keepPreviousData`; o filtro é feito **no servidor** (`?state=`), mas a lista "Todas" é cacheada separadamente |
| `useConversation(id)` | `commsApi.conversation(id)` | `enabled: !!id`; `staleTime: Infinity` enquanto o SSE estiver conectado |
| `useWaitlist()` | `commsApi.waitlist()` | `refetchInterval: 30_000` |
| `useSmartFillRun()` | reuso do Cockpit | `refetchInterval: 10_000` enquanto `running` |
| `useCommsStream()` | `subscribe("/comms/stream")` | ver 3.4 |

Mutations (`use-comms-actions.ts`), todas otimistas com snapshot `{ conversations, conversation, waitlist }` no contexto e rollback em `onError`; `onSettled` invalida `qk.comms.all` (+ `qk.cockpit.all` quando mexe em Smart Fill):

| Ação (tecla) | `mutationFn` | Otimista | Toast / undo |
|---|---|---|---|
| `T` assumir | `commsApi.takeover(id)` | `humanInControl = {me, now}`; step `takeover` (`Hand`, tom `fg`) | "Você assumiu a conversa de {nome} · o Copilot fica em espera" · **undo = release** |
| `Esc` devolver | `commsApi.release(id)` | `humanInControl = null`; se `state === "humano"` → `confirmado`; step `released` (`Sparkles`) | "Copilot retomou a conversa de {nome}" · undo = takeover |
| `↵` enviar | `commsApi.sendMessage(id, {text})` | append `Message{kind:"human", delivery:null}`; `preview`, `lastMessageAt` | sem toast; falha reverte e mostra `message` |
| `O` oferecer | `commsApi.offerNextSlot(entryId)` | `lastOfferAt = now`, `lastOfferStatus = "sent"` | "Oferta enviada a {nome} pela próxima vaga de {Dr.} · o Copilot acompanha a resposta" · undo = `cancelOffer` |
| `Alt+↑/↓` | `commsApi.reorderWaitlist(entryId, {position})` | swap dentro do grupo | "{nome} subiu/desceu na fila alta" · undo = posição anterior |

Undo no protótipo é snapshot puro de cliente (6 s); no app cada undo chama a mutação inversa listada acima.

### 3.4 Stream

`GET /comms/stream` (SSE, `subscribe()` do `client.ts`). Frames:

```ts
type CommsFrame =
  | { kind: "conversation"; data: Conversation }                       // lista: upsert por id
  | { kind: "timeline"; conversationId: string; item: TimelineItem }   // detalhe: append
  | { kind: "typing"; conversationId: string; who: "in" | "out" | null }
  | { kind: "summary"; data: CommsSummary }
  | { kind: "waitlist"; data: WaitlistEntry[] }
  | { kind: "smart-fill"; data: SmartFillRun | null };
```

`typing` **não** persiste; é só evento. Fallback: `refetchInterval` dos hooks.

### 3.5 Layout de arquivos

```
apps/web/src/features/comms/
├─ comms-page.tsx
├─ types/comms.ts
├─ api/comms-api.ts
├─ hooks/{use-comms-summary,use-conversations,use-conversation,use-waitlist,use-comms-stream,use-comms-actions,use-comms-keymap,use-conversation-navigation}.ts
├─ lib/{state.ts (STATES, ordenação), revenue.ts, format.ts (ago)}
├─ components/
│  ├─ comms-header-row.tsx · rescue-kpis.tsx · filter-bar.tsx
│  ├─ conversation-list.tsx · conversation-row.tsx
│  ├─ thread.tsx · thread-header.tsx · timeline.tsx · bubble.tsx · system-row.tsx · typing-row.tsx · reasoning-details.tsx · composer.tsx
│  ├─ waitlist.tsx · waitlist-entry.tsx · smart-fill-run.tsx
│  └─ (atoms, palette, shortcuts, toast importados de features/cockpit/components)
└─ comms.test.tsx   # ordenação, contagens/receita, move(), reorder dentro do grupo, keymap
```

---

## 4. Contratos REST (NestJS)

Módulo novo `apps/api/src/modules/comms/` (controller + `services/*.service.ts` + `requests/*.request.ts` Zod + `dto/*.dto.ts`). Guard JWT; `@Roles("RECEPCAO","GESTOR")`. Prefixo `api/v1`. Horas ISO com offset via `ClinicTime`.

### 4.1 `GET /comms/summary?date=`

```json
{ "date": "2026-10-10", "total": 34, "confirmed": 29, "rescheduledByAi": 3, "waiting": 1, "needsHuman": 1,
  "revenueProtectedCents": 994000, "autonomyPct": 94 }
```

### 4.2 `GET /comms/conversations?date=&state=&page=&pageSize=`

Envelope paginado padrão (`PageDto`). Ordenação fixa no servidor: `humano, aguardando, reagendado, confirmado`, depois `lastMessageAt desc`.

```json
{ "data": [
  { "id": "0192…c-paula", "patientId": "…", "patientName": "Paula Siqueira", "phone": "+55 11 •••••-4321",
    "appointmentId": "…", "professionalId": "…helena", "startsAt": "2026-10-10T14:30:00-03:00", "rescheduledFrom": null,
    "typeLabel": "Consulta", "payer": { "kind": "conv", "label": "Unimed" }, "state": "aguardando",
    "humanInControl": null, "escalation": null, "typing": null,
    "lastMessageAt": "2026-10-09T08:00:00-03:00", "preview": "Olá, Paula! Aqui é o assistente…", "unread": 0 },
  { "id": "0192…c-marcelo", "patientName": "Marcelo Tavares", "state": "humano",
    "escalation": { "id": "…", "reason": "price_question", "openedAt": "2026-10-09T10:31:00-03:00", "taskId": "…", "resolvedAt": null },
    "preview": "Boa pergunta, Marcelo. Vou pedir para a equipe…", "lastMessageAt": "2026-10-09T10:31:00-03:00", "unread": 1 }
], "meta": { "page": 1, "pageSize": 50, "total": 34 } }
```

### 4.3 `GET /comms/conversations/:id`

`ConversationDetail` com `timeline` cronológica (mensagens e passos intercalados):

```json
{ "id": "0192…c-paula", "...": "…",
  "timeline": [
    { "type": "step", "id": "s1", "kind": "reminder_sent", "at": "2026-10-09T08:00:00-03:00", "text": "Lembrete de confirmação enviado · modelo 24h", "icon": "Send", "tone": "muted", "payload": { "template": "confirmacao-24h", "notificationId": "…" } },
    { "type": "message", "id": "m1", "kind": "out", "at": "2026-10-09T08:00:00-03:00", "text": "Olá, Paula! …", "reasoning": null, "delivery": "read", "providerMessageId": "wamid.…" },
    { "type": "message", "id": "m2", "kind": "in", "at": "2026-10-09T10:42:06-03:00", "text": "Oi, de tarde não vou conseguir. Tem algo de manhã?", "reasoning": null, "delivery": null, "providerMessageId": "wamid.…" },
    { "type": "step", "id": "s2", "kind": "intent_detected", "at": "2026-10-09T10:42:06-03:00", "text": "Intenção detectada: remarcar · preferência: manhã", "icon": "MessageCircle", "tone": "ai", "payload": { "intent": "reschedule", "period": "manha", "confidence": 0.93 } },
    { "type": "message", "id": "m3", "kind": "out", "at": "2026-10-09T10:42:10-03:00", "text": "Claro, Paula! Tenho dois horários…", "reasoning": "Considerou: preferência por manhã, convênio Unimed com grade liberada, Dra. Helena tem 2 vagas livres em 7 dias…", "delivery": "read", "providerMessageId": "…" },
    { "type": "step", "id": "s3", "kind": "slots_offered", "at": "2026-10-09T10:42:10-03:00", "text": "2 horários oferecidos", "icon": "Sparkles", "tone": "ai", "payload": { "slots": ["2026-10-10T09:00:00-03:00", "2026-10-12T08:30:00-03:00"] } },
    { "type": "message", "id": "m4", "kind": "in", "at": "2026-10-09T10:42:17-03:00", "text": "Sábado 9h, perfeito", "reasoning": null, "delivery": null, "providerMessageId": "…" },
    { "type": "step", "id": "s4", "kind": "rescheduled", "at": "2026-10-09T10:42:19-03:00", "text": "Consulta remarcada: 14:30 → 09:00 · sáb 10/10", "icon": "CalendarCheck", "tone": "ok", "payload": { "from": "2026-10-10T14:30:00-03:00", "to": "2026-10-10T09:00:00-03:00", "newAppointmentId": "…" } },
    { "type": "step", "id": "s5", "kind": "agenda_updated", "at": "2026-10-09T10:42:19-03:00", "text": "Agenda atualizada · vaga 14:30 liberada para o Smart Fill · zero intervenção humana", "icon": "Database", "tone": "ai", "payload": { "smartFillRunId": "…" } }
  ] }
```

O protótipo renderiza `slots_offered` dentro do raciocínio da mensagem; o backend pode emitir os dois (mensagem com `reasoning` + step) e o front esconde o step quando a mensagem anterior já carrega `reasoning`.

### 4.4 `POST /comms/conversations/:id/takeover` · `POST …/release`

Sem corpo. Resposta: `ConversationDetail` atualizado. Regras: takeover grava `humanInControl` e insere step `takeover`; o worker do Copilot ignora mensagens recebidas da conversa enquanto `humanInControl != null` (apenas registra). Release limpa, insere step `released` e, se havia `escalation` aberta, resolve a `Task` e muda `state` para o estado derivado da consulta. Erros: `409 CONVERSATION_ALREADY_HUMAN` (outro usuário assumiu; `message` traz o nome), `409 CONVERSATION_NOT_HUMAN` no release.

### 4.5 `POST /comms/conversations/:id/messages`

```json
{ "text": "Oi, Marcelo! A crioterapia fica R$ 320 por sessão e o Bradesco não cobre. Quer manter a consulta amanhã?" }
```

Exige `humanInControl.userId === req.user.id` (`403 NOT_IN_CONTROL`). Cria `Notification{channel: WHATSAPP, body, status: PENDENTE}` + `Message{kind: "human"}`; o status de entrega chega pelo webhook e atualiza `delivery`. Resposta `201 Message`.

### 4.6 Lista de espera **[GAP: modelo inexistente]**

| Método | Rota | Corpo / resposta |
|---|---|---|
| `GET` | `/waitlist?professionalId=&urgency=` | `WaitlistEntry[]` ordenado por `urgency, position` |
| `POST` | `/waitlist` | `{ patientId, urgency, procedureLabel, professionalId?, specialty, preferredPeriod, acceptsSqueeze, notes? }` → `201 WaitlistEntry` |
| `PATCH` | `/waitlist/:id` | campos parciais; `{ position }` reordena dentro do grupo (move os irmãos) |
| `DELETE` | `/waitlist/:id` | `204` (motivo opcional `?reason=scheduled|gave_up`) |
| `POST` | `/waitlist/:id/offer` | `{ slotStartsAt?: string }` — sem slot, o serviço escolhe a próxima vaga livre do profissional/especialidade que casa com `preferredPeriod`. Cria `Notification` + step `offer_sent`; devolve `{ entry, conversationId }`. `409 OFFER_ALREADY_OPEN` |
| `POST` | `/waitlist/:id/offer/cancel` | undo da oferta enquanto não respondida |

Score (`0..1`) calculado no backend: `0.5·urgência + 0.2·dias esperando (cap 14) + 0.15·aceita encaixe + 0.15·já faltou/desmarcou antes`. Front nunca recalcula.

### 4.7 Smart Fill runs

Reuso de `GET /cockpit/smart-fill/active` (Cockpit 4.3) acrescido de `events: AgentStep[]` (timeline de ofertas) e `conversationIds: Record<candidatePatientId, conversationId>` para o botão "Ver conversa". `POST /smart-fill/runs/:id/skip/:candidateId` (dispensar candidato) fica para a fase da fila.

### 4.8 Webhook WhatsApp (inbound)

`POST /webhooks/whatsapp` já existe (`notifications.controller.ts`, HMAC em `x-signature`, `@Public()`), mas só entende "confirmação" (`isConfirmation(dto.message)`) e procura a consulta pelo telefone. Evolução necessária:

1. Resolver a **conversa** (paciente + consulta mais próxima com conversa aberta), não só a consulta.
2. Persistir `Message{kind:"in"}` sempre, mesmo sem intenção reconhecida.
3. Passar o texto ao **Copilot** (worker em `jobs/`, fila BullMQ `comms-agent`): classifica intenção (`confirm | reschedule | cancel | question | price_question | other`), decide passo (`slots_offered`, `rescheduled`, `confirmed`, `escalated`), grava `AgentStep` e `Message{kind:"out", reasoning}` e dispara a `Notification`.
4. Se `humanInControl`, só persiste e emite SSE; nenhuma resposta automática.
5. Eventos de status do provedor (`sent/delivered/read`) atualizam `Message.delivery` e geram step `read` quando for a primeira leitura.
6. Mensagens de "digitando" do provedor (quando suportado) viram frame `typing` no SSE sem persistência.

Resposta continua `{ received: true }` em 200 para qualquer caso válido (o provedor reenvia em erro).

### 4.9 Erros

Envelope RFC 7807 padrão do app. Códigos novos: `CONVERSATION_ALREADY_HUMAN`, `CONVERSATION_NOT_HUMAN`, `NOT_IN_CONTROL`, `OFFER_ALREADY_OPEN`, `WAITLIST_POSITION_OUT_OF_GROUP`.

---

## 5. Atalhos e acessibilidade

### 5.1 Keymap global (`use-comms-keymap.ts`), na ordem do protótipo

| Tecla | Condição | Efeito |
|---|---|---|
| `Ctrl/Cmd+K` | sempre | alterna a paleta |
| — | paleta ou atalhos abertos | retorna |
| `Esc` | foco em `input`/`textarea` e humano no controle | `release` (devolve ao Copilot); outros inputs: retorna |
| — | `meta/ctrl/alt` | retorna (exceto `Alt+↑/↓`, tratado pelo próprio item da fila) |
| `/` · `?` | — | paleta · atalhos |
| `Esc` | — | se humano no controle → `release`; senão `view = "list"` (telefone) |
| `Z` | — | undo do toast ativo |
| `1`–`5` | — | filtro (Todas · Precisa de humano · Reagendadas · Confirmadas · Sem resposta) |
| — | foco dentro de `[data-wid]` | retorna (`O` e setas pertencem ao item da fila) |
| `↓`/`J` · `↑`/`K` | — | `move(±1)` na lista **filtrada**; seleciona e foca a linha |
| `Enter` | conversa selecionada | `view = "thread"` (telefone); no desktop a seleção já abre |
| `T` | conversa selecionada sem humano | `takeover` |

Item da fila (`onKeyDown` local): `Alt+↑/↓` reordena no grupo; `O` oferece. Linha da lista: `Enter` abre, duplo clique abre.

### 5.2 Foco

- Linha de conversa `tabindex=0`; `onFocus` seleciona. Após `move()`, `focusRow(id)` com `scrollIntoView({block:"nearest"})` (sem `smooth` em reduced motion).
- `takeover` move o foco para o input do compositor (`autofocus` controlado por `humanInControl`); `release` devolve à linha selecionada.
- Reordenar mantém o foco no mesmo `li[data-wid]` (rAF após o swap).
- Fechar overlay → foco na linha selecionada. Focus trap nos diálogos (`Dialog` existente ou `focus-trap-react`).

### 5.3 ARIA

| Elemento | Atributos |
|---|---|
| Timeline | `ol[aria-live="polite"][aria-relevant="additions"][aria-label="Linha do tempo da conversa"]` — mensagens novas são lidas; `typing` tem `aria-label` ("Paula digitando" / "Copilot escrevendo") e os pontos são `aria-hidden` |
| Linha de conversa | `aria-label="{nome}, {hora}, {profissional}, {estado}"`, `aria-current="true"` na selecionada |
| Filtros | `role=group` + `aria-pressed` |
| Segmento Hoje/Amanhã | `role=group` + `aria-current="true"` |
| Score | número com `aria-label="Prioridade 92 de 100"`; `Meter` é `role=presentation` |
| Raciocínio | `<details>/<summary>` nativo (teclado e leitor de tela de graça) |
| Compositor | `input[aria-label="Mensagem"]`, `disabled` sem humano; botão `aria-label="Enviar"` |
| Voltar (telefone) | `aria-label="Voltar para a lista"` |
| Clock | `aria-live="off"` |

### 5.4 Cor nunca sozinha

Estado = chip com ícone + texto; urgência = ponto + rótulo; score = barra + número; bolha do Copilot = tinta **e** rótulo "Copilot" com `Sparkles`; bolha humana = fundo invertido **e** rótulo "Carla · recepção"; oferta enviada = chip com `Send` e hora; item reordenado = toast com texto.

### 5.5 Contraste (medir no PR)

Mesmas referências do Cockpit 5.5. Pontos novos: texto 13 `text-fg` sobre `bg-ok/[0.1]` (bolha) ≥ 12:1 nos dois temas; `text-ai` 11/500 sobre `bg-surface` ≥ 4.5:1 (claro 7.0, escuro 6.9); `text-faint` 12 sobre `bg-sunken` ≥ 4.5:1 só para prévia/metadados (já redundantes com a conversa aberta).

---

## 6. Checklist de craft

- [ ] Linha de conversa ≤ 96 px; 34 linhas rolam dentro do painel sem mover KPIs nem filtros.
- [ ] Timeline rola para o fim ao receber mensagem **só se** o usuário já estava no fim (threshold 48 px); caso contrário mostra pílula "Novas mensagens ↓".
- [ ] `aria-live` lê a mensagem nova uma única vez; `typing` não dispara leitura repetida (usa `aria-label` no `li`, não texto vivo).
- [ ] Compositor desabilitado sem humano; `T` habilita e foca; `Esc` dentro do input devolve ao Copilot e não limpa o rascunho.
- [ ] Takeover é visível em **três** lugares: chip no cabeçalho, chip na lista, separador na timeline.
- [ ] KPIs: "Reagendadas" e "Receita protegida" fazem `anim-flash` só quando sobem acima do valor inicial da sessão; "Aguardando" muda para `warn` apenas com escalação aberta.
- [ ] Filtro `5` vazio mostra o estado "Ninguém sem resposta" (não um painel em branco).
- [ ] Fila: `Alt+↑/↓` nunca cruza grupos; setas desabilitadas nos extremos; foco fica no item; toast com undo.
- [ ] "Oferecer próxima vaga" vira "Oferta enviada" + chip com hora; undo reverte os dois.
- [ ] Smart Fill: cronômetro deriva de timestamps + `useClock`; ao preencher, glow muda ai → ok em 700 ms e a timeline ganha dois eventos.
- [ ] `tabular-nums` em horas, contagens, scores, dias, cronômetro, moeda, badge da nav.
- [ ] Telefone 400 px: uma coluna, `view` list/thread, botão voltar, sem scroll horizontal; toast não cobre o compositor (`pb-24`).
- [ ] `md`: fila em linha própria com 3 grupos lado a lado; `xl`: fila rolável à direita com `shrink-0` nos filhos (sem isso o card do Smart Fill é esmagado).
- [ ] `prefers-reduced-motion`: sem `dot/ping/enter/pop`; o roteiro ao vivo não existe no app (o SSE entrega o estado real), mas transições de `Meter` e glow também zeram.
- [ ] Nenhum literal de cor além dos pontos de profissional e `bg-black/40` do scrim; bolha verde é `bg-ok/[0.1]`.
- [ ] Vitest: ordenação da lista, contagens e receita, `move()` sobre a lista filtrada, `moveWait()` dentro do grupo, keymap (`Esc` com e sem humano).

### 6.1 Playwright (`apps/web/e2e-tests/visual.spec.ts`)

```ts
test("captura o centro de resgate", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-09T13:42:00.000Z") }); // 10:42 em -03:00
  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    const json = (body: unknown) => route.fulfill({ json: body });
    if (url.includes("/auth/me")) return json(user);
    if (url.includes("/stream")) return route.abort();
    if (url.includes("/comms/summary")) return json(commsSummary);                 // 4.1
    if (/\/comms\/conversations\/[^/?]+$/.test(url)) return json(conversationPaula); // 4.3
    if (url.includes("/comms/conversations")) return json(conversationsPage);     // 4.2 (34 itens)
    if (url.includes("/waitlist")) return json(waitlist);                         // 4.6 (8 itens)
    if (url.includes("/smart-fill/active")) return json(smartFillRunning);        // 4.7
    return json({ data: [], meta: {} });
  });
  await page.addInitScript(() => { localStorage.setItem("clinicflow.access", "fake"); });
  await page.goto("/comms");
  await expect(page.getByRole("heading", { name: "Centro de Resgate" })).toBeVisible();
  await expect(page.getByRole("region", { name: /Conversa com Paula/ })).toBeVisible();

  for (const [name, w, h, scheme] of [["desk-light", 1600, 1100, "light"], ["desk-dark", 1440, 1000, "dark"], ["phone", 400, 900, "light"]] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: w, height: h });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await expect(page).toHaveScreenshot(`comms-${name}.png`, { fullPage: name !== "desk-dark" });
  }

  await page.keyboard.press("t");
  await expect(page.getByText("Humano no controle")).toHaveCount(2); // cabeçalho + lista
  await page.keyboard.type("Oi, Paula!");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Carla · recepção")).toBeVisible();
});
```

Fixtures em `apps/web/e2e-tests/fixtures/comms-api.ts` (`commsSummary`, `conversationsPage`, `conversationPaula`, `conversationMarcelo`, `waitlist`, `smartFillRunning`).

---

## Apêndice — Discrepâncias protótipo × API atual

| # | Protótipo | API hoje | Decisão nesta spec |
|---|---|---|---|
| 1 | Conversa como entidade (estado, humano no controle, escalação, timeline) | Só `Notification` (1 linha por envio, sem resposta armazenada) e `Task` | Modelos novos `conversations`, `messages`, `agent_steps`, `escalations` (expand-only); `Notification` vira o registro de transporte referenciado por `Message.notificationId` |
| 2 | Mensagens recebidas, intenção, raciocínio | Webhook só reconhece "confirmação" e marca `RESPONDIDA`; nada persiste | Webhook passa a persistir `Message{in}` e enfileirar o agente (4.8) |
| 3 | `NotificationStatus.SIMULADA` | Transporte `simulated` grava `SIMULADA` e nunca `ENVIADA` | Em dev o front trata `SIMULADA` como `delivery: "sent"`; em prod o transporte HTTP é obrigatório. Nunca mostrar "SIMULADA" ao usuário |
| 4 | Status de entrega (enviada/lida) | `sentAt` apenas | `Message.delivery` + eventos de status do provedor |
| 5 | "Humano no controle" pausa o Copilot | Não existe agente, logo não existe pausa | `conversations.human_user_id` + `human_since`; worker checa antes de responder |
| 6 | Escalação com motivo e task | `TaskType` não tem contato humano | Novo `TaskType.CONTATO_HUMANO` + tabela `escalations` |
| 7 | Fila de espera com urgência, score, período, encaixe, posição | Nenhum modelo de waitlist (mesmo GAP do Cockpit #5) | `waitlist_entries` + `waitlist_offers` (4.6); score no serviço |
| 8 | Smart Fill com timeline de ofertas e link para conversa | Inexistente | Extensão do contrato do Cockpit 4.3 (`events`, `conversationIds`) |
| 9 | Pagador e receita protegida | Sem convênio/preço | `payer: null` → KPI 5 usa `averageTicketCents` da clínica para todos; sub muda para "estimada por ticket médio" |
| 10 | Dois horários oferecidos "considerando preferência e convênio" | `GET /appointments/slots` sem heurística nem grade por convênio | Agente usa `slots` + `preferredPeriod` + histórico de horários do paciente; grade por convênio fica como `null` |
| 11 | Conversas de **amanhã** como recorte padrão | `jobs.generatePendingConfirmations` usa `confirmationLeadHours` (48 h) | Recorte da tela = `date` (default amanhã); o job continua decidindo quando enviar |
| 12 | Segundo lembrete após 2 h sem resposta (Rodrigo) | Job é horário e só cria `CONFIRMACAO_PENDENTE` uma vez (dedup) | Worker do agente agenda `resend_scheduled` com `deduplicationKey` por tentativa |
| 13 | Typing indicator | Sem suporte | Frame SSE opcional; sem provedor, nunca aparece |
| 14 | Undo = snapshot de cliente | Sem endpoints inversos | Cada ação tem inversa explícita (release/takeover, cancel offer, reorder) |
| 15 | Tailwind v3 / Google Fonts | v4 / `@fontsource` | Igual ao Cockpit (1.2, 1.9) |
