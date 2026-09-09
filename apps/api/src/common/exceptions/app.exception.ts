import { HttpException, HttpStatus } from "@nestjs/common";
import { ErrorCodeValue } from "../constants/error-codes";

export interface AppExceptionPayload {
  code: ErrorCodeValue;
  message: string;
  status?: HttpStatus;
  details?: Record<string, unknown>;
}

/**
 * Erro de domínio com código estável.
 *
 * Toda regra de negócio violada sobe por aqui, nunca por um `BadRequestException`
 * cru: o filtro global lê `code` e `details` e monta o envelope padrão da aplicação.
 */
export class AppException extends HttpException {
  readonly code: ErrorCodeValue;
  readonly details?: Record<string, unknown>;

  constructor(payload: AppExceptionPayload) {
    super(
      {
        code: payload.code,
        message: payload.message,
        details: payload.details,
      },
      payload.status ?? HttpStatus.BAD_REQUEST,
    );
    this.code = payload.code;
    this.details = payload.details;
  }

  static notFound(entity: string, id?: string): AppException {
    return new AppException({
      code: "RESOURCE_NOT_FOUND",
      message: id
        ? `${entity} não encontrado(a): ${id}`
        : `${entity} não encontrado(a).`,
      status: HttpStatus.NOT_FOUND,
    });
  }

  static conflict(
    code: ErrorCodeValue,
    message: string,
    details?: Record<string, unknown>,
  ): AppException {
    return new AppException({
      code,
      message,
      details,
      status: HttpStatus.CONFLICT,
    });
  }

  static unprocessable(
    code: ErrorCodeValue,
    message: string,
    details?: Record<string, unknown>,
  ): AppException {
    return new AppException({
      code,
      message,
      details,
      status: HttpStatus.UNPROCESSABLE_ENTITY,
    });
  }

  static badRequest(
    code: ErrorCodeValue,
    message: string,
    details?: Record<string, unknown>,
  ): AppException {
    return new AppException({
      code,
      message,
      details,
      status: HttpStatus.BAD_REQUEST,
    });
  }
}
