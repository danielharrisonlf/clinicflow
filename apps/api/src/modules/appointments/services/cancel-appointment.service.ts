import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AppointmentStatus, CancelReason, Channel } from "@prisma/client";
import { uuidv7 } from "uuidv7";
import type { AuthenticatedUser } from "../../../common/interfaces/authenticated-user.interface";
import { ClockService } from "../../../shared/clock/clock.service";
import {
  AppointmentCancelledPayload,
  DomainEvent,
} from "../../../shared/events/domain-events";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { AppointmentStateMachine } from "../appointment-status.machine";
import { AppointmentDetailDto } from "../dto/appointment-response.dto";
import { CancelAppointmentRequest } from "../requests/cancel-appointment.request";
import { FindAppointmentByIdService } from "./find-appointment-by-id.service";

const CANCEL_REASON_LABELS: Record<CancelReason, string> = {
  [CancelReason.PACIENTE_DESMARCOU]: "Paciente desmarcou",
  [CancelReason.NO_SHOW]: "Não compareceu (no-show)",
  [CancelReason.INDISPONIBILIDADE_CLINICA]: "Indisponibilidade da clínica",
  [CancelReason.OUTRO]: "Outro motivo",
};

@Injectable()
export class CancelAppointmentService {
  private readonly logger = new Logger(CancelAppointmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly events: EventEmitter2,
    private readonly findByIdService: FindAppointmentByIdService,
  ) {}

  async execute(
    id: string,
    dto: CancelAppointmentRequest,
    actor: AuthenticatedUser,
  ): Promise<AppointmentDetailDto> {
    const appointment = await this.findByIdService.getOrThrow(id);
    AppointmentStateMachine.assert(
      appointment.status,
      AppointmentStatus.CANCELADA,
    );

    const reasonCode = dto.reasonCode ?? dto.reason ?? CancelReason.OUTRO;
    const note = dto.note ?? dto.notes;
    const label = CANCEL_REASON_LABELS[reasonCode] ?? reasonCode;
    const eventReason = note ? `${label} — ${note}` : label;

    const now = this.clock.now();
    await this.prisma.$transaction(async (tx) => {
      await tx.appointment.update({
        where: { id },
        data: {
          status: AppointmentStatus.CANCELADA,
          cancelledAt: now,
          cancelReason: reasonCode,
          cancelNote: note ?? null,
        },
      });
      await tx.appointmentEvent.create({
        data: {
          id: uuidv7(),
          appointmentId: id,
          fromStatus: appointment.status,
          toStatus: AppointmentStatus.CANCELADA,
          actorId: actor.id,
          actorName: actor.name,
          channel: Channel.WEB,
          reason: eventReason,
        },
      });
    });

    const payload: AppointmentCancelledPayload = {
      appointmentId: id,
      patientId: appointment.patientId,
      reasonCode,
    };
    this.events.emit(DomainEvent.AppointmentCancelled, payload);

    this.logger.log(
      `Consulta ${appointment.code} cancelada por ${actor.name}: ${eventReason}`,
    );

    return this.findByIdService.execute(id);
  }
}
