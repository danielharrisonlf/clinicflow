import type { NotificationItem, NotificationStatus } from "@/lib/api/types";

/**
 * Risco de falta derivado no front (DESIGN.md §Prevenção de faltas). O backend
 * não manda esse campo: ele sai do último envio de WhatsApp da consulta mais o
 * relógio.
 */
export type NoShowRisk = "CONFIRMADA" | "SEM_RESPOSTA" | "CRITICO";

/**
 * A partir daqui, ficar sem resposta deixa de ser espera e vira risco. Curta o
 * bastante para "sem resposta" existir nas consultas do próprio dia, e longa o
 * bastante para a recepção ainda ligar e reencaixar a vaga.
 */
export const CRITICAL_WINDOW_HOURS = 3;

const HOUR = 3_600_000;

/**
 * - `RESPONDIDA` → confirmada pelo paciente;
 * - `ENVIADA`/`SIMULADA` sem resposta → sem resposta, ou crítico se faltar
 *   menos de 3h para a consulta (inclui a que já passou do horário);
 * - `PENDENTE`, `FALHOU` ou nenhum envio → crítico: a mensagem não chegou.
 */
export function noShowRisk({
  startsAt,
  lastStatus,
  now = Date.now(),
}: {
  startsAt: string;
  lastStatus: NotificationStatus | null | undefined;
  now?: number;
}): NoShowRisk {
  if (lastStatus === "RESPONDIDA") return "CONFIRMADA";
  if (lastStatus === "ENVIADA" || lastStatus === "SIMULADA") {
    const hoursLeft = (Date.parse(startsAt) - now) / HOUR;
    return hoursLeft < CRITICAL_WINDOW_HOURS ? "CRITICO" : "SEM_RESPOSTA";
  }
  return "CRITICO";
}

export const RISK_META: Record<
  NoShowRisk,
  { label: string; ink: string; pulse: boolean; order: number }
> = {
  CRITICO: { label: "Crítico", ink: "text-danger", pulse: true, order: 0 },
  SEM_RESPOSTA: {
    label: "Sem resposta",
    ink: "text-warning",
    pulse: false,
    order: 1,
  },
  CONFIRMADA: {
    label: "Confirmada pelo paciente",
    ink: "text-revenue",
    pulse: false,
    order: 2,
  },
};

/**
 * Último envio de cada consulta, a partir de uma única página do histórico.
 * Compara `createdAt` em vez de confiar na ordem da resposta.
 */
export function latestByAppointment(
  items: NotificationItem[],
): Map<string, NotificationItem> {
  const latest = new Map<string, NotificationItem>();
  for (const item of items) {
    if (!item.appointmentId) continue;
    const current = latest.get(item.appointmentId);
    if (!current || Date.parse(item.createdAt) > Date.parse(current.createdAt))
      latest.set(item.appointmentId, item);
  }
  return latest;
}
