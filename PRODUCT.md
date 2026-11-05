# ClinicFlow — direção de produto

Decisão: 4 de outubro de 2026. Base: código atual de `apps/web` e `apps/api`,
revisão dos fluxos e documentação pública dos produtos comparados. As decisões
de público e posicionamento abaixo são hipóteses para validar em pilotos.

## O que existe hoje

ClinicFlow organiza a operação de uma clínica: agenda, confirmação, chegada,
sala de espera, início e conclusão do atendimento, cadastro de pacientes,
anexos e pendências de retorno. A recepção acompanha o próximo passo; profissionais
e gestão consultam o mesmo contexto, respeitando seus perfis de acesso.

O cadastro reúne dados e notas administrativas e documentos anexados. Não há
prontuário clínico completo, prescrição eletrônica, faturamento, TISS ou inteligência
artificial implementados. A implantação atual atende uma clínica; isolamento de
múltiplas clínicas e contratação autônoma de SaaS não estão implementados.

WhatsApp tem template, transporte HTTP e webhook. No transporte `log`, as
mensagens são **SIMULADA**, sem `sentAt` e sem envio ao paciente. `ENVIADA` significa
aceite HTTP do provedor, não comprovante de entrega. Falhas aparecem como `FALHOU`
com `error`; a repetição automática é impedida por consulta e horário. Reenvio manual
continua disponível pela API. A interface de histórico de envios e reenvio é prioridade
futura, não uma capacidade prometida pela landing.

## Marca e posicionamento

Manter **ClinicFlow**. Categoria: **software de operação para recepção de clínicas**.
Promessa: **O próximo passo de cada paciente, claro para toda a equipe.**

Explicação curta: organize agenda, chegadas, documentos e retornos em um fluxo
que acompanha o dia da clínica. Voz direta, calma e prática; nomes das ações
descrevem o que acontece: confirmar, registrar chegada, iniciar, concluir e agendar retorno.

Público inicial proposto: clínicas independentes com recepção compartilhada e
aproximadamente 2–10 profissionais. Recepcionista é o usuário principal;
gestão decide adoção e acompanha a rotina. Esse recorte é uma hipótese,
sem pesquisa de campo ou demanda comercial comprovada.

## Escolhas de estratégia

| Dimensão | Decisão |
| --- | --- |
| Visão | Toda a equipe sabe em que etapa o paciente está e o que vem a seguir. |
| Segmento inicial | Clínica independente com recepção compartilhada. |
| Valor | Visibilidade da rotina, continuidade entre etapas e menos procura por contexto. |
| Diferenciação proposta | Clareza e agilidade de operação; testar facilidade de aprendizado no balcão. |
| Escopo | Agenda → confirmação → chegada → atendimento → retorno. |
| Métrica inicial proposta | Proporção de consultas do dia com estado atualizado ao encerrar o expediente. |
| Distribuição proposta | Demonstração orientada e piloto assistido; ainda sem oferta comercial definida. |
| Capacidades necessárias | Fluxo confiável, implantação simples, observabilidade e integração de mensagens. |
| Vantagem defensável | Ainda não demonstrada; aprender com uso repetido da recepção. |

Não prometer redução de faltas, ganhos financeiros ou percentuais sem medição.
Instrumentação, linha de base e consentimento adequado precisam anteceder tais alegações.

## O que manter, acrescentar e retirar

**Manter e aprofundar:** balcão do dia, agenda cronológica, espera por ordem de
chegada, detalhes contextuais, anexos, tarefas de confirmação e retorno, busca e teclado.

**Implementado neste ciclo:** linguagem visual comum, ação principal por consulta,
contadores como filtros, folhas contextuais, prévias de documentos, formulários em
seções, landing com demonstração por etapa, e verdade do transporte de mensagens
com proteção contra confirmações automáticas duplicadas.

**Próximas prioridades, ainda não implementadas:**

1. Histórico de confirmação por consulta: simulação, aceite do provedor, falha,
   resposta e reenvio manual visíveis; não confundir envio com confirmação do paciente.
2. Conectar uma tarefa de retorno à consulta efetivamente agendada e oferecer resolver
   essa tarefa no fluxo. Hoje resolver a tarefa não comprova um novo agendamento.
3. Tornar falta e recuperação explícitas. Hoje `NO_SHOW` é motivo de cancelamento;
   a rotina de fechamento gera tarefa de recuperação sem criar um estado `FALTOU`.
4. Implantação inicial assistida: dados da clínica, horários, equipe, importação e
   primeiro dia de uso. Separação por clínica é pré-requisito para SaaS com múltiplos clientes.

**Retirar do posicionamento atual:** promessa de prontuário completo, IA, ERP,
financeiro, telemedicina, marketplace e múltiplas unidades. Não foram apagados dados
ou módulos existentes para realizar esse recorte. Recursos futuros só entram se
melhorarem a jornada central e tiverem demanda validada.

## Descoberta e validação propostas

Resultado desejado: a recepção encontra e executa a próxima ação sem ajuda.

| Oportunidade hipotética | Soluções a comparar | Experimento proposto |
| --- | --- | --- |
| Dificuldade de escolher a próxima ação | Filtros por estado; lista priorizada; contadores acionáveis | 4 de 5 participantes completam um ciclo sem ajuda. |
| Retornos perdem continuidade | Tarefa automática; indicação de vencimento; atalho contextual | 4 de 5 encontram e agendam um retorno após concluir a consulta. |
| Valor pouco claro antes de usar | Capturas anotadas; demonstração por abas; jornada explicada | 4 de 5 descrevem corretamente o uso para recepção. |

Esses experimentos não foram realizados. Não há notas de entrevistas,
resultados de conversão ou pontuação quantitativa fabricados.

## Referências e escolhas visuais

- Base atual: [Fluent 2, Microsoft](https://fluent2.microsoft.design/), com os temas
  oficiais de `@fluentui/tokens` aplicados aos componentes do ClinicFlow. Azul oceano nas
  ações, superfícies azul-gelo, área de trabalho branca e tipografia Segoe UI com fontes
  nativas de fallback. Atkinson Mono mantém horas e documentos legíveis.
- A landing compartilha essa identidade, com título à esquerda, prévia do painel e
  demonstração das quatro etapas. Suas imagens mostram a aplicação real com fixtures
  fictícios identificados. O conteúdo continua focado na recepção, sem métricas inventadas.

A direção anterior baseada em Osha/Aurelien do UITopic foi substituída após o feedback
do usuário. A nova implementação adapta a fundação Fluent às necessidades da clínica;
os componentes e a composição das páginas pertencem ao ClinicFlow. O detalhamento
de tokens e critérios de acessibilidade está em [DESIGN.md](DESIGN.md).

Referências de categoria consultadas: [iClinic](https://iclinic.com.br/software-medico/),
[Feegow](https://feegowclinic.com.br/), [Amplimed](https://www.amplimed.com.br/),
[Doctoralia Pro](https://pro.doctoralia.com.br/) e [Shosp](https://www.shosp.com.br/).
O recorte de recepção é uma escolha de foco; não implica que concorrentes deixem
de atender recepcionistas. Não foi realizado benchmark de preço ou desempenho.

## Skills utilizadas

Foram instaladas `product-strategy`, `opportunity-solution-tree` e `positioning-ideas`
do [pm-skills, de phuryn](https://github.com/phuryn/pm-skills), licença MIT,
fixadas na revisão `8607e3b077817f89bf4a9b623246219734ac3be0`.
Os arquivos foram inspecionados antes da instalação. Os métodos organizaram esta
decisão, sem substituir evidência do repositório. Os skills Product Design e
Richard Product UX/UI apoiaram o exame dos fluxos e a implementação.

Semantica indisponível nesta sessão; este arquivo é o registro persistido no workspace.
