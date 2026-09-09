import { Controller, Get, Query } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { SearchResultDto, SearchService } from "./search.service";

@ApiTags("Paleta de comandos (⌘K)")
@ApiBearerAuth()
@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary: "Busca unificada de paciente, profissional e ações rápidas",
    description:
      "Com menos de 2 caracteres devolve os pacientes que estão na clínica agora (PACIENTES RECENTES).",
  })
  @ApiQuery({ name: "q", required: false, example: "Luiza" })
  @ApiOkResponse({ type: SearchResultDto })
  search(@Query("q") q?: string): Promise<SearchResultDto> {
    return this.searchService.search(q);
  }
}
