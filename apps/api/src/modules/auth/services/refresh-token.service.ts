import { HttpStatus, Injectable } from "@nestjs/common";
import { AppException } from "../../../common/exceptions/app.exception";
import { ClockService } from "../../../shared/clock/clock.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { AuthResponseDto } from "../dto/auth.dto";
import { RefreshTokenRequest } from "../requests/refresh-token.request";
import { SessionTokenService } from "./session-token.service";

@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly tokenService: SessionTokenService,
  ) {}

  async execute(dto: RefreshTokenRequest): Promise<AuthResponseDto> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.tokenService.hashToken(dto.refreshToken) },
      include: { user: { include: { professional: true } } },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < this.clock.now()) {
      throw new AppException({
        code: "TOKEN_INVALID",
        message: "Sessão expirada. Entre novamente.",
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: this.clock.now() },
    });

    return this.tokenService.issueSession(stored.user);
  }
}
