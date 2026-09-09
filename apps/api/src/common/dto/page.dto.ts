import { ApiProperty } from "@nestjs/swagger";
import { PageOptionsDto } from "./page-options.dto";

export interface PageMetaDtoParameters {
  pageOptionsDto: PageOptionsDto;
  itemCount: number;
}

/**
 * Metadados da página. É exatamente o rodapé desenhado nas telas 02 e 09:
 * "Mostrando 1–12 de 1.248 pacientes" mais os controles ‹ 1 2 3 … 104 ›.
 */
export class PageMetaDto {
  @ApiProperty() readonly page: number;
  @ApiProperty() readonly limit: number;
  @ApiProperty({ description: "Total de registros que casam com o filtro" })
  readonly itemCount: number;
  @ApiProperty() readonly pageCount: number;
  @ApiProperty() readonly hasPreviousPage: boolean;
  @ApiProperty() readonly hasNextPage: boolean;

  constructor({ pageOptionsDto, itemCount }: PageMetaDtoParameters) {
    this.page = pageOptionsDto.page;
    this.limit = pageOptionsDto.limit;
    this.itemCount = itemCount;
    this.pageCount = Math.ceil(itemCount / pageOptionsDto.limit);
    this.hasPreviousPage = this.page > 1;
    this.hasNextPage = this.page < this.pageCount;
  }
}

export class PageDto<T> {
  @ApiProperty({ isArray: true })
  readonly data: T[];

  @ApiProperty({ type: () => PageMetaDto })
  readonly meta: PageMetaDto;

  constructor(data: T[], meta: PageMetaDto) {
    this.data = data;
    this.meta = meta;
  }
}
