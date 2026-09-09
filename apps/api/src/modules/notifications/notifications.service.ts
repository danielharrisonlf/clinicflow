import { Injectable, Logger } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { Channel, NotificationStatus } from "@prisma/client";
import { uuidv7 } from "uuidv7";
import { config } from "../../common/config";
import { PageDto } from "../../common/dto/page.dto";
import { PageOptionsDto } from "../../common/dto/page-options.dto";
import { AppException } from "../../common/exceptions/app.exception";
import { ClinicTime } from "../../common/utils/clinic-time.util";
import { paginate } from "../../common/utils/paginate.util";
import { ClockService } from "../../shared/clock/clock.service";
import { HttpClientService } from "../../shared/http-client/http-client.service";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { APPOINTMENT_INCLUDE } from "../appointments/appointment.mapper";
import { SettingsService } from "../settings/settings.service";

export class NotificationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true, type: String }) appointmentId!: string | null;
  @ApiProperty({ enum: Channel }) channel!: Channel;
  @ApiProperty() to!: string;
  @ApiProperty() body!: string;
  @ApiProperty({ enum: NotificationStatus }) status!: NotificationStatus;
  @ApiProperty({ nullable: true, type: String }) sentAt!: string | null;
  @ApiProperty() createdAt!: string;
}

/**
 * Automação de confirmação por WhatsApp.
 *
 * O transporte é trocável por variável de ambiente: `log` escreve uma linha e
 * não envia nada — o padrão em desenvolvimento, para ninguém receber mensagem
 * de teste no celular. `http` fala com o provedor real pelo HttpClientService.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly http: HttpClientService,
    private readonly clock: ClockService,
  ) {}

  async findAll(
    options: PageOptionsDto,
    appointmentId?: string,
  ): Promise<PageDto<NotificationResponseDto>> {
    const where = appointmentId ? { appointmentId } : {};

    const page = await paginate(
      options,
      (args) =>
        this.prisma.notification.findMany({
          ...args,
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        }),
      () => this.prisma.notification.count({ where }),
    );

    return new PageDto(
      page.data.map((notification) => ({
        id: notification.id,
        appointmentId: notification.appointmentId,
        channel: notification.channel,
        to: notification.to,
        body: notification.body,
        status: notification.status,
        sentAt: notification.sentAt?.toISOString() ?? null,
        createdAt: notification.createdAt.toISOString(),
      })),
      page.meta,
    );
  }

  /** Monta a mensagem a partir do template da clínica e despacha. */
  async sendConfirmationRequest(appointmentId: string): Promise<void> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: APPOINTMENT_INCLUDE,
    });
    if (!appointment) throw AppException.notFound("Consulta", appointmentId);

    const settings = await this.settings.get();
    const body = settings.whatsappTemplate
      .replace("{{paciente}}", appointment.patient.name.split(" ")[0] ?? "")
      .replace("{{profissional}}", appointment.professional.name)
      .replace("{{data}}", formatDate(appointment.startsAt))
      .replace("{{hora}}", ClinicTime.timeOf(appointment.startsAt));

    const notification = await this.prisma.notification.create({
      data: {
        id: uuidv7(),
        appointmentId,
        channel: Channel.WHATSAPP,
        to: appointment.patient.phone,
        body,
      },
    });

    await this.dispatch(notification.id, appointment.patient.phone, body);
  }

  private async dispatch(
    notificationId: string,
    to: string,
    body: string,
  ): Promise<void> {
    if (
      config.notifications.transport === "log" ||
      !config.notifications.whatsappBaseUrl
    ) {
      this.logger.log(`[WhatsApp:log] para ${to}: ${body}`);
      await this.markSent(notificationId);
      return;
    }

    try {
      await this.http.request({
        url: `${config.notifications.whatsappBaseUrl}/messages`,
        method: "POST",
        headers: config.notifications.whatsappToken
          ? { authorization: `Bearer ${config.notifications.whatsappToken}` }
          : {},
        body: { to, text: body },
      });
      await this.markSent(notificationId);
    } catch (error) {
      // Falha de envio não derruba a operação da recepção: fica registrada e a
      // pendência de confirmação continua aberta no sistema.
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { status: NotificationStatus.FALHOU, error: String(error) },
      });
      this.logger.error(`Falha ao enviar notificação ${notificationId}.`);
    }
  }

  private async markSent(notificationId: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { status: NotificationStatus.ENVIADA, sentAt: this.clock.now() },
    });
  }

  /** Marca a notificação como respondida quando o webhook traz o "SIM". */
  async markAnswered(appointmentId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { appointmentId, status: NotificationStatus.ENVIADA },
      data: { status: NotificationStatus.RESPONDIDA },
    });
  }
}

function formatDate(instant: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    timeZone: ClinicTime.zone,
  }).format(instant);
}
