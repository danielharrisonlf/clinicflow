# ClinicFlow — Sistema visual "Cockpit"

Superfície: app autenticado da recepção e do corpo clínico (`apps/web`), do celular ao
monitor do balcão. Modo: **Operate**. A pessoa está numa tarefa; a ferramenta some dentro dela.

> Fonte da verdade: **o código** (`apps/web/src/index.css` e
> `apps/web/src/components/ui`). Todos os tokens vivem no CSS (`@theme` + bloco
> `data-theme="dark"`). **Não existe mais tema em runtime**: `lib/fluent-theme.ts` foi
> a iteração anterior (Fluent 2) e não deve voltar — estilo inline no `<html>` vence o
> CSS e torna o sistema inauditável. Iterações anteriores: Letters (azul cirúrgico),
> Fluent 2 (Segoe/azul oceano). A atual: **Cockpit**, descrita aqui.

## Posicionamento do produto (de onde vem o vocabulário)

ClinicFlow não é agenda: é **cockpit de operação e resgate de receita** da clínica.
Toda tela responde em 3 segundos: *quem chegou, quem está em risco de faltar, qual o
próximo clique*. O vocabulário da interface segue esses pilares:

| Conceito | Nome na interface |
|---|---|
| Dashboard `/` | **Cockpit do dia** (nav: "Cockpit") |
| Rastreio de confirmações WhatsApp (API `GET notifications`) | **Prevenção de faltas** |
| Risco derivado da confirmação | `Confirmada` / `Sem resposta` / `Crítico` (sem envio, falha, ou sem resposta e consulta em <3h) |
| Fila da recepção | **Sala de espera** (ao vivo, SSE) |
| Tarefas RESGATE_NO_SHOW / CONFIRMACAO_PENDENTE | **Resgates** — linguagem de recuperação, não de burocracia |

Regra de honestidade: a interface **nunca inventa números** (receita em R$, tendências
sem série histórica). Métrica aparece quando a API a fornece. A história de ROI em
reais pertence à landing page, que declara suas premissas.

## Cena de uso (de onde vêm as decisões)

Recepcionista e corpo clínico, 8 horas por dia no balcão e nos consultórios, luz ambiente
alta, monitor a ~70cm, telefone tocando, paciente na frente. Olhada de 1 a 3 segundos.
No celular, o mesmo sistema serve quem confere a agenda no corredor.

1. **Legibilidade a distância vence expressão.** Corpo a 15px, números em mono com
   glifos distintos; contraste medido em cada superfície, nos dois temas.
2. **Claro é o padrão** (luz alta); escuro é primeira classe para o turno da noite.
   "Sistema" é a preferência inicial. Trocar de tema é troca de token, nunca redesenho.
3. **O acento é ação, nunca enfeite.** Azul = ação primária, seleção, foco. Esmeralda =
   receita/sucesso. Rosa = risco/atraso. Estados da consulta têm vocabulário próprio e
   nunca dependem só de cor.

## Referência estética

**UITopic / SaaS B2B high-end**: bento grid assimétrico com respiro generoso,
micro-bordas (`slate-200/80` no claro, `white/10` no escuro), sombras difusas em duas
camadas no claro, elevação por luminosidade no escuro, vidro (`backdrop-blur` +
superfície translúcida) **somente** em camadas sobrepostas (sheet, diálogo, paleta de
comandos, header móvel) — nunca em card em repouso. Dots de status com pulso para o
que está vivo agora. Familiaridade é feature: os padrões de navegação, tabela e
formulário continuam convencionais; a identidade está nos tokens, não em affordances
inventadas.

## Tipografia

**Geist Variable** na interface (via `@fontsource-variable/geist`) e **Geist Mono**
(`@fontsource-variable/geist-mono`) em hora, duração, telefone, CPF, contagens e
qualquer valor que atualiza. `tabular-nums` em tudo que é numérico. Auto-hospedadas;
sem chamadas a serviços externos de fontes.

Escala fixa (token semântico, nunca `text-sm`/`text-2xl`) — mesmos nomes e tamanhos
da iteração anterior, já validados no balcão:

| Token | px | Uso |
|---|---|---|
| `text-hero` | 40 | só no painel da marca do login |
| `text-title` / `text-title-sm` | 28 / 22 | título de tela (desktop / celular) |
| `text-metric` / `text-metric-sm` | 26 / 20 | valor de stat card (sempre mono) |
| `text-entity` | 24 | nome em destaque |
| `text-section` | 18 | título de seção e de diálogo |
| `text-card` | 16 | título de painel, nome na linha, hora |
| `text-body` | 15 | corpo, linha de lista, campo |
| `text-label` | 13 | rótulo de campo, meta secundária |
| `text-micro` | 12 | selo, atalho, rótulo de stat card |

Caixa-alta com `tracking-wider` é permitida em **dois** lugares: rótulo de stat card
do bento (`text-micro` semibold) e título de grupo da navegação. Em nenhum outro —
sem eyebrow acima de título de tela ou seção. Piso de 12px. Campo em ponteiro grosso
sobe para 16px (`text-input-touch`).

## Cor

Família slate como neutro; azul para ação, esmeralda para receita/sucesso, rosa para
risco. Tokens no `index.css`; não adicionar cores soltas nos componentes. Os ~30 tokens
`--color-marketing-*` da landing interna (`/conhecer`) **devem ser preservados**.

| Token | Claro | Escuro | Papel |
|---|---|---|---|
| `surface-app` | `#F8FAFC` | `#020617` | fundo e navegação |
| `surface-base` | `#FFFFFF` | `#0F172A` | painéis, cards, diálogos |
| `surface-raised` | `#FFFFFF` + shadow-raised | `#1E293B` | menu, hover, segmento ativo |
| `surface-sunken` | `#F1F5F9` | `#0B1120` | trilhos, chips, skeleton |
| `surface-hover` | `rgb(15 23 42 / .05)` | `rgb(255 255 255 / .06)` | hover translúcido sobre qualquer superfície |
| `surface-glass` | `rgba(255,255,255,.72)` | `rgba(15,23,42,.75)` | overlays com `backdrop-blur-md` |
| `border-subtle` | `rgba(226,232,240,.8)` | `rgba(255,255,255,.08)` | micro-borda de card |
| `border-default` | `#CBD5E1` | `rgba(255,255,255,.14)` | divisórias fortes |
| `border-strong` | `#8392A7` | `#64748B` | contorno de campo |
| `ink-primary` | `#0F172A` | `#E2E8F0` | texto principal (nunca branco puro no escuro) |
| `ink-secondary` / `tertiary` | `#334155` / `#5B6B82` | `#94A3B8` / `#8796AB` | apoio / metadados |
| `accent` | `#2563EB` (hover `#1D4ED8`) | `#2563EB` (hover `#1D4ED8` — hover escurece também no escuro: texto branco exige ≥4.5:1) | ação primária, texto branco |
| `accent-ink` / `accent-weak` | `#1D4ED8` / `#EFF6FF` | `#60A5FA` / `#172554` | link, seleção, item ativo |
| `revenue` / `revenue-weak` | `#047857` / `#ECFDF5` | `#34D399` / `#064E3B` | sucesso, confirmado, receita |
| `danger` / `danger-weak` | `#BE123C` / `#FFF1F2` | `#FB7185` / `#4C0519` | risco, atraso, destrutivo |
| `warning` / `warning-weak` | `#92400E` / `#FFFBEB` | `#FCD34D` / `#451A03` | atenção, espera |
| `info` | família do accent | | avisos neutros |

Medir contraste ao alterar tokens: texto ≥ 4.5:1 e controles ≥ 3:1 contra a superfície
adjacente, **nos dois temas separadamente**. Âmbar/amarelo nunca como tinta de texto
pequeno sobre claro.

### Estados da consulta

Um matiz **e um ícone** por estado; pílula com dot. O dot **pulsa** apenas no que está
acontecendo agora: `CHECK_IN` (paciente esperando), `EM_ATENDIMENTO` e `ATRASADA`.
`prefers-reduced-motion` troca pulso por dot estático.

| Estado | Ícone | Claro (tinta / fundo) | Escuro (tinta) |
|---|---|---|---|
| Agendada | relógio | `#475569`, contorno | `#94A3B8` |
| Confirmada | círculo com check | `#1D4ED8` / `#DBEAFE` | `#93C5FD` |
| Aguardando (CHECK_IN) | poltrona | `#92400E` / `#FEF3C7` · pulso | `#FCD34D` |
| Em atendimento | estetoscópio | `#6D28D9` / `#EDE9FE` · pulso | `#C4B5FD` |
| Concluída | check duplo | `#047857` / `#D1FAE5` | `#6EE7B7` |
| Cancelada / Reagendada | proibido / repetir | `#5B6B82` / `#F1F5F9` | `#94A3B8` |
| Atrasada (derivado) | triângulo | `#BE123C` / `#FFE4E6` · pulso | `#FDA4AF` |

Concluída e cancelada recuam visualmente: já saíram da fila de trabalho.

### Prevenção de faltas (novo vocabulário)

Derivado no front a partir de `NotificationStatus` + horário da consulta:
`RESPONDIDA` → dot esmeralda "Confirmada pelo paciente"; `ENVIADA`/`SIMULADA` sem
resposta → dot âmbar "Sem resposta"; `PENDENTE`/`FALHOU`, nenhum envio, ou sem
resposta a <3h da consulta → dot rosa pulsando "Crítico". A janela de 3h (e não 24h)
existe para que "Sem resposta" apareça nas consultas do próprio dia e ainda sobre
tempo de ligar e reencaixar (`CRITICAL_WINDOW_HOURS` em `no-show-risk.ts`). Ação da linha: reenviar confirmação
(`POST notifications/appointments/:id/confirmation`).

## Forma, espaço e elevação

Grade de 4px. Raios maiores que a iteração anterior: `marker` 6 (selo, kbd), `control`
8 (botão, campo, segmento), `raised` 10 (menu, aviso), `card` 12 (painel, stat card),
`modal` 16 (diálogo, folha). Selo de estado é pílula.

Sombras no claro, difusas em duas camadas (nunca halo colorido sem deslocamento):

- `shadow-panel`: `0 1px 2px rgb(2 6 23 / .04), 0 8px 24px -12px rgb(2 6 23 / .12)`
- `shadow-raised`: `0 2px 4px rgb(2 6 23 / .06), 0 16px 32px -16px rgb(2 6 23 / .18)`
- `shadow-overlay`: `0 8px 16px rgb(2 6 23 / .10), 0 32px 64px -24px rgb(2 6 23 / .28)`

No escuro a elevação vem da luminosidade da superfície + micro-borda; sombra só sob
overlay. Larguras estruturais como token: `w-sidebar` 232, `w-rail` 84, `w-panel` 520,
`h-bottom-nav` 64.

Movimento: 150–250ms, só para mudança de estado (abrir folha, entrar toast). Pulso dos
dots: ~2s, opacidade 1→.4, escala sutil. Sem coreografia de carregamento.
`prefers-reduced-motion` zera tudo globalmente. Trocar de tema não dispara transição.

## Bento (Cockpit do dia)

O Cockpit é um grid bento assimétrico: faixa hero de stat cards + painel principal
"Consultas de hoje" + coluna viva (sala de espera, prevenção de faltas, resgates).

Anatomia do **stat card**: rótulo em `text-micro` caixa-alta `tracking-wider`
`ink-tertiary`; valor em `text-metric` **Geist Mono**; linha de apoio em `text-label`
(ex.: "3 sem resposta"); dot de estado quando o valor é vivo. Clicável = aplica filtro
(comportamento já existente do NowStrip — preservar). Card em repouso: `surface-base`
+ `border-subtle` + `shadow-panel`; sem glass, sem gradiente, sem sparkline inventado.

## Componentes (`apps/web/src/components/ui`)

Inventário e contratos **inalterados** — o redesign troca a pele, não a API:

| Componente | Estados / notas |
|---|---|
| `Button`, `IconButton`, `ButtonLink`, `ButtonAnchor` | primário, secundário, ghost, destrutivo, destrutivo-ghost, link × sm/md/lg/icon. Hover, pressionado (desce 1px), foco, desabilitado, carregando (`aria-busy`, mantém largura). 44px em ponteiro grosso. Ícone sozinho exige `label`. |
| `Field`, `PasswordField`, `SelectField`, `TextareaField`, `Switch` | Casca única: rótulo, `*`, dica/erro via `aria-describedby`, `aria-invalid`. |
| `SegmentedControl`, `Tabs`/`TabPanel` | Radios reais com contagem; abas WAI-ARIA com roving tabindex. |
| `Overlay` | Diálogo ou folha lateral (`variant="sheet"`); folha inferior no celular. Fundo com `surface-glass` + blur. Portal, `inert`, focus trap, Esc na camada do topo. |
| `Menu` | WAI-ARIA, `surface-raised`, fora do overflow da barra lateral. |
| `Panel`, `PanelHeader`, `StatTile`, `DescriptionList`, `Avatar` | Superfícies bento. Nunca card dentro de card. `StatTile` segue a anatomia de stat card acima. |
| `StatusBadge`, `Badge`, `Callout` | Selo pílula com dot (pulso nos estados vivos); aviso no fluxo com fundo tingido + ícone. Sem barra lateral colorida. |
| `EmptyState`, `ErrorState`, `InlineError`, `Loading`, skeletons | Vazio ensina o próximo passo; erro nomeia o problema e a saída. |
| `Pagination`, `ToastProvider`, `ErrorBoundary`, `Kbd` | Comportamentos atuais preservados (Desfazer [Z], erro 10s como `alert`). |

Paleta de comandos (`Ctrl/⌘K`) usa `surface-glass` + blur — é a vitrine do vidro.

## Navegação e responsivo

| Elemento | Celular (<768) | Tablet (768–1023) | Desktop (≥1024) |
|---|---|---|---|
| Navegação | barra superior + bottom nav (Cockpit, Agenda, Espera, Pacientes, Mais) | trilho de ícones 84px | barra lateral 232px em dois grupos |
| Busca (⌘K) | ícone na barra superior | ícone no trilho | campo na barra lateral |
| Nova consulta | botão no painel | botão no trilho | botão primário na barra lateral (`N`) |
| Detalhe lateral / diálogo | folha inferior | painel lateral | painel lateral / diálogo centrado |

Atalhos: `⌘K`/`Ctrl K` **e `/`** abrem a busca, `N` nova consulta, `S` sala de espera,
`Z` desfaz enquanto o aviso estiver na tela, `Esc` fecha a camada do topo. Atalhos de
uma letra param em campo de texto e com sobreposição aberta. Link "Pular para o
conteúdo" no topo.

## Fronteira com o backend

O backend manda a tela quase pronta, e o front não recalcula nada disso:

| Campo do DTO | O que o front faz com ele |
|---|---|
| `stateLabel` | Rótulo do selo, direto — "Atrasada 27min" |
| `derivedState` | Cor e ícone do selo, incluindo `ATRASADA`, que não existe no Prisma |
| `allowedTransitions` | **Quais botões existem na linha.** O front não conhece a máquina de estados |
| `dueLabel`, `waitingLabel`, `summary`, `credential`, `typeLabel`, `sizeLabel` | Texto pronto |
| `meta` de paginação | Rodapé "Mostrando 1–15 de 1.248" |
| Resumo do balcão: `total`, `open`, `rescheduled`, `unconfirmed`, `nextArrival` | Contadores e próxima chegada, calculados no servidor |

A ordem dos botões é a do ciclo de vida (`CONFIRMADA → CHECK_IN → EM_ATENDIMENTO →
CONCLUIDA`), e o primário é sempre o **passo seguinte**. Datas e horas no **fuso da
clínica** (`settings.timezone`): `features/appointments/labels.ts` concentra formatação.

## Decisões de implementação

- **Tokens só no CSS.** `data-theme` no `<html>` resolvido antes da primeira pintura
  (script no `index.html`); `theme-color` acompanha. Um único bloco de tokens escuros.
- **SSE sobre `fetch`, não `EventSource`** (header Bearer). 401 no stream renova uma vez.
- **Um refresh por vez.** Restaurar sessão não desloga por rede caída.
- **Erros normalizados** (`ApiError.fieldErrors()`), telas lazy, detalhe contextual de
  consulta em folha com `backgroundLocation`, página corrigida após transição, prévias
  de documentos em folha — tudo preservado da iteração anterior.
- **Densidade operacional.** Resumos em linhas compactas; cor de ação reservada ao
  próximo passo.

## A armadilha do tailwind-merge

`cn()` usa `twMerge`: para ele `text-card` (tamanho) e `text-ink-onaccent` (cor) caem
no mesmo grupo e só o último sobrevive. Todo token novo de `font-size`, `shadow` ou
`rounded` precisa entrar em `extendTailwindMerge` (`lib/utils.ts`). Regressão coberta
em `button.test.tsx`.

## Recuperação de senha

`POST /auth/forgot-password` responde 202 exista ou não a conta. Token só como hash,
30 minutos, pedido novo invalida anteriores, trocar a senha revoga as sessões.

## Armadilha da API do Penpot

`shape.fontSize` devolve **string**. Mudar `shape.fontSize` não altera texto fixado no
range — use `shape.getRange(0, n).fontSize = x`. Coordenadas são globais do canvas.

## Verificação

- `pnpm --filter web test` — unitários (botão/merge, selo, overlay, abas, paginação,
  cliente da API, datas, ações da consulta).
- `pnpm --filter web test:e2e` — fumaça sem backend e capturas com API mockada.
- `e2e-tests/.shots-crawl.mjs` — fotografa cada rota em 1440/768/390 contra API real.
- `e2e-tests/redesign.spec.ts` — matriz de rotas em três larguras e dois temas.
