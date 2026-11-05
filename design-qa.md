# ClinicFlow — revisão visual Fluent 2

Data: 4 de outubro de 2026. A direção Osha/Aurelien foi substituída após o feedback
do usuário. Escopo: identidade visual da aplicação, landing e temas; operação local.

## Fontes e decisão

Base: [Fluent 2, Microsoft](https://fluent2.microsoft.design/), suas orientações de
[cor](https://fluent2.microsoft.design/color),
[tipografia](https://fluent2.microsoft.design/typography) e
[botões](https://fluent2.microsoft.design/components/web/react/core/button/usage).
`@fluentui/tokens` é importado pela aplicação: os temas `webLightTheme` e
`webDarkTheme` alimentam os aliases do ClinicFlow em `lib/fluent-theme.ts`.

Azul oceano nas ações, azul-gelo nas superfícies, texto ardósia, Segoe UI e controles
com raio de 4px substituem a linguagem anterior. O corpo a 15px, Atkinson Mono nos
dados, navegação operacional e estados clínicos são adaptações ao balcão.

As imagens ilustrativas da documentação Fluent exemplificam estados e hierarquia;
os valores de marca do pacote oficial são a referência numérica. A comparação não
afirma réplica de uma página Microsoft nem uso integral da biblioteca Fluent React.
Layouts e componentes acessíveis permanecem próprios do ClinicFlow.

## Evidências observadas

- Antes: `out/visual-refresh/before/`, capturas frescas da aplicação e da
  landing anterior em 1440 e 390px; a landing também foi capturada em 768px.
- Fonte: páginas oficiais em `out/product-direction/references/` e
  imagens originais em `out/visual-refresh/reference/`: `button-states.png`,
  `brand-action.png`, `brand-selection.png` e `segoe.webp`.
- Implementação real com API: `out/visual-refresh/after/app/`, quatro rotas em
  desktop e celular, mais login, no mesmo ambiente de demonstração.
- Landing: `out/visual-refresh/after/landing/`, 1440, 768 e 390px,
  nos dois temas do navegador, sem overflow ou imagens ausentes.
- Matriz de rotas: `out/visual-refresh/tester/shots/redesign/after/`, 17 rotas,
  três larguras e dois temas. As imagens da landing vêm da aplicação com
  fixtures fictícios em `out/visual-refresh/marketing/`, convertidas para oito WebP.

Fonte e render foram inspecionados conjuntamente no artefato
`out/visual-refresh/comparisons/source-render-foundation.png`.
`app-before-after.png` e `landing-before-after.png`, no mesmo diretório, mostram
a mudança de direção. Os pares preservam proporções; screenshots usam densidade 1.
O relatório anterior está em `out/visual-refresh/before/design-qa.md`.

## Resultado da inspeção

- Navegação contígua ao conteúdo, com seleção azul; área de trabalho plana branca.
- Botões e campos com cantos contidos, contorno perceptível sem foco e
  tipografia nativa. Cores clínicas mantêm ícones e texto.
- Landing com cabeçalho reto, título à esquerda e produto à direita, abas
  sublinhadas, seções claras e imagens coerentes com a interface atual.
- Tema escuro com fundo azul-ardósia, superfícies neutras e ação azul; a landing
  preserva apresentação clara, documentada em DESIGN.md.
- Prévia mobile com captura própria: as primeiras consultas ficam legíveis,
  sem miniaturizar a interface desktop inteira.

## Correção encontrada na revisão independente

P2: o anel de foco usava o azul de fundo do botão, que no tema escuro tinha contraste
inferior a 3:1. Corrigido para `accent-ink`, incluindo campos, date/time, radios,
switches, seleção de horário, upload, configurações e itens de menu.

A revisão posterior confirmou via Tab no navegador o anel efetivo e contraste
de 5,05–7,03:1 no escuro e 4,75–5,38:1 no claro. Campo claro: 3,09:1;
botão primário com texto branco: 5,38:1 claro e 6,66:1 escuro.

Critério de medição: contornos necessários para reconhecer campos e indicadores de
foco exigem 3:1. Em botões identificados por texto ou ícone contrastante, a borda
decorativa não é o único sinal do controle, conforme a orientação
[WCAG 1.4.11 do W3C](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).
As medições locais não equivalem a uma certificação completa de acessibilidade.

Biome, formato, TypeScript/Vite, 47 testes unitários e 14 testes E2E aprovados.
A auditoria independente final mediu texto e campos em cinco rotas nos dois temas,
sem falha nos limites medidos; a matriz final contém 102 capturas. As evidências são consolidadas em
[docs/REDESIGN-VALIDATION.md](docs/REDESIGN-VALIDATION.md).

Diferenças deliberadas: domínio clínico, conteúdo próprio, corpo de leitura maior,
superfícies frias e fonte monoespaçada nos dados. Não há divergência pendente
identificada na revisão do foco; aceitação estética final pertence ao usuário.
