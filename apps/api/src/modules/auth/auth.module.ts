import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { config } from "../../common/config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { ForgotPasswordService } from "./services/forgot-password.service";
import { GetSessionUserService } from "./services/get-session-user.service";
import { LoginService } from "./services/login.service";
import { LogoutService } from "./services/logout.service";
import { RefreshTokenService } from "./services/refresh-token.service";
import { ResetPasswordService } from "./services/reset-password.service";
import { SessionTokenService } from "./services/session-token.service";

const services = [
  AuthService,
  SessionTokenService,
  LoginService,
  RefreshTokenService,
  LogoutService,
  ForgotPasswordService,
  ResetPasswordService,
  GetSessionUserService,
];

/**
 * Global porque o `JwtAuthGuard` registrado com APP_GUARD precisa do
 * `JwtService` em toda a aplicação, não só neste módulo.
 */
@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: config.jwt.secret,
      signOptions: { expiresIn: config.jwt.accessTtl },
    }),
  ],
  controllers: [AuthController],
  providers: services,
  exports: [JwtModule, ...services],
})
export class AuthModule {}
