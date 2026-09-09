import { Prisma, TaskStatus, TaskType } from "@prisma/client";
import { DateTime } from "luxon";
import { ClinicTime } from "../../common/utils/clinic-time.util";
import { TaskResponseDto } from "./dto/task.dto";

export const OPEN_STATUSES: TaskStatus[] = [
  TaskStatus.ABERTA,
  TaskStatus.EM_ANDAMENTO,
];

export const SUGGESTED_ACTION: Record<TaskType, string> = {
  RETORNO_A_AGENDAR: "Agendar retorno",
  CONFIRMACAO_PENDENTE: "Confirmar",
  RESGATE_NO_SHOW: "Ligar WhatsApp",
  ENVIO_DOCUMENTO: "Enviar documento",
  AGUARDANDO_EXAME: "Ver ficha",
  OUTRO: "Ver ficha",
};

export type TaskWithPatient = Prisma.TaskGetPayload<{
  include: { patient: { select: { id: true; name: true; phone: true } } };
}>;

export function toTaskResponse(
  task: TaskWithPatient,
  now: Date,
): TaskResponseDto {
  const isUrgent =
    task.dueAt !== null && task.dueAt.getTime() <= endOfToday(now);

  return {
    id: task.id,
    patientId: task.patient.id,
    patientName: task.patient.name,
    patientPhone: task.patient.phone,
    appointmentId: task.appointmentId,
    type: task.type,
    status: task.status,
    title: task.title,
    notes: task.notes,
    dueAt: task.dueAt?.toISOString() ?? null,
    dueLabel: buildDueLabel(task.dueAt, now),
    isUrgent,
    suggestedAction: SUGGESTED_ACTION[task.type],
    lastContactAt: task.lastContactAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
  };
}

export function buildDueLabel(dueAt: Date | null, now: Date): string {
  if (!dueAt) return "Sem prazo";
  if (dueAt.getTime() <= endOfToday(now)) return "Urgente (Hoje)";
  return `Até ${DateTime.fromJSDate(dueAt).setZone(ClinicTime.zone).minus({ minutes: 1 }).toFormat("dd LLL", { locale: "pt-BR" })}`;
}

export function endOfToday(now: Date): number {
  return DateTime.fromJSDate(now)
    .setZone(ClinicTime.zone)
    .endOf("day")
    .toMillis();
}
