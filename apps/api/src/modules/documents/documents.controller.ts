import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { ApiPageResponse } from "../../common/decorators/api-paginated-response.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { DocumentDownloadDto, DocumentResponseDto } from "./dto/document.dto";
import {
  CreateDocumentRequest,
  CreateDocumentSchema,
} from "./requests/create-document.request";
import {
  ListDocumentsQueryRequest,
  ListDocumentsQuerySchema,
} from "./requests/list-documents.request";
import {
  UpdateDocumentRequest,
  UpdateDocumentSchema,
} from "./requests/update-document.request";
import { CreateDocumentService } from "./services/create-document.service";
import { CreateDownloadUrlService } from "./services/create-download-url.service";
import { FindAllDocumentsService } from "./services/find-all-documents.service";
import { FindDocumentByIdService } from "./services/find-document-by-id.service";
import { RemoveDocumentService } from "./services/remove-document.service";
import { UpdateDocumentService } from "./services/update-document.service";

@ApiTags("Documentos")
@ApiBearerAuth()
@Controller("documents")
export class DocumentsController {
  constructor(
    private readonly findAllService: FindAllDocumentsService,
    private readonly findByIdService: FindDocumentByIdService,
    private readonly createService: CreateDocumentService,
    private readonly updateService: UpdateDocumentService,
    private readonly createDownloadUrlService: CreateDownloadUrlService,
    private readonly removeService: RemoveDocumentService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Repositório central de documentos" })
  @ApiPageResponse(DocumentResponseDto)
  findAll(
    @Query(new ZodValidationPipe(ListDocumentsQuerySchema))
    query: ListDocumentsQueryRequest,
  ) {
    return this.findAllService.execute(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Metadados do documento" })
  @ApiOkResponse({ type: DocumentResponseDto })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.findByIdService.execute(id);
  }

  @Get(":id/download")
  @ApiOperation({ summary: 'Botão "Visualizar" — URL assinada de leitura' })
  @ApiOkResponse({ type: DocumentDownloadDto })
  download(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.createDownloadUrlService.execute(id, actor);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Registrar o documento após o upload",
    description:
      "Fluxo: POST /uploads/sign → PUT na uploadUrl → POST /documents com o objectKey.",
  })
  create(
    @Body(new ZodValidationPipe(CreateDocumentSchema))
    dto: CreateDocumentRequest,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.createService.execute(dto, actor);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Reclassificar tipo ou revincular paciente/consulta",
  })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateDocumentSchema))
    dto: UpdateDocumentRequest,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.updateService.execute(id, dto, actor);
  }

  @Delete(":id")
  @Roles(Role.GESTOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Remover documento (lógico; expurgo do arquivo em 30 dias)",
  })
  remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.removeService.execute(id, actor);
  }
}
