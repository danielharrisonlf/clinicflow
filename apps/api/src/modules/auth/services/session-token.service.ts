import { createHash, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Prisma, Role, User } from "@prisma/client";
import { uuidv7 } from "uuidv7";
import { config } from "../../../common/config";
import { ClockService } from "../../../shared/clock/clock.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { AuthResponseDto, SessionUserDto } from "../dto/auth.dto";

export const ROLE_LABEL: Record<Role, string> = {
  RECEPCAO: "Recepção",
  PROFISSIONAL: "Profissional",
  GESTOR: "Gestão",
};

export type UserWithProfessional = Prisma.UserGetPayload<{
  include: { professional: true };
}>;

@Injectable()
export class SessionTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly clock: ClockService,
  ) {}

  hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  toSessionUser(
    user: User & { professional?: { id: string } | null },
  ): SessionUserDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      professionalId: user.professional?.id ?? null,
      roleLabel: ROLE_LABEL[user.role],
    };
  }

  async issueSession(user: UserWithProfessional): Promise<AuthResponseDto> {
    const professionalId = user.professional?.id;

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      ...(professionalId ? { professionalId } : {}),
    });

    const refreshToken = randomBytes(48).toString("base64url");
    const expiresAt = new Date(
      this.clock.nowMs() + config.jwt.refreshTtlDays * 24 * 60 * 60 * 1000,
    );

    await this.prisma.refreshToken.create({
      data: {
        id: uuidv7(),
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: this.toSessionUser(user),
    };
  }
}
