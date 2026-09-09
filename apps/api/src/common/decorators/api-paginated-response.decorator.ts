import { applyDecorators, Type } from "@nestjs/common";
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from "@nestjs/swagger";
import { CursorMetaDto, CursorPageDto } from "../dto/cursor-page.dto";
import { PageDto, PageMetaDto } from "../dto/page.dto";

/** Documenta `PageDto<T>` no Swagger — genéricos não sobrevivem à reflexão sozinhos. */
export function ApiPageResponse<TModel extends Type<unknown>>(model: TModel) {
  return applyDecorators(
    ApiExtraModels(PageDto, PageMetaDto, model),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(PageDto) },
          {
            properties: {
              data: { type: "array", items: { $ref: getSchemaPath(model) } },
              meta: { $ref: getSchemaPath(PageMetaDto) },
            },
          },
        ],
      },
    }),
  );
}

export function ApiCursorResponse<TModel extends Type<unknown>>(model: TModel) {
  return applyDecorators(
    ApiExtraModels(CursorPageDto, CursorMetaDto, model),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(CursorPageDto) },
          {
            properties: {
              data: { type: "array", items: { $ref: getSchemaPath(model) } },
              meta: { $ref: getSchemaPath(CursorMetaDto) },
            },
          },
        ],
      },
    }),
  );
}
