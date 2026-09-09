# ClinicFlow AI — Sistema Visual & Especificação Operacional

Superfície: app autenticado de desktop da recepção (19 telas, 1440×900 + uma de 1280),
arquivo Penpot "Page 1". Modo: **Operate**. A pessoa está numa tarefa; a ferramenta some dentro dela.
**Status do Design:** 10/10 — Sistema completo, denso, acessível via teclado e auditável.

## Cena de uso (de onde vêm as decisões)

Recepcionista, 8 horas por dia, em pé ou sentada no balcão, sala com luz ambiente alta,
monitor a ~70cm, telefone tocando, paciente na frente. Ela olha a tela em rajadas de
1 a 3 segundos e precisa responder três perguntas: *quem chegou, quem está atrasado,
o que eu clico agora*. Densidade e legibilidade a distância ganham de expressão.
Luz e cor saem daí — não da categoria: tema **claro**, contraste alto, superfície fria e neutra
para não competir com as cores de estado, que são a única informação colorida da tela.

## Tipografia

Uma superfamília, dois papéis.

- **Atkinson Hyperlegible Next** — títulos, rótulos, corpo, botões, nomes.
  Desenhada pelo Braille Institute para máxima diferenciação de caracteres em baixa
  acuidade visual. Escolha do assunto, não de gosto: turno longo, olhada rápida,
  nomes próprios que não podem ser lidos errado.
- **Atkinson Hyperlegible Mono** — horas, durações, telefones, CPF, IDs de consulta.
  Mono aqui é medição, não fantasia: alinha colunas de horário e impede salto de layout
  quando 09:15 vira 11:00.

Escala fixa (sem `clamp`), razão ~1.2:

| Papel | px | peso | line-height |
|---|---|---|---|
| Hero (só no login) | 44 | 600 | 1.15 |
| Título de tela | 30 | 700 | 1.15 |
| Métrica | 28 | 700 | 1.15 |
| Título de entidade | 24 | 600 | 1.15 |
| Seção | 20 | 600 | 1.25 |
| Subtítulo / card | 16 | 600 | 1.35 |
| Corpo / linha de tabela | 14 | 400–600 | 1.45 |
| Rótulo secundário | 13 | 400–600 | 1.45 |
| Micro (cabeçalho de coluna, meta, kbd) | 11–12 | 600 | 1.45 |

Piso absoluto: **11px** (apenas chips técnicos e atalhos kbd). Sem caixa-alta em rótulo, sem eyebrow, sem separador `•` em meta.

## Cor

Restrained. O acento é ação primária, seleção atual e estado — nunca decoração.

```
surface.base      #FFFFFF   conteúdo
surface.app       #F4F6F7   fundo da aplicação, barra lateral
surface.sunken    #EDF1F2   trilhos, células vazias da grade, chips kbd
border.subtle     #E4E8EA   divisórias de linha
border.default    #CFD6DA   contorno de campo, contorno de card
ink.primary       #0E1114   nome, número, título
ink.secondary     #4A545E   rótulo, apoio
ink.tertiary      #79848F   meta, placeholder, dicas
accent.default    #0B5C63   ação primária, item de nav atual, em atendimento
accent.weak       #E4EFEF   fundo do item de nav atual, seleção na busca
```

Estados espelham a máquina de estados da consulta, um para um:

```
AGENDADA        #79848F   sem preenchimento
CONFIRMADA      #1C5FA8   tinta azul, linha #EAF1F9
CHECK_IN/ESPERA #7A4A00   tinta âmbar sobre pílula #F2C64B — o único selo preenchido
EM_ATENDIMENTO  #0B5C63   acento: é a consulta viva
CONCLUIDA       #17683C   tinta verde, linha #E8F2EC
CANCELADA       #79848F   tinta terciária, linha esmaecida
ATRASADA        #B3261E   tinta vermelha, linha #FBEBE9
```

Só um estado é preenchido sólido (espera), porque é o único que pede ação imediata da
recepção. Âmbar como **texto** nunca é `#F2C64B` — vira `#7A4A00`, que passa em AA.

## Forma e espaço

Grade de 4px. Raios: `4` marcador e kbd, `6` controle e campo, `8` toast e item ativo, `10` card e painel, `12` modal, pílula só em selo.
Sombra só onde há elevação real (drawer, painel, modal, toasts): deslocamento + blur, nunca halo colorido.

## Afordâncias de Teclado (Keyboard-first)

O ClinicFlow opera com foco no operador de balcão:
- **`⌘K` / `Ctrl+K`**: Abre a Paleta de Comandos Global a qualquer momento (Tela 18).
- **`[N]`**: Nova consulta imediata.
- **`[C]`**: Check-in direto na linha em foco da tabela.
- **`[I]`**: Iniciar atendimento do paciente selecionado.
- **`[S]`**: Alternar visão para a Sala de Espera.
- **`[Esc]`**: Fechar drawers, modais ou cancelar seleção.
- **`[↑ / ↓]`**: Navegação vertical entre linhas da tabela e itens da paleta de comandos.
- **`[Desfazer Z]`**: Reverter última alteração operacional via Toast flutuante.

## Componentes

Sete famílias na biblioteca local do arquivo, 46 variantes, na prancheta `00 - Componentes`:

| Família | Eixos | Variantes |
|---|---|---|
| Botão | Tipo (primário, secundário, destrutivo) × Estado | 18 |
| Selo de estado | Estado (os 7 do `AppointmentStatus`) | 7 |
| Campo | Estado (default, foco, erro, desabilitado) | 4 |
| Item de navegação | Estado (default, hover, ativo) | 3 |
| Linha de tabela | Estado (default, hover, selecionada) | 3 |
| Toasts / Notificações | Tipo (Sucesso com desfazer, Conflito/Aviso, Erro de API) | 3 |
| Kbd Badges | Teclas operacionais (`⌘K`, `Esc`, `C`, `I`, `N`, `S`, `↑↓`, `↵`) | 8 |

Estado cobre default, hover, pressionado, foco, desabilitado e carregando. Se um estado não
está aqui, ele não existe: não invente na tela.

## Telas do Sistema (20 pranchetas)

- **00 - Fundamentos.** Paleta, tokens, escala de tipografia, cores semânticas e ícones.
- **00 - Componentes.** 7 famílias de componentes, 46 variantes incluindo Toasts e Kbd chips.
- **01 - Login.** Acesso autenticado rápido por perfil.
- **02 - Painel do dia.** Tabela cronológica completa com rodapé de paginação, seletor de densidade (Padrão/Compacto) e Toast flutuante de sucesso no canto inferior direito.
- **02b - Painel do dia · 1280.** Adaptação estrutural para resolução de balcão compacto.
- **03 - Agenda semanal.** Grade semanal com blocos cronológicos por profissional e legenda de status.
- **04 - Detalhe da consulta.** Drawer lateral contextual com histórico completo de **Auditoria (Audit Trail)** rastreando quem alterou, quando e por qual canal.
- **05 - Nova consulta.** Modal ágil com validação inline de horários e alerta de sobreposição.
- **06 - Reagendar.** Painel lateral de 540px preservando a visão da grade de fundo.
- **07 - Cancelar.** Painel lateral com registro obrigatório de motivo para auditoria.
- **08 - Sala de espera.** Visão em tempo real da fila física, ordenada por tempo decrescente, métricas de espera média/máxima e rodapé sincronizado com chamador de TV.
- **09 - Pacientes.** Tabela com busca indexada (⌘K), paginação e contagem total de registros.
- **10 - Ficha do paciente.** Prontuário operacional com abas de consultas, exames e pendências.
- **11 - Novo paciente.** Formulário simplificado de cadastro em 1 minuto.
- **12 - Profissionais.** Gestão de corpo clínico, especialidades e status de atendimento.
- **13 - Agenda do profissional.** Visão diária detalhada por sala e horário.
- **14 - Documentos.** Repositório central de anexos e laudos.
- **15 - Pendências e retornos.** Funil de acompanhamento pós-consulta para combate ao no-show.
- **16 - Configurações.** Painel de gestão da clínica, horários de funcionamento e permissões.
- **17 - Estados de sistema.** Estados de loading, empty states, e falhas reais com saídas de recuperação.
- **18 - Paleta de comandos (⌘K).** Janela modal centralizada com busca unificada por paciente, profissional e ações rápidas sem uso de mouse.

## Desvios registrados

- **Selo de tipo de arquivo (`PDF`) e Kbd a 11px.** Únicos textos abaixo de 12px no arquivo.
  São selos técnicos de formato e atalhos, não texto de leitura contínua.
- **Scrim no Penpot vs Implementação Frontend:** No editor do Penpot, boards aninhados sobrepõem retângulos irmãos. No código React/Tailwind, o scrim deve ser implementado como overlay fixo de tela inteira (`fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50`).
- **Ícones.** Quatro desenhados (fechar, seta, agenda, alerta), traço único de 1,6px em grade de 24. A paleta de comandos utiliza glifo vetorial ⌕ limpo para busca.

## Armadilha da API do Penpot

`shape.fontSize` devolve **string**. Comparar com `===` contra número falha em silêncio.
Mudar `shape.fontSize` **não** altera texto cujo tamanho está fixado no range de caracteres — é preciso `shape.getRange(0, n).fontSize = x`.
Coordenadas (`shape.x`, `shape.y`) são **globais do canvas**, mesmo para filhos de boards; filhos devem somar o `(x, y)` do pai.

## Responsivo — 26 pranchetas (13 Mobile 390×844, 13 Tablet 768×1024)

Mesma superfície, mesma máquina de estados, mesmo vocabulário. O que muda é a
tradução estrutural, não o sistema.

### Forks de layout resolvidos

| Elemento | Desktop 1440 | Tablet 768 | Mobile 390 |
|---|---|---|---|
| Navegação | Barra lateral rotulada 212px | Trilho de ícone 72px com rótulo curto | Bottom nav 5 destinos, 56px, fixa em `y=788` |
| Tabela com ação por linha | Tabela | Tabela, linha de 56px | Pilha de cards, ação como botão de largura cheia |
| Grade da agenda | 7 dias | 3 dias | Lista cronológica de um dia |
| Drawer de detalhe | Lateral 480px | Lateral 400px sobre scrim `ink.primary` a 30% | Bottom sheet de altura cheia |
| Modal | Modal centrado | Modal centrado | Sheet ancorado no rodapé |
| Formulário de 2 colunas | 2 colunas | 2 colunas de 296px, calha de 24 | 1 coluna |
| Paginação | Rodapé numerado (Pág. 1 de 104) | Rodapé numerado | Rolagem contínua — a contagem vive no subcabeçalho |

### Escala responsiva

Mesma escala do desktop com os dois degraus de topo rebaixados — 30px num board de
390 come metade da largura útil:

| Papel | Desktop | Responsivo |
|---|---|---|
| Título de tela | 30 | **24** |
| Métrica | 28 | **20** |
| Título de entidade | 24 | 24 |
| Seção | 20 | 20 |
| Subtítulo / card | 16 | 16 |
| Corpo | 14 | 14 |
| Rótulo secundário | 13 | 13 |
| Micro | 11–12 | **12** |

**Piso de 12px, sem exceção** — o desvio de 11px do desktop (selo `PDF`, kbd) não
vale em tela de mão. Distribuição atual: 12px ×962, 13 ×160, 14 ×102, 16 ×46,
20 ×37, 24 ×15. Nenhum outro tamanho existe no arquivo.

### Alvo de toque

Todo controle interativo tem **44px de altura mínima**. Isso reescreveu a altura das
linhas de tabela no tablet: 56px, com o botão de ação a 44 centrado. Onde a contagem de
linhas não cabia mais no viewport, a lista foi truncada ao que cabe — a prancheta é o
viewport, não o documento.

### Recorte de viewport

Prancheta e contêiner de conteúdo com `clipContent`. O último card fica cortado pela
bottom nav de propósito: é assim que rolagem se parece parada. Nada é desenhado fora
dos limites da prancheta.

### Ícones

Doze desenhados, traço único de 1,6px em grade de 20: painel, agenda, pacientes,
espera, mais, médicos, documentos, pendências, ajustes, fechar, voltar, busca,
mais chevron (‹ ›) e relógio. Substituíram 140 emoji e glifos Unicode
(👥 🩺 📄 🔔 ⚙ 🔍 📅 ⚠️ ⏱ ☰ ◫ ● ✕ ← › ‹) que a implementação responsiva usava como ícone.

### Desvios do responsivo

- **Trilho do tablet com rótulo curto** (`Docs`, `Pend.`, `Config`): 72px não comporta
  a palavra inteira a 12px. É abreviação de trilho, não de conteúdo.
- **Sala de espera não preenche o viewport.** Seis pessoas na fila é o número real; a
  tela termina com `Fim da fila — 6 pacientes aguardando` e o rodapé do chamador de TV
  ancorado embaixo. Encher a fila para preencher pixel seria mentir sobre a operação.

## Implementação em código (`apps/web`)

O arquivo Penpot é a especificação; `apps/web` é onde ela vira produto. Quando os
dois divergirem, **o código vence** — é ele que a recepção usa.

### Tokens

`src/index.css`, bloco `@theme` do Tailwind v4. Os mesmos 41 tokens desta
especificação, com os mesmos nomes: `surface.app` → `--color-surface-app` →
`bg-surface-app`. Não existe cor literal em componente; se um hex aparecer num
`className`, é bug.

Escala tipográfica como token semântico (`text-body`, `text-metric`), não como
`text-sm`/`text-2xl`. O degrau responsivo é explícito: `text-title-sm md:text-title`.

### Fronteira com o backend

O backend manda a tela quase pronta, e o front não recalcula nada disso:

| Campo do DTO | O que o front faz com ele |
|---|---|
| `stateLabel` | Rótulo do selo, direto — "Atrasada 27min" |
| `derivedState` | Cor do selo, incluindo `ATRASADA`, que não existe no Prisma |
| `allowedTransitions` | **Quais botões existem na linha.** O front não conhece a máquina de estados |
| `dueLabel`, `waitingLabel`, `summary` | Texto pronto, sem formatação no cliente |
| `meta` de paginação | Rodapé "Mostrando 1–15 de 1.248" |

A ordem dos botões é do ciclo de vida (`CONFIRMADA → CHECK_IN → EM_ATENDIMENTO →
CONCLUIDA`), e o primário é sempre o **passo seguinte**. Ordenar por urgência
colocava "Check-in" como botão escuro numa consulta apenas agendada — com o
paciente ainda em casa.

### Decisões que só apareceram na implementação

- **SSE sobre `fetch`, não `EventSource`.** O `JwtAuthGuard` só aceita
  `Authorization: Bearer`, e `EventSource` não manda header. A alternativa seria
  token na query, que vaza para log de acesso e proxy.
- **Um refresh por vez.** Cinco queries paralelas recebendo 401 disparariam cinco
  rotações; como o backend invalida o refresh usado, quatro derrubariam a sessão.
- **`formatDate` montado à mão.** `toLocaleDateString("pt-BR", { month: "short" })`
  devolve "11 de set. de 2026", que quebra em duas linhas na coluna da tabela.
- **Paginação numerada não existe no mobile.** A contagem vive no subcabeçalho.

### Verificação

`e2e-tests/visual.spec.ts` captura as telas com a API mockada, em 1440, 768 e 390.
Foi assim que apareceram o telefone quebrando em duas linhas, o selo estourando a
altura da linha e o card de métrica órfão — nenhum deles foi pego por asserção
numérica. Screenshot é a verdade; medida numérica pega o que o olho perde.

## Tema escuro

Adicionado a pedido, sem mudar a decisão de cena de uso: o balcão sob luz alta
continua sendo o padrão, e `system` é a preferência inicial. Quem pega o turno da
noite herda a escolha do aparelho.

O tema inteiro é troca de token. Nenhum componente tem variante `dark:`, porque
nenhum componente conhece cor literal. Os overrides ficam no layer `theme`, que é
onde o `@theme` do Tailwind emite os tokens: em `base` a ordem de camadas
inverteria e o claro venceria sempre.

Três estados, não dois: `data-theme="light"`, `data-theme="dark"` e a ausência do
atributo, que segue o sistema. O `:root:not([data-theme="light"])` na media query
impede que a preferência do SO atropele quem pediu claro na mão. Um script inline
no `index.html` aplica o atributo antes da primeira pintura.

O que não muda de tema: o selo de espera. Âmbar sólido com tinta escura é legível
nos dois, e ele é o único estado preenchido do sistema.

No escuro o acento clareia (`#0B5C63` → `#58B6BE`) e, junto com ele,
`ink.onaccent` escurece. É por isso que a cor do texto sobre o acento é um token
e não `text-white`.

## A armadilha do tailwind-merge

`cn()` usa `twMerge`, que resolve conflito de utilitárias pelo grupo da classe.
Ele não conhece a escala do projeto: para ele `text-card` (tamanho) e
`text-ink-onaccent` (cor) caem no mesmo grupo, viram conflito, e só o último
sobrevive. Resultado: **todo botão primário e destrutivo perdia a cor do texto** e
herdava o `color` do body, texto quase preto sobre o acento escuro.

A correção é declarar a escala em `extendTailwindMerge` (`lib/utils.ts`). Vale
para qualquer token novo em `font-size`, `shadow` e `rounded`: se ele não estiver
lá, o merge vai tratá-lo como cor.

Regressão coberta em `components/ui/__tests__/button.test.tsx`.

## Recuperação de senha

Fluxo novo, com endpoint novo no backend (`POST /auth/forgot-password` e
`POST /auth/reset-password`).

- O pedido responde 202 exista ou não a conta. Dizer "e-mail não encontrado" num
  formulário público transforma a tela num enumerador de quem trabalha na clínica.
- Token guardado só como hash, igual ao refresh, com validade de 30 minutos.
- Pedido novo invalida os anteriores.
- Trocar a senha revoga as sessões abertas: se o pedido veio de um acesso
  indevido, a troca precisa expulsar quem já estava dentro.
- O envio usa `MailService`, com o mesmo desenho do transporte de notificação:
  `log` em desenvolvimento, pluggável em produção.
