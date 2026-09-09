import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { CancelReason, TaskType } from "@prisma/client";
import { DateTime } from "luxon";
import { ClinicTime } from "../../common/utils/clinic-time.util";
import type {
  AppointmentCancelledPayload,
  AppointmentCompletedPayload,
} from "../../shared/events/domain-events";
import { DomainEvent } from "../../shared/events/domain-events";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { SettingsService } from "../settings/settings.service";
import { TasksService } from "./tasks.service";

/**
 * Pendências nascem de eventos, não de digitação.
 *
 * É o que fecha o ciclo do produto (atendimento → pendência → retorno): tarefas de retorno
 * e cancelamento são criadas automaticamente pelo sistema.
 */
@Injectable()
export class TasksListener {
  private readonly logger = new Logger(TasksListener.name);

  constructor(
    private readonly tasks: TasksService,
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  @OnEvent(DomainEvent.AppointmentCompleted)
  async onAppointmentCompleted(
    payload: AppointmentCompletedPayload,
  ): Promise<void> {
    const settings = await this.settings.get();
    const dueAt = DateTime.fromJSDate(payload.completedAt)
      .setZone(ClinicTime.zone)
      .plus({ days: settings.returnWindowDays })
      .endOf("day")
      .toUTC()
      .toJSDate();

    await this.tasks.createSystemTask({
      patientId: payload.patientId,
      appointmentId: payload.appointmentId,
      type: TaskType.RETORNO_A_AGENDAR,
      title: `Retorno em até ${settings.returnWindowDays} dias após a consulta`,
      dueAt,
    });

    this.logger.log(
      `Pendência de retorno criada para o paciente ${payload.patientId}.`,
    );
  }

  @OnEvent(DomainEvent.AppointmentCancelled)
  async onAppointmentCancelled(
    payload: AppointmentCancelledPayload,
  ): Promise<void> {
    // Só no-show vira resgate. Um cancelamento avisado com antecedência é
    // operação normal e não deve poluir o funil.
    if (payload.reasonCode !== CancelReason.NO_SHOW) return;

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: payload.appointmentId },
      include: { professional: { select: { name: true } } },
    });
    if (!appointment) return;

    await this.tasks.createSystemTask({
      patientId: payload.patientId,
      appointmentId: payload.appointmentId,
      type: TaskType.RESGATE_NO_SHOW,
      title: `Não compareceu em ${ClinicTime.isoDateOf(appointment.startsAt)} — reagendar`,
      dueAt: DateTime.now()
        .setZone(ClinicTime.zone)
        .plus({ days: 3 })
        .endOf("day")
        .toUTC()
        .toJSDate(),
    });
  }
}
