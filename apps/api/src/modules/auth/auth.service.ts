import { Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { AuthResponseDto, SessionUserDto } from "./dto/auth.dto";
import { ForgotPasswordService } from "./services/forgot-password.service";
import { GetSessionUserService } from "./services/get-session-user.service";
import { LoginService } from "./services/login.service";
import { LogoutService } from "./services/logout.service";
import { RefreshTokenService } from "./services/refresh-token.service";
import { ResetPasswordService } from "./services/reset-password.service";

/**
 * AuthService Facade.
 *
 * Cada verbo/ação possui seu serviço individual e isolado.
 * Esta classe atua como fachada para compatibilidade interna.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly loginService: LoginService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly logoutService: LogoutService,
    private readonly forgotPasswordService: ForgotPasswordService,
    private readonly resetPasswordService: ResetPasswordService,
    private readonly getSessionUserService: GetSessionUserService,
  ) {}

  login(email: string, password: string): Promise<AuthResponseDto> {
    return this.loginService.execute({ email, password });
  }

  refresh(refreshToken: string): Promise<AuthResponseDto> {
    return this.refreshTokenService.execute({ refreshToken });
  }

  logout(refreshToken: string): Promise<void> {
    return this.logoutService.execute({ refreshToken });
  }

  me(user: AuthenticatedUser): Promise<SessionUserDto> {
    return this.getSessionUserService.execute(user);
  }

  requestPasswordReset(email: string): Promise<void> {
    return this.forgotPasswordService.execute({ email });
  }

  resetPassword(token: string, password: string): Promise<void> {
    return this.resetPasswordService.execute({ token, password });
  }
}
