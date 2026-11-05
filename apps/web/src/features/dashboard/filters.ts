import type { AppointmentStatus, ListAppointmentsQuery } from "@/lib/api/types";

export type Filter =
  | "abertas"
  | "confirmar"
  | "atrasadas"
  | "concluidas"
  | "todas";

/** Estados que ainda pedem algo da recepção. É o filtro padrão do turno. */
export const OPEN_STATUSES: AppointmentStatus[] = [
  "AGENDADA",
  "CONFIRMADA",
  "CHECK_IN",
  "EM_ATENDIMENTO",
];

export const PAGE_SIZE = 50;

/**
 * Filtro da URL → consulta da API. A Prevenção de faltas usa a mesma consulta
 * de "a confirmar" (página 1): com o filtro aplicado, as duas dividem o cache.
 */
export function queryFor(
  filter: Filter,
  date: string,
  page: number,
): ListAppointmentsQuery {
  const base = { date, page, limit: PAGE_SIZE, direction: "asc" as const };
  if (filter === "abertas") return { ...base, status: OPEN_STATUSES };
  if (filter === "confirmar") return { ...base, status: ["AGENDADA"] };
  if (filter === "concluidas") return { ...base, status: ["CONCLUIDA"] };
  if (filter === "atrasadas") return { ...base, derivedState: "ATRASADA" };
  return base;
}
