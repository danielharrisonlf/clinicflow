import { Injectable } from "@nestjs/common";
import { AppException } from "../../../common/exceptions/app.exception";
import type { AuthenticatedUser } from "../../../common/interfaces/authenticated-user.interface";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { SessionUserDto } from "../dto/auth.dto";
import { SessionTokenService } from "./session-token.service";

@Injectable()
export class GetSessionUserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: SessionTokenService,
  ) {}

  async execute(user: AuthenticatedUser): Promise<SessionUserDto> {
    const found = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { professional: true },
    });
    if (!found) throw AppException.notFound("Usuário", user.id);
    return this.tokenService.toSessionUser(found);
  }
}
