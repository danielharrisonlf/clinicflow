import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AppointmentStatus } from "@prisma/client";
import type { AuthenticatedUser } from "../../../common/interfaces/authenticated-user.interface";
import { ClockService } from "../../../shared/clock/clock.service";
import {
  AppointmentCompletedPayload,
  DomainEvent,
} from "../../../shared/events/domain-events";
import { AppointmentDetailDto } from "../dto/appointment-response.dto";
import { FindAppointmentByIdService } from "./find-appointment-by-id.service";
import { TransitionAppointmentService } from "./transition-appointment.service";

@Injectable()
export class CompleteAppointmentService {
  constructor(
    private readonly transitionService: TransitionAppointmentService,
    private readonly findByIdService: FindAppointmentByIdService,
    private readonly clock: ClockService,
    private readonly events: EventEmitter2,
  ) {}

  async execute(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<AppointmentDetailDto> {
    const result = await this.transitionService.execute({
      id,
      to: AppointmentStatus.CONCLUIDA,
      actor,
    });

    const appointment = await this.findByIdService.getOrThrow(id);

    const payload: AppointmentCompletedPayload = {
      appointmentId: id,
      patientId: appointment.patientId,
      professionalId: appointment.professionalId,
      completedAt: appointment.completedAt ?? this.clock.now(),
    };
    this.events.emit(DomainEvent.AppointmentCompleted, payload);

    return result;
  }
}
