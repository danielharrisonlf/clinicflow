const ZOD_REQUEST_KEY = "clinicflow:zod-request";

/**
 * Marca uma classe de request cuja validação pertence ao `ZodValidationPipe`.
 *
 * Existe porque várias requests de listagem estendem `PageOptionsDto` para
 * herdar o Swagger e os getters `skip`/`direction` — e com isso herdam também
 * os decorators do class-validator. Sem a marca, o `AppValidationPipe` global
 * (que roda antes do pipe do parâmetro) validava a classe com
 * `forbidNonWhitelisted` e recusava todo filtro declarado só no schema do Zod.
 *
 * A marca tem dois efeitos:
 * - o `AppValidationPipe` deixa a classe passar intacta;
 * - o `ZodValidationPipe` devolve o resultado do `parse` como instância da
 *   classe, para os getters do protótipo (`skip`, `direction`) funcionarem.
 */
export function ZodRequest(): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(ZOD_REQUEST_KEY, true, target);
  };
}

/** A classe (ou um ancestral dela) foi marcada com `@ZodRequest()`? */
export function isZodRequest(metatype: unknown): metatype is new () => object {
  return (
    typeof metatype === "function" &&
    Reflect.getMetadata(ZOD_REQUEST_KEY, metatype) === true
  );
}
