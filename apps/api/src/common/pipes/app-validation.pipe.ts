import { ArgumentMetadata, Injectable, ValidationPipe } from "@nestjs/common";
import { getMetadataStorage } from "class-validator";

/**
 * Pipe de validação global híbrido.
 *
 * Executa as validações do class-validator apenas quando a classe alvo possui
 * decorators do class-validator. Requisições tipadas com schemas do Zod são
 * repassadas intactas para o ZodValidationPipe, evitando que o whitelist
 * descarte campos legítimos ou rejeite propriedades desconhecidas.
 */
@Injectable()
export class AppValidationPipe extends ValidationPipe {
  protected override toValidate(metadata: ArgumentMetadata): boolean {
    const { metatype } = metadata;
    if (!metatype || !super.toValidate(metadata)) {
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
