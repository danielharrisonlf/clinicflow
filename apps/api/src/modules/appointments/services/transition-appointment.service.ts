import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Appointment, AppointmentStatus, Channel } from "@prisma/client";
import { uuidv7 } from "uuidv7";
import type { AuthenticatedUser } from "../../../common/interfaces/authenticated-user.interface";
import { ClockService } from "../../../shared/clock/clock.service";
import {
  AppointmentStatusChangedPayload,
  DomainEvent,
} from "../../../shared/events/domain-events";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { AppointmentStateMachine } from "../appointment-status.machine";
import { AppointmentDetailDto } from "../dto/appointment-response.dto";
import { FindAppointmentByIdService } from "./find-appointment-by-id.service";

export const TIMESTAMP_FIELD: Partial<
  Record<AppointmentStatus, keyof Appointment>
> = {
  CONFIRMADA: "confirmedAt",
  CHECK_IN: "checkedInAt",
  EM_ATENDIMENTO: "startedAt",
  CONCLUIDA: "completedAt",
  CANCELADA: "cancelledAt",
};

@Injectable()
export class TransitionAppointmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly events: EventEmitter2,
    private readonly findByIdService: FindAppointmentByIdService,
  ) {}

  async execute(params: {
    id: string;
    to: AppointmentStatus;
    actor: AuthenticatedUser;
    channel?: Channel;
    reason?: string;
  }): Promise<AppointmentDetailDto> {
    const appointment = await this.findByIdService.getOrThrow(params.id);
    AppointmentStateMachine.assert(appointment.status, params.to);

    const now = this.clock.now();
    const timestampField = TIMESTAMP_FIELD[params.to];

    await this.prisma.$transaction(async (tx) => {
      await tx.appointment.update({
        where: { id: params.id },
        data: {
          status: params.to,
          ...(timestampField ? { [timestampField]: now } : {}),
        },
      });
      await tx.appointmentEvent.create({
        data: {
          id: uuidv7(),
          appointmentId: params.id,
          fromStatus: appointment.status,
          toStatus: params.to,
          actorId: params.actor.id,
          actorName: params.actor.name,
          channel: params.channel ?? Channel.WEB,
          reason: params.reason ?? null,
        },
      });
    });

    const payload: AppointmentStatusChangedPayload = {
      appointmentId: params.id,
      patientId: appointment.patientId,
      professionalId: appointment.professionalId,
      fromStatus: appointment.status,
      toStatus: params.to,
      occurredAt: now,
    };
    this.events.emit(DomainEvent.AppointmentStatusChanged, payload);
    if (params.to === AppointmentStatus.CHECK_IN) {
      this.events.emit(DomainEvent.AppointmentCheckedIn, payload);
    }

    return this.findByIdService.execute(params.id);
  }
}
