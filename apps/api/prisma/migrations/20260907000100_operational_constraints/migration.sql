-- Extensões usadas pela busca (⌘K, tela 18) e pela trava de sobreposição.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Busca por nome de paciente com ILIKE '%...%' sem varredura completa.
CREATE INDEX IF NOT EXISTS idx_patient_name_trgm
  ON "patients" USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_professional_name_trgm
  ON "professionals" USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_document_file_name_trgm
  ON "documents" USING gin (file_name gin_trgm_ops);

-- Índice parcial da sala de espera: a fila real tem dezenas de linhas,
-- não faz sentido indexar as milhares de consultas já concluídas.
CREATE INDEX IF NOT EXISTS idx_appointment_waiting
  ON "appointments" (checked_in_at)
  WHERE status = 'CHECK_IN';

CREATE INDEX IF NOT EXISTS idx_task_open
  ON "tasks" (due_at)
  WHERE status IN ('ABERTA', 'EM_ANDAMENTO');

-- Trava de sobreposição de agenda no próprio banco. A validação de aplicação
-- não basta: duas recepcionistas podem confirmar o mesmo horário no mesmo
-- instante. DEFERRABLE para permitir o encaixe explícito da tela 05, que
-- adia a checagem dentro da transação e grava o motivo na auditoria.
ALTER TABLE "appointments"
  ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (
    professional_id WITH =,
    tsrange(starts_at, ends_at, '[)') WITH &&
  )
  WHERE (status NOT IN ('CANCELADA', 'REAGENDADA'))
  DEFERRABLE INITIALLY IMMEDIATE;
