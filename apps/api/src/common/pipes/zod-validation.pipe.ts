import {
  ArgumentMetadata,
  HttpStatus,
  Injectable,
  PipeTransform,
} from "@nestjs/common";
import { ZodError, ZodSchema } from "zod";
import { isZodRequest } from "../decorators/zod-request.decorator";
import { AppException } from "../exceptions/app.exception";

type ZodValidationErrorMessages = Readonly<Record<string, string>>;

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(
    private readonly schema: ZodSchema<unknown>,
    private readonly errorMessages?: ZodValidationErrorMessages,
  ) {}

  transform(value: unknown, metadata?: ArgumentMetadata) {
    let parsed: unknown;
    try {
      parsed = this.schema.parse(value);
    } catch (err) {
      if (err instanceof ZodError) {
        const errorMessages = this.errorMessages;
        const issue = errorMessages
          ? err.issues.find((item) => item.message in errorMessages)
          : undefined;

        if (issue && errorMessages) {
          throw new AppException({
            code: "VALIDATION_FAILED",
            message: errorMessages[issue.message] ?? issue.message,
            status: HttpStatus.BAD_REQUEST,
            details: { issues: err.errors },
          });
        }

        throw new AppException({
          code: "VALIDATION_FAILED",
          message: "Dados enviados estão incorretos.",
          status: HttpStatus.BAD_REQUEST,
          details: {
            issues: err.errors.map((error) => ({
              path: error.path.join("."),
              message: error.message,
              code: error.code,
            })),
          },
        });
      }
      throw err;
    }

    return hydrate(parsed, metadata?.metatype);
  }
}

/**
 * Entrega o resultado do schema como instância da classe `@ZodRequest()`.
 *
 * `Object.create` em vez de `new`: o construtor rodaria os inicializadores de
 * campo e deixaria propriedades próprias `undefined` para filtros não enviados.
 * Aqui só existem as chaves que o schema devolveu, e os acessores do protótipo
 * (`skip`, `direction`) passam a funcionar. O `Object.assign` dispara setters
 * do protótipo, então `direction: "desc"` vindo do schema vira `order: DESC`.
 *
 * Classes sem a marca recebem o objeto puro, como antes.
 */
function hydrate(parsed: unknown, metatype: unknown): unknown {
  if (
    !isZodRequest(metatype) ||
    parsed === null ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    return parsed;
  }
  return Object.assign(Object.create(metatype.prototype), parsed);
}
