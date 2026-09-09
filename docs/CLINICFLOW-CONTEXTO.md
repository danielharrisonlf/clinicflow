# ClinicFlow AI — Contexto do Projeto de Backend & Produto

> **Disciplina:** Back-end Frameworks  
> **Stack Principal:** NestJS + TypeScript + PostgreSQL + Prisma ORM  
> **Arquitetura:** Monorepo (`apps/api` em NestJS e `apps/web` em React)  
> **Origem dos Requisitos:** `ClinicFlow_AI.pdf` (17 páginas) e proposta de design operacional.

---

## 1. Visão Geral e Ideia Central

O **ClinicFlow AI** é uma plataforma de gestão operacional focada em pequenas e médias clínicas e consultórios médicos/multidisciplinares.

### O Problema Real
Hoje, essas clínicas operam com dados fragmentados entre WhatsApp, planilhas Excel, agendas físicas/Google Calendar e papéis soltos. Isso gera:
* Confirmações manuais de consulta com alto índice de faltas (no-show);
* Descontrole na recepção (dificuldade em saber quem já chegou, quem está em espera e quem já foi atendido);
* Documentos e exames espalhados sem vínculo com a ficha do paciente;
* Retornos e pendências esquecidos dependendo apenas da memória dos atendentes.

### Proposta de Valor
Transformar essa jornada dispersa em um **fluxo único, rastreável e centrado na recepção**:
$$\text{Agendamento} \longrightarrow \text{Confirmação} \longrightarrow \text{Check-in} \longrightarrow \text{Atendimento} \longrightarrow \text{Pendências} \longrightarrow \text{Retorno}$$

> **O que NÃO é:** Não é um prontuário eletrônico pesado (PEP hospitalar) nem ERP de faturamento TISS/SUS. O foco é resolver a **dor operacional** diária com agilidade.

---

## 2. Personas e Atores

1. **Recepcionista (Usuária Primária):**
   - Opera o sistema 8h por dia no balcão. Precisa de alta densidade de informação, atalhos de teclado e ações a um clique (confirmar, check-in, reagendar) sem abrir modais desnecessários.
2. **Profissional de Saúde (Médico/Terapeuta):**
   - Consulta a agenda do dia, visualiza status da sala de espera e acessa os documentos anexados do paciente.
3. **Gestor da Clínica:**
   - Acompanha o volume diário, taxa de no-show, pendências de retorno e capacidade de atendimento.

---

## 3. Regras de Negócio & Ciclo de Vida da Consulta

### Máquina de Estados da Consulta (`AppointmentStatus`)
```
AGENDADA ──► CONFIRMADA ──► CHECK_IN ──► EM_ATENDIMENTO ──► CONCLUIDA
   │             │
   ├──► CANCELADA◄┘
   │
   └──► REAGENDADA
```

* **Transições estritas:** Uma consulta `CONCLUIDA` não pode retroceder para `AGENDADA`. Qualquer nova consulta requer uma operação explícita de reagendamento.
* **Auditoria (Rastreabilidade):** Toda alteração de status, cancelamento ou reagendamento registra: `timestamp`, `userId` responsável e `motivo` (obrigatório em cancelamentos).

---

## 4. Requisitos Funcionais (RF)

### MUST (Essenciais para o MVP / V1)
* **RF01 - Gestão de Pacientes:** Cadastro com nome, CPF, data de nascimento, telefone/WhatsApp, e-mail, observações e histórico de consultas.
* **RF02 - Gestão de Profissionais:** Cadastro de médicos/especialistas, especialidade, tempo padrão de consulta e grade de horários de atendimento.
* **RF03 - Gestão de Consultas (Agenda):** Criação de agendamentos, verificação de conflito de horários do profissional, confirmação, reagendamento e cancelamento.
* **RF04 - Acompanhamento do Atendimento (Check-in):** Registro do momento exato em que o paciente chega à clínica (check-in), início do atendimento e encerramento.
* **RF05 - Gestão de Documentos:** Upload e vinculação de exames, atestados, guias e receitas diretamente ao paciente e/ou consulta.

### SHOULD (Importantes para a V1)
* **RF06 - Pendências e Retornos:** Controle de pacientes que necessitam agendar retorno em 15/30 dias e tarefas pendentes da recepção.
* **RF07 - Painel Operacional do Dia:** Visão cronológica das consultas de hoje com filtros rápidos por profissional, status e ações diretas na linha.

### COULD (Roadmap Futuro - V2/V3)
* **RF08 - Assistente IA Administrativa:** Classificação automática de tipo de documento anexado (exame, atestado, laudo) e resumos operacionais diários (sem decisão clínica).

---

## 5. Arquitetura de Software & Stack

### Back-end (NestJS)
Estrutura modular baseada em separação de responsabilidades e injeção de dependências:
```
apps/api/src/
├── modules/
│   ├── auth/            # JWT, estratégias Passport, Guards de permissão (Recepção, Médico, Gestor)
│   ├── patients/        # CRUD de pacientes, busca por nome/CPF/telefone
│   ├── professionals/   # Gestão de corpo clínico e horários
│   ├── appointments/    # Agendamento, conflito de horários, máquina de estados
│   ├── documents/       # Upload S3/Local, metadados de arquivos
│   ├── returns/         # Lembretes e pendências de retorno
│   └── dashboard/       # Agregações para o painel operacional do dia
├── common/              # Filters globais, interceptors, decorators, guards
└── prisma/              # Schema do banco de dados e migrations
```

### Modelo de Dados Relacional (Entidades Principais)
* **`User`**: Usuários do sistema (e-mail, senha hash, role: `RECEPCAO`, `PROFISSIONAL`, `GESTOR`).
* **`Patient`**: Dados cadastrais do paciente e contato.
* **`Professional`**: Dados do especialista, registro profissional (CRM/CRP) e vínculo com `User`.
* **`Appointment`**: Consulta vinculando `Patient` + `Professional`, com data/hora início/fim, `status` e notas operacionais.
* **`Document`**: Arquivos associados a um `Patient` e opcionalmente a um `Appointment`.
* **`ReturnReminder`**: Alertas de agendamento de retorno com prazo limite e status de contato.

---

## 6. Telas Mapeadas para o Front-end

As telas foram estruturadas para o desktop da recepção e consistem em:
1. `01 - Login` (Acesso rápido por perfil)
2. `02 - Painel do Dia` (Lista cronológica acionável + métricas topo)
3. `03 - Agenda Semanal` (Visão em grade por sala/profissional)
4. `04 - Detalhe da Consulta` (Drawer lateral rápido para não perder contexto)
5. `05 - Nova Consulta` (Formulário ágil com busca instantânea de paciente e horários livres)
6. `06 - Reagendar` / `07 - Cancelar` (Fluxos rápidos com registro de motivo)
7. `09 - Pacientes` & `10 - Ficha do Paciente` (Histórico completo e documentos)
8. `11 - Novo Paciente` (Cadastro simplificado em 1 minuto)
9. `12 - Profissionais` & `13 - Agenda do Profissional`
10. `14 - Documentos` (Repositório central com preview)
11. `15 - Pendências e Retornos` (Funil de acompanhamento pós-consulta)
12. `16 - Configurações` & `17 - Estados de Sistema` (Loading, Empty, Erro)
