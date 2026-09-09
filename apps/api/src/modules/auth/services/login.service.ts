import { HttpStatus, Injectable } from "@nestjs/common";
import { compare } from "bcryptjs";
import { AppException } from "../../../common/exceptions/app.exception";
import { ClockService } from "../../../shared/clock/clock.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { AuthResponseDto } from "../dto/auth.dto";
import { LoginRequest } from "../requests/login.request";
import { SessionTokenService } from "./session-token.service";

@Injectable()
export class LoginService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly tokenService: SessionTokenService,
  ) {}

  async execute(dto: LoginRequest): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: { professional: true },
    });

    const passwordMatches = user
      ? await compare(dto.password, user.passwordHash)
      : false;

    if (!user?.isActive || !passwordMatches) {
      throw new AppException({
        code: "INVALID_CREDENTIALS",
        message: "E-mail ou senha incorretos.",
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: this.clock.now() },
    });

    return this.tokenService.issueSession(user);
  }
}
