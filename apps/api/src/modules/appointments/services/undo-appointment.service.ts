import { Injectable } from "@nestjs/common";
import { AppointmentStatus, Channel } from "@prisma/client";
import { uuidv7 } from "uuidv7";
import { config } from "../../../common/config";
import { AppException } from "../../../common/exceptions/app.exception";
import type { AuthenticatedUser } from "../../../common/interfaces/authenticated-user.interface";
import { AuditService } from "../../../shared/audit/audit.service";
import { ClockService } from "../../../shared/clock/clock.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { AppointmentDetailDto } from "../dto/appointment-response.dto";
import { FindAppointmentByIdService } from "./find-appointment-by-id.service";
import { TIMESTAMP_FIELD } from "./transition-appointment.service";

@Injectable()
export class UndoAppointmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly audit: AuditService,
    private readonly findByIdService: FindAppointmentByIdService,
  ) {}

  async execute(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<AppointmentDetailDto> {
    const appointment = await this.findByIdService.getOrThrow(id);

    const lastEvent = await this.prisma.appointmentEvent.findFirst({
      where: { appointmentId: id, isCompensation: false },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    if (!lastEvent || lastEvent.fromStatus === null) {
      throw AppException.unprocessable(
        "UNDO_NOT_ALLOWED",
        "Não há alteração recente para desfazer nesta consulta.",
      );
    }

    if (lastEvent.actorId !== actor.id) {
      throw AppException.unprocessable(
        "UNDO_NOT_ALLOWED",
        "Só quem fez a alteração pode desfazê-la.",
      );
    }

    const elapsedSeconds =
      (this.clock.nowMs() - lastEvent.createdAt.getTime()) / 1000;
    if (elapsedSeconds > config.undoWindowSeconds) {
      throw AppException.unprocessable(
        "UNDO_WINDOW_EXPIRED",
        `A janela de ${config.undoWindowSeconds}s para desfazer já passou. Registre a correção como uma nova ação.`,
      );
    }

    const clearedField = TIMESTAMP_FIELD[lastEvent.toStatus];

    await this.prisma.$transaction(async (tx) => {
      await tx.appointment.update({
        where: { id },
        data: {
          status: lastEvent.fromStatus as AppointmentStatus,
          ...(clearedField ? { [clearedField]: null } : {}),
          ...(lastEvent.toStatus === AppointmentStatus.CANCELADA
            ? { cancelReason: null, cancelNote: null }
            : {}),
        },
      });
      await tx.appointmentEvent.create({
        data: {
          id: uuidv7(),
          appointmentId: id,
          fromStatus: lastEvent.toStatus,
          toStatus: lastEvent.fromStatus as AppointmentStatus,
          actorId: actor.id,
          actorName: actor.name,
          channel: Channel.WEB,
          reason: "Desfeito pelo operador",
          isCompensation: true,
        },
      });
    });

    await this.audit.record({
      actor,
      action: "appointment.undo",
      entity: "Appointment",
      entityId: id,
      before: { status: appointment.status },
      after: { status: lastEvent.fromStatus },
    });

    return this.findByIdService.execute(id);
  }
}
