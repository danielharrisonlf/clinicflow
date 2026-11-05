import { Injectable } from "@nestjs/common";
import { AppointmentStatus, CancelReason, Channel } from "@prisma/client";
import { uuidv7 } from "uuidv7";
import { config } from "../../../common/config";
import { ErrorCode } from "../../../common/constants/error-codes";
import { AppException } from "../../../common/exceptions/app.exception";
import type { AuthenticatedUser } from "../../../common/interfaces/authenticated-user.interface";
import { ClinicTime } from "../../../common/utils/clinic-time.util";
import { isAppointmentOverlapViolation } from "../../../common/utils/prisma-errors.util";
import { AuditService } from "../../../shared/audit/audit.service";
import { ClockService } from "../../../shared/clock/clock.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import type { AppointmentWithRelations } from "../appointment.mapper";
import { AppointmentStateMachine } from "../appointment-status.machine";
import { AvailabilityService } from "../availability.service";
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
    private readonly availability: AvailabilityService,
  ) {}

  async execute(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<AppointmentDetailDto> {
    const appointment = await this.findByIdService.getOrThrow(id);

    const lastEvent = await this.prisma.appointmentEvent.findFirst({
      where: { appointmentId: id, isCompensation: false },
      // Ordem de inserção, não `createdAt`: o id é uuidv7 (ordenado pelo
      // relógio de quem gravou e monotônico no processo), enquanto `createdAt`
      // pode vir de fora — importações e a semente gravam carimbos retroativos
      // ou futuros, e um evento "das 09:32" gravado às 02:00 passava na frente
      // da transição que o operador tinha acabado de fazer.
      orderBy: { id: "desc" },
    });

    // O evento mais recente de todos já é um "desfazer": não há o que repetir.
    // Sem isso, cada novo Z reaplicava a mesma reversão e duplicava a trilha.
    const latest = await this.prisma.appointmentEvent.findFirst({
      where: { appointmentId: id },
      orderBy: { id: "desc" },
      select: { isCompensation: true },
    });
    if (latest?.isCompensation) {
      throw AppException.unprocessable(
        "UNDO_NOT_ALLOWED",
        "A última alteração desta consulta já foi desfeita.",
      );
    }

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

    // Desfazer um reagendamento não pode só devolver a original: a consulta
    // nova criada por ele continuaria ativa e o paciente ficaria com duas.
    const successor =
      lastEvent.toStatus === AppointmentStatus.REAGENDADA
        ? await this.prisma.appointment.findFirst({
            where: { rescheduledFromId: id },
          })
        : null;
    const cancelSuccessor =
      successor !== null && successor.status !== AppointmentStatus.CANCELADA;

    if (
      cancelSuccessor &&
      !AppointmentStateMachine.can(
        successor.status,
        AppointmentStatus.CANCELADA,
      )
    ) {
      throw AppException.unprocessable(
        "UNDO_NOT_ALLOWED",
        "A consulta criada pelo reagendamento já avançou e não pode ser desfeita. Registre a correção como uma nova ação.",
        { rescheduledToId: successor.id, status: successor.status },
      );
    }

    // Cancelada ou reagendada, a consulta estava fora da trava de
    // sobreposição; voltar a um status ativo a recoloca nela. Se outra
    // consulta ocupou o horário nesse meio-tempo o banco recusaria, então a
    // recusa é explicada antes de tentar.
    const reentersOverlapGuard =
      lastEvent.toStatus === AppointmentStatus.CANCELADA ||
      lastEvent.toStatus === AppointmentStatus.REAGENDADA;
    if (reentersOverlapGuard && !appointment.isOverbooked) {
      await this.assertSlotStillFree(appointment, successor?.id ?? null);
    }

    const now = this.clock.now();

    try {
      await this.prisma.$transaction(async (tx) => {
        if (successor) {
          // A nova consulta sai primeiro: ela pode sobrepor o horário antigo
          // (reagendar 09:00 → 09:15) e a trava é checada a cada comando.
          // É cancelada com evento de compensação, não apagada: a trilha de
          // auditoria continua mostrando que ela existiu. O vínculo
          // `rescheduledFromId` é único, então é solto aqui para a original
          // poder ser reagendada de novo.
          await tx.appointment.update({
            where: { id: successor.id },
            data: {
              rescheduledFromId: null,
              ...(cancelSuccessor
                ? {
                    status: AppointmentStatus.CANCELADA,
                    cancelledAt: now,
                    cancelReason: CancelReason.OUTRO,
                    cancelNote: `Reagendamento desfeito — consulta #${appointment.code} restaurada.`,
                  }
                : {}),
            },
          });
          if (cancelSuccessor) {
            await tx.appointmentEvent.create({
              data: {
                id: uuidv7(),
                appointmentId: successor.id,
                fromStatus: successor.status,
                toStatus: AppointmentStatus.CANCELADA,
                actorId: actor.id,
                actorName: actor.name,
                channel: Channel.WEB,
                reason: `Reagendamento desfeito pelo operador — consulta #${appointment.code} restaurada`,
                isCompensation: true,
              },
            });
          }
        }

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
    } catch (error) {
      // Corrida: alguém gravou no horário entre a checagem e o UPDATE.
      if (isAppointmentOverlapViolation(error)) {
        throw slotTakenException(appointment, null);
      }
      throw error;
    }

    await this.audit.record({
      actor,
      action: "appointment.undo",
      entity: "Appointment",
      entityId: id,
      before: { status: appointment.status },
      after: {
        status: lastEvent.fromStatus,
        ...(successor ? { cancelledRescheduledToId: successor.id } : {}),
      },
    });

    return this.findByIdService.execute(id);
  }

  private async assertSlotStillFree(
    appointment: AppointmentWithRelations,
    successorId: string | null,
  ): Promise<void> {
    const overlapping = await this.availability.findOverlapping(
      appointment.professionalId,
      appointment.startsAt,
      appointment.endsAt,
      appointment.id,
    );
    // Espelha a trava do banco: a consulta nova do reagendamento é cancelada
    // na mesma transação, e encaixes ficam fora da trava.
    const blocking = overlapping.find(
      (other) => other.id !== successorId && !other.isOverbooked,
    );
    if (blocking) throw slotTakenException(appointment, blocking);
  }
}

function slotTakenException(
  appointment: AppointmentWithRelations,
  conflict: { id: string; patient: { name: string } } | null,
): AppException {
  const time = ClinicTime.timeOf(appointment.startsAt);
  const takenBy = conflict ? ` por ${conflict.patient.name}` : "";
  return AppException.conflict(
    ErrorCode.APPOINTMENT_SLOT_CONFLICT,
    `Não dá para desfazer: o horário das ${time} do(a) ${appointment.professional.name} já está ocupado${takenBy}. Agende um novo horário para o paciente.`,
    conflict
      ? { conflictWithId: conflict.id, patientName: conflict.patient.name }
      : undefined,
  );
}
