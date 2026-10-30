import {
  ArgumentMetadata,
  Injectable,
  ValidationPipe,
  ValidationPipeOptions,
} from "@nestjs/common";
import { getMetadataStorage } from "class-validator";
import { isZodRequest } from "../decorators/zod-request.decorator";

/**
 * Pipe de validação global híbrido.
 *
 * Executa as validações do class-validator apenas quando a classe alvo possui
 * decorators do class-validator. Requisições tipadas com schemas do Zod são
 * repassadas intactas para o ZodValidationPipe, evitando que o whitelist
 * descarte campos legítimos ou rejeite propriedades desconhecidas.
 *
 * Classes marcadas com `@ZodRequest()` também passam direto, mesmo herdando
 * decorators do class-validator (caso das listagens que estendem
 * `PageOptionsDto`): quem valida essas é o schema do Zod.
 */
@Injectable()
export class AppValidationPipe extends ValidationPipe {
  protected override toValidate(metadata: ArgumentMetadata): boolean {
    const { metatype } = metadata;
    if (!metatype || !super.toValidate(metadata)) {
      return false;
    }

    if (isZodRequest(metatype)) {
      return false;
    }

    const hasValidationDecorators =
      getMetadataStorage().getTargetValidationMetadatas(
        metatype,
        "",
        false,
        false,
      ).length > 0;

    return hasValidationDecorators;
  }
}

/**
 * Opções do pipe global, compartilhadas entre o `main.ts` e o e2e para os dois
 * não divergirem (o e2e usava um `ValidationPipe` puro e recusava o login).
 */
export const GLOBAL_VALIDATION_OPTIONS: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: {
    // Sem coerção implícita: a conversão vem dos @Type() dos DTOs, para
    // "abc" em um campo numérico virar erro de validação, não NaN.
    enableImplicitConversion: false,
  },
};
