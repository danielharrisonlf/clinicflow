import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "@prisma/client";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { AppException } from "../exceptions/app.exception";
import type { AuthenticatedUser } from "../interfaces/authenticated-user.interface";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    // Sem usuário aqui significa rota pública anotada com @Roles — configuração
    // contraditória. Barrar é mais seguro do que adivinhar a intenção.
    if (!user || !required.includes(user.role)) {
      throw new AppException({
        code: "FORBIDDEN_ROLE",
        message: "Seu perfil não tem permissão para esta ação.",
        status: HttpStatus.FORBIDDEN,
        details: { requiredRoles: required },
      });
    }
    return true;
  }
}
