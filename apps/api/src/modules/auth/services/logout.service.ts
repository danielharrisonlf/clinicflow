import { Injectable } from "@nestjs/common";
import { ClockService } from "../../../shared/clock/clock.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { RefreshTokenRequest } from "../requests/refresh-token.request";
import { SessionTokenService } from "./session-token.service";

@Injectable()
export class LogoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly tokenService: SessionTokenService,
  ) {}

  async execute(dto: RefreshTokenRequest): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash: this.tokenService.hashToken(dto.refreshToken),
        revokedAt: null,
      },
      data: { revokedAt: this.clock.now() },
    });
  }
}
