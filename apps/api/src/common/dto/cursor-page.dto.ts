import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

/**
 * Entrada das listagens em que o volume cresce sem teto e ninguém pula para a
 * "página 40": histórico do paciente, auditoria da consulta, log da clínica.
 * Sem OFFSET, o tempo de resposta não degrada com a profundidade.
 */
export class CursorOptionsDto {
  @ApiPropertyOptional({
    description: "Cursor opaco devolvido pela página anterior",
  })
  @IsString()
  @IsOptional()
  readonly cursor?: string;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  readonly limit: number = 20;
}

export class CursorMetaDto {
  @ApiProperty() readonly hasNextPage: boolean;
  @ApiProperty({ nullable: true, type: String }) readonly nextCursor:
    | string
    | null;

  constructor(hasNextPage: boolean, nextCursor: string | null) {
    this.hasNextPage = hasNextPage;
    this.nextCursor = nextCursor;
  }
}

export class CursorPageDto<T> {
  @ApiProperty({ isArray: true }) readonly data: T[];
  @ApiProperty({ type: () => CursorMetaDto }) readonly meta: CursorMetaDto;

  constructor(data: T[], meta: CursorMetaDto) {
    this.data = data;
    this.meta = meta;
  }
}
