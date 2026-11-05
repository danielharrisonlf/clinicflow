# Tela 4 — Patient 360 & Care Continuity · Handoff de engenharia (Fase 4)

Fonte da verdade visual: protótipo interativo `screens/04-patient-360.html` (React 18 + Tailwind + lucide-react, arquivo único, mesma base da Tela 1). Tokens, atoms, header, paleta, toast e motion são **idênticos ao cockpit** — este documento só descreve o que é novo; para o resto, `cockpit-handoff.md` (seções 1.1–1.9, 2.1, 2.6) vale integralmente. Lacunas do backend marcadas com **[GAP]**.

Rota alvo: `/pacientes/:id` (substitui a ficha atual de `apps/web/src/features/patients`). Perfis: `RECEPCAO`, `GESTOR` e `PROFISSIONAL` (profissional vê só seus pacientes — ver 4.7).

Alavanca de produto: **3 — Pathways de continuidade** (`refounding.md` §3). Métrica-norte: taxa de retorno efetivado em até 7 dias após o prazo. A tela existe para que a recepção veja, em 3 segundos, qual trilha está aberta e dispare o Copilot com uma tecla.

---

## 1. Tokens e classes-chave desta tela

Tudo da seção 1 do cockpit se aplica (cores, Tailwind v4 `@theme inline`, raios, bordas, sombras, motion). Novidades:

### 1.1 Classes e valores novos

| Onde | Classe / valor | Observação |
|---|---|---|
| Avatar da paciente | `Avatar size={56}`, iniciais a **16 px** quando `size >= 48` (o atom ganhou `fontSize` condicional; abaixo de 48 continua 11 px) | Única alteração num atom do cockpit |
| Nome da paciente | `text-[20px] font-semibold tracking-tight` | Novo degrau na escala: 20/600 sans |
| Mini-stats (LTV, consultas, no-show) | `font-mono text-[22px] font-medium tnum`; unidade `text-[14px] text-muted`; grade `grid-cols-3 divide-x divide-fg/[0.08] bg-sunken/60` | Reusa o 22 mono do cronômetro do cockpit |
| Hero "Pathway de Continuidade" | mesmo glow do Smart Fill: `border-ai/25 shadow-[0_24px_60px_-28px_rgb(var(--ai)/0.55)]` → `border-ok/30 shadow-glow-ok` quando concluído, `transition-shadow duration-700`; blob `-right-16 -top-16 h-40 w-40 blur-3xl` | Expor como `shadow-glow-ai` / `shadow-glow-ok` (já previsto em 1.6 do cockpit) |
| Alerta inteligente dentro do hero | `rounded-xl border-ai/20 bg-ai/[0.06] px-3 py-2.5` com `Sparkles`; concluído: `border-ok/20 bg-ok/[0.06]` + `CircleCheck`; `role="status"` | |
| Stepper — passo concluído | círculo `h-5 w-5 rounded-full bg-ok text-bg` + `Check` sw 2.5 | |
| Stepper — passo pendente | `h-5 w-5 rounded-full border-2 border-ai bg-surface` com `Pulse ai` dentro (`border-warn` + `Pulse warn` na trilha atrasada) | O `Pulse` fica vivo só enquanto o Copilot está enviando/esperando |
| Stepper — passo futuro | `border border-dashed border-fg/30` + ponto `h-1.5 w-1.5 bg-faint` | |
| Conector do stepper | `w-px bg-fg/[0.1]` vertical (`left-[9px] top-6`); em `xl+` no hero vira horizontal `h-px left-7 top-[9px] w-[calc(100%-40px)]`; em `sm`–`xl` (2 colunas) o conector some | |
| Chips de horário sugerido | `h-8 rounded-lg border-fg/[0.1]`, label mono; selecionado `border-ai/40 bg-ai/[0.06]` + `Check` + `aria-pressed` | Mesmo estado do slot de reagendar |
| Chip de alergia | `Chip tone="bad" icon="TriangleAlert"` | Único uso de `bad` na tela em repouso |
| Tabs | `h-9 px-2.5 text-[13px] font-medium`; ativa `text-fg` + sublinhado `absolute inset-x-2 -bottom-px h-0.5 bg-fg`; inativa `text-muted hover:bg-sunken/70`; contador `rounded-full bg-sunken font-mono text-[11px]`; `Kbd` 1–4 em `sm+` | `role=tablist/tab/tabpanel` |
| Linha de consulta | data em coluna `w-[4.5rem]` mono 12 (`dd/mm` em fg, `/aa` em faint, hora abaixo); chip de status à direita `shrink-0` | |
| Item de exame | `button rounded-xl p-1 border-transparent`; hover `border-fg/[0.08] bg-sunken/70`; foco `border-ai/50 ring-[3px] ring-ai/15`; thumb 44 px `rounded-lg bg-sunken` | Linha do tempo `left-[26px] top-[52px] w-px bg-fg/[0.08]` |
| Thumbs de exame | dermatoscopia e mapeamento = `radial-gradient` sobre tokens `warn`/`fg`; ECG = `<svg>` polyline em `ok`; laudo/lab = ícone lucide (`FileText`, `TestTubes`) | **Nenhuma imagem externa**; no app real os thumbs vêm de `thumbnailUrl` (4.5) com estes como fallback por `type` |
| Bolhas de conversa | enviadas (Copilot/recepção) `rounded-xl rounded-tr-sm border-ai/20 bg-ai/[0.06]` à direita; paciente `rounded-tl-sm border-fg/[0.08] bg-sunken` à esquerda; autor 11/500 (`ai` Copilot, `fg` recepção, `muted` paciente) | |
| Compositor | `rounded-xl border-fg/[0.1] p-1.5` com `focus-within:border-ai/50 focus-within:ring-[3px] focus-within:ring-ai/15` | |
| Overlay largo (pré-visualização) | `Overlay wide` → `max-w-[920px]` (o atom ganhou a prop `wide`; padrão continua 560) ; corpo `max-h-[62vh] overflow-y-auto bg-sunken/60` | |
| "Papel" do documento | `rounded-xl border-fg/[0.08] bg-surface p-4 sm:p-6`; cabeçalho de laboratório 14/600 + nº e data mono à direita; seções com título 11 uppercase `tracking-[0.06em] text-faint` | |
| Linha de laboratório alterada | `bg-warn/[0.06]`, valor `text-warn font-mono font-medium` + `ArrowUp` + "ALTO" 11 uppercase | Cor + seta + texto: nunca só cor |
| Conclusão do laudo | `rounded-lg border-ok/20 bg-ok/[0.06]`, texto 14/500 | |
| Grade do ECG | `pattern` SVG 20 px `rgb(var(--bad)/.18)` + 4 px `/.07`; traçado `rgb(var(--fg))` 1.6 px | Grade em carmim é convenção do papel de ECG; o traçado é `fg` para ler no escuro |
| Botão `Btn` | atom novo: `h-8 rounded-lg px-2.5 text-[12px] font-medium`; `primary` = `bg-fg text-bg border-fg/90`; `busy` → `disabled:opacity-70` + ícone `LoaderCircle animate-spin` | Generaliza o botão de ação do card do cockpit |
| Chip de CPF/carteirinha mascarado | mono `tnum`, máscara `•••.456.789-••`; botão `Eye`/`EyeOff` 24 px com `aria-pressed` | |

### 1.2 Escala tipográfica adicional

| Tamanho | Fonte | Peso | Uso |
|---|---|---|---|
| 22 | mono | 500 | Mini-stats da identidade |
| 20 | sans | 600 | Nome da paciente |
| 14 | sans | 500 / 600 | Conclusão do laudo; cabeçalho do laboratório |
| 12.5 | sans | 400 | "Copilot observa" (como o feed do cockpit) |

Piso de 12 px mantido; 11 px apenas em `Kbd`, contadores de aba, autor da bolha, rótulos de seção do documento e legendas sobre a imagem (`bg-fg/80 text-bg`).

### 1.3 Motion adicional

- Troca de aba: `key={tab}` no `tabpanel` → `anim-enter` (280 ms).
- Troca de exame dentro da pré-visualização: `key={exam.id}` no corpo → `anim-enter`.
- `LoaderCircle` com `animate-spin` enquanto `busy`; `prefers-reduced-motion` zera (`animate-spin` entrou na regra global do `<style>`).
- Hero: `Pulse ai` só `live` nos estados `sending`/`sent`; passa a `ok` estático em `chosen`.

---

## 2. Anatomia da tela

Container: `main max-w-[1680px] px-4 sm:px-6 pt-4 pb-24 flex-col gap-4`. Grade principal `grid-cols-[minmax(0,1fr)]` → `lg:grid-cols-[minmax(0,1fr)_340px]` (**sempre** `minmax(0,…)`: a faixa de abas é um scroll container e, com a faixa implícita `auto`, empurrava a coluna além de 400 px).

### 2.1 Header (sticky, 2 linhas)

Linha 1 idêntica ao cockpit, com **Pacientes** `aria-current="page"`. Linha 2: breadcrumb (`Pacientes › Camila Duarte`, botão "Pacientes" navega para a lista) · data por extenso · "ao vivo · HH:MM:SS" (`Pulse ok`) · chip de contexto `border-ok/20 bg-ok/[0.06]` "Agora · Em atendimento · Sala 1 · Dra. Helena · mm:ss" (detalhe em `md+`). O chip aparece só quando existe consulta `EM_ATENDIMENTO` da paciente hoje (`PatientProfile.current`).

### 2.2 Barra de identidade (`section[aria-label="Identificação da paciente"]`)

`rounded-2xl bg-surface shadow-card`, duas áreas:

1. **Identidade** (`p-4 sm:p-5`, `lg:flex-row`): avatar 56 · nome 20/600 + "34 anos · Feminino" + "Unimed **+ Particular**" · `dl` inline com **CPF** mascarado + `Eye` (revelar), **Tel.** mono + `Copy`, **Carteirinha** mascarada · chips: `bad` Alergia: Dipirona, `muted` Prefere manhã (`Sunrise`), `ai` WhatsApp ativo, `muted` Termo LGPD assinado · à direita ações `A` Agendar (primário), `M` Mensagem, `U` Anexar exame.
2. **Mini-stats** (`grid-cols-3 divide-x border-t bg-sunken/60`): LTV `brl` em `ok` ("desde mar/2023 · 11 consultas") · Consultas no ano ("4 com a Dra. Helena · 1 Dr. Menezes") · No-show `%` (tom `warn` se > 15 %; "1 falta em 11 · 03/03/2026").

Copiar telefone: `navigator.clipboard.writeText` → fallback `textarea` + `execCommand("copy")` → último recurso: toast com o número para copiar à mão. Revelar CPF: toggle local + toast "CPF revelado · acesso registrado na auditoria (LGPD)" — no app, dispara `POST /patients/:id/reveal` (4.6) antes de mostrar.

### 2.3 Hero "Pathway de Continuidade" (`section[aria-label]`, `aria-busy` enquanto envia)

Cabeçalho: ícone `Route` em caixa 24 (`bg-ai/10 text-ai`) + título 13/600 + `DocTag` + status à direita ("Retorno pendente" `ai` com `Pulse` / "Retorno agendado" `ok`).
Alerta: "Paciente realizou biópsia há 14 dias — agendamento de retorno para entrega de laudo pendente." + complemento muted (laudo na ficha desde 06/10; prazo ideal 16/10).
Stepper (4 passos, `sm:grid-cols-2 xl:grid-cols-4`): Biópsia 25/09 ✓ → Laudo recebido 06/10 ✓ (link **ver** abre o documento) → Retorno p/ entrega de laudo · pendente · prazo ideal até 16/10 → Revisão em 6 meses · abr/2027.
Rodapé (só enquanto pendente): legenda `Sparkles` "Horários sugeridos na agenda da Dra. Helena, pela preferência de manhã" · 3 chips de horário (`aria-pressed`, `title` = motivo) · botão **D Disparar contato agora** + status `aria-live="polite"`.

Máquina de estados do contato (`ContactAttempt.status`):

| Estado | Botão | Status ao lado | Efeito |
|---|---|---|---|
| `idle` | "Disparar contato agora" | "Copilot oferece os 3 horários pelo WhatsApp e agenda a resposta sozinho" | — |
| `sending` (1,2 s) | "Enviando…" + spinner, `disabled` | `Pulse ai` "Enviando pelo WhatsApp…" | — |
| `sent` | "Aguardando resposta", `disabled` | `CheckCheck` "Copilot enviou mensagem pelo WhatsApp · HH:MM · paciente digitando…" | Mensagem do Copilot entra na aba Conversas |
| `chosen` (+3,4 s) | some | — | Alerta vira `ok` "Retorno confirmado para Ter 14/10 · 09:30"; passo 3 vira ✓ com data de hoje; chips `ok` CalendarCheck + `ai` "Camila escolheu Ter 14/10 · 09:30 às HH:MM"; resposta da paciente + confirmação do Copilot nas Conversas; toast `ai` com **Desfazer Z** |

`Z` dentro de 6 s: cancela os timers pendentes, restaura `contact` e `messages` ao snapshot. No app: `DELETE /pathways/:id/contact/:attemptId` (4.4) + rollback do cache.

### 2.4 Abas (`section[aria-label="Ficha"]`, `min-w-0 overflow-hidden`)

`tablist` horizontal com scroll (`overflow-x-auto`), 4 abas com ícone, contador e `Kbd` numérico; botão `? atalhos` à direita (`sm+`). Painel `p-4` com `anim-enter` por troca.

| Aba | Tecla | Conteúdo |
|---|---|---|
| Visão geral | `1` / `g o` | `xl:grid-cols-2`: **Últimas consultas** (4, link "ver todas") · **Exames recentes** (3, link "ver todos", "clique para visualizar") |
| Consultas | `2` / `g c` | Linha de resumo (total, faltas, ticket médio particular) + lista completa (`ConsultList`): data/hora mono, tipo 13/500, `DocTag` + `Payer`, chip de status (`now` ok DoorOpen "Em atendimento" · `done` muted CircleCheck "Concluída" · `noshow` bad CalendarX2 "Faltou" · `scheduled` ai CalendarCheck "Agendada") |
| Exames | `3` / `g e` | Resumo ("N documentos · Enter ou clique abre · ← → navegam") + botão `U` Anexar + `ExamTimeline` completa |
| Conversas | `4` / `g v` | `Chat`: lista `max-h-[52vh] overflow-y-auto` com separadores de data (mono 11 centrado), bolhas por autor, compositor (`M` foca o input; Enter envia; toast com undo) |

### 2.5 Pré-visualização de exame (`ExamPreview`, `Overlay wide`, `align="top"`)

Abre por clique, Enter/Space no item (é um `button`), pela paleta ou pelo link **ver** do stepper. Cabeçalho: thumb 40 + título 15/600 + "dd/mm/aaaa · origem · Dr. X · arquivo · tamanho" + `← → i/N` + `X`. Corpo (`max-h-[62vh] overflow-y-auto bg-sunken/60`) renderiza por `kind`:

| `kind` | `DocumentType` | Render do protótipo | No app |
|---|---|---|---|
| `laudo` | `LAUDO` | Papel com cabeçalho do laboratório, campos (paciente, solicitante, material, coleta, hipótese, liberação), Macroscopia, Microscopia, **Conclusão** em caixa `ok`, assinatura digital | `<iframe>`/PDF.js com `previewUrl`; o bloco "Conclusão" vem de `summary.conclusion` quando o Copilot extraiu **[GAP]** |
| `lab` | `EXAME_LABORATORIAL` | Tabela analito / resultado / unidade (`sm+`) / referência; linhas alteradas em `warn` com seta e "ALTO"; rodapé "2 valores acima da referência" | `summary.analytes[]` **[GAP]**; sem resumo, cai no PDF |
| `derma` / `map` | `EXAME_IMAGEM` | Quadro 1:1 com `radial-gradient` (lesão / 3 nevos), legendas de escala e aumento, `dl` de características | `<img src={previewUrl}>` com `object-contain`; `dl` de `summary.fields` |
| `ecg` | `OUTRO` (ou `EXAME_IMAGEM`) | SVG 880×120 com grade e polyline DII, campos FC/PR/QRS/QTc/eixo, conclusão | PDF ou imagem; o SVG é só do protótipo |

Rodapé: Anterior / Próximo · **Baixar** (`GET /documents/:id/download`) · **Enviar à paciente** (primário; `POST /documents/:id/send` **[GAP]** → toast `ai`). Teclado interno: `← ↑ k` anterior, `→ ↓ j` próximo (circular), `Esc` fecha e devolve o foco ao item (`[data-exam=id]`).

### 2.6 Lateral (`aside[aria-label="Dados e trilhas"]`, 340 px em `lg+`)

1. **Outras trilhas** (`Route`, "N pendentes"/"tudo em dia"): lista `divide-y` de `SmallPathway` — ponto de tom + título 13/500 + status (`ok` "Em dia", `warn` "Atrasado"; depois da ação: "Lembrete ativo"/"Contato feito") + `DocTag` + detalhe 12 muted + stepper compacto (vertical) + botão da trilha (`Programar lembrete` secundário na trilha em dia; `Lembrar exame` **primário** na atrasada). Clique → `sending` 0,9 s → `done` + mensagem do Copilot nas Conversas (TSH) + toast com undo.
2. **Dados cadastrais** (`IdCard`, "dados fictícios"): `dl` `grid-cols-[6.5rem_minmax(0,1fr)]` `divide-y`: Nascimento, Sexo, CPF (segue o toggle da barra), Telefone, E-mail (`break-all`), Endereço, Convênio + carteirinha mascarada, Emergência, Alergias (`text-bad font-medium`), Paciente desde. Nota LGPD em 12 faint.
3. **Copilot observa** (`Sparkles`): 3 observações com ícone e tom (`ai` canal confiável, `muted` preferência de horário, `warn` falta sem lembrete). No app: `PatientProfile.insights[]` **[GAP]** — até existir, ocultar o painel.

### 2.7 Overlays e toast

Paleta (`Ctrl+K`, `/`): grupos **Ações** (Disparar contato `D` — só em `idle`, Agendar `A`, Mensagem `M`, Anexar `U`, Revelar/Ocultar CPF, Alternar tema, Atalhos `?`), **Exames de Camila** (cada um abre a pré-visualização), **Abas** (`1`–`4`), **Ir para** (Cockpit, Agenda, Centro de Resgate, Lista de pacientes). Busca normaliza acentos.
**Agendar retorno** (`A`): mesmo diálogo de reagendar do cockpit — 3 slots `1/2/3 ↑↓ Enter Esc`, checkbox "Copilot envia o convite pelo WhatsApp e resolve a tarefa de retorno"; confirmar leva a trilha direto a `chosen` com o slot escolhido.
**Anexar exame** (`U`): dropzone tracejada (`border-dashed border-fg/[0.14] bg-sunken/60`) com arquivo de exemplo, `fieldset` de tipo (radios estilizados como chips, `accent-ai`), dica do Copilot ("parece o TSH pedido em 30/08"); confirmar insere o documento no topo da timeline, marca a trilha do TSH como concluída, troca para a aba Exames e mostra toast com undo.
Toast: igual ao cockpit (6 s, `Z`).

### 2.8 Responsivo (como implementado)

| Breakpoint | Mudanças |
|---|---|
| `< 640` | Tudo em 1 coluna; busca só ícone; sem avatar/usuário; `Kbd` das abas oculto; "visualizar" dos exames oculto; mini-stats em 3 colunas com `truncate`; stepper vertical; abas rolam horizontalmente |
| `sm ≥ 640` | Stepper do hero em 2 colunas (sem conector); coluna "unidade" da tabela de laboratório; contador `i/N` da pré-visualização |
| `md ≥ 768` | Nav; detalhe do chip "Em atendimento"; footer de atalhos |
| `lg ≥ 1024` | Lateral de 340 px; ações da identidade à direita na mesma linha |
| `xl ≥ 1280` | Stepper do hero em 4 colunas com conector horizontal; Visão geral em 2 colunas; nome/cargo do usuário |

Verificado em 400 px: `scrollWidth - innerWidth = 0`.

---

## 3. Arquitetura de estado

### 3.1 `apps/web/src/features/patient-360/types/patient360.ts`

```ts
import type { AppointmentType, DocumentType, TaskType } from "../../../lib/api/types";

export type Tone = "ai" | "ok" | "warn" | "bad" | "fg" | "muted";

export interface MaskedField {
  /** "•••.456.789-••" — sempre presente. */
  masked: string;
  /** Só vem quando o cliente pediu `?reveal=cpf` e o acesso foi auditado. */
  value: string | null;
}

export interface PatientProfile {
  id: string;
  name: string;
  birthDate: string | null;        // AAAA-MM-DD
  age: number | null;
  sex: "F" | "M" | "OUTRO" | null; // [GAP]
  cpf: MaskedField | null;
  phone: string;                   // "(11) 98765-4321" já formatado
  phoneE164: string;               // "+5511987654321" para o botão copiar / wa.me
  email: string | null;
  address: string | null;          // [GAP]
  since: string;                   // Patient.createdAt (data)
  insurance: { name: string; card: MaskedField } | null;   // [GAP]
  acceptsPrivate: boolean;
  allergies: string[];             // [GAP] — hoje viria de Patient.notes
  tags: { id: string; label: string; icon: string; tone: Tone }[]; // "Prefere manhã", "WhatsApp ativo"
  consent: { lgpdSignedAt: string | null; whatsappOptIn: boolean };
  stats: {
    ltvCents: number;
    appointmentsTotal: number;
    appointmentsThisYear: number;
    byProfessional: { professionalId: string; shortName: string; count: number }[];
    noShowCount: number;
    noShowRate: number;            // 0..1
    lastNoShowAt: string | null;
  };
  /** Consulta em andamento agora, para o chip do header. */
  current: { appointmentId: string; professionalId: string; room: string | null; startedAt: string; plannedMinutes: number; typeLabel: string } | null;
  insights: { id: string; icon: string; tone: Tone; text: string }[]; // [GAP]
}

export type PathwayStepState = "done" | "pending" | "future";
export interface PathwayStep {
  id: string;
  label: string;
  state: PathwayStepState;
  date: string | null;             // AAAA-MM-DD quando concluído/agendado
  hint: string | null;             // "prazo ideal até 16/10", "abr/2027"
  documentId: string | null;       // abre a pré-visualização
  appointmentId: string | null;
}

export type PathwayKind = "FOLLOW_UP" | "EXAM_PENDING" | "RECURRING_REVIEW";
export type PathwayStatus = "pending" | "overdue" | "on_track" | "done";

export interface CarePathway {
  id: string;
  kind: PathwayKind;
  status: PathwayStatus;
  tone: Tone;                      // ai (pendente) · warn (atrasada) · ok (em dia / concluída)
  title: string;                   // "Pathway de Continuidade", "Revisão de nevos anual"
  alert: string | null;            // frase do Copilot no hero
  detail: string | null;           // linha muted das trilhas pequenas
  professionalId: string;
  /** Task que a trilha representa; null para trilhas derivadas (revisão anual). */
  taskId: string | null;
  taskType: TaskType | null;       // RETORNO_A_AGENDAR | AGUARDANDO_EXAME
  dueAt: string | null;            // prazo ideal
  steps: PathwayStep[];
  suggestedSlots: { id: string; startsAt: string; label: string; reason: string }[];
  action: { label: string; icon: string; primary: boolean; doneLabel: string } | null;
  lastContact: ContactAttempt | null;
}

export type ContactStatus = "queued" | "sending" | "sent" | "delivered" | "replied" | "scheduled" | "failed" | "cancelled";
export interface ContactAttempt {
  id: string;
  pathwayId: string;
  channel: "WHATSAPP" | "SMS" | "TELEFONE";
  status: ContactStatus;
  sentAt: string | null;
  repliedAt: string | null;
  chosenSlot: { startsAt: string; label: string; appointmentId: string } | null;
  undoableUntil: string | null;    // janela de desfazer (servidor)
}

export type ExamPreviewKind = "pdf" | "image" | "lab" | "laudo" | "none";
export interface ExamAttachment {
  id: string;
  type: DocumentType;
  typeLabel: string;
  title: string;                   // fileName sem extensão, ou summary.title
  source: string | null;
  fileName: string;
  sizeLabel: string;
  createdAt: string;               // data do documento (ver discrepância 5)
  professionalId: string | null;   // via appointmentId
  flagged: boolean;                // algum analito fora da referência
  previewKind: ExamPreviewKind;
  previewUrl: string | null;       // assinada, curta
  thumbnailUrl: string | null;     // [GAP]
  summary: ExamSummary | null;     // [GAP]
}
export type ExamSummary =
  | { kind: "lab"; analytes: { name: string; value: string; unit: string; reference: string; flag: "high" | "low" | null }[] }
  | { kind: "laudo"; fields: [string, string][]; sections: { title: string; text: string }[]; conclusion: string | null }
  | { kind: "image"; fields: [string, string][] };

export interface PatientAppointment {
  id: string;
  startsAt: string;
  professionalId: string;
  type: AppointmentType;
  typeLabel: string;
  status: "now" | "done" | "noshow" | "scheduled" | "cancelled";
  payer: { kind: "conv"; label: string } | { kind: "part"; label: "Particular"; valueCents: number } | null;
}

export interface ChatMessage {
  id: string;
  at: string;
  from: "copilot" | "staff" | "patient";
  authorName: string | null;       // "Carla · recepção"
  text: string;
  channel: "WHATSAPP";
}

export interface Patient360 {
  patient: PatientProfile;
  pathways: CarePathway[];         // [0] é a trilha principal (hero)
  appointments: PatientAppointment[];
  exams: ExamAttachment[];
  messages: ChatMessage[];
  serverNow: string;
}
```

### 3.2 Chaves (`apps/web/src/lib/query.ts`)

```ts
patients: {
  // …existentes…
  p360: (id: string) => ["patients", "detail", id, "360"] as const,
  pathways: (id: string) => ["patients", "detail", id, "pathways"] as const,
  messages: (id: string) => ["patients", "detail", id, "messages"] as const,
  examPreview: (documentId: string) => ["documents", documentId, "preview"] as const,
},
```

Tudo sob `["patients","detail",id]`: `invalidateQueries({ queryKey: qk.patients.detail(id) })` derruba ficha, 360, trilhas e conversas de uma vez.

### 3.3 Hooks TanStack Query v5

```ts
// hooks/use-patient-360.ts
export function usePatient360(id: string, reveal?: "cpf") {
  return useQuery({
    queryKey: [...qk.patients.p360(id), { reveal }],
    queryFn: () => patient360Api.get(id, reveal),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}
// usePathways(id): qk.patients.pathways(id), refetchInterval 10_000 enquanto algum lastContact.status ∈ {sending, sent, delivered}
// usePatientMessages(id): qk.patients.messages(id), refetchInterval 5_000 com a aba Conversas aberta (enabled)
// useExamPreview(documentId): qk.patients.examPreview, staleTime = expiresIn * 900 (renova a URL assinada antes de vencer), enabled quando o overlay abre
```

```ts
// hooks/use-pathway-contact.ts — otimista + undo (mesmo padrão de use-cockpit-actions)
export function usePathwayContact(patientId: string) {
  const qc = useQueryClient();
  const key = qk.patients.pathways(patientId);
  return useMutation({
    mutationFn: (vars: { pathwayId: string; slotIds: string[] }) => patient360Api.contact(vars.pathwayId, vars.slotIds),
    onMutate: async ({ pathwayId }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<CarePathway[]>(key);
      qc.setQueryData<CarePathway[]>(key, (list) => list?.map((p) => p.id === pathwayId
        ? { ...p, lastContact: { id: "tmp", pathwayId, channel: "WHATSAPP", status: "sending", sentAt: null, repliedAt: null, chosenSlot: null, undoableUntil: null } }
        : p));
      return { previous };
    },
    onError: (e, _v, ctx) => { ctx?.previous && qc.setQueryData(key, ctx.previous); toast.push({ tone: "error", title: "Não foi possível contatar", description: errorMessage(e) }); },
    onSuccess: (attempt) => qc.setQueryData<CarePathway[]>(key, (list) => list?.map((p) => p.id === attempt.pathwayId ? { ...p, lastContact: attempt } : p)),
    onSettled: () => { void qc.invalidateQueries({ queryKey: qk.patients.detail(patientId) }); void qc.invalidateQueries({ queryKey: qk.tasks.all }); },
  });
}
```

Demais mutações, todas com `onSettled` invalidando `qk.patients.detail(id)` + a coleção afetada:

| Tecla / ação | `mutationFn` | Otimista | Toast |
|---|---|---|---|
| `D` disparar | `patient360Api.contact(pathwayId, slotIds)` | `lastContact.status = "sending"` | — (o status fica ao lado do botão); ao chegar `scheduled` via refetch/SSE: toast `ai` "Camila escolheu {slot}" com undo |
| `Z` após `scheduled` | `patient360Api.cancelContact(pathwayId, attemptId)` | restaura snapshot | "Ação desfeita" |
| `A` agendar | `appointmentsApi.create({...})` + `tasksApi.resolve(taskId)` → melhor: `appointmentsApi.scheduleFollowUp` do cockpit (4.8 lá) | trilha → `done`, passo 3 ✓ | "Retorno agendado para {slot} · convite enviado" |
| `M` enviar mensagem | `patient360Api.sendMessage(id, { text })` | mensagem `from: "staff"` no fim | "Mensagem enviada pelo WhatsApp" (undo = `DELETE /messages/:id` dentro da janela) |
| `U` anexar | `documentsApi.upload(...)` (existente, multipart) | documento no topo de `exams` | "Exame anexado · trilha do TSH atualizada" |
| Trilha pequena | `patient360Api.contact(pathwayId, [])` (EXAM_PENDING) ou `patient360Api.scheduleReminder(pathwayId)` (RECURRING_REVIEW) | `lastContact.status = "sending"` | `action.doneLabel` |
| Revelar CPF | `patient360Api.reveal(id, "cpf")` | — (só mostra após a resposta) | "CPF revelado · acesso registrado na auditoria" |
| Copiar telefone | local | — | "Telefone copiado" |
| Enviar exame à paciente | `patient360Api.sendDocument(documentId)` | — | "{título} enviado a Camila pelo WhatsApp" |

### 3.4 Layout de arquivos

```
apps/web/src/features/patient-360/
├─ patient-360-page.tsx            # rota /pacientes/:id
├─ types/patient360.ts             # 3.1
├─ api/patient-360-api.ts          # get, pathways, contact, cancelContact, scheduleReminder, messages, sendMessage, reveal, sendDocument, examPreview
├─ hooks/{use-patient-360,use-pathways,use-pathway-contact,use-patient-messages,use-exam-preview,use-p360-keymap,use-tabs}.ts
├─ lib/{format.ts (dm, dmy, brl, hm), mask.ts (maskCpf, maskCard), tones.ts, pathway.ts (deriveTone, stepStates)}
├─ components/
│  ├─ p360-header.tsx · identity-bar.tsx · mini-stats.tsx
│  ├─ pathway-hero.tsx · pathway-stepper.tsx · small-pathway.tsx · slot-chips.tsx
│  ├─ ficha-tabs.tsx · consult-list.tsx · exam-timeline.tsx · exam-thumb.tsx · chat.tsx
│  ├─ exam-preview.tsx + docs/{laudo-doc,lab-doc,image-doc,pdf-doc}.tsx
│  ├─ demographics.tsx · copilot-insights.tsx
│  ├─ schedule-dialog.tsx · upload-dialog.tsx · shortcuts-dialog.tsx
│  └─ atoms/btn.tsx (+ os do cockpit)
└─ patient-360.test.tsx            # Vitest: maskCpf, deriveTone, movePreview circular, keymap g-prefix
```

---

## 4. Contratos REST (NestJS)

Prefixo `api/v1`. Módulo novo `apps/api/src/modules/pathways/` + endpoints novos em `patients` e `documents`. Guard JWT; `@Roles("RECEPCAO","GESTOR","PROFISSIONAL")` com filtro por profissional (4.7). Horas ISO com offset via `ClinicTime`; datas `AAAA-MM-DD`.

### 4.1 `GET /patients/:id/360?reveal=`

Agrega `FindPatientByIdService` + `GetPatientSummaryService` + consultas + documentos + tasks abertas + notificações. `reveal` ∈ `cpf` | `card` (opcional) grava `AuditLog` antes de responder (4.6).

```json
{
  "patient": {
    "id": "0192…camila", "name": "Camila Duarte", "birthDate": "1992-03-14", "age": 34, "sex": "F",
    "cpf": { "masked": "•••.456.789-••", "value": null },
    "phone": "(11) 98765-4321", "phoneE164": "+5511987654321", "email": "camila.duarte@exemplo.com.br",
    "address": "Rua das Figueiras, 120 · Pinheiros · São Paulo/SP", "since": "2023-03-18",
    "insurance": { "name": "Unimed", "card": { "masked": "•••• •••• 0000 00-0", "value": null } }, "acceptsPrivate": true,
    "allergies": ["Dipirona"],
    "tags": [{ "id": "morning", "label": "Prefere manhã", "icon": "Sunrise", "tone": "muted" }, { "id": "wa", "label": "WhatsApp ativo", "icon": "MessageCircle", "tone": "ai" }],
    "consent": { "lgpdSignedAt": "2023-03-18T10:02:00-03:00", "whatsappOptIn": true },
    "stats": { "ltvCents": 486000, "appointmentsTotal": 11, "appointmentsThisYear": 5,
      "byProfessional": [{ "professionalId": "…helena", "shortName": "Dra. Helena", "count": 4 }, { "professionalId": "…menezes", "shortName": "Dr. Menezes", "count": 1 }],
      "noShowCount": 1, "noShowRate": 0.09, "lastNoShowAt": "2026-03-03" },
    "current": { "appointmentId": "…a1", "professionalId": "…helena", "room": "Sala 1", "startedAt": "2026-10-09T10:35:00-03:00", "plannedMinutes": 30, "typeLabel": "Consulta de acompanhamento" },
    "insights": []
  },
  "pathways": [ /* 4.2 */ ],
  "appointments": [
    { "id": "…a1", "startsAt": "2026-10-09T10:30:00-03:00", "professionalId": "…helena", "type": "CONSULTA", "typeLabel": "Consulta de acompanhamento", "status": "now", "payer": { "kind": "part", "label": "Particular", "valueCents": 38000 } },
    { "id": "…a2", "startsAt": "2026-09-25T09:00:00-03:00", "professionalId": "…helena", "type": "PROCEDIMENTO", "typeLabel": "Biópsia de pele (shave)", "status": "done", "payer": { "kind": "part", "label": "Particular", "valueCents": 68000 } },
    { "id": "…a7", "startsAt": "2026-03-03T09:00:00-03:00", "professionalId": "…menezes", "type": "RETORNO", "typeLabel": "Retorno", "status": "noshow", "payer": { "kind": "conv", "label": "Unimed" } }
  ],
  "exams": [
    { "id": "…e1", "type": "LAUDO", "typeLabel": "Laudo", "title": "Laudo anatomopatológico · biópsia shave", "source": "Lab. Patologia Diagnóstica",
      "fileName": "laudo-ap-2026-10-06.pdf", "sizeLabel": "1,2 MB", "createdAt": "2026-10-06T16:20:00-03:00", "professionalId": "…helena",
      "flagged": false, "previewKind": "laudo", "previewUrl": null, "thumbnailUrl": null,
      "summary": { "kind": "laudo", "fields": [["Material", "Pele · dorso (shave)"], ["Coleta", "25/09/2026"]], "sections": [{ "title": "Microscopia", "text": "…" }], "conclusion": "Nevo melanocítico composto, sem atipias. Margens cirúrgicas livres." } },
    { "id": "…e5", "type": "EXAME_LABORATORIAL", "typeLabel": "Laboratorial", "title": "Hemograma · lipidograma · glicemia", "source": "Lab. São Lucas",
      "fileName": "exames-2026-03-02.pdf", "sizeLabel": "310 KB", "createdAt": "2026-03-02T11:00:00-03:00", "professionalId": "…okada",
      "flagged": true, "previewKind": "lab", "previewUrl": null, "thumbnailUrl": null,
      "summary": { "kind": "lab", "analytes": [{ "name": "LDL", "value": "158", "unit": "mg/dL", "reference": "< 130", "flag": "high" }, { "name": "TSH", "value": "2,1", "unit": "µUI/mL", "reference": "0,4 – 4,0", "flag": null }] } }
  ],
  "messages": [
    { "id": "…m4", "at": "2026-10-08T14:02:00-03:00", "from": "copilot", "authorName": null, "channel": "WHATSAPP", "text": "Oi, Camila! Confirmando sua consulta amanhã…" },
    { "id": "…m5", "at": "2026-10-08T14:05:00-03:00", "from": "patient", "authorName": null, "channel": "WHATSAPP", "text": "1" }
  ],
  "serverNow": "2026-10-09T10:42:00-03:00"
}
```

Mapeamento de `appointments[].status`: `EM_ATENDIMENTO` → `now`; `CONCLUIDA` → `done`; `AGENDADA`/`CONFIRMADA`/`CHECK_IN` futuras → `scheduled`; `CANCELADA` com `cancelReason = NO_SHOW` (confirmar valor do enum `CancelReason`) → `noshow`; demais canceladas → `cancelled` (a lista mostra, com chip muted). `REAGENDADA` não aparece (o novo horário aparece).

### 4.2 `GET /patients/:id/pathways`

Deriva as trilhas de `Task` + histórico. Regras do serviço `derive-pathways.service.ts`:

| `kind` | Origem | `steps` | `status`/`tone` |
|---|---|---|---|
| `FOLLOW_UP` | `Task RETORNO_A_AGENDAR` aberta, `appointmentId` = consulta que gerou | consulta de origem ✓ · documento `LAUDO` mais recente vinculado ao paciente após a consulta ✓ (se houver) · "Retorno para entrega de laudo" pendente (`dueAt` = `task.dueAt` ?? `completedAt + returnWindowDays`) · "Revisão em N meses" futuro | `pending`/`ai`; `overdue`/`warn` se `now > dueAt` |
| `EXAM_PENDING` | `Task AGUARDANDO_EXAME` aberta | pedido ✓ (data da task) · coleta pendente · retorno futuro | `pending`/`ai` até 14 dias; `overdue`/`warn` depois (protótipo: 40 dias) |
| `RECURRING_REVIEW` | Consulta `CONCLUIDA` cujo `typeLabel` casa com regra de revisão anual **[GAP]** (ou `Task OUTRO` com `title` "Revisão anual") | última revisão ✓ (documento `EXAME_IMAGEM` vinculado) · próxima futuro (+12 meses) | `on_track`/`ok`; `overdue`/`warn` após a data |

A primeira trilha (`[0]`) é a de maior urgência: `overdue` > `pending` por `dueAt` crescente > `on_track`. O hero mostra `[0]`; as demais vão para a lateral.

```json
[
  { "id": "pw_…", "kind": "FOLLOW_UP", "status": "pending", "tone": "ai", "title": "Pathway de Continuidade",
    "alert": "Paciente realizou biópsia há 14 dias — agendamento de retorno para entrega de laudo pendente",
    "detail": null, "professionalId": "…helena", "taskId": "task_…", "taskType": "RETORNO_A_AGENDAR", "dueAt": "2026-10-16",
    "steps": [
      { "id": "st1", "label": "Biópsia de pele (shave)", "state": "done", "date": "2026-09-25", "hint": null, "documentId": null, "appointmentId": "…a2" },
      { "id": "st2", "label": "Laudo anatomopatológico recebido", "state": "done", "date": "2026-10-06", "hint": null, "documentId": "…e1", "appointmentId": null },
      { "id": "st3", "label": "Retorno para entrega de laudo", "state": "pending", "date": null, "hint": "prazo ideal até 16/10", "documentId": null, "appointmentId": null },
      { "id": "st4", "label": "Revisão em 6 meses", "state": "future", "date": null, "hint": "abr/2027", "documentId": null, "appointmentId": null }
    ],
    "suggestedSlots": [
      { "id": "s1", "startsAt": "2026-10-14T09:30:00-03:00", "label": "Ter, 14/10 · 09:30", "reason": "preferência de manhã da paciente" },
      { "id": "s2", "startsAt": "2026-10-15T08:45:00-03:00", "label": "Qua, 15/10 · 08:45", "reason": "primeiro horário do dia da Dra. Helena" },
      { "id": "s3", "startsAt": "2026-10-16T11:00:00-03:00", "label": "Qui, 16/10 · 11:00", "reason": "último dia dentro do prazo ideal" }
    ],
    "action": { "label": "Disparar contato agora", "icon": "Send", "primary": true, "doneLabel": "Retorno agendado" },
    "lastContact": null },
  { "id": "pw_…", "kind": "EXAM_PENDING", "status": "overdue", "tone": "warn", "title": "Exame de sangue (TSH) pendente há 40 dias",
    "detail": "Pedido em 30/08 pelo Dr. Menezes · sem resultado anexado · retorno depende do exame", "taskType": "AGUARDANDO_EXAME", "taskId": "task_…", "dueAt": "2026-09-13",
    "steps": [ { "id": "t1", "label": "Pedido 30/08", "state": "done", "date": "2026-08-30" }, { "id": "t2", "label": "Coleta", "state": "pending" }, { "id": "t3", "label": "Retorno", "state": "future" } ],
    "suggestedSlots": [], "action": { "label": "Lembrar exame", "icon": "Send", "primary": true, "doneLabel": "Copilot enviou o pedido de exame e o link do laboratório conveniado" }, "lastContact": null }
]
```

`suggestedSlots`: 3 primeiros de `GET /appointments/slots?professionalId&date` entre hoje e `dueAt`, ordenados pela preferência (`tags.morning` → manhã primeiro). Heurística no serviço, sem IA nesta fase.

### 4.3 `POST /pathways/:id/contact`

Body `{ "channel": "WHATSAPP", "slotIds": ["s1","s2","s3"] }` (`slotIds` vazio em `EXAM_PENDING`). Cria `Notification` (`Channel.WHATSAPP`, template `pathway_follow_up` / `pathway_exam_reminder`), atualiza `Task.lastContactAt` (reusa `POST /tasks/:id/contact`) e devolve `ContactAttempt` com `status: "sending"`. Quando o webhook do WhatsApp recebe a escolha (`"1"`): cria a consulta no slot, resolve a task (`RESOLVIDA`), e o attempt vira `scheduled` com `chosenSlot` e `undoableUntil = now + UNDO_WINDOW_SECONDS`. Stream `GET /patients/:id/stream` (SSE, mesmo padrão do cockpit) emite `{ kind: "pathway", data: CarePathway }` e `{ kind: "message", data: ChatMessage }`.

```json
{ "id": "ca_…", "pathwayId": "pw_…", "channel": "WHATSAPP", "status": "sending", "sentAt": null, "repliedAt": null, "chosenSlot": null, "undoableUntil": null }
```

Erros (envelope RFC 7807 do `AllExceptionsFilter`): `409 PATHWAY_CONTACT_IN_FLIGHT` (já existe attempt `sending/sent/delivered`), `422 PATIENT_WHATSAPP_OPT_OUT`, `404`.

### 4.4 `DELETE /pathways/:id/contact/:attemptId` (undo)

Dentro de `undoableUntil`: cancela a consulta criada (motivo `UNDO`), reabre a task, envia mensagem de retratação pela mesma conversa, `status: "cancelled"`. Fora da janela: `409 UNDO_WINDOW_EXPIRED` (mesmo código do undo de consulta).

### 4.5 Pré-visualização e thumbnail de documento

- `GET /documents/:id/preview` → `{ "url": "…assinada…", "kind": "pdf" | "image", "expiresIn": 300 }` — mesma geração de `download`, mas `Content-Disposition: inline`. Driver local: `/api/v1/uploads/…?inline=1`.
- `GET /documents/:id/thumbnail` → imagem 160×160 (`image/webp`), gerada no upload por job (`jobs.service.ts`) — PDF: primeira página via `pdf-thumbnail`/`sharp`; imagem: resize. **[GAP]** — até existir, `thumbnailUrl: null` e o front usa o thumb por `type` (1.1).
- `summary` (laudo/lab): extração por job com o Copilot **[GAP]**; `null` cai no PDF inline.
- `POST /documents/:id/send` → envia o link assinado (validade curta) pelo WhatsApp e registra `ChatMessage` **[GAP]**.

### 4.6 LGPD: mascaramento e auditoria de revelação

- `cpf` e `insurance.card` **nunca** saem em claro por padrão. Máscara no servidor (`mask.util.ts`): CPF `•••.456.789-••` (mantém dígitos 4–9), carteirinha mantém os últimos 7.
- `GET /patients/:id/360?reveal=cpf` exige papel `RECEPCAO`/`GESTOR`, grava `AuditLog { action: "PATIENT_PII_REVEAL", entity: "patients", entityId, actorId, meta: { field: "cpf", ip, ua } }` na mesma requisição e devolve `value`. O cliente mostra o toast "CPF revelado · acesso registrado na auditoria" e re-mascara ao sair da rota (não persiste em cache: a chave inclui `{ reveal }` e `gcTime: 0` para essa variante).
- `GET /patients/:id` atual devolve `cpf` em claro para todos os papéis — **mudar** para mascarado (discrepância 2).
- Copiar telefone não audita (dado operacional). Exportação (`GET /patients/export`) continua sob `GESTOR`.
- Mensagens do WhatsApp: `PROFISSIONAL` vê só as da própria agenda; recepção vê todas.

### 4.7 Reuso de endpoints existentes

| Uso | Endpoint |
|---|---|
| Histórico de consultas (aba) | `GET /patients/:id/appointments` (cursor) — o 360 já traz as 8 últimas; a aba pagina a partir daí |
| Documentos | `GET /patients/:id/documents`, `GET /documents/:id/download`, `POST /documents` (multipart, `type`, `source`, `appointmentId`) |
| Tarefas | `GET /patients/:id/tasks`, `PATCH /tasks/:id/resolve`, `POST /tasks/:id/contact` |
| Agendar retorno (`A`) | `PATCH /appointments/:id/schedule-follow-up` (cockpit 4.8) ou `POST /appointments` + `resolve` |
| Slots sugeridos | `GET /appointments/slots` |

---

## 5. Atalhos e acessibilidade

### 5.1 Keymap global (`use-p360-keymap.ts`)

| Tecla | Condição | Efeito |
|---|---|---|
| `Ctrl+K` / `Cmd+K` | Sempre | Alterna a paleta |
| — | Overlay aberto (paleta, agendar, anexar, atalhos, pré-visualização) | Retorna; o overlay trata o próprio teclado |
| — | `input`/`textarea` focado; `meta/ctrl/alt` | Retorna |
| `g` → `o` `c` `e` `v` | Prefixo de 1,2 s (`gPrefix`) | Aba Visão geral / Consultas / Exames / Conversas |
| `/` · `?` | — | Paleta · Atalhos |
| `1` `2` `3` `4` | — | Abas |
| `D` | trilha principal em `idle` | Disparar contato |
| `A` | — | Diálogo Agendar retorno (se já agendado: toast informativo) |
| `M` | — | Aba Conversas + foco no compositor |
| `U` | — | Diálogo Anexar exame |
| `Z` | toast com undo | Desfazer |

Overlays: pré-visualização `← ↑ k` / `→ ↓ j` / `Esc`; agendar `1 2 3 ↑ ↓ Enter Esc` + duplo clique; anexar `Enter Esc`; atalhos `Esc ?`; paleta `↑ ↓ Enter Esc`.

### 5.2 Foco

- Item de exame é `button` (`data-exam`), então Enter/Space abrem nativamente; fechar a pré-visualização devolve o foco ao item (`closePreview` → `rAF` → `focus({ preventScroll: true })`).
- Diálogos: foco inicial no container (`tabIndex=-1`); paleta no input (`autoFocus`). Usar o `Dialog` com focus trap do app.
- `M` foca o compositor via `ref` após trocar a aba (`requestAnimationFrame`).
- Toggle de CPF: `aria-pressed`, rótulo descreve a consequência ("fica registrado na auditoria").

### 5.3 ARIA

| Elemento | Atributos |
|---|---|
| Barra de identidade | `section[aria-label="Identificação da paciente"]`; `dl` para CPF/Tel./Carteirinha; CPF com `aria-live="polite"` para anunciar a revelação |
| Hero | `section[aria-label=title][aria-busy]`; alerta `role="status"`; status do contato `aria-live="polite"` ligado ao botão por `aria-describedby` |
| Stepper | `ol[aria-label="Etapas da trilha"]`; estado em texto ("concluído", "pendente"), não só no ícone |
| Chips de horário | `div[role=group][aria-label]` + `button[aria-pressed][title=motivo]` |
| Abas | `role=tablist` / `tab[aria-selected][aria-controls]` / `tabpanel[aria-labelledby]` |
| Lista de consultas / exames / mensagens | `ol[aria-label]`; separadores de data `role=presentation` |
| Pré-visualização | `role=dialog aria-modal aria-label="Pré-visualização: …"`; imagem `role=img` com `aria-label` descritivo; ECG `svg[role=img][aria-label]`; tabela com `thead` |
| Toast | `role=status` |

### 5.4 Cor nunca sozinha

Alergia = chip carmim **+ ícone + texto**; analito alterado = fundo âmbar + seta + "ALTO"; passo concluído = esmeralda + `Check` + "concluído"; trilha atrasada = âmbar + "Atrasado" + "há 40 dias"; no-show = carmim + `CalendarX2` + "Faltou"; CPF mascarado = pontos + botão com rótulo.

### 5.5 Contraste (referência)

Iguais ao cockpit. Novos pares: `text-bad` em `bg-bad/[0.08]` (chip de alergia) — claro 5,9:1, escuro 7,8:1; `text-warn` em `bg-warn/[0.06]` (linha de laboratório) — claro 5,3:1 (medir no PR com o `--warn` claro `#B45309`); legendas `text-bg` sobre `bg-fg/80` na imagem — ≥ 10:1.

---

## 6. Checklist de craft

### 6.1 Itens verificáveis

- [ ] Página completa em repouso: hero, abas, lateral e footer visíveis sem rolar além do fold em 1600×1100; nada depende de hover para existir.
- [ ] `scrollWidth - innerWidth = 0` em 400 px (verificado no protótipo); grades usam `minmax(0,1fr)`, nunca a faixa implícita `auto`.
- [ ] CPF e carteirinha chegam mascarados do servidor; `reveal` audita antes de devolver; valor revelado não persiste em cache (`gcTime: 0`).
- [ ] Copiar telefone funciona com clipboard bloqueado (fallback `execCommand`) e sem nenhum (toast com o número).
- [ ] `D`: botão `disabled` em `sending/sent`; `aria-busy` no hero; status `aria-live` anuncia "enviou" e "escolheu"; `Pulse` só vivo nesses estados.
- [ ] Transição `ai → ok` do hero com `transition-shadow 700ms`; passo 3 vira ✓ com a data de hoje e o slot escolhido no `hint`.
- [ ] `Z` em até 6 s cancela os timers locais e restaura trilha **e** conversas; servidor cobre com `undoableUntil`.
- [ ] Pré-visualização: setas circulam (último → primeiro), `Esc` devolve o foco ao item, corpo rola internamente (`max-h-[62vh]`), URL assinada renovada antes de vencer.
- [ ] Laboratório: linha alterada tem fundo, seta e texto "ALTO"; rodapé conta os alterados; coluna de unidade some abaixo de `sm` sem quebrar a tabela.
- [ ] Nenhuma imagem externa no protótipo; no app, `<img>` com `object-contain`, `loading="lazy"` e `alt` = `title`.
- [ ] `tabular-nums` em datas, horas, CPF, telefone, carteirinha, moeda, contadores de aba, `i/N`, valores de laboratório e do ECG.
- [ ] Abas trocam com `1–4`, `g o/c/e/v`, clique e paleta; `tabpanel` reanima; contadores refletem o estado (exames anexados, mensagens novas).
- [ ] `M` troca de aba e foca o compositor num único frame; Enter envia; lista rola para o fim.
- [ ] Anexar: `fieldset/legend`, radios reais (não só chips), `Enter` confirma, `Esc` fecha; documento novo entra no topo com `anim-enter` e a trilha correspondente fecha.
- [ ] Trilhas pequenas: botão primário só na atrasada (`warn`); concluída mostra `doneLabel` em `ok` com `CheckCheck`.
- [ ] Nada abaixo de 12 px além de `Kbd`, contadores, autor da bolha, títulos de seção do documento e legendas sobre imagem.
- [ ] Escuro: grade do ECG legível (`bad/.18`), gradientes das imagens sem estourar, `color-scheme: dark` nos radios/checkbox.
- [ ] `prefers-reduced-motion`: sem spinner, sem `enter/pop`, sem `ping`.
- [ ] Vitest: `maskCpf("123.456.789-09") === "•••.456.789-••"`, `derivePathways` ordena `overdue` antes de `pending`, `movePreview(-1)` no índice 0 vai ao último, prefixo `g` expira em 1,2 s.

### 6.2 Teste visual Playwright (compatível com `apps/web/e2e-tests/visual.spec.ts`)

```ts
test("captura o paciente 360", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-09T13:42:00.000Z") }); // 10:42 em -03:00

  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    const json = (body: unknown) => route.fulfill({ json: body });
    if (url.includes("/auth/me")) return json(user);
    if (url.includes("/stream")) return route.abort();
    if (url.match(/\/patients\/[^/]+\/360/)) return json(patient360);            // fixture = seção 4.1 completa
    if (url.match(/\/patients\/[^/]+\/pathways/)) return json(pathways);         // seção 4.2
    if (url.match(/\/pathways\/[^/]+\/contact/)) return json(contactAttempt);    // seção 4.3
    if (url.match(/\/documents\/[^/]+\/preview/)) return json({ url: "/fixtures/laudo.pdf", kind: "pdf", expiresIn: 300 });
    if (url.includes("/settings")) return json({ clinicName: "Clínica Vértice", timezone: "America/Sao_Paulo", returnWindowDays: 30 });
    return json({ data: [], meta: {} });
  });

  await page.addInitScript(() => {
    localStorage.setItem("clinicflow.access", "fake");
    localStorage.setItem("clinicflow.refresh", "fake");
  });

  await page.goto("/pacientes/0192-camila");
  await expect(page.getByRole("heading", { name: "Camila Duarte" })).toBeVisible();
  await expect(page).toHaveScreenshot("patient-360-light.png", { fullPage: true });

  // Hero: dispara contato e espera o passo concluído (timers controlados pelo clock).
  await page.keyboard.press("d");
  await page.clock.runFor(5000);
  await expect(page.getByText("Camila escolheu Ter 14/10 · 09:30")).toBeVisible();

  // Pré-visualização do laudo + navegação por setas.
  await page.getByRole("button", { name: /Abrir Laudo anatomopatológico/ }).click();
  await expect(page.getByRole("dialog", { name: /Pré-visualização/ })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("dialog")).toContainText("Dermatoscopia digital");
  await page.keyboard.press("Escape");

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page).toHaveScreenshot("patient-360-dark.png", { fullPage: true });

  await page.setViewportSize({ width: 400, height: 900 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBe(0);
});
```

Fixtures em `apps/web/e2e-tests/fixtures/patient-360-api.ts` (`patient360`, `pathways`, `contactAttempt`) com os dados do protótipo (8 consultas, 5 exames, 6 mensagens, 3 trilhas).

---

## Apêndice — Discrepâncias protótipo × API atual

| # | Protótipo | API hoje | Decisão nesta spec |
|---|---|---|---|
| 1 | Trilhas de continuidade com passos, prazo e slots | Só `Task` (`RETORNO_A_AGENDAR`, `AGUARDANDO_EXAME`) com `title/dueAt/lastContactAt` | Derivar `CarePathway` no servidor (4.2); sem tabela nova nesta fase. Fase 4b: `care_pathways` + `pathway_steps` persistidos quando as regras ficarem configuráveis por clínica |
| 2 | CPF e carteirinha mascarados; revelar audita | `GET /patients/:id` devolve `cpf` em claro; `AuditLog` existe mas não cobre leitura | Máscara no servidor + `?reveal=` auditado (4.6); `PatientDetailDto.cpf` passa a `MaskedField` (quebra o front atual de pacientes — migrar junto) |
| 3 | Sexo, endereço, convênio, carteirinha, alergias, tags, consentimento | `Patient` só tem `name, cpf, birthDate, phone, email, notes` | **[GAP]** colunas expand-only: `sex`, `address_json`, `insurance_name`, `insurance_card`, `allergies TEXT[]`, `lgpd_signed_at`, `whatsapp_opt_in`; até lá os campos vêm `null` e a UI omite a linha |
| 4 | LTV, consultas no ano, no-show, ticket médio | `PatientSummary` tem só contagens; sem preço | `stats` calculado de `Appointment` + `price_cents` (gap do cockpit, discrepância 3 de lá); `ltvCents: 0` oculta o stat |
| 5 | Data do exame (coleta/liberação) | `Document.createdAt` = upload | **[GAP]** `documents.document_date DATE NULL` preenchido pelo upload (campo no `UploadDialog`) ou pela extração; fallback `createdAt` |
| 6 | Pré-visualização rica (tabela de laboratório, conclusão do laudo, campos) | Só download do arquivo | `summary` por job de extração (4.5) — Fase 5; sem ele, PDF/imagem inline |
| 7 | Thumbnails por exame | Inexistentes | `GET /documents/:id/thumbnail` por job; fallback por `type` |
| 8 | Conversa do WhatsApp por paciente (Copilot, recepção, paciente) | `Notification` guarda só envios; sem inbound | **[GAP]** `messages` (inbound/outbound, autor) — modelo compartilhado com a Tela 3 (Comms) |
| 9 | Copilot envia 3 horários e agenda sozinho pela resposta | Sem webhook de resposta nem criação automática de consulta | `POST /pathways/:id/contact` + webhook (4.3); até o canal existir, o botão `D` cria a task de contato e o toast diz "mensagem na fila" |
| 10 | Undo do agendamento feito pelo Copilot | Undo só por consulta e pelo mesmo ator | `DELETE …/contact/:attemptId` dentro de `undoableUntil` (4.4) |
| 11 | "Copilot observa" (insights) | Inexistente | `insights: []` oculta o painel |
| 12 | Chip "Em atendimento · Sala 1 · mm:ss" no header | `Appointment.startedAt/room` existem | `current` derivado no 360; sem gap |
| 13 | Trilha "Revisão de nevos anual" | Nenhuma regra de recorrência | Regra fixa por `typeLabel` nesta fase; configurável depois |
| 14 | Enviar exame à paciente | Inexistente | `POST /documents/:id/send` (4.5) — link assinado curto pelo WhatsApp |
| 15 | Tabs com `g`-prefixo e `1–4` | — | Só front; documentar no diálogo `?` |
