import { HttpStatus, Injectable } from "@nestjs/common";
import { hash } from "bcryptjs";
import { AppException } from "../../../common/exceptions/app.exception";
import { ClockService } from "../../../shared/clock/clock.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { ResetPasswordRequest } from "../requests/reset-password.request";
import { SessionTokenService } from "./session-token.service";

@Injectable()
export class ResetPasswordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly tokenService: SessionTokenService,
  ) {}

  async execute(dto: ResetPasswordRequest): Promise<void> {
    const stored = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.tokenService.hashToken(dto.token) },
      include: { user: true },
    });

    const now = new Date(this.clock.nowMs());
    if (!stored || stored.usedAt || stored.expiresAt < now) {
      throw new AppException({
        code: "RESET_TOKEN_INVALID",
        message: "Este link expirou ou já foi usado. Peça outro.",
        status: HttpStatus.BAD_REQUEST,
      });
    }

    // Trocar a senha derruba as sessões abertas
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { passwordHash: await hash(dto.password, 10) },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: now },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
  }
}
