import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma, Role, User } from "@prisma/client";
import { hash } from "bcryptjs";
import { uuidv7 } from "uuidv7";
import { PageDto } from "../../common/dto/page.dto";
import { PageOptionsDto } from "../../common/dto/page-options.dto";
import { AppException } from "../../common/exceptions/app.exception";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { paginate } from "../../common/utils/paginate.util";
import { AuditService } from "../../shared/audit/audit.service";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { CreateUserDto, UpdateUserDto, UserResponseDto } from "./dto/user.dto";

const PASSWORD_ROUNDS = 12;

/** Serviço de gerenciamento de acessos e perfis de usuários. */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(options: PageOptionsDto): Promise<PageDto<UserResponseDto>> {
    const where: Prisma.UserWhereInput = options.search
      ? {
          OR: [
            { name: { contains: options.search, mode: "insensitive" } },
            { email: { contains: options.search, mode: "insensitive" } },
          ],
        }
      : {};

    const page = await paginate(
      options,
      (args) =>
        this.prisma.user.findMany({
          ...args,
          where,
          include: { professional: { select: { id: true } } },
          orderBy: [{ name: options.direction }, { id: options.direction }],
        }),
      () => this.prisma.user.count({ where }),
    );

    return new PageDto(page.data.map(toUserResponse), page.meta);
  }

  async create(
    dto: CreateUserDto,
    actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw AppException.conflict(
        "EMAIL_ALREADY_USED",
        "Já existe um acesso com este e-mail.",
      );
    }

    const user = await this.prisma.user.create({
      data: {
        id: uuidv7(),
        name: dto.name.trim(),
        email,
        passwordHash: await hash(dto.password, PASSWORD_ROUNDS),
        role: dto.role,
      },
      include: { professional: { select: { id: true } } },
    });

    await this.audit.record({
      actor,
      action: "user.created",
      entity: "User",
      entityId: user.id,
      after: { name: user.name, email: user.email, role: user.role },
    });

    return toUserResponse(user);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const before = await this.findOneOrThrow(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name === undefined ? {} : { name: dto.name.trim() }),
        ...(dto.email === undefined
          ? {}
          : { email: dto.email.toLowerCase().trim() }),
        ...(dto.isActive === undefined ? {} : { isActive: dto.isActive }),
      },
      include: { professional: { select: { id: true } } },
    });

    await this.audit.record({
      actor,
      action: "user.updated",
      entity: "User",
      entityId: id,
      before: {
        name: before.name,
        email: before.email,
        isActive: before.isActive,
      },
      after: { name: user.name, email: user.email, isActive: user.isActive },
    });

    return toUserResponse(user);
  }

  async changeRole(
    id: string,
    role: Role,
    actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    // Trocar o próprio perfil é como serrar o galho: o último gestor viraria
    // recepção e ninguém mais administraria a clínica.
    if (id === actor.id) {
      throw new AppException({
        code: "FORBIDDEN_ROLE",
        message: "Você não pode alterar o próprio perfil de acesso.",
        status: HttpStatus.FORBIDDEN,
      });
    }

    const before = await this.findOneOrThrow(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: { role },
      include: { professional: { select: { id: true } } },
    });

    await this.audit.record({
      actor,
      action: "user.role_changed",
      entity: "User",
      entityId: id,
      before: { role: before.role },
      after: { role: user.role },
    });

    return toUserResponse(user);
  }

  async resetPassword(
    id: string,
    password: string,
    actor: AuthenticatedUser,
  ): Promise<void> {
    await this.findOneOrThrow(id);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { passwordHash: await hash(password, PASSWORD_ROUNDS) },
      }),
      // Trocar a senha derruba todas as sessões abertas daquele acesso.
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.audit.record({
      actor,
      action: "user.password_reset",
      entity: "User",
      entityId: id,
    });
  }

  private async findOneOrThrow(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw AppException.notFound("Usuário", id);
    return user;
  }
}

function toUserResponse(
  user: User & { professional?: { id: string } | null },
): UserResponseDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    professionalId: user.professional?.id ?? null,
  };
}
