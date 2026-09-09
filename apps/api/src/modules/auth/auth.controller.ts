import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { AuthResponseDto, SessionUserDto } from "./dto/auth.dto";
import {
  ForgotPasswordRequest,
  ForgotPasswordSchema,
} from "./requests/forgot-password.request";
import { LoginRequest, LoginSchema } from "./requests/login.request";
import {
  RefreshTokenRequest,
  RefreshTokenSchema,
} from "./requests/refresh-token.request";
import {
  ResetPasswordRequest,
  ResetPasswordSchema,
} from "./requests/reset-password.request";
import { ForgotPasswordService } from "./services/forgot-password.service";
import { GetSessionUserService } from "./services/get-session-user.service";
import { LoginService } from "./services/login.service";
import { LogoutService } from "./services/logout.service";
import { RefreshTokenService } from "./services/refresh-token.service";
import { ResetPasswordService } from "./services/reset-password.service";

@ApiTags("Autenticação")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly loginService: LoginService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly logoutService: LogoutService,
    private readonly forgotPasswordService: ForgotPasswordService,
    private readonly resetPasswordService: ResetPasswordService,
    private readonly getSessionUserService: GetSessionUserService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Entrar com e-mail e senha" })
  @ApiOkResponse({ type: AuthResponseDto })
  login(
    @Body(new ZodValidationPipe(LoginSchema))
    dto: LoginRequest,
  ): Promise<AuthResponseDto> {
    return this.loginService.execute(dto);
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Renovar a sessão (rotação do refresh token)" })
  @ApiOkResponse({ type: AuthResponseDto })
  refresh(
    @Body(new ZodValidationPipe(RefreshTokenSchema))
    dto: RefreshTokenRequest,
  ): Promise<AuthResponseDto> {
    return this.refreshTokenService.execute(dto);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: "Pede o link de redefinição de senha",
    description:
      "Responde 202 mesmo quando o e-mail não existe: a resposta não pode revelar quem tem conta.",
  })
  @Post("forgot-password")
  forgotPassword(
    @Body(new ZodValidationPipe(ForgotPasswordSchema))
    dto: ForgotPasswordRequest,
  ): Promise<void> {
    return this.forgotPasswordService.execute(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Troca a senha usando o token do e-mail" })
  @Post("reset-password")
  resetPassword(
    @Body(new ZodValidationPipe(ResetPasswordSchema))
    dto: ResetPasswordRequest,
  ): Promise<void> {
    return this.resetPasswordService.execute(dto);
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Encerrar a sessão atual" })
  logout(
    @Body(new ZodValidationPipe(RefreshTokenSchema))
    dto: RefreshTokenRequest,
  ): Promise<void> {
    return this.logoutService.execute(dto);
  }

  @Get("me")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Perfil da sessão (barra lateral de todas as telas)",
  })
  @ApiOkResponse({ type: SessionUserDto })
  me(@CurrentUser() user: AuthenticatedUser): Promise<SessionUserDto> {
    return this.getSessionUserService.execute(user);
  }
}
