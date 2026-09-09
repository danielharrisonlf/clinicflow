import { createHmac, timingSafeEqual } from "node:crypto";
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AppointmentStatus, Channel } from "@prisma/client";
import { config } from "../../common/config";
import { ApiPageResponse } from "../../common/decorators/api-paginated-response.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { PageOptionsDto } from "../../common/dto/page-options.dto";
import { AppException } from "../../common/exceptions/app.exception";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { AppointmentsService } from "../appointments/appointments.service";
import { WhatsappWebhookDto } from "./dto/whatsapp-webhook.dto";
import {
  NotificationResponseDto,
  NotificationsService,
} from "./notifications.service";

@ApiTags("Automação WhatsApp")
@Controller()
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly appointmentsService: AppointmentsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("notifications")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Histórico de envios" })
  @ApiPageResponse(NotificationResponseDto)
  findAll(
    @Query() options: PageOptionsDto,
    @Query("appointmentId") appointmentId?: string,
  ) {
    return this.notificationsService.findAll(options, appointmentId);
  }

  @Post("notifications/appointments/:id/confirmation")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Reenviar a mensagem de confirmação" })
  resend(@Param("id", ParseUUIDPipe) id: string) {
    return this.notificationsService.sendConfirmationRequest(id);
  }

  /**
   * Resposta do paciente pelo WhatsApp.
   *
   * Público por natureza (o provedor não tem sessão), então a autenticação é a
   * assinatura HMAC do corpo. Sem ela, qualquer um confirmaria consultas
   * alheias com um `curl`.
   */
  @Public()
  @Post("webhooks/whatsapp")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Webhook de resposta do paciente (assinado por HMAC)",
  })
  async webhook(
    @Body() dto: WhatsappWebhookDto,
    @Headers("x-signature") signature: string,
  ): Promise<{ received: boolean }> {
    assertSignature(dto, signature);

    if (!isConfirmation(dto.message)) {
      return { received: true };
    }

    const appointment = await this.prisma.appointment.findFirst({
      where: {
        patient: { phone: { contains: onlyDigits(dto.from).slice(-8) } },
        status: AppointmentStatus.AGENDADA,
        startsAt: { gte: new Date() },
      },
      orderBy: { startsAt: "asc" },
    });
    if (!appointment) return { received: true };

    // O ator é o próprio sistema: o histórico de auditoria registra
    // "Confirmação recebida — via WhatsApp automatizado", sem nome de operador.
    const systemActor: AuthenticatedUser = {
      id: appointment.createdById ?? appointment.id,
      email: "sistema@clinicflow",
      name: "WhatsApp automatizado",
      role: "RECEPCAO",
    };

    await this.appointmentsService.confirm(
      appointment.id,
      systemActor,
      Channel.WHATSAPP,
    );
    await this.notificationsService.markAnswered(appointment.id);

    return { received: true };
  }
}

function assertSignature(
  payload: WhatsappWebhookDto,
  signature: string | undefined,
): void {
  const expected = createHmac("sha256", config.notifications.webhookSecret)
    .update(JSON.stringify(payload))
    .digest("hex");

  const received = Buffer.from(signature ?? "");
  const expectedBuffer = Buffer.from(expected);

  if (
    received.length !== expectedBuffer.length ||
    !timingSafeEqual(received, expectedBuffer)
  ) {
    throw new AppException({
      code: "TOKEN_INVALID",
      message: "Assinatura do webhook inválida.",
      status: HttpStatus.UNAUTHORIZED,
    });
  }
}

const CONFIRMATION_WORDS = ["sim", "confirmo", "confirmado", "ok", "1"];

function isConfirmation(message: string): boolean {
  return CONFIRMATION_WORDS.includes(message.trim().toLowerCase());
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}
