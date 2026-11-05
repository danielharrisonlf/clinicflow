`screens/04-patient-360.html` | `patient-360-handoff.md` |`screens/03-revenue-rescue.html` | `revenue-rescue-handoff.md` |`screens/02-smart-calendar.html` | `smart-calendar-handoff.md` |`screens/01-clinic-cockpit.html` | `cockpit-handoff.md` |# ClinicFlow — Re-fundação do produto (Fase 1)

Status: proposta aprovada para prototipação · 09/10/2026
Protótipos: `docs/product/screens/` · Handoff por tela: `docs/product/*-handoff.md`

## 1. Diagnóstico

O ClinicFlow virou uma lista de consultas com CRUD. Agenda é commodity: toda clínica já tem uma
(Feegow, iClinic, planilha, Google Agenda) e nenhuma troca de sistema por "mais uma agenda".
Uma clínica compra software quando ele mexe em uma destas três linhas:

| Dor | Onde dói | Ordem de grandeza |
|---|---|---|
| **Cadeira vazia** (no-show e desistência tardia) | faturamento irrecuperável | 2 faltas/dia × ticket R$ 150–600 × 21 dias = **R$ 6 mil a R$ 25 mil/mês por profissional** |
| **Recepção cega** | experiência e reputação | espera de 40 min sem previsão; médico interrompido por interfone e WhatsApp pessoal |
| **Balde furado** (retorno que nunca volta) | receita recorrente e desfecho clínico | ~60% dos retornos preventivos e pós-procedimento se perdem sem contato ativo |

As três dores têm a mesma raiz: **a clínica não enxerga nem age sobre a jornada do paciente entre
os horários marcados**. A agenda registra intenção; o dinheiro se perde no que acontece em volta dela.

## 2. Posicionamento

**ClinicFlow — o sistema operacional das clínicas de alta performance.**
Zero cadeira vazia, recepção sem atrito, jornada do paciente operada em tempo real.

- **Para quem:** clínicas privadas e multidisciplinares de 3 a 30 profissionais, com mix de convênio
  e particular, recepção de 1 a 6 pessoas, alto volume de retornos (dermato, ortopedia, cardio,
  endócrino, odonto, estética médica).
- **Comprador:** sócio-gestor / gerente administrativo (olha receita e ocupação).
  **Usuário diário:** recepção (velocidade, previsibilidade). **Beneficiário silencioso:** o médico
  (menos interrupção, agenda cheia).
- **Contra o quê:** não competimos com prontuário eletrônico. Integramos com ele. Competimos com a
  planilha de lista de espera, o WhatsApp pessoal da recepcionista e o "liga pra confirmar".

## 3. As três alavancas (por que a clínica paga)

### Alavanca 1 — Smart Fill e Copilot autônomo
Agente de WhatsApp em linguagem natural: confirma com um toque, remarca sozinho dentro das regras
da clínica e, quando alguém desiste, aciona a lista de espera priorizada até preencher a vaga.
- **Métrica-norte:** tempo até vaga reposta (meta < 8 min) e % de vagas recuperadas.
- **Prova na interface:** cartão Smart Fill ao vivo no Cockpit; Centro de Resgate (Tela 3).
- **Base existente:** `notifications`, `jobs`, `tasks.RESGATE_NO_SHOW`, `Channel.WHATSAPP/SISTEMA`.

### Alavanca 2 — Cockpit ao vivo (HUD da clínica)
O fluxo físico em tempo real: confirmado → check-in → espera com cronômetro de tolerância →
em consulta → finalizado/retorno. Aviso silencioso na tela do médico substitui o interfone.
- **Métrica-norte:** espera média e % de pacientes acima da tolerância.
- **Prova na interface:** Tela 1 (este protótipo).
- **Base existente:** `waiting-room`, `confirmedAt/checkedInAt/calledAt/startedAt/completedAt`.

### Alavanca 3 — Pathways de continuidade
Cada consulta finalizada abre uma trilha (retorno em N dias, exame pendente, laudo a entregar).
O sistema agenda ou cobra o contato antes de o paciente sumir.
- **Métrica-norte:** taxa de retorno efetivado em até 7 dias após o prazo.
- **Prova na interface:** coluna "Finalizados & retornos" no Cockpit; Paciente 360 (Tela 4).
- **Base existente:** `tasks.RETORNO_A_AGENDAR/AGUARDANDO_EXAME`, `documents.LAUDO`.

## 4. Modelo de valor

O produto mostra o próprio ROI na tela principal: **receita salva estimada** = soma do ticket médio
das vagas recuperadas (remarcação sem perda + vaga reposta via Smart Fill). Precificação sugerida
por profissional ativo, com o argumento "o Smart Fill paga a assinatura com uma vaga por mês".

## 5. Princípios de produto

1. **O sistema age; a recepção supervisiona.** Toda ação automática aparece no feed de atividade e
   pode ser desfeita.
2. **Zero clique para saber, um toque para agir.** Estado legível em 3 s a 70 cm; cada cartão tem
   uma ação primária com atalho de uma tecla.
3. **Dinheiro visível.** Ocupação, no-shows evitados e receita salva ficam no topo, sempre.
4. **Cor nunca sozinha.** Todo estado tem rótulo, ícone ou número além da cor.

## 6. Direção visual

Nova direção pedida pelo produto (substitui a base Fluent descrita em `DESIGN.md` quando for
implementada): Geist / Geist Mono com `tabular-nums`, superfície off-white `#FBFBFD` ou obsidiana
`#09090B`, bordas de 8% de opacidade, esmeralda para fluxo e receita, índigo para o Copilot,
âmbar para atenção, carmim para desistência. Densidade de ferramenta (Linear, Raycast, Notion
Calendar), Cmd+K universal e atalhos de uma tecla.

## 7. Roteiro de telas

| # | Tela | Alavanca | Protótipo | Handoff | Artifact |
|---|---|---|---|---|---|
| 1 | The Clinic Cockpit | 2 (+1, +3) | `screens/01-clinic-cockpit.html` | `cockpit-handoff.md` | https://claude.ai/artifact/KWAujMd5USoVsofsb8g8F4 |
| 2 | Smart Calendar | 1 | `screens/02-smart-calendar.html` | `smart-calendar-handoff.md` | https://claude.ai/artifact/UAMhLWdb2s6ZbsGVqBwN4P |
| 3 | Centro de Resgate (Comms & Smart Waitlist) | 1 | `screens/03-revenue-rescue.html` | `revenue-rescue-handoff.md` | https://claude.ai/artifact/2bwkektWBoMfcssmSNfCdw |
| 4 | Patient 360 & Care Continuity | 3 | `screens/04-patient-360.html` | `patient-360-handoff.md` | https://claude.ai/artifact/1ye1zM1PhkTzTdEVUAXje6 |

Os quatro protótipos compartilham tokens, componentes e a mesma história de dados de exemplo
(Clínica Vértice, sexta 09/10/2026, 10:42): Mariana Costa repõe a vaga das 14:00 do Dr. Ramos,
Eduardo Brandão repõe a das 15:30 da Dra. Okada, Camila Duarte está em consulta e tem o retorno
do laudo pendente.
