# Tela 1 — The Clinic Cockpit · Handoff de engenharia (Fase 4)

Fonte da verdade visual: protótipo interativo `clinic-cockpit.html` (React 18 + Tailwind + lucide-react, arquivo único). Tudo que está neste documento foi extraído dele ou do código existente em `apps/api` e `apps/web`. Onde o protótipo mostra algo que o backend ainda não modela, a lacuna está marcada com **[GAP]**.

Rota alvo: `/cockpit` (nova entrada em `apps/web/src/App.tsx`, ao lado de `/`, `/agenda`, `/sala-de-espera`). Perfil: `RECEPCAO` (gestor também vê; profissional não).

> **Mudança de direção de design.** `DESIGN.md` e `apps/web/src/index.css` descrevem hoje um sistema baseado em Fluent 2 (Segoe UI + Atkinson Hyperlegible Mono, azul `#0f6cbd` como acento, superfícies azul-gelo). O cockpit é uma **direção nova pedida pelo product owner**: Geist / Geist Mono, off-white `#FBFBFD` sobre obsidian `#09090B` no escuro, e quatro cores semânticas com papel fixo — **esmeralda = fluxo positivo e receita**, **índigo = Copilot / IA**, **âmbar = atenção e atraso**, **carmim = desistência e estouro**. O azul Fluent não aparece. A seção 1.8 lista o que muda em `index.css`.

---

## 1. Design tokens e classes-chave

### 1.1 Cores (tripletas RGB, exatamente como no protótipo)

| Token | Claro (RGB) | Claro (hex) | Escuro (RGB) | Escuro (hex) | Papel |
|---|---|---|---|---|---|
| `--bg` | `251 251 253` | `#FBFBFD` | `9 9 11` | `#09090B` | Fundo da página |
| `--surface` | `255 255 255` | `#FFFFFF` | `18 18 21` | `#121215` | Cards, painéis, header (com alpha) |
| `--sunken` | `244 244 247` | `#F4F4F7` | `14 14 17` | `#0E0E11` | Colunas do board, hover, chip neutro, avatar |
| `--fg` | `17 17 22` | `#111116` | `244 244 246` | `#F4F4F6` | Texto principal, botão primário, bordas via alpha |
| `--muted` | `92 92 106` | `#5C5C6A` | `161 161 170` | `#A1A1AA` | Texto secundário |
| `--faint` | `140 140 155` | `#8C8C9B` | `113 113 122` | `#71717A` | Texto terciário, eixos, placeholders |
| `--ok` | `5 150 105` | `#059669` | `16 185 129` | `#10B981` | Esmeralda: fluxo, receita, sala livre, "ao vivo" |
| `--ai` | `79 70 229` | `#4F46E5` | `129 140 248` | `#818CF8` | Índigo: Copilot, seleção, foco, Smart Fill |
| `--warn` | `180 83 9` | `#B45309` | `251 191 36` | `#FBBF24` | Âmbar: tolerância a 75 %, consulta acima do previsto, intake pendente |
| `--bad` | `225 29 72` | `#E11D48` | `251 113 133` | `#FB7185` | Carmim: tolerância estourada, desmarcação, vaga aberta |

Cores fixas por profissional (pontinho do `DocTag`, Consultórios): `#8B5CF6`, `#0EA5E9`, `#EC4899`, `#14B8A6`. **[GAP]** `Professional` não tem cor; derivar por índice estável (`hash(id) % 4`) sobre essa paleta, nunca persistir.

Escuro declara `color-scheme: dark`. O protótipo cobre os três estados (`prefers-color-scheme` + `data-theme="light"|"dark"`); no app o script de `apps/web/index.html` já resolve "sistema" para `data-theme` antes da primeira pintura, então basta o override por atributo (ver 1.8).

### 1.2 Mapeamento para Tailwind v4 `@theme`

O protótipo usa Tailwind v3 com `rgb(var(--x) / <alpha-value>)`. Em v4 `<alpha-value>` não existe: modificadores de opacidade (`bg-ok/10`, `border-fg/[0.08]`) viram `color-mix()` sobre qualquer cor, inclusive uma `var()`. Então os tokens entram como cor pronta em `@theme inline` (inline para que as utilitárias apontem para a variável e o override escuro funcione sem duplicar classes):

```css
/* apps/web/src/index.css — bloco novo */
@theme inline {
  --color-bg: rgb(var(--bg));
  --color-surface: rgb(var(--surface));
  --color-sunken: rgb(var(--sunken));
  --color-fg: rgb(var(--fg));
  --color-muted: rgb(var(--muted));
  --color-faint: rgb(var(--faint));
  --color-ok: rgb(var(--ok));
  --color-ai: rgb(var(--ai));
  --color-warn: rgb(var(--warn));
  --color-bad: rgb(var(--bad));

  --font-sans: "Geist Variable", "Geist", ui-sans-serif, system-ui, "Segoe UI", sans-serif;
  --font-mono: "Geist Mono Variable", "Geist Mono", ui-monospace, "SFMono-Regular", Consolas, monospace;

  --ease-cockpit: cubic-bezier(0.2, 0.8, 0.2, 1);
  --animate-enter: enter 280ms var(--ease-cockpit) both;
  --animate-flash: flash 1600ms ease-out both;
  --animate-pop: pop 220ms var(--ease-cockpit) both;
}

@layer theme {
  :root {
    --bg: 251 251 253; --surface: 255 255 255; --sunken: 244 244 247;
    --fg: 17 17 22; --muted: 92 92 106; --faint: 140 140 155;
    --ok: 5 150 105; --ai: 79 70 229; --warn: 180 83 9; --bad: 225 29 72;
  }
  :root[data-theme="dark"] {
    color-scheme: dark;
    --bg: 9 9 11; --surface: 18 18 21; --sunken: 14 14 17;
    --fg: 244 244 246; --muted: 161 161 170; --faint: 113 113 122;
    --ok: 16 185 129; --ai: 129 140 248; --warn: 251 191 36; --bad: 251 113 133;
  }
}
```

Fontes: substituir os imports `@fontsource/atkinson-hyperlegible-mono/*` por `@fontsource-variable/geist` e `@fontsource-variable/geist-mono` (confirmar nomes no registry antes de fixar no `package.json`; alternativa estática `@fontsource/geist` + `@fontsource/geist-mono` nos pesos 400/500/600). O protótipo carrega Geist 400/500/600/700 e Geist Mono 400/500/600; **700 não é usado** em nenhum lugar — não embarcar.

### 1.3 Escala tipográfica realmente usada (px)

| Tamanho | Fonte | Peso | Uso no protótipo |
|---|---|---|---|
| 30 | mono | 500 | Valor dos vitais (`leading-none tracking-tight`) |
| 26 | mono | 500 | Cronômetro do Smart Fill |
| 22 | mono | 500 | Cronômetro do card em espera / em atendimento |
| 18 | mono | 500 | Unidade ao lado do vital (`%`, ` min`), em `text-muted` |
| 15 | sans | 600 | Logotipo "ClinicFlow", `h1` "Fluxo ao vivo", títulos de diálogo, input da paleta (400) |
| 14 | sans | 500 | Nome do paciente no card; `body` base |
| 13.5 | sans / mono | 500 | Rótulo de item da paleta; label do slot de reagendamento (mono) |
| 13 | sans | 500 / 600 | Nav, botões, data, clima, títulos de coluna e painel (600), candidatos do Smart Fill, linhas dos consultórios |
| 12.5 | sans | 400 | Texto do feed de atividade (`text-fg/85`) |
| 12 | sans / mono | 400 / 500 | Chips (500), metadados, legendas, botões de ação do card (500), subtítulos |
| 11 | sans / mono | 500 | `Kbd`, iniciais do avatar (600), badge da nav, horas do feed, eixo do heat strip, cabeçalho de grupo da paleta (uppercase `tracking-[0.06em]`) |

Piso: **12 px** para qualquer texto que precise ser lido; 11 px só em `Kbd`, iniciais, eixo e badges numéricos (todos redundantes com outro sinal). `body` do cockpit é 14 px (o app hoje usa 15 px): aplicar `text-[14px]` no container da rota, não mudar o `body` global.

`font-variant-numeric: tabular-nums` em **todo** dígito que troca ao vivo: horas, cronômetros, contagens, moeda, badge. O protótipo usa `.tnum`; `index.css` já tem `.tabular` e aplica em `.font-mono` — reaproveitar e adicionar `@utility tnum { font-variant-numeric: tabular-nums; }` só se quiser manter a classe do protótipo.

### 1.4 Raios

| Classe | px | Onde |
|---|---|---|
| `rounded-2xl` | 16 | Painéis: vitais, heat strip, colunas do board, Smart Fill, Consultórios, Atividade, overlays |
| `rounded-xl` | 12 | Cards de paciente, placeholder "Ninguém nesta etapa", toast, banner "outro dia", slot de reagendamento |
| `rounded-lg` | 8 | Controles: botões, nav, busca, seletor de dia, toggle de tema, opção da paleta, ações do card, logo |
| `rounded-md` | 6 | Chips, caixa de ícone (Smart Fill, paleta), flash do vital, botão "?" atalhos |
| `rounded-[5px]` | 5 | `Kbd` |
| `rounded-[3px]` / `rounded-sm` | 3 / 2 | Barras do heat strip / quadradinhos da legenda |
| `rounded-full` | — | Avatar, pontos de status, `Meter`, badge da nav, marcador "agora", ícone do feed |

### 1.5 Bordas e alphas

| Valor | Uso |
|---|---|
| `border-fg/[0.06]` | Coluna do board; `divide-y` de listas (Smart Fill, Consultórios, atalhos); linha do feed; footer |
| `border-fg/[0.08]` | Padrão: cards, painéis, header, busca, seletor de dia, avatar, chip neutro, ícone do feed, separadores de diálogo |
| `border-fg/[0.1]` | Overlay, toast, botão secundário, placeholder tracejado (`border-dashed`), "Ver conversas" |
| `border-fg/[0.12]` | `Kbd` |
| `border-fg/[0.14]` | Hover do card |
| `border-fg/[0.16]` | Hover da busca |
| `border-fg/90` | Botão primário |
| `border-ai/20` · `/25` · `/40` · `/50` | Chip ai e banner · Smart Fill em andamento e clima warn/bad (`warn/25`, `bad/25`) · slot selecionado · card selecionado |
| `border-ok/20` · `/30` | Chip ok e clima ok · Smart Fill concluído |
| `border-bad/70` | Barra da vaga aberta no heat strip |
| `border-bg/20` | `Kbd` dentro de botão primário / toast |

Fundos com alpha recorrentes: `bg-ai/[0.08]` chip e hover de "Voltar para hoje"; `bg-ai/[0.06]` banner, slot selecionado, clima; `bg-ok/[0.08]` chip ok e botão "Chamar"; `bg-ok/[0.14]` hover do "Chamar"; `bg-fg/[0.06]` trilho do `Meter`; `bg-fg/20` scrim; `bg-bg/80` header; `bg-sunken/60` coluna; `bg-ok/35` barra parcial; `bg-bad/15` vaga aberta.

### 1.6 Sombras

| Nome | Valor | Onde |
|---|---|---|
| card | `0 1px 2px rgb(var(--fg) / 0.04)` | Card de paciente, vitais, busca |
| kbd | `0 1px 0 rgb(var(--fg) / 0.06)` | `Kbd` (removida com `shadow-none` dentro de botão primário/toast) |
| glow-ai | `0 24px 60px -28px rgb(var(--ai) / 0.55)` | Smart Fill em andamento |
| glow-ok | `0 24px 60px -28px rgb(var(--ok) / 0.55)` | Smart Fill concluído (troca com `transition-shadow duration-700`) |
| overlay | `0 32px 80px -20px rgb(0 0 0 / 0.35)` | Paleta, reagendar, atalhos |
| toast | `0 20px 50px -20px rgb(0 0 0 / 0.5)` | Toast |

Blob de luz do Smart Fill: `div` absoluto `-right-16 -top-16 h-40 w-40 rounded-full blur-3xl` com `background: rgb(var(--ai) / .16)` (ou `rgb(var(--ok) / .14)` quando concluído), `pointer-events-none`, container com `overflow-hidden`.

Expor como `--shadow-cockpit-card`, `--shadow-glow-ai`, `--shadow-glow-ok`, `--shadow-cockpit-overlay`, `--shadow-cockpit-toast` no `@theme` para usar `shadow-glow-ai` em vez de arbitrary values.

### 1.7 Estados

| Elemento | Repouso | Hover | Foco visível | Selecionado / ativo |
|---|---|---|---|---|
| Card de paciente | `border-fg/[0.08] bg-surface shadow-card` | `border-fg/[0.14]` | `border-ai/50 ring-[3px] ring-ai/15` | idem foco (`aria-current="true"`) |
| Botão primário (1ª ação) | `bg-fg text-bg border-fg/90` | `bg-fg/85` | `ring-2 ring-ai/40` | — |
| Botão secundário | `bg-surface text-fg/80 border-fg/[0.1]` | `bg-sunken` | `ring-2 ring-ai/40` | — |
| Nav | `text-muted` | `bg-sunken/70 text-fg` | `ring-2 ring-ai/40` | `bg-sunken text-fg` + `aria-current="page"` |
| Busca (header) | `border-fg/[0.08] text-muted` | `border-fg/[0.16] text-fg` | `ring-2 ring-ai/40` | — |
| Opção da paleta | — | `bg-sunken` (via `onMouseMove` → índice) | — | `bg-sunken` + `aria-selected` + ícone `CornerDownLeft` |
| Slot de reagendar | `border-transparent` | `bg-sunken` | — | `border-ai/40 bg-ai/[0.06]` + `aria-pressed` + ícone `Check` |
| "Chamar" (Consultórios) | `bg-ok/[0.08] text-ok` | `bg-ok/[0.14]` | `ring-2 ring-ok/40` | — |
| Toggle tema / setas de dia | `text-muted border-fg/[0.08]` | `bg-sunken text-fg` | `ring-2 ring-ai/40` | — |
| Linha de ações do card | `opacity-0` (fica no layout) | `group-hover:opacity-100` | `group-focus-within:opacity-100` | `opacity-100` quando selecionado; sempre `opacity-100` em `[@media(hover:none)]` |

Transições: `transition-[box-shadow,border-color] duration-150` no card; `transition-colors` (150 ms padrão) em botões; `transition-opacity duration-150` na linha de ações; `transition-[width] duration-700 ease-out` no `Meter`; `transition-all duration-700` nas barras do heat strip; `transition-shadow duration-700` no Smart Fill.

### 1.8 Motion

```css
@keyframes enter { from { opacity: 0; transform: translateY(4px) scale(.99); } to { opacity: 1; transform: none; } }
@keyframes flash { 0% { background: rgb(var(--ok) / .16); } 100% { background: transparent; } }
@keyframes pop   { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
```

| Classe | Animação | Onde |
|---|---|---|
| `anim-enter` | `enter 280ms cubic-bezier(.2,.8,.2,1) both` | Card ao entrar numa coluna (key = `id + stage`, então mudar de etapa reanima); primeiro item do feed |
| `anim-flash` | `flash 1.6s ease-out both` | Valor do vital quando sobe (key = valor; só quando ultrapassa a baseline) |
| `anim-pop` | `pop 220ms cubic-bezier(.2,.8,.2,1) both` | Overlays e toast (key = `toast.id`) |
| `animate-ping` | Tailwind padrão | Halo do `Pulse` ("ao vivo", coluna Em atendimento, Smart Fill em andamento) |

`prefers-reduced-motion: reduce`: o protótipo zera animações e **todas** as transições. `index.css` já faz isso globalmente (duração 0.01 ms com `!important`); não duplicar.

### 1.9 O que muda em `index.css`

| Hoje (Fluent) | Cockpit | Ação |
|---|---|---|
| `--font-sans` Segoe UI; `--font-mono` Atkinson Hyperlegible Mono | Geist / Geist Mono | Trocar imports `@fontsource` e os dois tokens (impacta todas as telas — decisão do PO: a direção nova vale para o app inteiro, não só para `/cockpit`) |
| `--color-surface-app #f1f6fa`, `-base`, `-sunken`, `-raised` | `--color-bg`, `--color-surface`, `--color-sunken` | Adicionar os novos tokens; manter os antigos até as outras telas migrarem (Fase 5) |
| `--color-ink-primary/secondary/tertiary` | `--color-fg`, `--color-muted`, `--color-faint` | idem |
| `--color-accent #0f6cbd` (azul) para ação, foco, seleção | Ação = `fg` sólido; foco e seleção = `ai` (índigo) | Nas telas do cockpit, anel de foco é `ring-ai/40`. O `:focus-visible` global (`box-shadow` com `--color-accent-ink`) continua para as telas antigas; o cockpit sobrescreve no escopo da rota com `[data-screen="cockpit"] :focus-visible { box-shadow: none }` e usa as utilitárias |
| `--color-success/warning/danger/info` | `ok / warn / bad / ai` | Adicionar; os `--color-state-*` por status clínico **não** são usados no cockpit (tom vem da etapa, não do status) |
| `--radius-card 8px`, `--radius-modal 8px` | 12 / 16 px | Cockpit usa as utilitárias nativas (`rounded-xl`, `rounded-2xl`); não alterar os tokens Fluent |
| `--shadow-*` sem halo colorido | Glow colorido no Smart Fill | Adicionar `--shadow-glow-ai`, `--shadow-glow-ok` (exceção documentada ao "nunca halo colorido") |
| `--animate-pop 160ms` | `pop 220ms` com bezier `.2,.8,.2,1` | Renomear o do cockpit para `--animate-cockpit-pop` para não colidir com o `pop` existente (keyframes diferentes) |
| `body` 15 px | 14 px no cockpit | Escopo da rota |
| `<meta name="theme-color" content="#f1f6fa">` | `#FBFBFD` / `#09090B` | Atualizar em `index.html` junto com a migração global |

---

## 2. Anatomia da tela

Container: `main` com `max-w-[1680px] mx-auto px-4 sm:px-6 pt-4 pb-24`, `flex-col gap-4`. Header com o mesmo `max-w` e padding.

### 2.1 Header (sticky, 2 linhas)

`header.sticky z-30 border-b border-fg/[0.08] bg-bg/80 backdrop-blur-xl`, `top: env(safe-area-inset-top, 0px)`.

**Linha 1 (`h-14`, `gap-3`)**: logo (`h-7 w-7 rounded-lg bg-fg text-bg`, SVG de linha de ECG `M3 12h4l2-5 4 10 2-5h6`, stroke 2.2) + "ClinicFlow" 15/600 + `/ {clínica}` 13 faint (`lg+`) · nav `md+` (Cockpit ativo, Agenda, Comms com badge `2`, Pacientes; ícones `LayoutGrid`, `CalendarDays`, `MessagesSquare`, `UsersRound`, 14 px) · `flex-1` · botão de busca (`h-8`, `sm:w-64`, ícone `Search`, placeholder "Buscar paciente ou ação", `Kbd Ctrl K` em `sm+`) · toggle de tema (`h-8 w-8`, `Sun`/`Moon`) · usuário (`sm+`: avatar 28; `xl+`: nome 13/500 + "Recepção · balcão 1" 11 faint) separado por `border-l`.

**Linha 2 (`pb-3`, `flex-wrap gap-x-4 gap-y-2`)**: seletor de dia (`ChevronLeft` / label `min-w-[13.5rem]` 13/500 `first-letter:uppercase` formato `weekday, d 'de' month` pt-BR / `ChevronRight`) · "Voltar para hoje" (`Undo2`, `text-ai`, só quando `dayOffset !== 0`) · "ao vivo · HH:MM:SS" (`Pulse ok` + mono 13, `aria-live="off"`) · Clima operacional (ícone `CloudSun`/`Cloud`/`CloudRain`, "Fluxo estável" / "Atenção" / "Fluxo pressionado", detalhe em `md+`; borda/fundo pelo nível: `border-ok/20 bg-ok/[0.06]`, `border-warn/25 bg-warn/[0.06]`, `border-bad/25 bg-bad/[0.06]`).

Regra do clima: `late` = consultas com `elapsed > planned`; `overTol` = esperas `>= 15 min`. `late + overTol >= 3` → `bad`; `> 0` → `warn`; senão `ok`. Detalhe: `"Dr. X +N min · M acima da tolerância"` ou `"sem atrasos"`.

Quando `dayOffset !== 0`, aparece um banner `rounded-xl border-ai/20 bg-ai/[0.06]` (ícone `History`) no topo do `main`: "Outro dia selecionado. Para consultar o histórico, abra a Agenda; o cockpit abaixo continua mostrando o fluxo ao vivo de hoje." **O board não muda de dia** — só o rótulo.

### 2.2 Vitals strip

`section[aria-label="Sinais vitais de hoje"]`: `grid grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl border-fg/[0.08] bg-fg/[0.08] overflow-hidden shadow-card` (o `gap-px` sobre fundo `fg/[0.08]` desenha as divisórias). Cada `Vital`: `bg-surface p-4 sm:p-5`, rótulo 12/500 muted com ícone 14, valor 30 mono, sub 12 muted.

| # | Ícone | Rótulo | Valor | Tom | Sub |
|---|---|---|---|---|---|
| 1 | `Gauge` | Ocupação | `round(filled/total*100)` + `%` | — | "`47` de `50` horários · 3 livres à tarde" |
| 2 | `ShieldCheck` | No-shows prevenidos | `saved` | `ai` | "remarcados ou vagas repostas pelo Copilot" |
| 3 | `Wallet` | Receita salva estimada | `brl(revenue)` (sem centavos) | `ok` | "hoje, por ticket médio de cada vaga recuperada" |
| 4 | `Timer` | Espera média | `avgWait` + ` min` | — | "agora `N` na espera · maior `M min`" ou "ninguém esperando agora" |

Flash (`anim-flash`) dispara quando o valor sobe acima da baseline do carregamento (prototipo: `filled > 47`, `saved > 4`, `revenue > 3200`). Implementar como "valor atual > valor da primeira resposta da sessão".

### 2.3 Day heat strip

`section[aria-label="Ocupação do dia por meia hora"]`, `rounded-2xl border-fg/[0.08] bg-surface px-4 sm:px-5 pt-3.5 pb-3`. Cabeçalho: "Ocupação do dia" 12/500 muted + legenda (cheio `bg-ok`, parcial `bg-ok/35`, "15:30 aberta/reposta"). 24 faixas de 30 min, 07:00–19:00, `flex h-9 items-end gap-[3px]`; cada barra `flex-1 rounded-[3px]`, altura `max(14, v*100)%`, `bg-ok` se `v >= 1`, `bg-ok/35` caso contrário, `opacity-40` se já passou; faixa com vaga aberta `border border-bad/70 bg-bad/15` até ser reposta. `title` = "HH:MM · N% ocupado". Marcador "agora": linha `w-px bg-fg` de `-top-1` a `-bottom-1` em `left: nowPct%` com bolinha `h-2 w-2 rounded-full bg-fg ring-2 ring-surface`. Eixo: `07h 09h 11h 13h 15h 17h 19h` mono 11 faint, `justify-between`.

### 2.4 Board de 5 etapas

Título "Fluxo ao vivo" 15/600 + "da confirmação ao retorno, na ordem em que acontece" 12 muted + botão `? atalhos` (`sm+`) à direita. Grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3`.

Coluna: `section[aria-labelledby=col-{id}] rounded-2xl border-fg/[0.06] bg-sunken/60`. Header `flex-col gap-0.5 px-3 pt-3 pb-2.5`: linha 1 = ponto (`Pulse` só na etapa live) + `h2` 13/600 `whitespace-nowrap` + contagem mono 12 à direita (`ml-auto`); linha 2 = subtítulo 12 faint `truncate pl-4`. Lista `ul min-h-[140px] gap-2 px-2 pb-2`. Vazio: `li` tracejado "Ninguém nesta etapa agora".

| id | Título | Subtítulo | Tom | Ordenação | Corpo do card |
|---|---|---|---|---|---|
| `arriving` | A chegar | Confirmados pelo Copilot | `ai` | `time asc` | Chip `ai` `MessageCircle` "WhatsApp · confirmou HH:MM" + ETA opcional ("a caminho · ~10 min"); ou chip `ai` `Zap` "Smart Waitlist · vaga preenchida HH:MM" |
| `reception` | Na recepção | Check-in recente | `fg` | `checkedInAt asc` | Chip intake (`ok` `ShieldCheck` / `warn` `FileWarning`) + "check-in HH:MM · há N min" mono 12 |
| `waiting` | Em espera | Tolerância de 15 min | `warn` | `waitingSince asc` | Cronômetro `mm:ss` 22 mono (tom `ok` < 75 % · `warn` ≥ 75 % · `bad` ≥ 100 % da tolerância) + "limite 15:00" (`whitespace-nowrap`) + `Meter` + chips: `bad` `TriangleAlert` "+N min além" (se estourou), `ai` `BellRing` "sala avisada HH:MM" (se notificado), "Dr. X +N min" (médico ocupado e atrasado) ou "Sala N livre" em `text-ok` |
| `consult` | Em atendimento | Tempo decorrido | `ok` (live) | `startedAt asc` | Cronômetro `mm:ss` 22 mono + "/ 30:00 · SN" (`whitespace-nowrap`) + `Meter` (`warn` se > 100 %) + chip `warn` `Hourglass` "N min acima do previsto" |
| `done` | Finalizados | Retornos a agendar | `muted` | `finishedAt desc` | Chip de retorno (`pending` → `warn` `CalendarPlus` "Retorno em 30 dias · a agendar"; `exam` → `muted` `FlaskConical`; `scheduled` → `ok` `CalendarCheck` "Retorno 06/11 · 09:30") + "finalizado HH:MM" |

Card (`li[data-pid][tabindex=0]`, `rounded-xl bg-surface p-3 gap-2.5`): linha 1 = `Avatar` 32 (iniciais, palavras > 2 letras, 2 primeiras) + nome 14/500 `truncate` + hora mono 12 muted; linha 2 = pagador (`Particular · R$ 450` com valor mono, ou nome do convênio) + `DocTag` (ponto colorido 6 px + "Dra. Helena"); linha 3 = tipo 12 faint. Depois o corpo da etapa e, por último, a **linha de ações sempre renderizada** (`h-7` por botão, `flex-wrap gap-1.5`) com opacidade 0 fora de hover/foco/seleção — é isso que garante zero layout shift ao selecionar. Primeiro botão é primário (`bg-fg`), os demais secundários; cada um carrega `Kbd` com a letra.

| Etapa | Ações (ordem) |
|---|---|
| arriving | `C` Check-in (`LogIn`) · `R` Reagendar (`CalendarClock`) |
| reception | `E` Liberar p/ espera (`Armchair`) · `R` Reagendar |
| waiting | `N` Notificar sala (`BellRing`) · `R` Reagendar |
| consult | `F` Finalizar (`CircleCheck`) |
| done | `A` Agendar retorno (`CalendarPlus`) — só se `followUp.kind !== "scheduled"` |

### 2.5 Copilot rail (`aside#rail[aria-label="Copilot"]`)

Layout: `grid gap-4 md:grid-cols-3 min-[1800px]:flex min-[1800px]:flex-col`; a partir de 1800 px vira a coluna direita de 340 px (`min-[1800px]:grid-cols-[minmax(0,1fr)_340px]` no wrapper). Abaixo disso o board usa a largura toda, para as 5 colunas não ficarem estreitas demais.

**Smart Fill** (`rounded-2xl p-4`, borda/glow por status): ícone `Zap` em caixa 24 px (`bg-ai/10 text-ai` ou `bg-ok/10 text-ok`) + "Smart Fill" 13/600 + status à direita ("Em andamento" com `Pulse ai` / "Vaga reposta" em ok) · "15:30 · Dra. Beatriz Okada" 13 + "Cláudia Reis desmarcou às 10:39 pelo WhatsApp" 12 muted · cronômetro 26 mono (`elapsed = (filledAt ?? now) - openedAt`) + "meta 08:00" · `Meter` (`elapsed / 480s`) · lista numerada de candidatos (`divide-y`, `py-2`): índice mono 12 faint `w-4`, nome 13/500, motivo 12 muted, status à direita 12/500 (`lido` "Lida" muted · `digitando` "Respondendo…" ai · `aceitou` "Aceitou 15:30" ok · `enviado` "Enviada" muted · `fila` "Na fila" muted · `cancelado` "Dispensada" muted) · botão secundário `h-8 w-full` "Ver conversas no Centro de Resgate" + `ArrowUpRight`.

**Consultórios** (`rounded-2xl p-4`, ícone `DoorOpen`): uma linha por profissional (`py-2.5`, `divide-y`): ponto colorido + "Sala N" 13/500 + "Dra. Helena · Dermatologia" 12 muted + à direita cronômetro mono 12 (`text-warn` se acima do previsto) ou "Livre" 12/500 ok. Se ocupado: segunda linha com nome do paciente + `Meter` de 80 px. Se livre e há alguém esperando por esse profissional: botão `Chamar {nome} · espera N min` (`bg-ok/[0.08] text-ok`).

**Atividade** (`rounded-2xl p-4`, ícone `Activity`, "Copilot e recepção" à direita): até **7** itens, timeline com linha vertical `left-[11px] top-6 w-px bg-fg/[0.08]` entre itens, ícone 24 px redondo com borda e tom (`ai`/`ok`/`bad`/`fg`), hora mono 11 faint + texto 12.5 `text-fg/85`. Primeiro item com `anim-enter` ao entrar.

### 2.6 Overlays

Base `Overlay`: `div[role=dialog][aria-modal=true][aria-label]` fixo `inset-0 z-50 bg-black/40 backdrop-blur-[2px] px-4`; `align="top"` → `items-start pt-[12vh]` (paleta); `align="center"` (reagendar, atalhos). Painel `anim-pop max-w-[560px] rounded-2xl border-fg/[0.1] bg-surface shadow-overlay overflow-hidden`. Clique no scrim (`mousedown` no próprio backdrop) fecha.

| Overlay | Abertura | Conteúdo | Teclado interno |
|---|---|---|---|
| Paleta (`Busca rápida`) | `Ctrl/Cmd+K`, `/`, botão de busca | Input `h-12` 15 px + `Kbd Esc`; lista `role=listbox max-h-[52vh]` com grupos (11 uppercase faint): **Ações** (Chamar próximo com sala livre `N`, Acompanhar Smart Fill, Alternar tema, Mostrar atalhos `?`), **Pacientes de hoje** (nome + "HH:MM · Dr. X · Etapa"), **Ir para** (Agenda inteligente, Centro de Resgate, Paciente 360); rodapé `↑↓ navegar · ↵ abrir · N resultados`. Busca normaliza acentos (`NFD`) e casa em `label + hint + group` | `↑↓` move, `Enter` executa, `Esc` fecha; `mousemove` seleciona; item ativo faz `scrollIntoView({block:"nearest"})`; vazio: "Nada encontrado para “q”." |
| Reagendar | `R` em arriving/reception/waiting | Cabeçalho avatar 36 + "Reagendar {nome}" 15/600 + "HH:MM · Dr. X · tipo" + botão `X`; "Sugestões do Copilot pelo histórico do paciente" (`Sparkles`, ai); 3 slots (`Kbd 1/2/3`, label mono 13.5, hint 12 muted); checkbox `accent-[rgb(var(--ai))]` "Copilot avisa {primeiro nome} pelo WhatsApp e libera a vaga para o Smart Fill" (default marcado); rodapé Cancelar + "Reagendar ↵" primário | `1/2/3` e `↑↓` selecionam, `Enter` confirma, `Esc` fecha, duplo clique confirma; foco inicial no container (`tabIndex=-1`) |
| Atalhos | `?` ou botão | Lista `label — Kbd[]` (ver 5.1) | `Esc` ou `?` fecha |
| Toast | Após cada ação | Fixo `bottom: calc(16px + safe-area)`, `z-40`, `max-w-[560px] rounded-xl bg-fg text-bg` 13 px, ícone (ok ou ai), mensagem, botão "Desfazer `Z`" quando há undo, botão `X`. Some em **6 s**; nova mensagem substitui (key = id) | `Z` global aciona o undo |

Fechar qualquer overlay devolve o foco ao card que estava selecionado (`lastFocusRef`).

### 2.7 Responsivo (como implementado)

| Breakpoint | Mudanças |
|---|---|
| `< 640` | Board 1 coluna; busca só ícone; sem avatar/usuário; vitais 2×2; rail empilhado (1 coluna); footer de atalhos oculto; nav oculta |
| `sm ≥ 640` | Busca `w-64` com placeholder e `Kbd`; avatar do usuário; board 2 colunas; botão "? atalhos"; `px-6` |
| `md ≥ 768` | Nav visível; detalhe do clima; rail em 3 colunas lado a lado; footer de atalhos |
| `lg ≥ 1024` | Board 5 colunas; vitais 4 colunas; "/ Clínica" no logo |
| `xl ≥ 1280` | Nome e cargo do usuário |
| `≥ 1800` (`min-[1800px]`) | Rail vira coluna direita de 340 px; board ocupa `minmax(0,1fr)` |

Touch (`hover:none`): linha de ações sempre visível. Nenhum scroll horizontal em 390 px.

---

## 3. Arquitetura de estado

### 3.1 `apps/web/src/features/cockpit/types/cockpit.ts`

```ts
import type { AppointmentType } from "../../../lib/api/types";

export type FlowStage = "arriving" | "reception" | "waiting" | "consult" | "done";
export type Tone = "ai" | "ok" | "warn" | "bad" | "fg" | "muted";

export interface CockpitProfessional {
  id: string;
  name: string;        // "Dra. Helena Prado"
  shortName: string;   // "Dra. Helena"
  specialty: string;
  /** Sala do dia (ScheduleWindow.room ou Appointment.room); null se não configurada. */
  room: string | null;
  /** Índice 0..3 na paleta fixa; derivado no backend por hash do id. */
  colorIndex: number;
}

export type Payer =
  | { kind: "conv"; label: string }            // convênio
  | { kind: "part"; label: "Particular"; valueCents: number };

interface CockpitPatientBase {
  id: string;              // appointmentId
  patientId: string;
  name: string;
  professionalId: string;
  /** ISO 8601 com offset da clínica. */
  startsAt: string;
  durationMinutes: number;
  type: AppointmentType;
  /** Rótulo livre do backend: "Retorno · ECG", "Biópsia de pele". */
  typeLabel: string;
  payer: Payer | null;
}

export interface ArrivingPatient extends CockpitPatientBase {
  stage: "arriving";
  /** null = AGENDADA sem confirmação. */
  confirmedAt: string | null;
  confirmedVia: "WHATSAPP" | "WEB" | "TELEFONE" | "SISTEMA" | null;
  /** Preenchido quando a vaga veio do Smart Fill. */
  smartFillAt: string | null;
  eta: string | null;
}

export interface ReceptionPatient extends CockpitPatientBase {
  stage: "reception";
  checkedInAt: string;
  intake: { ok: boolean; text: string };
}

export interface WaitingPatient extends CockpitPatientBase {
  stage: "waiting";
  checkedInAt: string;
  /** = Appointment.readyAt. Base do cronômetro. */
  waitingSince: string;
  /** = Appointment.calledAt quando o aviso foi silencioso. */
  notifiedAt: string | null;
}

export interface ConsultPatient extends CockpitPatientBase {
  stage: "consult";
  startedAt: string;
  plannedMinutes: number;
}

export type FollowUpKind = "pending" | "exam" | "scheduled";

export interface DonePatient extends CockpitPatientBase {
  stage: "done";
  finishedAt: string;
  followUp: { kind: FollowUpKind; text: string; taskId: string | null; appointmentId: string | null } | null;
}

export type CockpitPatient =
  | ArrivingPatient | ReceptionPatient | WaitingPatient | ConsultPatient | DonePatient;

export interface CockpitBoard {
  date: string;                 // AAAA-MM-DD
  /** Relógio do servidor no momento da resposta; corrige o drift do cliente. */
  serverNow: string;
  toleranceMinutes: number;     // ClinicSettings.lateToleranceMinutes
  professionals: CockpitProfessional[];
  stages: Record<FlowStage, CockpitPatient[]>;
  /** 24 faixas de 30 min, 07:00–19:00, 0..1. */
  heat: { bucket: number; ratio: number; freed: boolean }[];
}

export interface Vitals {
  filledSlots: number;
  totalSlots: number;
  freeSlotsAfternoon: number;
  noShowsPrevented: number;
  revenueSavedCents: number;
  averageWaitMinutes: number;
  waitingCount: number;
  longestWaitMinutes: number;
}

export type WeatherLevel = "ok" | "warn" | "bad";
export interface OperationalWeather {
  level: WeatherLevel;
  detail: string;          // "Dr. Ramos +6 min · 1 acima da tolerância" | "sem atrasos"
}

export type SmartFillCandidateStatus = "lido" | "digitando" | "aceitou" | "enviado" | "fila" | "cancelado";
export interface SmartFillCandidate {
  patientId: string;
  name: string;
  reason: string;          // "Prioridade alta · palpitações · Unimed"
  status: SmartFillCandidateStatus;
}
export interface SmartFillRun {
  id: string;
  status: "running" | "filled" | "expired";
  professionalId: string;
  slotStartsAt: string;    // 15:30
  openedAt: string;        // desmarcação
  filledAt: string | null;
  targetSeconds: number;   // 480
  cancelledBy: { patientName: string; channel: "WHATSAPP" | "TELEFONE" | "WEB" } | null;
  candidates: SmartFillCandidate[];
}

export interface RoomStatus {
  professionalId: string;
  room: string | null;
  current: { appointmentId: string; patientName: string; startedAt: string; plannedMinutes: number } | null;
  next: { appointmentId: string; patientName: string; waitingSince: string } | null;
}

export interface ActivityEvent {
  id: string;
  at: string;
  tone: Tone;
  icon: string;            // nome lucide: "ScanLine" | "CalendarX2" | "MessageCircle" | "Zap" | "CheckCheck" | "Armchair" | "BellRing" | "DoorOpen" | "CircleCheck" | "CalendarCheck" | "CalendarClock"
  text: string;
  appointmentId: string | null;
}

export type CardActionKey = "c" | "e" | "n" | "f" | "a" | "r";
export interface CardAction {
  key: CardActionKey;
  label: string;
  icon: string;
  primary: boolean;
}

export type NotifyRoomResult = { mode: "called" | "silent_notice"; appointmentId: string };
```

### 3.2 FlowStage ↔ `AppointmentStatus` + carimbos

| FlowStage | Filtro | Carimbo que ancora o cronômetro | Ação que sai da etapa |
|---|---|---|---|
| `arriving` | `status IN (AGENDADA, CONFIRMADA)` e `startsAt` no dia | `confirmedAt` (exibição) | `PATCH /appointments/:id/check-in` → `CHECK_IN` + `checkedInAt` |
| `reception` | `status = CHECK_IN AND readyAt IS NULL` | `checkedInAt` ("há N min") | **novo** `PATCH /appointments/:id/release-to-waiting` → `readyAt = now` (status não muda) |
| `waiting` | `status = CHECK_IN AND readyAt IS NOT NULL` | `readyAt` (`waitingSince`) | **novo** `POST /appointments/:id/notify-room` → `EM_ATENDIMENTO` + `startedAt` (sala livre) ou só `calledAt` (aviso silencioso) |
| `consult` | `status = EM_ATENDIMENTO` | `startedAt`; `plannedMinutes = durationMinutes` | `PATCH /appointments/:id/complete` → `CONCLUIDA` + `completedAt` |
| `done` | `status = CONCLUIDA` | `completedAt` | **novo** `PATCH /appointments/:id/schedule-follow-up` |
| (fora) | `CANCELADA`, `REAGENDADA` | — | Reagendar remove o card do board (o protótipo filtra o paciente) |

`followUp` em `done`: `Task` aberta `RETORNO_A_AGENDAR` → `pending`; `AGUARDANDO_EXAME` → `exam`; task `RESOLVIDA` com consulta futura do mesmo paciente/profissional → `scheduled`; nenhuma → `null` (card sem chip e sem ação `A`).

**Por que `readyAt`**: hoje `CHECK_IN` cobre tanto "no balcão resolvendo carteirinha" quanto "sentado esperando", e a `sala-de-espera` conta a espera a partir de `checkedInAt`. O cockpit separa as duas etapas porque o cronômetro de tolerância só faz sentido depois do intake. Expand-only, sem backfill:

```sql
-- apps/api/prisma/migrations/20261010000000_appointments_ready_at/migration.sql
-- Cockpit (tela 1): "Na recepção" vs "Em espera" dentro de CHECK_IN.
-- Expand: coluna nula, sem reescrita; linhas antigas continuam "na recepção"
-- e os fluxos atuais (sala-de-espera) seguem lendo checked_in_at.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "ready_at" TIMESTAMPTZ(3) NULL;
-- Só a fila do dia consulta por isto; índice parcial fica pequeno.
CREATE INDEX IF NOT EXISTS "appointments_ready_at_idx"
  ON "appointments" ("professional_id", "ready_at")
  WHERE "status" = 'CHECK_IN';
COMMIT;
```

```prisma
// schema.prisma · model Appointment
/// Liberado do balcão para a sala de espera. Null enquanto o intake
/// (carteirinha, guia, termo) não terminou. Base do cronômetro de tolerância.
readyAt DateTime? @map("ready_at")
```

Compatibilidade: `PATCH /appointments/:id/check-in` passa a aceitar `{ "skipIntake": true }` (grava `readyAt = checkedInAt` na mesma transação) para clínicas sem etapa de balcão e para o fluxo atual da `/sala-de-espera`, que deve enviar `skipIntake: true` até ser migrada. `TIMESTAMP_FIELD` não ganha entrada (não é status). O serviço de undo precisa reconhecer o evento `CHECK_IN → CHECK_IN` com `reason = "released_to_waiting"` e, ao desfazê-lo, zerar `readyAt` (ver 4.6).

**Modelos opcionais (fora do mínimo da Fase 4, listados porque o protótipo os exibe)**:

| Dado no protótipo | Hoje | Proposta expand |
|---|---|---|
| Pagador (convênio / particular R$) **[GAP]** | Não existe em `Patient` nem `Appointment` | `patients.insurance_name TEXT NULL`; `appointments.price_cents INT NULL`. Até lá o board devolve `payer: null` e o card omite a linha |
| Intake (carteirinha, guia TISS) **[GAP]** | Não existe | `appointments.intake_status TEXT NULL` (`OK` / `PENDING`) + `intake_note TEXT NULL`. Até lá: `intake = { ok: true, text: "Check-in registrado" }` |
| Smart Fill / lista de espera **[GAP]** | Não existe (nenhum modelo de waitlist) | `smart_fill_runs` + `smart_fill_candidates` (Fase 4b). Até lá `GET /cockpit/smart-fill/active` → `null` e o card mostra estado vazio "Nenhuma vaga aberta agora" |
| ETA "a caminho · ~10 min" **[GAP]** | Não existe | Fica `null`; vem do canal WhatsApp numa fase futura |
| Sala fixa por profissional | `ScheduleWindow.room` por dia da semana; `Appointment.room` | Board resolve `room` = `Appointment.room ?? ScheduleWindow.room` do dia; sem migração |

### 3.3 Layout de arquivos

```
apps/web/src/features/cockpit/
├─ cockpit-page.tsx                 # rota /cockpit; compõe header, vitais, strip, board, rail, overlays
├─ types/cockpit.ts                 # seção 3.1
├─ api/cockpit-api.ts               # cockpitApi (board, vitals, smartFill, activity, releaseToWaiting, notifyRoom, scheduleFollowUp)
├─ hooks/
│  ├─ use-clock.ts                  # tick de 1 s + offset do servidor
│  ├─ use-cockpit-board.ts
│  ├─ use-cockpit-vitals.ts
│  ├─ use-smart-fill-runs.ts
│  ├─ use-cockpit-activity.ts
│  ├─ use-cockpit-stream.ts         # subscribe("/cockpit/stream")
│  ├─ use-cockpit-actions.ts        # mutations otimistas + undo (Z)
│  ├─ use-cockpit-keymap.ts         # keydown global (seção 5)
│  └─ use-board-navigation.ts       # selectedId, move(h/j/k/l), focusCard
├─ lib/
│  ├─ stage.ts                      # STAGES, STAGE_LABEL, cardActions(p), sort por etapa
│  ├─ weather.ts                    # deriveWeather(board, now)
│  ├─ format.ts                     # hm, hms, mmss, brl, initials, first, norm
│  └─ tones.ts                      # DOT, TEXT, CHIP maps (classes Tailwind)
├─ components/
│  ├─ cockpit-header.tsx
│  ├─ vitals-strip.tsx
│  ├─ day-heat-strip.tsx
│  ├─ flow-board.tsx                # grid de 5 colunas
│  ├─ flow-column.tsx
│  ├─ patient-card.tsx              # + card-body-{arriving,reception,waiting,consult,done}.tsx
│  ├─ copilot-rail.tsx
│  ├─ smart-fill-card.tsx
│  ├─ rooms-panel.tsx
│  ├─ activity-feed.tsx
│  ├─ command-palette.tsx
│  ├─ reschedule-dialog.tsx
│  ├─ shortcuts-dialog.tsx
│  ├─ cockpit-toast.tsx
│  └─ atoms/{pulse,kbd,chip,meter,avatar,doc-tag,payer}.tsx
└─ cockpit.test.tsx                 # Vitest: cardActions, deriveWeather, move(), tolerância
```

Em `apps/web/src/lib/query.ts`, adicionar:

```ts
cockpit: {
  all: ["cockpit"] as const,
  board: (date?: string) => ["cockpit", "board", { date }] as const,
  vitals: (date?: string) => ["cockpit", "vitals", { date }] as const,
  smartFill: ["cockpit", "smart-fill", "active"] as const,
  activity: (limit: number) => ["cockpit", "activity", { limit }] as const,
},
```

E em `apps/web/src/lib/api/endpoints.ts` um `cockpitApi` (ou no `api/cockpit-api.ts` da feature, importando `request` de `../../../lib/api/client`), mais `appointmentsApi.releaseToWaiting`, `appointmentsApi.notifyRoom`, `appointmentsApi.scheduleFollowUp`.

### 3.4 Hooks TanStack Query v5

```ts
// use-cockpit-board.ts
export function useCockpitBoard(date?: string) {
  return useQuery({
    queryKey: qk.cockpit.board(date),
    queryFn: () => cockpitApi.board(date),
    staleTime: 30_000,                  // herdado do client
    refetchInterval: 20_000,            // rede de segurança se o SSE cair
    refetchIntervalInBackground: false,
    placeholderData: keepPreviousData,
  });
}
// useCockpitVitals(date): idem, refetchInterval 60_000
// useSmartFillRuns(): queryKey qk.cockpit.smartFill, refetchInterval 10_000 enquanto status === "running"
// useCockpitActivity(limit = 7): queryKey qk.cockpit.activity(limit)
```

```ts
// use-cockpit-actions.ts — padrão de mutação otimista com rollback
type Ctx = { previous: CockpitBoard | undefined; snapshotAt: number };

function useBoardMutation<TVars extends { id: string }>(
  mutationFn: (vars: TVars) => Promise<unknown>,
  apply: (board: CockpitBoard, vars: TVars, nowIso: string) => CockpitBoard,
) {
  const qc = useQueryClient();
  const key = qk.cockpit.board(undefined);
  return useMutation({
    mutationFn,
    onMutate: async (vars): Promise<Ctx> => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<CockpitBoard>(key);
      if (previous) qc.setQueryData(key, apply(previous, vars, new Date().toISOString()));
      return { previous, snapshotAt: Date.now() };
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
      toast.push({ tone: "error", title: "Não foi possível concluir", description: errorMessage(error) });
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.cockpit.all });
      void qc.invalidateQueries({ queryKey: qk.appointments.all });
      void qc.invalidateQueries({ queryKey: qk.waitingRoom.all });
      void qc.invalidateQueries({ queryKey: qk.dashboard.all });
    },
  });
}
```

| Ação (tecla) | `mutationFn` | `apply` (otimista) | Toast |
|---|---|---|---|
| `C` check-in | `appointmentsApi.checkIn(id)` | move `arriving → reception`, `checkedInAt = now`, `intake = {ok:true,"Check-in registrado no balcão"}` | "{nome} fez check-in" `LogIn` |
| `E` liberar | `appointmentsApi.releaseToWaiting(id)` | `reception → waiting`, `waitingSince = now` | "{primeiro} liberado para a espera · cronômetro iniciado" `Armchair` |
| `N` notificar | `appointmentsApi.notifyRoom(id)` | se nenhum `consult` do mesmo profissional: `waiting → consult`, `startedAt = now`; senão `notifiedAt = now` | `called`: "{primeiro} chamado para a {sala}" · `silent_notice`: "{Dr.} avisado na tela: {primeiro} está pronto" (tom `ai`). Se o servidor responder modo diferente do previsto, `onSuccess` corrige o cache |
| `F` finalizar | `appointmentsApi.complete(id)` | `consult → done`, `finishedAt = now`, `followUp = {pending, "Retorno em N dias"}` (N = `returnWindowDays`) | "Atendimento de {primeiro} finalizado · retorno entra na fila" `CircleCheck` |
| `A` retorno | `appointmentsApi.scheduleFollowUp(id, body)` | `followUp = {scheduled, "Retorno dd/mm · HH:MM · convite enviado"}` | "Retorno de {primeiro} agendado · Copilot enviou o convite" `CalendarCheck`, tom `ai` |
| `R` reagendar | `appointmentsApi.reschedule(id, {date,time,reason,…})` | remove o card | "{nome} remarcado para {slot} · paciente avisado" `CalendarClock`, tom `ai` |

**Undo (Z)** — duas camadas, como já existe em `/appointments/:id/undo`:

1. O toast guarda `{ appointmentId, previous: CockpitBoard }` por **6 s** (janela do protótipo; o servidor permite `UNDO_WINDOW_SECONDS`, padrão 30 s, então o cliente nunca expira antes do servidor).
2. `Z` (ou o botão): `qc.setQueryData(board, previous)` imediatamente (rollback otimista) e `appointmentsApi.undo(appointmentId)`. Sucesso → invalida `qk.cockpit.all`, toast "Ação desfeita" (`Undo2`, tom `ai`, sem undo). Erro `UNDO_WINDOW_EXPIRED` / `UNDO_NOT_ALLOWED` → re-invalida e mostra a `message` do envelope.
3. Sem toast ativo, `Z` não faz nada.

Não existe undo de `A` (cria consulta nova — o undo do servidor cancelaria a consulta criada; aceitável, mas fora do escopo: o toast de `A` **não** oferece Desfazer na Fase 4).

### 3.5 Refetch e SSE

Recomendado: **`GET /cockpit/stream`** (SSE, mesmo padrão de `waiting-room/stream` e `dashboard/stream`, autenticado por header via `subscribe()` de `client.ts`, que já faz reconexão com backoff 1 s → 30 s e refresh de token).

```ts
// use-cockpit-stream.ts
useEffect(() => subscribe<CockpitStreamFrame>("/cockpit/stream", (frame) => {
  if (frame.kind === "board") qc.setQueryData(qk.cockpit.board(undefined), frame.data);
  void qc.invalidateQueries({ queryKey: qk.cockpit.vitals(undefined) });
  void qc.invalidateQueries({ queryKey: qk.cockpit.activity(7) });
  if (frame.kind === "smart-fill") qc.setQueryData(qk.cockpit.smartFill, frame.data);
}), [qc]);
```

Servidor: `merge(fromEvent(AppointmentStatusChanged), fromEvent(AppointmentCheckedIn), fromEvent(AppointmentCreated), fromEvent(AppointmentReadyForWaiting /*novo*/), fromEvent(AppointmentRoomNotified /*novo*/))` → `startWith(null)` → `switchMap(() => boardService.execute())` → `{ data: { kind: "board", data } }`. Smart Fill emite `{ kind: "smart-fill" }` quando existir.

Fallback: o `refetchInterval` de 20 s nos hooks cobre proxy sem SSE; não é necessário detectar o estado do stream. `refetchOnWindowFocus` segue ligado (padrão do client).

### 3.6 Relógio de 1 s (local)

```ts
// use-clock.ts
export function useClock(serverNowIso?: string): number {
  const offset = useRef(0);
  useEffect(() => { if (serverNowIso) offset.current = Date.parse(serverNowIso) - Date.now(); }, [serverNowIso]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  return now + offset.current;
}
```

Um único intervalo na página (contexto `ClockProvider`), **nunca** refetch para atualizar cronômetros. Todo tempo exibido é `now - Date.parse(timestamp)`: espera, consulta, Smart Fill, "há N min", clima, posição do marcador no heat strip. `serverNow` da resposta do board corrige o drift do relógio do balcão.

---

## 4. Contratos REST (NestJS)

Prefixo: `api/v1` (`config.apiPrefix`). Módulo novo `apps/api/src/modules/cockpit/` (`cockpit.controller.ts`, `cockpit.module.ts`, `services/get-cockpit-board.service.ts`, `get-cockpit-vitals.service.ts`, `get-active-smart-fill.service.ts`, `list-cockpit-activity.service.ts`, `requests/*.request.ts` com Zod + `ZodValidationPipe`, `dto/*.dto.ts` com `@ApiProperty`). Ações no paciente ficam em `appointments` (controller existente), não no cockpit. Guard JWT padrão; `@Roles("RECEPCAO","GESTOR")`.

Horas em ISO 8601 com offset (`2026-10-09T10:42:00-03:00`) via `ClinicTime`; datas `AAAA-MM-DD`.

### 4.1 `GET /cockpit/board?date=`

Query: `date?` (`AAAA-MM-DD`, default hoje no fuso da clínica; regex `DATE_PATTERN` como em `list-slots.request.ts`).

```json
{
  "date": "2026-10-09",
  "serverNow": "2026-10-09T10:42:00-03:00",
  "toleranceMinutes": 15,
  "professionals": [
    { "id": "0192…", "name": "Dra. Helena Prado", "shortName": "Dra. Helena", "specialty": "Dermatologia", "room": "Sala 1", "colorIndex": 0 },
    { "id": "0192…", "name": "Dr. Rafael Ramos", "shortName": "Dr. Ramos", "specialty": "Ortopedia", "room": "Sala 2", "colorIndex": 1 }
  ],
  "stages": {
    "arriving": [
      { "stage": "arriving", "id": "0192…p01", "patientId": "…", "name": "Carlos Eduardo Lima", "professionalId": "…ramos",
        "startsAt": "2026-10-09T11:15:00-03:00", "durationMinutes": 30, "type": "RETORNO", "typeLabel": "Retorno",
        "payer": { "kind": "conv", "label": "Bradesco Saúde" },
        "confirmedAt": "2026-10-09T07:58:00-03:00", "confirmedVia": "WHATSAPP", "smartFillAt": null, "eta": "a caminho · ~10 min" },
      { "stage": "arriving", "id": "0192…p05", "name": "Mariana Costa", "professionalId": "…ramos",
        "startsAt": "2026-10-09T14:00:00-03:00", "durationMinutes": 30, "type": "AVALIACAO", "typeLabel": "Avaliação",
        "payer": { "kind": "part", "label": "Particular", "valueCents": 40000 },
        "confirmedAt": "2026-10-09T09:52:00-03:00", "confirmedVia": "WHATSAPP", "smartFillAt": "2026-10-09T09:52:00-03:00", "eta": null }
    ],
    "reception": [
      { "stage": "reception", "id": "0192…p07", "name": "Roberto Nogueira", "professionalId": "…okada",
        "startsAt": "2026-10-09T11:00:00-03:00", "durationMinutes": 30, "type": "RETORNO", "typeLabel": "Retorno",
        "payer": { "kind": "conv", "label": "Amil" },
        "checkedInAt": "2026-10-09T10:41:00-03:00", "intake": { "ok": false, "text": "Guia TISS aguardando autorização" } }
    ],
    "waiting": [
      { "stage": "waiting", "id": "0192…p09", "name": "Gustavo Teixeira", "professionalId": "…menezes",
        "startsAt": "2026-10-09T10:45:00-03:00", "durationMinutes": 30, "type": "PRIMEIRA_CONSULTA", "typeLabel": "Primeira consulta",
        "payer": { "kind": "part", "label": "Particular", "valueCents": 52000 },
        "checkedInAt": "2026-10-09T10:28:00-03:00", "waitingSince": "2026-10-09T10:31:00-03:00", "notifiedAt": null }
    ],
    "consult": [
      { "stage": "consult", "id": "0192…p11", "name": "Isabela Rocha", "professionalId": "…ramos",
        "startsAt": "2026-10-09T10:00:00-03:00", "durationMinutes": 30, "type": "AVALIACAO", "typeLabel": "Avaliação · joelho",
        "payer": { "kind": "conv", "label": "Porto Saúde" },
        "startedAt": "2026-10-09T10:04:00-03:00", "plannedMinutes": 30 }
    ],
    "done": [
      { "stage": "done", "id": "0192…p14", "name": "Patrícia Gomes", "professionalId": "…helena",
        "startsAt": "2026-10-09T09:00:00-03:00", "durationMinutes": 30, "type": "CONSULTA", "typeLabel": "Consulta",
        "payer": { "kind": "conv", "label": "Unimed" },
        "finishedAt": "2026-10-09T09:24:00-03:00",
        "followUp": { "kind": "pending", "text": "Retorno em 30 dias", "taskId": "0192…t1", "appointmentId": null } },
      { "stage": "done", "id": "0192…p16", "name": "Renata Saldanha", "professionalId": "…okada",
        "startsAt": "2026-10-09T09:40:00-03:00", "durationMinutes": 30, "type": "CONSULTA", "typeLabel": "Consulta",
        "payer": { "kind": "conv", "label": "SulAmérica" },
        "finishedAt": "2026-10-09T10:12:00-03:00",
        "followUp": { "kind": "exam", "text": "Holter 24h solicitado · retorno após laudo", "taskId": "0192…t2", "appointmentId": null } }
    ]
  },
  "heat": [
    { "bucket": 0, "ratio": 0.5, "freed": false }, { "bucket": 1, "ratio": 0.75, "freed": false },
    { "bucket": 17, "ratio": 0.75, "freed": true }
  ]
}
```

Ordenação é responsabilidade do servidor (tabela 2.4). `heat[].ratio` = consultas ativas na faixa / capacidade (soma das `ScheduleWindow` que cobrem a faixa, em slots de `defaultDurationMinutes`). `freed = true` quando há cancelamento na faixa sem reposição.

### 4.2 `GET /cockpit/vitals?date=`

```json
{
  "filledSlots": 47, "totalSlots": 50, "freeSlotsAfternoon": 3,
  "noShowsPrevented": 4, "revenueSavedCents": 320000,
  "averageWaitMinutes": 8, "waitingCount": 3, "longestWaitMinutes": 20
}
```

Fontes: `filled/total` do mesmo cálculo do heat; `averageWait/waitingCount/longestWait` reutilizam `GetWaitingRoomMetricsService` (trocar a base para `readyAt ?? checkedInAt`); `noShowsPrevented` = consultas do dia com `status = REAGENDADA` cujo evento veio por `channel = WHATSAPP` + runs de Smart Fill `filled` **[GAP** sem Smart Fill, só a primeira parcela**]**; `revenueSavedCents` = `noShowsPrevented × ticket médio` **[GAP** não há ticket; usar `ClinicSettings.averageTicketCents` novo (expand, default 0) ou devolver `0` e o front mostra "—"**]**.

### 4.3 `GET /cockpit/smart-fill/active`

`200` com `SmartFillRun` (3.1) ou `200 null` quando não há run em andamento nem concluída nos últimos 30 min. Exemplo (espelha o mock):

```json
{
  "id": "0192…sf1", "status": "running", "professionalId": "…okada",
  "slotStartsAt": "2026-10-09T15:30:00-03:00", "openedAt": "2026-10-09T10:39:00-03:00", "filledAt": null, "targetSeconds": 480,
  "cancelledBy": { "patientName": "Cláudia Reis", "channel": "WHATSAPP" },
  "candidates": [
    { "patientId": "…", "name": "Eduardo Brandão", "reason": "Prioridade alta · palpitações · Unimed", "status": "lido" },
    { "patientId": "…", "name": "Lívia Martins", "reason": "Check-up · flexível à tarde", "status": "enviado" },
    { "patientId": "…", "name": "Otávio Reis", "reason": "Retorno ecocardiograma", "status": "fila" }
  ]
}
```

Fase 4: o endpoint existe e devolve `null` (**[GAP]** sem modelo); o front já trata o estado vazio.

### 4.4 `GET /cockpit/activity?limit=`

`limit` inteiro 1..50, default 7 (`z.preprocess` numérico como em `list-slots.request.ts`). Fonte: `AppointmentEvent` do dia (+ `Notification` com `status IN (ENVIADA, RESPONDIDA)`), mais recentes primeiro.

```json
[
  { "id": "0192…e1", "at": "2026-10-09T10:41:00-03:00", "tone": "fg", "icon": "ScanLine", "text": "Roberto Nogueira fez check-in no totem. Guia TISS pendente.", "appointmentId": "…p07" },
  { "id": "0192…e2", "at": "2026-10-09T10:39:00-03:00", "tone": "bad", "icon": "CalendarX2", "text": "Cláudia Reis desmarcou 15:30 com a Dra. Okada pelo WhatsApp. Smart Fill iniciado.", "appointmentId": "…" },
  { "id": "0192…e3", "at": "2026-10-09T10:30:00-03:00", "tone": "ai", "icon": "MessageCircle", "text": "Copilot avisou 3 pacientes da tarde do Dr. Ramos sobre atraso previsto de 10 min.", "appointmentId": null },
  { "id": "0192…e4", "at": "2026-10-09T08:14:00-03:00", "tone": "ai", "icon": "CheckCheck", "text": "Copilot confirmou 31 de 34 consultas de hoje. 3 remarcadas sem ligação.", "appointmentId": null }
]
```

Mapa evento → `tone`/`icon`: `CHECK_IN` por `WEB` → `fg`/`ScanLine`; `readyAt` → `fg`/`Armchair`; `EM_ATENDIMENTO` → `ok`/`DoorOpen`; `calledAt` silencioso → `ai`/`BellRing`; `CONCLUIDA` → `ok`/`CircleCheck`; `CANCELADA` → `bad`/`CalendarX2`; `REAGENDADA` → `ai`/`CalendarClock`; `CONFIRMADA` por `WHATSAPP` → `ai`/`CheckCheck`; retorno agendado → `ai`/`CalendarCheck`; Smart Fill preenchido → `ok`/`Zap`.

### 4.5 `PATCH /appointments/:id/release-to-waiting`

Sem body. Pré-condições: `status = CHECK_IN`, `readyAt IS NULL` (senão `422 INVALID_STATUS_TRANSITION` com `details: { reason: "already_released" }`). Efeito: `readyAt = now`; `AppointmentEvent { fromStatus: CHECK_IN, toStatus: CHECK_IN, reason: "released_to_waiting", channel: WEB }`; emite `DomainEvent.AppointmentReadyForWaiting` (novo). Retorna `AppointmentDetailDto` (adicionar `readyAt: string | null` ao DTO e a `AppointmentDetail` em `types.ts`).

### 4.6 `POST /appointments/:id/undo` (existente, ajuste)

`UndoAppointmentService` hoje assume que o último evento mudou o status. Ajuste: se `lastEvent.fromStatus === lastEvent.toStatus === CHECK_IN` e `reason === "released_to_waiting"`, desfazer = `readyAt = null` + evento de compensação, sem tocar em `status`. Demais regras (mesmo ator, janela `UNDO_WINDOW_SECONDS`, não repetir compensação) permanecem.

### 4.7 `POST /appointments/:id/notify-room`

Sem body. Pré-condição: `status = CHECK_IN AND readyAt IS NOT NULL` (`422 INVALID_STATUS_TRANSITION` caso contrário).

| Situação | Efeito | Resposta `200` |
|---|---|---|
| Profissional **sem** `EM_ATENDIMENTO` ativo | `StartAttendanceService` (`CHECK_IN → EM_ATENDIMENTO`, `startedAt`, `calledAt` se nulo); `room` da consulta = sala do dia | `{ "mode": "called", "appointment": { …AppointmentDetailDto } }` |
| Profissional **com** `EM_ATENDIMENTO` ativo | `calledAt = now` (idempotente; segunda chamada só atualiza); `Notification { channel: SISTEMA, to: professionalId, body: "{nome} aguardando na espera", status: ENVIADA }`; emite `AppointmentRoomNotified` | `{ "mode": "silent_notice", "appointment": { … } }` |

O front decide o otimismo pelo cache local e corrige em `onSuccess` se o `mode` divergir.

### 4.8 `PATCH /appointments/:id/schedule-follow-up`

```json
{ "date": "2026-11-09", "time": "10:00", "durationMinutes": 30, "notifyViaWhatsapp": true, "taskId": "0192…t1" }
```

Zod: `date` `DATE_PATTERN`; `time` `^\d{2}:\d{2}$`; `durationMinutes` 5..480 opcional; `notifyViaWhatsapp` boolean default `true`; `taskId` uuid opcional. Pré-condição: consulta `CONCLUIDA`. Transação: cria `Appointment { type: RETORNO, status: AGENDADA, patientId, professionalId }` pela mesma validação de `CreateAppointmentService` (conflito → `409 APPOINTMENT_SLOT_CONFLICT`); resolve a `Task RETORNO_A_AGENDAR` (a informada ou a aberta da consulta); se `notifyViaWhatsapp`, enfileira `Notification WHATSAPP` com o template da clínica. Resposta:

```json
{ "followUp": { "id": "0192…new", "startsAt": "2026-11-09T10:00:00-03:00", "status": "AGENDADA", "…": "AppointmentDetailDto" },
  "task": { "id": "0192…t1", "status": "RESOLVIDA", "…": "TaskItem" },
  "notification": { "status": "PENDENTE" } }
```

### 4.9 Reuso dos endpoints existentes

| Ação do cockpit | Endpoint existente | Observação |
|---|---|---|
| `C` | `PATCH /appointments/:id/check-in` | + `{ skipIntake?: boolean }` (4.2 → 3.2) |
| `F` | `PATCH /appointments/:id/complete` | Já cria `Task RETORNO_A_AGENDAR`? Confirmar no `AppointmentCompleted` listener; se não, o cockpit precisa que crie (senão `done` sai sem `followUp`) |
| `R` | `PATCH /appointments/:id/reschedule` | Body `RescheduleInput` (`reason` obrigatório; o diálogo manda `"Reagendado pelo cockpit · {hint do slot}"`). Os 3 slots sugeridos vêm de `GET /appointments/slots?professionalId&date` (hoje) + heurística no front até existir sugestão do Copilot **[GAP]** |
| `Z` | `POST /appointments/:id/undo` | ver 4.6 |
| "Chamar" (Consultórios) / paleta | `POST /appointments/:id/notify-room` | Não usar `POST /waiting-room/call-next`: ele escolhe o paciente pela fila global, o cockpit chama por profissional |
| Busca da paleta | `GET /search?q=` | Para pacientes fora do dia; os do dia vêm do board em memória |
| Vitais de espera | `GET /waiting-room/metrics` | Internamente reaproveitado por `/cockpit/vitals` |

### 4.10 Erros

Manter o envelope único do `AllExceptionsFilter` (já no estilo problem-details, campos `statusCode, code, message, details?, path, timestamp`; o front normaliza em `ApiError`). Não introduzir `type/title/instance` do RFC 7807 estrito — seria um segundo formato para o mesmo cliente.

| Código | HTTP | Quando |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Zod (`details.issues[]`) |
| `RESOURCE_NOT_FOUND` | 404 | `:id` inexistente |
| `INVALID_STATUS_TRANSITION` | 422 | Etapa errada para a ação (`details: { from, to, allowed }`) |
| `APPOINTMENT_SLOT_CONFLICT` | 409 | `schedule-follow-up` / `reschedule` em horário ocupado (`details: { conflictWithId, patientName }`) |
| `PROFESSIONAL_OUTSIDE_SCHEDULE` | 422 | Retorno fora da grade |
| `UNDO_WINDOW_EXPIRED` / `UNDO_NOT_ALLOWED` | 422 | `Z` tarde ou por outro ator |
| `FORBIDDEN_ROLE` | 403 | Perfil `PROFISSIONAL` |

O front mostra `message` no toast de erro e escolhe a saída pelo `code` (ex.: `APPOINTMENT_SLOT_CONFLICT` reabre o diálogo de reagendar com o slot marcado como indisponível).

---

## 5. Atalhos e acessibilidade

### 5.1 Keymap global (`window.keydown`, hook `use-cockpit-keymap.ts`)

Ordem de avaliação exatamente como no protótipo:

| Tecla | Condição | Efeito |
|---|---|---|
| `Ctrl+K` / `Cmd+K` | Sempre (mesmo com overlay aberto) | Alterna a paleta; `preventDefault` |
| — | Overlay aberto (paleta, reagendar, atalhos) | Retorna: o overlay trata o próprio teclado |
| — | `e.target` é `input`/`textarea` | Retorna |
| — | `meta`/`ctrl`/`alt` pressionados | Retorna (não rouba atalhos do navegador) |
| `/` | — | Abre a paleta |
| `?` | — | Abre o diálogo de atalhos |
| `Esc` | — | Desseleciona o card (`selectedId = null`) |
| `Z` | — | Undo do toast ativo (sem toast: nada) |
| `↓` `↑` `←` `→` / `j` `k` `h` `l` | — | `move()`: ↓/↑ dentro da coluna (limitado), ←/→ pula colunas vazias, mantém o índice da linha (`min(ri, len-1)`); sem seleção, seleciona o primeiro card da primeira coluna não vazia |
| `C` `E` `N` `F` `A` `R` | `selectedId` definido | `perform(selectedId, key)` — ignorado se a etapa do card não oferece a ação (tabela 2.4) |

Teclado dos overlays: paleta `↑↓ Enter Esc`; reagendar `1 2 3 ↑↓ Enter Esc`; atalhos `Esc ?`. Letras são comparadas em minúsculas (`e.key.toLowerCase()`); `?` e `/` por `e.key` literal (funciona em ABNT2 com Shift).

Regras por etapa (a mesma tabela alimenta botões, teclas e paleta — uma única fonte: `cardActions(p)` em `lib/stage.ts`):

| Etapa | C | E | N | F | A | R |
|---|---|---|---|---|---|---|
| arriving | ✓ | — | — | — | — | ✓ |
| reception | — | ✓ | — | — | — | ✓ |
| waiting | — | — | ✓ | — | — | ✓ |
| consult | — | — | — | ✓ | — | — |
| done | — | — | — | — | ✓ se `followUp` e `kind !== "scheduled"` | — |

### 5.2 Foco

- Card: `li[tabindex=0]`; `onFocus` seleciona, `onClick` seleciona. Botões de ação têm `tabindex` `0` só no card selecionado (`-1` nos demais) — Tab percorre cards, não dezenas de botões ocultos.
- `focusCard(id)`: `requestAnimationFrame` → `el.focus({ preventScroll: true })` + `scrollIntoView({ block: "nearest", behavior: "smooth" })`.
- Após qualquer ação, o foco volta ao mesmo card (`focusCard(id)`), mesmo que ele tenha mudado de coluna (key `id + stage` remonta o `li`; o `rAF` resolve a ordem).
- Fechar overlay → foco no `lastFocusRef ?? selectedId`.
- Reagendar confirmado remove o card e zera a seleção; próxima seta seleciona o primeiro disponível.
- Diálogos: foco inicial no container (`tabIndex=-1`) ou no input (`autoFocus` na paleta). Implementar focus trap (o protótipo não tem; usar o `Dialog` já existente em `components/` se tiver trap, senão `focus-trap-react`).

### 5.3 ARIA

| Elemento | Atributos |
|---|---|
| Card | `aria-label="{nome}, {HH:MM}, {profissional}, {etapa}"`, `aria-current="true"` no selecionado |
| Cronômetro de espera | `aria-label="Esperando há N minutos"` (não ler `mm:ss` a cada segundo) |
| "ao vivo · HH:MM:SS" | `aria-live="off"` |
| Toast | `role="status"` (polite) |
| Overlays | `role="dialog" aria-modal="true" aria-label` |
| Paleta | input `aria-label="Buscar"`; `ul role="listbox" aria-label="Resultados"`; `li role="option" aria-selected`; cabeçalhos de grupo `role="presentation"` |
| Slots de reagendar | `aria-pressed` |
| Nav | `aria-label="Principal"`, `aria-current="page"` |
| Colunas | `section aria-labelledby="col-{id}"` com `h2#col-{id}` |
| Painéis | `aria-label` ("Sinais vitais de hoje", "Ocupação do dia por meia hora", "Smart Fill", "Consultórios", "Atividade", "Copilot") |
| Ícones lucide | `aria-hidden="true"` sempre; botões só-ícone com `aria-label` ("Dia anterior", "Próximo dia", "Usar tema escuro", "Fechar", "Fechar aviso") |
| `Meter` | `role="presentation"` (o número ao lado já diz o valor) |
| Avatar de iniciais | `aria-hidden="true"` |

### 5.4 Cor nunca sozinha

Todo estado colorido carrega um segundo sinal: chip com ícone + texto (`TriangleAlert` "+N min além", `Hourglass` "N min acima"), cronômetro com `limite 15:00` ao lado, coluna com título e contagem, clima com ícone + rótulo textual, barra do heat strip com `title`, vaga aberta com borda + legenda textual, Smart Fill com "Em andamento"/"Vaga reposta" escrito, "Livre" escrito nos consultórios, candidato com rótulo de status por extenso.

### 5.5 Contraste (medir no PR, valores de referência)

| Par | Claro | Escuro | Nota |
|---|---|---|---|
| `fg` / `bg` | ~17:1 | ~17:1 | — |
| `muted` / `surface` | ~6.4:1 | ~7.5:1 | Texto 12 px ok (AA pede 4.5) |
| `faint` / `surface` | ~3.3:1 | ~4.4:1 | **Só** para 11 px decorativo, eixos, placeholders e subtítulos redundantes; nunca para informação única |
| `ok` / `surface` | ~3.9:1 | ~7:1 | Esmeralda clara fica abaixo de 4.5 em texto 12 px: no claro, texto `ok` só em ≥ 13 px/500 ou com ícone; cronômetro 22 px passa (large text, 3:1) |
| `ai` / `surface` | ~7.4:1 | ~5.5:1 | ok |
| `warn` / `surface` | ~5.7:1 | ~10:1 | ok |
| `bad` / `surface` | ~4.6:1 | ~5.3:1 | ok |
| `bg` / `fg` (botão primário, toast) | ~17:1 | ~17:1 | `text-bg/80` ≈ 11:1 |

Anel de foco `ring-ai/15` + `border-ai/50` no card: a borda a 50 % fica ~3:1 contra `surface` no claro — aceitável para componente (WCAG 1.4.11), confirmar no escuro. Botões: `ring-ai/40` 2 px.

---

## 6. Checklist de craft

### 6.1 Itens verificáveis

- [ ] Densidade: card de paciente ≤ 112 px de altura sem corpo expandido em 1440 px; 5 colunas visíveis sem scroll horizontal em `lg`.
- [ ] Zero layout shift ao selecionar/hover: a linha de ações é sempre renderizada (`opacity-0`), nunca condicional. Medir com `PerformanceObserver` CLS = 0 ao navegar com setas por 20 cards.
- [ ] Zero layout shift do toast: `position: fixed` fora do fluxo; nova mensagem substitui, não empilha.
- [ ] `tabular-nums` em: horas dos cards, cronômetros (22/26/30 px), contagens das colunas, badge da nav, vitais e seus `sub`, moeda, feed, eixo do heat strip, `Kbd` numérico. Teste: alternar `10:59` → `11:00` não desloca o texto ao lado.
- [ ] Cronômetros derivam de timestamp + `useClock` (1 tick/s, um único `setInterval` na página); nenhuma query é disparada para avançar o relógio. `serverNow` corrige drift.
- [ ] Toast some em 6 s; `Z` dentro da janela desfaz (rollback local + `POST /undo`); depois de 6 s `Z` é no-op. Servidor com `UNDO_WINDOW_SECONDS ≥ 6`.
- [ ] Otimismo: cada ação move o card antes da resposta; erro reverte ao snapshot e mostra `message`; `onSettled` invalida `cockpit`, `appointments`, `waiting-room`, `dashboard`.
- [ ] SSE `/cockpit/stream` conectado via `subscribe()`; `refetchInterval` 20 s como fallback; `visual.spec.ts` aborta `/cockpit/stream`.
- [ ] Tolerância vem de `toleranceMinutes` do board (não hardcode 15); cores do cronômetro em 0.75 e 1.0 da tolerância; chip "+N min além" aparece exatamente em `>= tolerância`.
- [ ] Clima: `bad` com ≥ 3 ocorrências, `warn` com ≥ 1; detalhe lista `+N min` por profissional e "N acima da tolerância".
- [ ] Vital faz `anim-flash` só quando o valor **sobe** acima da baseline da sessão; não pisca no primeiro render.
- [ ] Heat strip: barras passadas com `opacity-40`; marcador "agora" em `(now - 07:00) / 12h`; faixa com vaga aberta muda de `border-bad` para `bg-ok` com transição 700 ms ao ser reposta.
- [ ] Card reanima (`anim-enter`) ao trocar de coluna (key `id + stage`), nunca ao simples re-render da lista.
- [ ] Foco retorna ao card após ação, após fechar overlay, após undo.
- [ ] Setas e `hjkl` pulam colunas vazias; `↓` no último card não sai da coluna.
- [ ] Teclas ignoradas com overlay aberto, dentro de inputs e com modificadores (exceto `Ctrl/Cmd+K`).
- [ ] Linha de ações visível sem hover em `hover:none`; alvos de toque ≥ 28 px de altura (`h-7`) com `gap-1.5` — abaixo dos 44 px recomendados; aceitável porque o card inteiro é o alvo primário e os botões são atalhos; registrar como dívida.
- [ ] Nenhum texto informativo abaixo de 12 px; 11 px só em `Kbd`, iniciais, eixo, badge.
- [ ] Escuro: `color-scheme: dark`; inputs nativos (checkbox com `accent-color` ai) legíveis; glow do Smart Fill visível mas sem estourar o `overflow-hidden`.
- [ ] `prefers-reduced-motion`: sem `ping`, sem `enter/flash/pop`, sem transição de width no `Meter` (herda a regra global).
- [ ] Sem `console.error` de chaves duplicadas no feed (key = `id`, não `t + text`).
- [ ] Mobile 390 px: 1 coluna, header em 2 linhas sem overflow, `pb-24` para o toast não cobrir o último card, sem scroll horizontal.
- [ ] Fontes Geist/Geist Mono carregadas por `@fontsource` (sem `<link>` para Google Fonts); `font-display: swap`; pesos 400/500/600 apenas.
- [ ] Nada do azul Fluent (`#0f6cbd`) visível na rota; anel de foco global sobrescrito no escopo `[data-screen="cockpit"]`.
- [ ] Vitest cobre `cardActions`, `deriveWeather`, `move()` e o tom do cronômetro nos limiares 0.74/0.75/1.0.

### 6.2 Teste visual Playwright (compatível com `apps/web/e2e-tests/visual.spec.ts`)

Adicionar um `test("captura o cockpit", …)` no mesmo arquivo, com o mesmo `addInitScript` de tokens falsos e o mesmo padrão `page.route("**/api/v1/**")`:

```ts
test("captura o cockpit", async ({ page }) => {
  // Relógio fixo: os cronômetros ficam determinísticos entre execuções.
  await page.clock.install({ time: new Date("2026-10-09T13:42:00.000Z") }); // 10:42 em -03:00

  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    const json = (body: unknown) => route.fulfill({ json: body });
    if (url.includes("/auth/me")) return json(user);
    if (url.includes("/stream")) return route.abort();
    if (url.includes("/cockpit/board")) return json(cockpitBoard);          // fixture = exemplo da seção 4.1 completo (17 pacientes)
    if (url.includes("/cockpit/vitals")) return json(cockpitVitals);        // seção 4.2
    if (url.includes("/cockpit/smart-fill/active")) return json(smartFill); // seção 4.3
    if (url.includes("/cockpit/activity")) return json(cockpitActivity);    // seção 4.4
    if (url.includes("/settings")) return json({ clinicName: "Clínica Vértice", timezone: "America/Sao_Paulo", defaultDurationMinutes: 30, confirmationLeadHours: 48, returnWindowDays: 30, lateToleranceMinutes: 15 });
    return json({ data: [], meta: {} });
  });

  await page.addInitScript(() => {
    localStorage.setItem("clinicflow.access", "fake");
    localStorage.setItem("clinicflow.refresh", "fake");
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/cockpit");
  await expect(page.getByText("Gustavo Teixeira")).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "shots/11-cockpit-desktop.png", fullPage: true });

  // Rail como coluna direita (>= 1800 px).
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: "shots/12-cockpit-wide.png", fullPage: true });

  // Seleção + linha de ações visível, sem deslocar o card vizinho.
  await page.getByRole("listitem", { name: /Gustavo Teixeira/ }).focus();
  await page.waitForTimeout(200);
  await page.screenshot({ path: "shots/13-cockpit-selecionado.png" });

  // Paleta e reagendar.
  await page.keyboard.press("Control+k");
  await page.waitForTimeout(300);
  await page.screenshot({ path: "shots/14-cockpit-paleta.png" });
  await page.keyboard.press("Escape");
  await page.keyboard.press("r");
  await expect(page.getByRole("dialog", { name: /Reagendar/ })).toBeVisible();
  await page.screenshot({ path: "shots/15-cockpit-reagendar.png" });
  await page.keyboard.press("Escape");

  // Mobile e escuro.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: "shots/16-cockpit-mobile.png", fullPage: true });

  await page.evaluate(() => localStorage.setItem("clinicflow.theme", "dark"));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/cockpit");
  await expect(page.getByText("Gustavo Teixeira")).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "shots/17-cockpit-escuro.png", fullPage: true });
  await page.evaluate(() => localStorage.removeItem("clinicflow.theme"));
});
```

Fixtures (`cockpitBoard`, `cockpitVitals`, `smartFill`, `cockpitActivity`) vão em `apps/web/e2e-tests/fixtures/cockpit-api.ts`, ao lado de `redesign-api.ts`, com os 17 pacientes do protótipo (`p01`–`p17`) e os quatro profissionais. `page.clock` exige Playwright ≥ 1.45; se a versão do repo for menor, fixar `Date.now` via `addInitScript`.

---

## Apêndice — Discrepâncias protótipo × API atual

| # | Protótipo | API hoje | Decisão nesta spec |
|---|---|---|---|
| 1 | "Na recepção" e "Em espera" são etapas distintas | Ambas são `CHECK_IN`; espera conta de `checkedInAt` | Coluna `ready_at` (3.2) + `release-to-waiting` (4.5) + ajuste no undo (4.6) |
| 2 | "Notificar sala" chama **ou** avisa em silêncio | `call-next` escolhe pela fila global; `calledAt` existe mas só marca "chamado no painel" | `notify-room` por consulta, dois modos (4.7) |
| 3 | Convênio / Particular R$ no card | Sem pagador em `Patient`/`Appointment` | `payer: null` + migração opcional |
| 4 | Intake (carteirinha, guia TISS) | Inexistente | `intake` sintético até existir coluna |
| 5 | Smart Fill com candidatos e cronômetro | Nenhum modelo de lista de espera | Endpoint devolve `null`; card em estado vazio; modelo na Fase 4b |
| 6 | Vitais "No-shows prevenidos" e "Receita salva" | Sem ticket médio nem contagem de reposições | Parcial (`REAGENDADA` via WhatsApp) + `averageTicketCents` opcional |
| 7 | Sala fixa e cor por profissional | `room` só em `ScheduleWindow`/`Appointment`; sem cor | Derivados no board, sem migração |
| 8 | Toast undo de 6 s | Servidor 30 s (`UNDO_WINDOW_SECONDS`) | Cliente 6 s; servidor cobre |
| 9 | Undo é snapshot puro de cliente | Undo real exige mesmo ator e último evento | Rollback local + `POST /undo`; erro re-invalida |
| 10 | Retorno agendado com "convite enviado" | `Task RETORNO_A_AGENDAR` existe; nenhum endpoint cria retorno + resolve task + notifica | `schedule-follow-up` (4.8) |
| 11 | Slots sugeridos "pelo histórico do paciente" | `GET /appointments/slots` sem heurística | Front monta 3 sugestões a partir dos slots livres; Copilot depois |
| 12 | Seletor de dia muda só o rótulo | `GET /dashboard/today?date=` aceita data | `board?date=` aceito, mas a UI mantém o banner e mostra hoje (comportamento do protótipo) |
| 13 | Tailwind v3 `<alpha-value>` | Tailwind v4 | `@theme inline` com `rgb(var(--x))` e `color-mix` (1.2) |
| 14 | Geist via Google Fonts `<link>` | `@fontsource` local | `@fontsource-variable/geist*` |
