import { randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { uuidv7 } from "uuidv7";
import { config } from "../../../common/config";
import { ClockService } from "../../../shared/clock/clock.service";
import { MailService } from "../../../shared/mail/mail.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { ForgotPasswordRequest } from "../requests/forgot-password.request";
import { SessionTokenService } from "./session-token.service";

@Injectable()
export class ForgotPasswordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly mail: MailService,
    private readonly tokenService: SessionTokenService,
  ) {}

  /**
   * Não diz se o e-mail existe. Responder "não encontrado" transforma o
   * formulário público num enumerador de quem trabalha na clínica.
   */
  async execute(dto: ForgotPasswordRequest): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (!user?.isActive) return;

    // Um pedido novo invalida os anteriores
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date(this.clock.nowMs()) },
    });

    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(
      this.clock.nowMs() + config.passwordResetTtlMinutes * 60 * 1000,
    );

    await this.prisma.passwordResetToken.create({
      data: {
        id: uuidv7(),
        userId: user.id,
        tokenHash: this.tokenService.hashToken(token),
        expiresAt,
      },
    });

    const link = `${config.appBaseUrl}/redefinir-senha?token=${token}`;
    await this.mail.send({
      to: user.email,
      subject: "Redefinir sua senha do ClinicFlow",
      body: [
        `Olá, ${user.name}.`,
        "",
        "Alguém pediu para redefinir a senha desta conta. Se não foi você, ignore este e-mail.",
        "",
        `Para escolher uma senha nova: ${link}`,
        "",
        `O link vale ${config.passwordResetTtlMinutes} minutos.`,
      ].join("\n"),
    });
  }
}
