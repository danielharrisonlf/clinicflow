# ClinicFlow — redesign e validação

Data: 4 de outubro de 2026. Escopo: `apps/web` e contratos operacionais de `apps/api`.

## Resultado de produto

O balcão reúne consultas, próxima chegada, fila e pendências em superfícies compactas. Os
contadores levam ao filtro correspondente; cada consulta mostra um próximo passo primário,
com outras ações em menu. Agenda, sala de espera e históricos usam a mesma linguagem.

Detalhes de consultas abertos a partir de listas preservam a página de origem em uma folha
lateral, ou inferior no celular. Cancelamento, reagendamento e edição substituem essa folha.
Endereços diretos continuam disponíveis. A paginação se recupera quando uma transição remove
o último item e aguarda o fechamento da folha antes de navegar.

Pacientes e profissionais mantêm os resultados durante uma busca, indicam a atualização e
oferecem limpeza de filtros. Cadastro de paciente e configurações agrupam os campos por
assunto. Pendências destacam uma ação principal por linha. Documentos têm prévia de PDF e
imagem, download e estados de carregamento, falha e nova tentativa.

A casca mantém navegação lateral, trilho no tablet e navegação inferior no celular. Menus
suportam setas, Home/End e Escape, evitam corte pelo viewport e ignoram ações desabilitadas.
Os atalhos de uma letra param em campos, menus e sobreposições. O foco retorna ao contexto
ao fechar uma folha; a busca global evita abrir resultados de um termo anterior.

A direção final está em [PRODUCT.md](../PRODUCT.md): software de operação para recepção,
com a promessa "O próximo passo de cada paciente, claro para toda a equipe".
Após o feedback sobre a paleta anterior, a base visual foi substituída por
[Fluent 2](https://fluent2.microsoft.design/). `@fluentui/tokens` fornece temas oficiais,
Segoe UI, cores de ação e neutros; o ClinicFlow mantém os próprios componentes e fluxos.
Azul oceano destaca ações, fundos azul-gelo delimitam navegação e áreas de apoio e o
conteúdo ocupa uma área branca contínua. Controles usam raio de 4px, painéis 8px e campos
têm borda forte. Atkinson Mono permanece nos dados. `data-theme` e as cores clínicas
continuam; a cor de foco usa `accent-ink` para manter contraste também no escuro.

A landing em `/conhecer`, e na raiz sem sessão, compartilha essa identidade. Cabeçalho reto,
título à esquerda, painel à direita e demonstração por quatro abas substituem a composição
anterior. As oito capturas WebP desktop/mobile mostram a aplicação atual, com fixtures
fictícios identificados. Ela funciona sem API para visitantes; usuários autenticados
continuam acessando o painel na raiz. O logout volta ao login no desktop e no celular.

## API

`dashboard.service.ts` acrescenta `total`, `open`, `rescheduled`, `unconfirmed` e `nextArrival`
ao resumo. Contagens e próxima chegada respeitam dia e profissional selecionados. O limite
de atraso fica dentro do dia consultado, tanto no resumo quanto na lista de consultas;
filtros futuros retornam zero atrasadas sem ampliar o intervalo.

As alterações do resumo não exigiram migração. A revisão de produto também corrigiu a
confirmação: transporte `log` registra `SIMULADA` com `sentAt` nulo; HTTP sem configuração
ou com falha registra `FALHOU` e expõe `error`. `ENVIADA` representa aceite HTTP do provedor,
não entrega ao paciente. Jobs reservam uma chave única por consulta/horário antes do envio;
reenvios manuais continuam permitidos. Repetição automática de uma falha não ocorre;
histórico de envio e reenvio na interface seguem como prioridade documentada.

A migração aditiva `20261004000000_notification_simulation_and_dedupe` acrescenta enum,
coluna nullable e índice único, preservando registros. Foi aplicada somente nos bancos
isolados de revisão. Alterações anteriores no workspace, incluindo overbooking, foram preservadas.

## Arquivos principais

| Área | Arquivos |
| --- | --- |
| Casca e contexto | `App.tsx`, `components/layout/app-shell.tsx`, `lib/navigation.ts` |
| Primitivos | `components/ui/overlay.tsx`, `menu.tsx`, `surface.tsx` |
| Balcão e atendimento | `features/dashboard/dashboard-page.tsx`, `features/agenda/agenda-page.tsx`, `features/waiting-room/waiting-room-page.tsx`, `features/appointments/appointment-list.tsx`, `appointment-detail-page.tsx`, `reschedule-panel.tsx` |
| Cadastros | `features/patients/`, `features/professionals/` |
| Documentos | `features/documents/document-preview.tsx`, `documents-page.tsx`, `use-open-document.ts` |
| Administração e busca | `features/tasks/tasks-page.tsx`, `features/settings/`, `features/auth/auth-layout.tsx`, `features/search/command-palette.tsx` |
| Marca, landing e sistema visual | `features/landing/`, `index.css`, `lib/fluent-theme.ts`, `lib/theme.tsx`, `apps/web/public/marketing/`, `PRODUCT.md`, `DESIGN.md` |
| API | `modules/dashboard/dashboard.service.ts`, `modules/appointments/services/find-all-appointments.service.ts`, `modules/notifications/notifications.service.ts`, `modules/jobs/jobs.service.ts` e respectivos testes; schema e migração de notificações |
| Verificação | `e2e-tests/redesign.spec.ts`, `e2e-tests/fixtures/redesign-api.ts`, `e2e-tests/.redesign-live.mjs`, testes unitários de menu, overlay, navegação e documentos |
| Verificação de produto | `e2e-tests/product.spec.ts`, `apps/api/test/confirmations.e2e-spec.ts`, `design-qa.md` |

Caminhos da tabela são relativos a `apps/web/src` ou `apps/api/src`, conforme a área.
O status do Git inclui trabalho anterior à missão e não representa apenas este redesign.

## Validação

O refresh Fluent revalidou Biome, formato, build web, unitários e navegação do redesign.
Os resultados da API, dos fluxos reais e da suíte home/visual abaixo são da etapa full-stack
anterior, no mesmo dia. Este refresh não alterou a API. O teste de tema acrescenta cobertura
da troca claro → escuro → claro e preservação dos tokens clínicos.

| Verificação | Resultado |
| --- | --- |
| Frontend — Biome, formato e build TypeScript/Vite | Aprovados |
| Frontend — unitários | 10 arquivos, 47 testes aprovados |
| API — unitários | 12 suítes, 97 testes aprovados |
| API — build NestJS/Prisma | Aprovado |
| API — E2E com PostgreSQL | 2 suítes, 32 testes aprovados, incluindo concorrência real de confirmações |
| Frontend — fluxos com API real | 6 testes aprovados |
| Frontend — home e visual existentes | 8 testes aprovados |
| Frontend — E2E do redesign | 9 testes aprovados; filtros, teclado, prévias, navegação e paginação contextual |
| Frontend — E2E de produto | 5 testes aprovados; landing sem API, links, teclado, celular e sessão |
| Matriz visual | 17 rotas × 3 larguras × 2 temas; 102 capturas, sem erro de renderização ou rolagem horizontal |
| Fluxo de documento com API real | Upload, prévia de imagem e download aprovados |
| Consulta contextual com API real | Filtro, fechamento por Escape e retorno de foco aprovados |
| Landing — navegador | 1440, 768 e 390px nos dois temas, sem overflow ou imagens ausentes |
| Refresh Fluent — contraste independente | Cinco rotas, dois temas; 218 amostras de texto e 21 campos por tema, sem falha nos limites medidos |

Na rodada final estável, o redesign passou em 9/9 testes e a landing passou em 5/5
após a atualização das imagens. As 102 capturas atuais estão em
`out/visual-refresh/tester/shots/redesign/after/`. O menor contraste de texto foi
4,81:1 claro e 5,20:1 escuro; contorno de campo 3,09:1 e 4,71:1. Tab real confirmou
foco mínimo de 4,81:1 claro e 6,00:1 escuro. A revisão independente aprovou a correção
do foco. Medições, script e imagens ficam em `out/visual-refresh/tester/`.
Esta verificação amostral não constitui uma certificação completa de acessibilidade.

Os testes com dados reais usaram um PostgreSQL isolado, container `clinicflow-redesign-qa`,
porta local `55432`, migrations aplicadas e seed de demonstração. A configuração existente
de `.env` e bancos do usuário não foi modificada. Jobs estavam desativados nessa instância.
Para a aceitação da API, foi criado `clinicflow_product_acceptance_20261004_1331` no mesmo
container, migrado e populado do zero. A primeira repetição de E2E no banco de demonstração
ocupado encontrou conflitos nos horários fixos da suíte; a execução isolada passou em todos
os 32 testes. As colisões Prisma dos testes de dedupe são esperadas e tratadas pelo serviço.

Comandos reproduzíveis: `pnpm --filter web check:fix`, `format:fix`, `test`, `build`;
`pnpm --filter api test -- --runInBand`, `build`, `test:e2e -- --runInBand`;
`pnpm --filter web test:e2e redesign --workers=1`; e
`E2E_REAL_API=1 pnpm --filter web test:e2e flows --workers=1` (definir variável conforme o shell).

## Evidências locais

- `apps/web/shots/redesign/after/`: matriz visual completa.
- `out/redesign/before/`: capturas anteriores preservadas.
- `out/redesign/live/`: 30 capturas das telas principais com API real, mais login.
- `out/redesign/live-workflows/consulta-contextual.png` e `documento-preview.png`: fluxos reais.
- `out/product-direction/references/`: fontes visuais capturadas e arquivos originais.
- `out/product-direction/app/`: capturas reais atualizadas para a apresentação.
- `out/product-direction/qa/`: comparações conjuntas com as fontes e capturas nos dois temas.
- `out/product-direction/tester/`: capturas e relatórios da validação independente da landing.
- `out/visual-refresh/`: estado anterior, capturas atuais, fontes Fluent, pares comparativos,
  imagens de apresentação e verificação independente da nova direção.

As capturas são evidências locais; não foram publicadas. A revisão independente aceitou as
correções dos limites de atraso e da paginação contextual. Semantica não estava disponível;
o registro durável desta entrega está neste documento e no repositório.

Na etapa de produto, `check:fix` corrigiu formato de arquivos integrados; a verificação
subsequente ficou limpa. TypeScript/Vite, NestJS/Prisma, testes e verificações de Biome passaram.
A matriz e as imagens de apresentação foram regeneradas com a direção Fluent 2.
`design-qa.md` registra fontes oficiais, comparações e a correção de foco no tema escuro.
A referência fornece a fundação; a composição dos fluxos permanece própria do ClinicFlow.
