import { AppointmentStatus } from "@prisma/client";
import { AppException } from "../../common/exceptions/app.exception";

/**
 * Máquina de estados da consulta, pura e sem I/O.
 *
 * Vive isolada porque é a única regra do sistema que não admite exceção:
 * "uma consulta CONCLUIDA não retrocede para AGENDADA". Sem I/O aqui,
 * cada transição possível é testável sem banco.
 */
const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  AGENDADA: [
    AppointmentStatus.CONFIRMADA,
    AppointmentStatus.CHECK_IN,
    AppointmentStatus.CANCELADA,
    AppointmentStatus.REAGENDADA,
  ],
  CONFIRMADA: [
    AppointmentStatus.CHECK_IN,
    AppointmentStatus.CANCELADA,
    AppointmentStatus.REAGENDADA,
  ],
  CHECK_IN: [
    AppointmentStatus.EM_ATENDIMENTO,
    AppointmentStatus.CANCELADA,
    AppointmentStatus.REAGENDADA,
  ],
  EM_ATENDIMENTO: [AppointmentStatus.CONCLUIDA],
  // Estados terminais. O caminho de volta é criar uma nova consulta, e é assim
  // que a recepção enxerga: cancelar não "desfaz", registra.
  CONCLUIDA: [],
  CANCELADA: [],
  REAGENDADA: [],
};

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  AGENDADA: "Agendada",
  CONFIRMADA: "Confirmada",
  CHECK_IN: "Aguardando",
  EM_ATENDIMENTO: "Em atendimento",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
  REAGENDADA: "Reagendada",
};

export const AppointmentStateMachine = {
  can(from: AppointmentStatus, to: AppointmentStatus): boolean {
    return TRANSITIONS[from].includes(to);
  },

  /** Lança 422 caso a transição de estado seja inválida. */
  assert(from: AppointmentStatus, to: AppointmentStatus): void {
    if (!this.can(from, to)) {
      throw AppException.unprocessable(
        "INVALID_STATUS_TRANSITION",
        `Uma consulta ${STATUS_LABEL[from].toLowerCase()} não pode ir para ${STATUS_LABEL[to].toLowerCase()}.`,
        { from, to, allowed: TRANSITIONS[from] },
      );
    }
  },

  allowedFrom(status: AppointmentStatus): AppointmentStatus[] {
    return [...TRANSITIONS[status]];
  },

  isTerminal(status: AppointmentStatus): boolean {
    return TRANSITIONS[status].length === 0;
  },

  label(status: AppointmentStatus): string {
    return STATUS_LABEL[status];
  },
};

/** Status que ainda ocupam lugar na agenda do profissional. */
export const ACTIVE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.AGENDADA,
  AppointmentStatus.CONFIRMADA,
  AppointmentStatus.CHECK_IN,
  AppointmentStatus.EM_ATENDIMENTO,
  AppointmentStatus.CONCLUIDA,
];
