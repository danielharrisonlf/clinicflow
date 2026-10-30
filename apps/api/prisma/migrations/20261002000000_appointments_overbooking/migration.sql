-- Encaixe (tela 05): a recepção pode marcar uma consulta por cima de outra.
--
-- A trava `appointments_no_overlap` da migração 20260907000100 foi criada
-- DEFERRABLE achando que isso abriria espaço para o encaixe, mas adiar a
-- checagem só a empurra para o COMMIT: a sobreposição continua sendo
-- rejeitada e o encaixe nunca gravava. O encaixe passa a ser um fato
-- explícito na linha (`is_overbooked`), e a trava ignora essas linhas.
--
-- Zero-downtime:
--   * ADD COLUMN com DEFAULT constante é só metadado no Postgres 11+, sem
--     reescrever a tabela; as linhas antigas ficam `false`, que é a verdade.
--   * Constraint de exclusão não aceita NOT VALID nem USING INDEX, então ela
--     é recriada na mesma transação (a tabela nunca fica sem trava). O índice
--     gist é reconstruído sob ACCESS EXCLUSIVE; no volume de uma clínica isso
--     leva milissegundos, e o lock_timeout evita enfileirar atrás de uma
--     transação longa e travar a agenda — se estourar, a migração falha
--     inteira e pode ser repetida.
BEGIN;

SET LOCAL lock_timeout = '5s';

ALTER TABLE "appointments"
  ADD COLUMN IF NOT EXISTS "is_overbooked" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS appointments_no_overlap;

ALTER TABLE "appointments"
  ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (
    professional_id WITH =,
    tsrange(starts_at, ends_at, '[)') WITH &&
  )
  WHERE (status NOT IN ('CANCELADA', 'REAGENDADA') AND NOT is_overbooked)
  DEFERRABLE INITIALLY IMMEDIATE;

COMMIT;
