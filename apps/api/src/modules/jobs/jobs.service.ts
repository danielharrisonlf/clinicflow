import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { AppointmentStatus, TaskType } from "@prisma/client";
import { DateTime } from "luxon";
import { config } from "../../common/config";
import { ClinicTime } from "../../common/utils/clinic-time.util";
import { ClockService } from "../../shared/clock/clock.service";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { StorageService } from "../../shared/storage/storage.service";
import { NotificationsService } from "../notifications/notifications.service";
import { SettingsService } from "../settings/settings.service";
import { TasksService } from "../tasks/tasks.service";

/**
 * Rotinas periódicas da clínica.
 *
 * Rodam em `@nestjs/schedule`, no próprio processo, e não em BullMQ: são três
 * jobs curtos e idempotentes, e exigir Redis no boot só para isso deixaria a
 * API sem subir num ambiente onde o banco já basta. Quando o volume pedir
 * fila com retentativa e DLQ, cada método aqui vira um `WorkerHost`.
 */
@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly tasks: TasksService,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
    private readonly clock: ClockService,
  ) {}

  /**
   * Gera as pendências de confirmação de consultas próximas.
   *
   * Idempotente por construção (`createSystemTask` ignora duplicatas), então
   * rodar de hora em hora não empilha 24 linhas por consulta.
   */
  @Cron(CronExpression.EVERY_HOUR, { name: "confirmacoes-pendentes" })
  async generatePendingConfirmations(): Promise<void> {
    if (!config.jobs.enabled) return;

    const settings = await this.settings.get();
    const now = this.clock.now();
    const horizon = new Date(
      now.getTime() + settings.confirmationLeadHours * 60 * 60 * 1000,
    );

    const pending = await this.prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.AGENDADA,
        startsAt: { gte: now, lte: horizon },
      },
      include: { patient: { select: { id: true, name: true } } },
      take: 200,
    });

    for (const appointment of pending) {
      await this.tasks.createSystemTask({
        patientId: appointment.patientId,
        appointmentId: appointment.id,
        type: TaskType.CONFIRMACAO_PENDENTE,
        title: `Confirmação pendente da consulta de ${ClinicTime.timeOf(appointment.startsAt)}`,
        dueAt: appointment.startsAt,
      });

      if (settings.whatsappEnabled) {
        await this.notifications.sendConfirmationRequest(appointment.id);
      }
    }

    if (pending.length > 0) {
      this.logger.log(
        `${pending.length} consulta(s) entraram no fluxo de confirmação.`,
      );
    }
  }

  /**
   * Expurgo dos arquivos de documentos removidos há mais de 30 dias.
   *
   * O metadado permanece no banco (auditoria), só os bytes saem do bucket.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: "expurgo-documentos" })
  async purgeDeletedDocuments(): Promise<void> {
    if (!config.jobs.enabled) return;

    const cutoff = DateTime.fromJSDate(this.clock.now())
      .minus({ days: 30 })
      .toJSDate();

    const stale = await this.prisma.document.findMany({
      where: { deletedAt: { lt: cutoff }, objectKey: { not: "" } },
      select: { id: true, objectKey: true },
      take: 100,
    });

    for (const document of stale) {
      await this.storage.remove(document.objectKey);
      await this.prisma.document.update({
        where: { id: document.id },
        data: { objectKey: "" },
      });
    }

    if (stale.length > 0) {
      this.logger.log(
        `${stale.length} arquivo(s) expurgados do armazenamento.`,
      );
    }
  }

  /**
   * Fecha o dia: consultas que ficaram em AGENDADA/CONFIRMADA e já passaram
   * viram no-show no dia seguinte, gerando a pendência de resgate.
   *
   * Sem isso, a tabela do dia anterior ficaria cheia de consultas "atrasadas"
   * eternamente, e ninguém saberia quem realmente faltou.
   */
  @Cron("0 2 * * *", { name: "fechamento-do-dia" })
  async closePreviousDay(): Promise<void> {
    if (!config.jobs.enabled) return;

    const yesterday = DateTime.fromJSDate(this.clock.now())
      .setZone(ClinicTime.zone)
      .minus({ days: 1 });
    const { start, end } = ClinicTime.dayRange(yesterday.toISODate() ?? "");

    const missed = await this.prisma.appointment.findMany({
      where: {
        startsAt: { gte: start, lt: end },
        status: {
          in: [AppointmentStatus.AGENDADA, AppointmentStatus.CONFIRMADA],
        },
      },
      select: { id: true, patientId: true, startsAt: true },
      take: 500,
    });

    for (const appointment of missed) {
      await this.tasks.createSystemTask({
        patientId: appointment.patientId,
        appointmentId: appointment.id,
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

    if (missed.length > 0) {
      this.logger.log(
        `${missed.length} ausência(s) registradas no funil de resgate.`,
      );
    }
  }
}
