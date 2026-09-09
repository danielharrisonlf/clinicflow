import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Request, Response } from "express";
import { ErrorCode, ErrorCodeValue } from "../constants/error-codes";
import { AppException } from "../exceptions/app.exception";

interface ErrorEnvelope {
  statusCode: number;
  code: ErrorCodeValue | string;
  message: string;
  details?: unknown;
  path: string;
  timestamp: string;
}

/**
 * Filtro global. Toda saída de erro da API tem a mesma forma, com um `code`
 * estável que o frontend usa para escolher a saída de recuperação.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const envelope = this.toEnvelope(exception, request.url);

    if (envelope.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `HTTP ${envelope.statusCode} [${request.method}] ${request.url} — ${envelope.message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `HTTP ${envelope.statusCode} [${request.method}] ${request.url} — ${envelope.code}`,
      );
    }

    response.status(envelope.statusCode).json(envelope);
  }

  private toEnvelope(exception: unknown, path: string): ErrorEnvelope {
    const base = { path, timestamp: new Date().toISOString() };

    if (exception instanceof AppException) {
      return {
        ...base,
        statusCode: exception.getStatus(),
        code: exception.code,
        message: this.messageOf(exception),
        ...(exception.details ? { details: exception.details } : {}),
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return { ...base, ...this.fromPrisma(exception) };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      // O ValidationPipe devolve { message: string[] }; preservamos a lista em `details`.
      if (typeof body === "object" && body !== null && "message" in body) {
        const raw = (body as { message: unknown }).message;
        if (Array.isArray(raw)) {
          return {
            ...base,
            statusCode: status,
            code: ErrorCode.VALIDATION_FAILED,
            message: "Dados inválidos no formulário.",
            details: { issues: raw },
          };
        }
      }
      return {
        ...base,
        statusCode: status,
        code: this.codeForStatus(status),
        message: this.messageOf(exception),
      };
    }

    return {
      ...base,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: "Não foi possível concluir a operação. Tente novamente.",
    };
  }

  private fromPrisma(
    error: Prisma.PrismaClientKnownRequestError,
  ): Pick<ErrorEnvelope, "statusCode" | "code" | "message" | "details"> {
    switch (error.code) {
      case "P2002":
        return {
          statusCode: HttpStatus.CONFLICT,
          code: ErrorCode.RESOURCE_CONFLICT,
          message: "Já existe um registro com estes dados.",
          details: { fields: error.meta?.target },
        };
      case "P2025":
        return {
          statusCode: HttpStatus.NOT_FOUND,
          code: ErrorCode.RESOURCE_NOT_FOUND,
          message: "Registro não encontrado.",
        };
      case "P2003":
        return {
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          code: ErrorCode.RESOURCE_CONFLICT,
          message: "Registro vinculado a outros dados e não pode ser alterado.",
        };
      default:
        this.logger.error(`Prisma ${error.code}: ${error.message}`);
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          code: ErrorCode.INTERNAL_ERROR,
          message: "Falha ao acessar os dados da clínica.",
        };
    }
  }

  private codeForStatus(status: number): ErrorCodeValue {
    if (status === HttpStatus.NOT_FOUND) return ErrorCode.RESOURCE_NOT_FOUND;
    if (status === HttpStatus.UNAUTHORIZED) return ErrorCode.TOKEN_INVALID;
    if (status === HttpStatus.FORBIDDEN) return ErrorCode.FORBIDDEN_ROLE;
    if (status === HttpStatus.CONFLICT) return ErrorCode.RESOURCE_CONFLICT;
    if (status === HttpStatus.TOO_MANY_REQUESTS) return ErrorCode.RATE_LIMITED;
    if (status >= 500) return ErrorCode.INTERNAL_ERROR;
    return ErrorCode.VALIDATION_FAILED;
  }

  private messageOf(exception: HttpException): string {
    const body = exception.getResponse();
    if (typeof body === "string") return body;
    if (typeof body === "object" && body !== null && "message" in body) {
      const raw = (body as { message: unknown }).message;
      if (typeof raw === "string") return raw;
    }
    return exception.message;
  }
}
