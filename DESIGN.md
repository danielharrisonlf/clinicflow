# ClinicFlow — Sistema visual

Superfície: app autenticado da recepção e do corpo clínico (`apps/web`), do celular ao monitor do balcão.
Modo: **Operate**. A pessoa está numa tarefa; a ferramenta some dentro dela.

> Fonte da verdade: **o código** (`apps/web/src/index.css`, `apps/web/src/lib/fluent-theme.ts`
> e `apps/web/src/components/ui`). Os temas publicados de `@fluentui/tokens` fornecem
> cores de marca e neutros, fonte e raios; os componentes continuam sendo do ClinicFlow.
> O arquivo Penpot documenta a versão anterior ("Letters", azul cirúrgico, Plus Jakarta/Inter)
> e ainda não foi redesenhado para este sistema.

## Cena de uso (de onde vêm as decisões)

Recepcionista e corpo clínico, 8 horas por dia no balcão e nos consultórios, luz ambiente alta,
monitor a ~70cm, telefone tocando, paciente na frente. Olhada de 1 a 3 segundos para responder:
*quem chegou, quem está atrasado, o que eu clico agora*. No celular, o mesmo sistema serve quem
confere a agenda no corredor.

Daí saem as três decisões que mandam no resto:

1. **Legibilidade a distância vence expressão.** Corpo a 15px e números com glifos
   distintos; verificar contraste em cada superfície, nos dois temas.
2. **Claro é o padrão** (luz alta), escuro é troca de token para o turno da noite. "Sistema" é a
   preferência inicial.
3. **O acento é ação, nunca enfeite.** Ação primária, seleção atual e foco. Estados da consulta
   têm vocabulário próprio e nunca dependem só de cor.

## Referências

Base atual: **[Fluent 2, Microsoft](https://fluent2.microsoft.design/)**. Esta escolha
substitui a direção Osha/Aurelien após o feedback do usuário sobre a paleta anterior.
Azul oceano reservado a ações e seleção, fundos azul-gelo, área de trabalho branca,
tipografia nativa e controles com cantos contidos formam a identidade comum.

- [Tokens](https://fluent2.microsoft.design/design-tokens): valores globais e aliases
  temáticos, aplicados por `applyFluentTheme` no `ThemeProvider`.
- [Cor](https://fluent2.microsoft.design/color): hierarquia por superfície; cor de marca
  nas ações, cores semânticas nas mensagens e estados.
- [Tipografia](https://fluent2.microsoft.design/typography): Segoe UI e fallbacks nativos,
  hierarquia regular/semibold, texto alinhado à esquerda e caixa de frase.
- [Botões](https://fluent2.microsoft.design/components/web/react/core/button/usage):
  um primário por contexto, estados interativos e foco perceptível.

A landing usa a mesma base em uma composição própria: título à esquerda, painel à
direita e demonstração por etapas. Imagens são capturas da aplicação com fixtures
fictícios, identificados na página. Sem fotografias ou números comerciais inventados.

Referências anteriores continuam informando a ergonomia dos fluxos:

- **SimplePractice, Fresha, Mangomint, Square Appointments** (via Lazyweb, telas reais de agenda
  e recepção): lista cronológica como superfície principal, detalhe em painel lateral sem perder
  o contexto, estado da consulta como selo curto ao lado do nome.
- **Epic / Apprentice Health** (agendamento hospitalar): o próximo passo como única ação primária
  da linha; contagem do dia como atalho para filtro, não como troféu.
Adaptação explícita: a fundação usa os tokens oficiais Fluent, mas layouts e componentes
acessíveis pertencem ao ClinicFlow. Não afirmar uso integral de Fluent React nem réplica
pixel a pixel de uma aplicação Microsoft. As referências de categoria orientam os fluxos.

## Tipografia

**Segoe UI** na interface, com fallbacks nativos publicados pelo Fluent, e **Atkinson
Hyperlegible Mono** em hora, duração, telefone, CPF e contagens. Segoe usa a fonte
instalada no sistema; Mono é auto-hospedada via `@fontsource`. Sem chamadas a serviços
externos de fontes. Corpo a 15px e controles de toque a 16px adaptam a escala ao balcão.

Escala fixa (token semântico, nunca `text-sm`/`text-2xl`):

| Token | px | Uso |
|---|---|---|
| `text-hero` | 40 | só no painel da marca do login |
| `text-title` / `text-title-sm` | 28 / 22 | título de tela (desktop / celular) |
| `text-metric` / `text-metric-sm` | 26 / 20 | contagem |
| `text-entity` | 24 | nome em destaque |
| `text-section` | 18 | título de seção e de diálogo |
| `text-card` | 16 | título de painel, nome na linha, hora |
| `text-body` | 15 | corpo, linha de lista, campo |
| `text-label` | 13 | rótulo de campo, meta secundária |
| `text-micro` | 12 | selo, atalho, rodapé de bottom nav |

Piso de **12px** em rótulos e metadados. Na aplicação, evitar caixa-alta e eyebrow acima
do título. A landing pode usar índices de seção para orientar a leitura. Campo em ponteiro
grosso sobe para 16px (`text-input-touch`) para evitar zoom no foco em iOS.

## Cor

Azul oceano identifica ações e seleção; branco, azul-gelo e ardósia organizam as
superfícies. Estados mantêm cores semânticas e ícones. Os valores oficiais resolvidos
ficam em `lib/fluent-theme.ts`; superfícies frias, contorno forte e feedback clínico
estão em `index.css`. Não adicionar cores soltas nos componentes.

| Token | Claro | Escuro | Papel |
|---|---|---|---|
| `surface-base` | `#FFFFFF` | `#292929` | painéis, diálogos |
| `surface-app` | `#F1F6FA` | `#111D2A` | fundo e navegação |
| `surface-sunken` | `#E9F2F8` | `#273744` | trilhos, chips, skeleton |
| `border-subtle` / `default` | tokens `colorNeutralStroke2` / `1` | equivalentes escuros | divisórias |
| `border-strong` | `#8794A3` | `#8794A3` | contorno de campo |
| `ink-primary` | `#242424` | token `colorNeutralForeground1` | texto principal |
| `ink-secondary` / `tertiary` | `#424242` / `#616161` | equivalentes escuros | apoio e metadados |
| `accent` | `#0F6CBD` | `#115EA3` | ação primária com texto branco |
| `accent-weak` / `accent-ink` | `#EBF3FC` / `#0F6CBD` | `#082338` / `#62ABF5` | seleção, item ativo |
| `danger` · `warning` · `success` · `info` | + `-weak` | | feedback |

Medir contraste ao alterar tokens: texto ≥4.5:1 e controles/campo ≥3:1 contra a
superfície adjacente. A landing usa azul-gelo (`surface-marketing`, `#EAF4FB`), branco,
tinta ardósia (`ink-marketing`, `#172C3E`) e ação azul em apresentação clara estável,
inclusive quando a aplicação está em tema escuro. Campos usam `border-strong`; bordas
sutis delimitam painéis e divisórias. Cores adicionais ficam centralizadas em `index.css`.

### Estados da consulta

Um matiz **e um ícone** por estado. Concluída e cancelada recuam: já saíram da fila de trabalho.
Só "aguardando" (check-in) é preenchido forte — é o único estado que pede ação imediata.

| Estado | Ícone | Tinta / fundo (claro) |
|---|---|---|
| Agendada | relógio | `#4F5B66`, contorno |
| Confirmada | círculo com check | `#1D4FB8` / `#E6EEFC` |
| Aguardando (CHECK_IN) | poltrona | `#7A4300` / `#FFE7B8` |
| Em atendimento | estetoscópio | `#5B34B0` / `#EFE9FB` |
| Concluída | check duplo | `#2F6B3F` / `#E5F2E8` |
| Cancelada / Reagendada | proibido / repetir | `#5E6964` / `#EEF0EF` |
| Atrasada (derivado) | triângulo | `#B42318` / `#FDE8E6` |

"Em atendimento" deixou de dividir o azul com "Confirmada": eram indistinguíveis na olhada.

## Forma, espaço e elevação

Grade de 4px (escala do Tailwind). Raios: `marker` e `control` 4 (selo, kbd, botão, campo),
`raised` 6 (menu, aviso), `card` e `modal` 8 (painel, diálogo, folha). Selo de estado é pílula.

Elevação com deslocamento e difusão, nunca halo colorido: `shadow-panel` (painel em repouso),
`shadow-raised` (segmento ativo, menu), `shadow-overlay` (diálogo, toast). Larguras estruturais
como token: `w-sidebar` 232, `w-rail` 84, `w-panel` 520, `h-bottom-nav` 64.

Movimento: 150–250ms, só para mudança de estado (abrir folha, entrar toast). Sem coreografia de
carregamento. `prefers-reduced-motion` zera tudo globalmente.

## Componentes (`apps/web/src/components/ui`)

| Componente | Estados / notas |
|---|---|
| `Button`, `IconButton`, `ButtonLink`, `ButtonAnchor` | primário, secundário, ghost, destrutivo, destrutivo-ghost, link × sm/md/lg/icon. Hover, pressionado (desce 1px), foco, desabilitado, carregando (`aria-busy`, mantém largura). 44px em ponteiro grosso. Ícone sozinho exige `label`. |
| `Field`, `PasswordField`, `SelectField`, `TextareaField`, `Switch` | Casca única: rótulo, `*` de obrigatório, dica ou erro ligado por `aria-describedby`, `aria-invalid`. Select com chevron. Senha com alternância acessível por teclado. |
| `SegmentedControl` | Filtro de escolha única (radios de verdade), com contagem e tom. |
| `Tabs` / `TabPanel` | Abas WAI-ARIA com roving tabindex, setas, Home/End. |
| `Overlay` | Diálogo centrado ou painel lateral (`variant="sheet"`); vira folha inferior no celular. Portal, fundo `inert`, foco no primeiro campo, retorno de foco, Esc só na camada do topo, rolagem travada. |
| `Menu` | Menu suspenso WAI-ARIA (setas, Esc, clique fora), fora do `overflow` da barra lateral. |
| `Panel`, `PanelHeader`, `StatTile`, `DescriptionList`, `Avatar` | Superfícies. Nunca card dentro de card. |
| `PageHeader`, `Section` | Um h1 por rota, caminho de volta, ações; atualiza o título da aba. |
| `StatusBadge`, `Badge`, `Callout` | Selo de estado com ícone; etiqueta; aviso no fluxo (fundo tingido + ícone). |
| `EmptyState`, `ErrorState`, `InlineError`, `Loading`, skeletons | Vazio ensina o próximo passo; erro nomeia o problema e a saída; carregamento com `aria-busy`. |
| `Pagination` | Em todos os tamanhos (no celular, só anterior/próxima). |
| `ToastProvider` | Sucesso, aviso, erro (erro fica 10s e é anunciado como `alert`). Pausa com ponteiro/foco, dispensável, `Desfazer [Z]`, ação de continuação. |
| `ErrorBoundary` | Erro de renderização derruba só a área, com saída. |

## Navegação e responsivo

| Elemento | Celular (<768) | Tablet (768–1023) | Desktop (≥1024) |
|---|---|---|---|
| Navegação | barra superior + bottom nav (Painel, Agenda, Espera, Pacientes, Mais) | trilho de ícones 84px com rótulo curto | barra lateral rotulada 232px em dois grupos |
| Busca (⌘K) | ícone na barra superior | ícone no trilho | campo na barra lateral |
| Nova consulta | botão no painel | botão no trilho | botão primário na barra lateral (`N`) |
| Conta e tema | menu do avatar + "Mais" | menu do avatar | menu do usuário no rodapé da barra |
| Lista com ação por linha | cartão com ação de largura cheia | linha em grade | linha em grade com coluna de estado |
| Detalhe lateral / diálogo | folha inferior | painel lateral | painel lateral / diálogo centrado |
| Paginação | anterior/próxima | numerada | numerada |

Atalhos: `⌘K`/`Ctrl K` busca, `N` nova consulta, `S` sala de espera, `Z` desfaz a última ação
enquanto o aviso estiver na tela, `Esc` fecha a camada do topo. Atalhos de uma letra param em
campo de texto e com sobreposição aberta. Link "Pular para o conteúdo" no topo.

## Fronteira com o backend

O backend manda a tela quase pronta, e o front não recalcula nada disso:

| Campo do DTO | O que o front faz com ele |
|---|---|
| `stateLabel` | Rótulo do selo, direto — "Atrasada 27min" |
| `derivedState` | Cor e ícone do selo, incluindo `ATRASADA`, que não existe no Prisma |
| `allowedTransitions` | **Quais botões existem na linha.** O front não conhece a máquina de estados |
| `dueLabel`, `waitingLabel`, `summary`, `credential`, `typeLabel`, `sizeLabel` | Texto pronto |
| `meta` de paginação | Rodapé "Mostrando 1–15 de 1.248" |
| Resumo do balcão: `total`, `open`, `rescheduled`, `unconfirmed`, `nextArrival` | Contadores por filtro e próxima chegada, calculados no servidor |

A ordem dos botões é a do ciclo de vida (`CONFIRMADA → CHECK_IN → EM_ATENDIMENTO → CONCLUIDA`),
e o primário é sempre o **passo seguinte**.

Datas e horas são exibidas no **fuso da clínica** (`settings.timezone`), não no do navegador:
`features/appointments/labels.ts` concentra a formatação e a aritmética de dias.

## Decisões de implementação

- **SSE sobre `fetch`, não `EventSource`.** O `JwtAuthGuard` só aceita `Authorization: Bearer`, e
  `EventSource` não manda header. Um 401 no stream renova o token uma vez; se persistir, espera o
  backoff em vez de girar o refresh em loop.
- **Um refresh por vez.** Cinco queries recebendo 401 disparariam cinco rotações.
- **Restaurar sessão não desloga por rede.** Só um 4xx de `/auth/me` encerra a sessão; rede caída
  ou 5xx mostra "Sem conexão" com tentar de novo.
- **Login volta para o endereço pedido** (deep link preservado no redirecionamento).
- **Erros normalizados.** `ApiError.fieldErrors()` lê `details.issues` do Zod e do class-validator;
  resposta HTML de proxy e rede caída viram `ApiError` com mensagem útil.
- **Telas carregadas sob demanda** (`React.lazy`): o balcão abre no painel sem baixar o resto.
- **Detalhe contextual de consulta.** Links de listas guardam `backgroundLocation`: a consulta
  abre em folha e mantém filtro, página e contexto atrás. Links diretos continuam sendo páginas.
  Cancelar, editar e reagendar substituem a folha de detalhe; nunca empilham formulários.
- **Página após uma transição.** Quando o último item sai do filtro, a lista volta à última
  página válida. Esse ajuste aguarda o fechamento do detalhe para não interromper a tarefa.
- **Prévias de documentos.** PDF e imagem abrem em folha, com carregamento, erro e nova tentativa.
  Download mantém o nome original. A URL temporária do arquivo é revogada ao fechar.
- **Densidade operacional.** Resumos usam linhas compactas; avatares e posições da fila usam
  superfícies neutras. A cor de ação continua reservada ao próximo passo.
- **Tema resolvido no `data-theme`.** Um único bloco de tokens escuros; o script de `index.html`
  resolve "sistema" antes da primeira pintura, e a `theme-color` acompanha.

## A armadilha do tailwind-merge

`cn()` usa `twMerge`, que resolve conflito pelo grupo da classe e não conhece a escala do projeto:
para ele `text-card` (tamanho) e `text-ink-onaccent` (cor) caem no mesmo grupo e só o último
sobrevive. Todo token novo de `font-size`, `shadow` ou `rounded` precisa entrar em
`extendTailwindMerge` (`lib/utils.ts`). Regressão coberta em `button.test.tsx`.

## Recuperação de senha

`POST /auth/forgot-password` responde 202 exista ou não a conta (a tela não vira enumerador de
quem trabalha na clínica). Token guardado só como hash, 30 minutos, pedido novo invalida os
anteriores, e trocar a senha revoga as sessões — inclusive a local, que é encerrada antes de
voltar ao login com o aviso "Senha alterada".

## Armadilha da API do Penpot

`shape.fontSize` devolve **string**. Mudar `shape.fontSize` não altera texto cujo tamanho está
fixado no range de caracteres — use `shape.getRange(0, n).fontSize = x`. Coordenadas são globais
do canvas, mesmo para filhos de boards.

## Verificação

- `pnpm --filter web test` — unitários (botão/merge, selo, overlay, abas, paginação, cliente da
  API, datas no fuso da clínica, ações da consulta).
- `pnpm --filter web test:e2e` — fumaça sem backend e capturas com API mockada (`shots/`).
- `e2e-tests/.shots-crawl.mjs` — ferramenta local: entra na API real e fotografa cada rota em
  1440/768/390, apontando erro de console, requisição falha e rolagem horizontal.
- `e2e-tests/redesign.spec.ts` — matriz das rotas em três larguras e dois temas, filtros,
  atalhos, navegação móvel, prévias e consulta contextual sem diálogos empilhados.
- [Relatório do redesign](docs/REDESIGN-VALIDATION.md) — mudanças, validação e evidências locais.
