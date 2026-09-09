import { AppointmentEvent, AppointmentStatus, Prisma } from "@prisma/client";
import { ClinicTime } from "../../common/utils/clinic-time.util";
import { AppointmentStateMachine } from "./appointment-status.machine";
import {
  AppointmentEventDto,
  AppointmentListItemDto,
  DerivedState,
} from "./dto/appointment-response.dto";

export type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: {
    patient: { select: { id: true; name: true; phone: true } };
    professional: { select: { id: true; name: true } };
  };
}>;

/**
 * Converte a consulta do banco na linha que o painel do dia desenha.
 *
 * O cálculo de espera e atraso mora aqui, no servidor, e não no cliente: o
 * balcão e o painel de TV precisam mostrar o mesmo "27min", e dois relógios
 * de máquinas diferentes não concordam.
 */
export function toAppointmentListItem(
  appointment: AppointmentWithRelations,
  now: Date,
  lateToleranceMinutes: number,
): AppointmentListItemDto {
  const durationMinutes = ClinicTime.minutesBetween(
    appointment.startsAt,
    appointment.endsAt,
  );

  const waitingMinutes =
    appointment.status === AppointmentStatus.CHECK_IN && appointment.checkedInAt
      ? ClinicTime.minutesBetween(appointment.checkedInAt, now)
      : null;

  // ATRASADA é quem ainda não chegou e o horário ultrapassou a tolerância.
  // Pacientes com check-in realizado permanecem como "aguardando".
  const isLate =
    (appointment.status === AppointmentStatus.AGENDADA ||
      appointment.status === AppointmentStatus.CONFIRMADA) &&
    now.getTime() >
      appointment.startsAt.getTime() + lateToleranceMinutes * 60_000;

  const lateMinutes = isLate
    ? ClinicTime.minutesBetween(appointment.startsAt, now)
    : null;

  const derivedState: DerivedState = isLate ? "ATRASADA" : appointment.status;

  return {
    id: appointment.id,
    code: appointment.code,
    startsAt: appointment.startsAt.toISOString(),
    endsAt: appointment.endsAt.toISOString(),
    time: ClinicTime.timeOf(appointment.startsAt),
    durationMinutes,
    type: appointment.type,
    status: appointment.status,
    derivedState,
    stateLabel: buildStateLabel(derivedState, waitingMinutes, lateMinutes),
    waitingMinutes,
    lateMinutes,
    patientId: appointment.patient.id,
    patientName: appointment.patient.name,
    patientPhone: appointment.patient.phone,
    professionalId: appointment.professional.id,
    professionalName: appointment.professional.name,
    room: appointment.room,
    notes: appointment.notes,
    allowedTransitions: AppointmentStateMachine.allowedFrom(appointment.status),
  };
}

/** "Atrasada 27min", "Aguardando 18min", "Confirmada" — o texto exato do selo. */
function buildStateLabel(
  state: DerivedState,
  waitingMinutes: number | null,
  lateMinutes: number | null,
): string {
  if (state === "ATRASADA") return `Atrasada ${lateMinutes ?? 0}min`;
  if (state === AppointmentStatus.CHECK_IN)
    return `Aguardando ${waitingMinutes ?? 0}min`;
  return AppointmentStateMachine.label(state);
}

const EVENT_TITLE: Record<AppointmentStatus, string> = {
  AGENDADA: "Consulta agendada",
  CONFIRMADA: "Confirmação recebida",
  CHECK_IN: "Check-in registrado",
  EM_ATENDIMENTO: "Atendimento iniciado",
  CONCLUIDA: "Atendimento concluído",
  CANCELADA: "Consulta cancelada",
  REAGENDADA: "Consulta reagendada",
};

export function toAppointmentEvent(
  event: AppointmentEvent,
): AppointmentEventDto {
  return {
    id: event.id,
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
    title: event.isCompensation
      ? `${EVENT_TITLE[event.toStatus]} (desfeito)`
      : EVENT_TITLE[event.toStatus],
    actorName: event.actorName,
    channel: event.channel,
    reason: event.reason,
    createdAt: event.createdAt.toISOString(),
  };
}

export const APPOINTMENT_INCLUDE = {
  patient: { select: { id: true, name: true, phone: true } },
  professional: { select: { id: true, name: true } },
} satisfies Prisma.AppointmentInclude;
