import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { Role } from "@prisma/client";
import { Request } from "express";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { AppException } from "../exceptions/app.exception";
import type { AuthenticatedUser } from "../interfaces/authenticated-user.interface";

export interface AccessTokenPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
  professionalId?: string;
}

/**
 * Guard global. Registrado com APP_GUARD, então a rota fechada é o padrão e
 * `@Public()` é a exceção explícita — o inverso esquece de proteger.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Barreira estrutural, aplicada antes de tudo e inclusive em rotas públicas:
    // nenhuma requisição pode trazer a própria identidade. Ela vem do token.
    // Isso impede que um handler novo, escrito com pressa, confie no cliente.
    rejectClientSuppliedIdentity(request);

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const token = extractBearer(request);
    if (!token) {
      throw new AppException({
        code: "TOKEN_MISSING",
        message: "Token de autenticação não fornecido.",
        status: HttpStatus.UNAUTHORIZED,
      });
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<AccessTokenPayload>(token);
      const user: AuthenticatedUser = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        ...(payload.professionalId
          ? { professionalId: payload.professionalId }
          : {}),
      };
      (request as Request & { user: AuthenticatedUser }).user = user;
      return true;
    } catch {
      throw new AppException({
        code: "TOKEN_INVALID",
        message: "Sessão expirada ou token inválido. Entre novamente.",
        status: HttpStatus.UNAUTHORIZED,
      });
    }
  }
}

function extractBearer(request: Request): string | undefined {
  const [type, token] = request.headers.authorization?.split(" ") ?? [];
  return type === "Bearer" ? token : undefined;
}

// Só chaves de identidade. `role` fica de fora de propósito: o endpoint de
// perfis precisa recebê-la no corpo, e quem barra escalonamento ali é o
// @Roles(GESTOR), não uma proibição cega de nome de campo.
const FORBIDDEN_KEYS = new Set(["userId", "user_id", "actorId", "actor_id"]);

function rejectClientSuppliedIdentity(request: Request): void {
  for (const source of [request.body, request.query, request.params]) {
    if (!source || typeof source !== "object") continue;
    for (const key of Object.keys(source as Record<string, unknown>)) {
      if (FORBIDDEN_KEYS.has(key)) {
        throw new AppException({
          code: "CLIENT_SUPPLIED_IDENTITY",
          message: "Identidade vem do token, não do cliente.",
          status: HttpStatus.FORBIDDEN,
        });
      }
    }
  }
}
