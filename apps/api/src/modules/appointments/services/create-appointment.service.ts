import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AppointmentStatus, Channel } from "@prisma/client";
import { uuidv7 } from "uuidv7";
import { ErrorCode } from "../../../common/constants/error-codes";
import { AppException } from "../../../common/exceptions/app.exception";
import type { AuthenticatedUser } from "../../../common/interfaces/authenticated-user.interface";
import { ClinicTime } from "../../../common/utils/clinic-time.util";
import { isAppointmentOverlapViolation } from "../../../common/utils/prisma-errors.util";
import { AuditService } from "../../../shared/audit/audit.service";
import { DomainEvent } from "../../../shared/events/domain-events";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { OVERBOOKING_REASON } from "../appointment-overbooking";
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

    const slot = {
      professionalId: dto.professionalId,
      professionalName: professional.name,
      startsAt,
      endsAt,
      time: dto.time,
      durationMinutes,
    };
    const allowOverbooking = dto.allowOverbooking ?? false;
    const conflict = await this.assertSlotIsFree({ ...slot, allowOverbooking });

    // Só é encaixe quando de fato sobrepõe: marcar toda consulta que veio com
    // a flag tiraria da trava do banco horários que estavam livres, e uma
    // corrida posterior pelo mesmo horário passaria sem 409.
    let isOverbooked = allowOverbooking && conflict !== null;
    const id = uuidv7();

    try {
      await this.persist(id, dto, actor, startsAt, endsAt, isOverbooked);
    } catch (error) {
      if (!isAppointmentOverlapViolation(error)) throw error;
      // Outra recepcionista gravou o horário entre a checagem e o INSERT.
      if (!allowOverbooking || isOverbooked) {
        throw slotConflictException(slot, null);
      }
      // A recepção já tinha aceitado encaixar: grava como encaixe.
      isOverbooked = true;
      await this.persist(id, dto, actor, startsAt, endsAt, isOverbooked);
    }

    await this.audit.record({
      actor,
      action: "appointment.created",
      entity: "Appointment",
      entityId: id,
      after: {
        patientId: dto.patientId,
        professionalId: dto.professionalId,
        startsAt: startsAt.toISOString(),
        overbooked: isOverbooked,
      },
    });

    this.events.emit(DomainEvent.AppointmentCreated, { appointmentId: id });
    this.logger.log(`Consulta ${id} criada por ${actor.name}`);
    return this.findByIdService.execute(id);
  }

  private async persist(
    id: string,
    dto: CreateAppointmentRequest,
    actor: AuthenticatedUser,
    startsAt: Date,
    endsAt: Date,
    isOverbooked: boolean,
  ): Promise<void> {
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
          isOverbooked,
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
          reason: isOverbooked ? OVERBOOKING_REASON : null,
        },
      });
    });
  }

  /** Devolve a primeira consulta sobreposta (ou null) quando o encaixe é permitido. */
  private async assertSlotIsFree(
    params: SlotParams & { allowOverbooking: boolean },
  ) {
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
    const first = overlapping[0] ?? null;

    if (first && !params.allowOverbooking) {
      throw slotConflictException(params, first);
    }
    return first;
  }
}

interface SlotParams {
  professionalId: string;
  professionalName: string;
  startsAt: Date;
  endsAt: Date;
  time: string;
  durationMinutes: number;
}

function slotConflictException(
  params: SlotParams,
  conflict: { id: string; patient: { name: string } } | null,
): AppException {
  return AppException.conflict(
    ErrorCode.APPOINTMENT_SLOT_CONFLICT,
    `O horário das ${params.time} do(a) ${params.professionalName} já está ocupado.`,
    {
      ...(conflict
        ? { conflictWithId: conflict.id, patientName: conflict.patient.name }
        : {}),
      durationMinutes: params.durationMinutes,
    },
  );
}
