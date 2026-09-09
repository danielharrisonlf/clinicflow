import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AppointmentStatus, Channel } from "@prisma/client";
import { uuidv7 } from "uuidv7";
import { ErrorCode } from "../../../common/constants/error-codes";
import { AppException } from "../../../common/exceptions/app.exception";
import type { AuthenticatedUser } from "../../../common/interfaces/authenticated-user.interface";
import { ClinicTime } from "../../../common/utils/clinic-time.util";
import { AuditService } from "../../../shared/audit/audit.service";
import { DomainEvent } from "../../../shared/events/domain-events";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { AvailabilityService } from "../availability.service";
import { AppointmentDetailDto } from "../dto/appointment-response.dto";
import { CreateAppointmentRequest } from "../requests/create-appointment.request";
import { FindAppointmentByIdService } from "./find-appointment-by-id.service";

@Injectable()
export class CreateAppointmentService {
  private readonly logger = new Logger(CreateAppointmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly audit: AuditService,
    private readonly events: EventEmitter2,
    private readonly findByIdService: FindAppointmentByIdService,
  ) {}

  async execute(
    dto: CreateAppointmentRequest,
    actor: AuthenticatedUser,
  ): Promise<AppointmentDetailDto> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, deletedAt: null },
    });
    if (!patient) throw AppException.notFound("Paciente", dto.patientId);

    const professional = await this.availability.getProfessionalOrThrow(
      dto.professionalId,
    );
    const durationMinutes = await this.availability.resolveDuration(
      professional,
      dto.durationMinutes,
    );
    const startsAt = ClinicTime.combine(dto.date, dto.time);
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

    await this.assertSlotIsFree({
      professionalId: dto.professionalId,
      professionalName: professional.name,
      startsAt,
      endsAt,
      time: dto.time,
      durationMinutes,
      allowOverbooking: dto.allowOverbooking ?? false,
    });

    const id = uuidv7();
    await this.prisma.$transaction(async (tx) => {
      await tx.appointment.create({
        data: {
          id,
          patientId: dto.patientId,
          professionalId: dto.professionalId,
          startsAt,
          endsAt,
          type: dto.type,
          status: AppointmentStatus.AGENDADA,
          room: dto.room ?? null,
          notes: dto.notes ?? null,
          createdById: actor.id,
        },
      });

      await tx.appointmentEvent.create({
        data: {
          id: uuidv7(),
          appointmentId: id,
          fromStatus: null,
          toStatus: AppointmentStatus.AGENDADA,
          actorId: actor.id,
          actorName: actor.name,
          channel: Channel.WEB,
          reason: dto.allowOverbooking
            ? "Encaixe autorizado pela recepção"
            : null,
        },
      });
    });

    await this.audit.record({
      actor,
      action: "appointment.created",
      entity: "Appointment",
      entityId: id,
      after: {
        patientId: dto.patientId,
        professionalId: dto.professionalId,
        startsAt: startsAt.toISOString(),
        overbooked: dto.allowOverbooking ?? false,
      },
    });

    this.events.emit(DomainEvent.AppointmentCreated, { appointmentId: id });
    this.logger.log(`Consulta ${id} criada por ${actor.name}`);
    return this.findByIdService.execute(id);
  }

  private async assertSlotIsFree(params: {
    professionalId: string;
    professionalName: string;
    startsAt: Date;
    endsAt: Date;
    time: string;
    durationMinutes: number;
    allowOverbooking: boolean;
  }): Promise<void> {
    const isWithin = await this.availability.isWithinSchedule(
      params.professionalId,
      params.startsAt,
      params.endsAt,
    );
    if (!isWithin) {
      throw AppException.badRequest(
        ErrorCode.PROFESSIONAL_OUTSIDE_SCHEDULE,
        `O horário das ${params.time} está fora do expediente configurado do profissional.`,
      );
    }

    const overlapping = await this.availability.findOverlapping(
      params.professionalId,
      params.startsAt,
      params.endsAt,
    );

    if (overlapping.length > 0 && !params.allowOverbooking) {
      throw AppException.conflict(
        ErrorCode.APPOINTMENT_SLOT_CONFLICT,
        `O horário das ${params.time} do(a) ${params.professionalName} já está ocupado.`,
        {
          conflictWithId: overlapping[0]?.id,
          patientName: overlapping[0]?.patient.name,
          durationMinutes: params.durationMinutes,
        },
      );
    }
  }
}
