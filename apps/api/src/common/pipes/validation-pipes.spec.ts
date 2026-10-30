import { ArgumentMetadata } from "@nestjs/common";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { z } from "zod";
import { ZodRequest } from "../decorators/zod-request.decorator";
import { Order, PageOptionsDto } from "../dto/page-options.dto";
import { AppException } from "../exceptions/app.exception";
import { AppValidationPipe } from "./app-validation.pipe";
import { ZodValidationPipe } from "./zod-validation.pipe";

const PageSchema = z.object({
  page: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? Number(val) : val),
    z.number().int().min(1).default(1),
  ),
  limit: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? Number(val) : val),
    z.number().int().min(1).max(100).default(10),
  ),
  direction: z.enum(["asc", "desc"]).optional(),
  hasPendencies: z.preprocess(
    (val) => (val === "true" ? true : val === "false" ? false : val),
    z.boolean().optional(),
  ),
});

/** Request de listagem típica: herda o PageOptionsDto e é validada pelo Zod. */
@ZodRequest()
class MarkedListRequest extends PageOptionsDto {
  @ApiPropertyOptional()
  hasPendencies?: boolean;
}

/** Mesmo formato, sem a marca: o caso que quebrava em produção. */
class UnmarkedListRequest extends PageOptionsDto {
  @ApiPropertyOptional()
  hasPendencies?: boolean;
}

/** Request de body só com Swagger, sem class-validator. */
class PlainZodBody {
  name?: string;
}

function queryMeta(metatype: ArgumentMetadata["metatype"]): ArgumentMetadata {
  return { type: "query", metatype, data: undefined };
}

describe("AppValidationPipe", () => {
  const pipe = new AppValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
  });

  it("deixa passar intacta a classe marcada com @ZodRequest, mesmo herdando class-validator", async () => {
    const value = { page: "2", limit: "5", hasPendencies: "true" };

    const result = await pipe.transform(value, queryMeta(MarkedListRequest));

    expect(result).toBe(value);
  });

  it("continua recusando campo fora da whitelist em classe sem a marca", async () => {
    await expect(
      pipe.transform({ hasPendencies: "true" }, queryMeta(UnmarkedListRequest)),
    ).rejects.toBeDefined();
  });

  it("continua validando o PageOptionsDto puro (limite e chave desconhecida)", async () => {
    await expect(
      pipe.transform({ limit: "1000" }, queryMeta(PageOptionsDto)),
    ).rejects.toBeDefined();
    await expect(
      pipe.transform({ foo: "1" }, queryMeta(PageOptionsDto)),
    ).rejects.toBeDefined();

    const ok = await pipe.transform(
      { page: "3", limit: "12" },
      queryMeta(PageOptionsDto),
    );
    expect(ok).toBeInstanceOf(PageOptionsDto);
    expect(ok.skip).toBe(24);
  });

  it("ignora classe sem decorators do class-validator", async () => {
    const value = { name: "x", extra: 1 };
    const result = await pipe.transform(value, {
      type: "body",
      metatype: PlainZodBody,
    });
    expect(result).toBe(value);
  });
});

describe("ZodValidationPipe", () => {
  const pipe = new ZodValidationPipe(PageSchema);

  it("devolve instância da classe @ZodRequest com skip e direction funcionando", () => {
    const result = pipe.transform(
      { page: "3", limit: "5", hasPendencies: "true" },
      queryMeta(MarkedListRequest),
    ) as MarkedListRequest;

    expect(result).toBeInstanceOf(MarkedListRequest);
    expect(result.skip).toBe(10);
    expect(result.limit).toBe(5);
    expect(result.hasPendencies).toBe(true);
  });

  it("não cria propriedades próprias para filtros não enviados", () => {
    const result = pipe.transform({}, queryMeta(MarkedListRequest)) as object;

    expect(Object.keys(result).sort()).toEqual(["limit", "page"]);
  });

  it("aplica o setter de direction vindo do schema", () => {
    const result = pipe.transform(
      { direction: "desc" },
      queryMeta(MarkedListRequest),
    ) as MarkedListRequest;

    expect(result.order).toBe(Order.DESC);
    expect(result.direction).toBe("desc");
  });

  it("assume direção ascendente quando o schema não traz order", () => {
    const result = pipe.transform(
      {},
      queryMeta(MarkedListRequest),
    ) as MarkedListRequest;

    expect(result.direction).toBe("asc");
    expect(result.skip).toBe(0);
  });

  it("devolve objeto puro para classe sem a marca", () => {
    const result = pipe.transform({ page: "1" }, queryMeta(PlainZodBody));

    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  });

  it("funciona sem metadata (uso direto do pipe)", () => {
    expect(pipe.transform({ page: "2" })).toEqual({ page: 2, limit: 10 });
  });

  it("recusa entrada inválida com VALIDATION_FAILED", () => {
    expect(() =>
      pipe.transform({ limit: "1000" }, queryMeta(MarkedListRequest)),
    ).toThrow(AppException);
    expect(() =>
      pipe.transform({ page: "0" }, queryMeta(MarkedListRequest)),
    ).toThrow(AppException);
  });
});
