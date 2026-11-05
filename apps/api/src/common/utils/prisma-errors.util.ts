import { Prisma } from "@prisma/client";

/** Nome da trava de sobreposição criada nas migrações de `appointments`. */
export const APPOINTMENT_OVERLAP_CONSTRAINT = "appointments_no_overlap";

/** SQLSTATE do Postgres para `exclusion_violation`. */
const EXCLUSION_VIOLATION = "23P01";

/**
 * A escrita bateu na trava `appointments_no_overlap`?
 *
 * O Prisma não tem código próprio para violação de EXCLUDE: numa query do
 * client (6.x) ela sobe como `PrismaClientUnknownRequestError` com o SQLSTATE
 * e o nome da constraint só na mensagem; numa query crua sobe como
 * `PrismaClientKnownRequestError` P2010 com `meta.code = "23P01"`. As duas
 * formas são reconhecidas para não depender da versão do engine.
 */
export function isAppointmentOverlapViolation(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const meta = (error.meta ?? {}) as Record<string, unknown>;
    if (meta.code === EXCLUSION_VIOLATION) {
      return mentionsConstraint(error.message, meta);
    }
    return false;
  }
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return (
      error.message.includes(EXCLUSION_VIOLATION) &&
      error.message.includes(APPOINTMENT_OVERLAP_CONSTRAINT)
    );
  }
  return false;
}

function mentionsConstraint(
  message: string,
  meta: Record<string, unknown>,
): boolean {
  const haystack = `${message} ${typeof meta.message === "string" ? meta.message : ""}`;
  return haystack.includes(APPOINTMENT_OVERLAP_CONSTRAINT);
}
