import { Injectable, Logger } from "@nestjs/common";
import { AppointmentStatus, Channel } from "@prisma/client";
import { uuidv7 } from "uuidv7";
import { ErrorCode } from "../../../common/constants/error-codes";
import { AppException } from "../../../common/exceptions/app.exception";
import type { AuthenticatedUser } from "../../../common/interfaces/authenticated-user.interface";
import { ClinicTime } from "../../../common/utils/clinic-time.util";
import { AuditService } from "../../../shared/audit/audit.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { AppointmentStateMachine } from "../appointment-status.machine";
import { AvailabilityService } from "../availability.service";
import { AppointmentDetailDto } from "../dto/appointment-response.dto";
import { RescheduleAppointmentRequest } from "../requests/reschedule-appointment.request";
import { FindAppointmentByIdService } from "./find-appointment-by-id.service";

@Injectable()
export class RescheduleAppointmentService {
  private readonly logger = new Logger(RescheduleAppointmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly audit: AuditService,
    private readonly findByIdService: FindAppointmentByIdService,
  ) {}

  async execute(
    id: string,
    dto: RescheduleAppointmentRequest,
    actor: AuthenticatedUser,
  ): Promise<AppointmentDetailDto> {
    const original = await this.findByIdService.getOrThrow(id);
    AppointmentStateMachine.assert(
      original.status,
      AppointmentStatus.REAGENDADA,
    );

    const professional = await this.availability.getProfessionalOrThrow(
      original.professionalId,
    );
    const durationMinutes = await this.availability.resolveDuration(
      professional,
      dto.durationMinutes ??
        ClinicTime.minutesBetween(original.startsAt, original.endsAt),
    );
    const startsAt = ClinicTime.combine(dto.date, dto.time);
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

    await this.assertSlotIsFree({
      professionalId: original.professionalId,
      professionalName: professional.name,
      startsAt,
      endsAt,
      time: dto.time,
      allowOverbooking: dto.allowOverbooking ?? false,
      ignoreAppointmentId: id,
    });

    const newId = uuidv7();

    await this.prisma.$transaction(async (tx) => {
      await tx.appointment.update({
        where: { id },
        data: { status: AppointmentStatus.REAGENDADA },
      });
      await tx.appointmentEvent.create({
        data: {
          id: uuidv7(),
          appointmentId: id,
          fromStatus: original.status,
          toStatus: AppointmentStatus.REAGENDADA,
          actorId: actor.id,
          actorName: actor.name,
          channel: Channel.WEB,
          reason: dto.reason,
        },
      });

      await tx.appointment.create({
        data: {
          id: newId,
          patientId: original.patientId,
          professionalId: original.professionalId,
          startsAt,
          endsAt,
          type: original.type,
          status: AppointmentStatus.AGENDADA,
          room: original.room,
          notes: original.notes,
          rescheduledFromId: id,
          createdById: actor.id,
        },
      });
      await tx.appointmentEvent.create({
        data: {
          id: uuidv7(),
          appointmentId: newId,
          fromStatus: null,
          toStatus: AppointmentStatus.AGENDADA,
          actorId: actor.id,
          actorName: actor.name,
          channel: Channel.WEB,
          reason: `Reagendada de ${ClinicTime.isoDateOf(original.startsAt)} ${ClinicTime.timeOf(original.startsAt)} — ${dto.reason}`,
        },
      });
    });

    await this.audit.record({
      actor,
      action: "appointment.rescheduled",
      entity: "Appointment",
      entityId: id,
      before: { startsAt: original.startsAt.toISOString() },
      after: {
        newAppointmentId: newId,
        startsAt: startsAt.toISOString(),
        reason: dto.reason,
      },
    });

    this.logger.log(
      `Consulta ${original.code} reagendada para ${dto.date} ${dto.time}.`,
    );

    return this.findByIdService.execute(newId);
  }

  private async assertSlotIsFree(params: {
    professionalId: string;
    professionalName: string;
    startsAt: Date;
    endsAt: Date;
    time: string;
    allowOverbooking: boolean;
    ignoreAppointmentId?: string;
  }): Promise<void> {
    const overlapping = await this.availability.findOverlapping(
      params.professionalId,
      params.startsAt,
      params.endsAt,
      params.ignoreAppointmentId,
    );

    if (overlapping.length > 0 && !params.allowOverbooking) {
      throw AppException.conflict(
        ErrorCode.APPOINTMENT_SLOT_CONFLICT,
        `O horário das ${params.time} do(a) ${params.professionalName} já está ocupado.`,
        {
          conflictWithId: overlapping[0]?.id,
          patientName: overlapping[0]?.patient.name,
        },
      );
    }
  }
}
