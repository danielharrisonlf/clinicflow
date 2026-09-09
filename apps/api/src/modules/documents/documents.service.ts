import { Injectable } from "@nestjs/common";
import { PageDto } from "../../common/dto/page.dto";
import { PageOptionsDto } from "../../common/dto/page-options.dto";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { DocumentWithPatient } from "./document.mapper";
import { DocumentDownloadDto, DocumentResponseDto } from "./dto/document.dto";
import { CreateDocumentRequest } from "./requests/create-document.request";
import { ListDocumentsQueryRequest } from "./requests/list-documents.request";
import { UpdateDocumentRequest } from "./requests/update-document.request";
import { CreateDocumentService } from "./services/create-document.service";
import { CreateDownloadUrlService } from "./services/create-download-url.service";
import { FindAllDocumentsService } from "./services/find-all-documents.service";
import { FindDocumentByIdService } from "./services/find-document-by-id.service";
import { RemoveDocumentService } from "./services/remove-document.service";
import { UpdateDocumentService } from "./services/update-document.service";

/**
 * DocumentsService Facade.
 *
 * Cada verbo/ação possui seu próprio serviço isolado.
 * Esta classe atua como fachada para consumidores internos.
 */
@Injectable()
export class DocumentsService {
  constructor(
    private readonly findAllService: FindAllDocumentsService,
    private readonly findByIdService: FindDocumentByIdService,
    private readonly createService: CreateDocumentService,
    private readonly updateService: UpdateDocumentService,
    private readonly createDownloadUrlService: CreateDownloadUrlService,
    private readonly removeService: RemoveDocumentService,
  ) {}

  findAll(
    query: ListDocumentsQueryRequest | PageOptionsDto,
    overrides: { patientId?: string; appointmentId?: string } = {},
  ): Promise<PageDto<DocumentResponseDto>> {
    return this.findAllService.execute(query, overrides);
  }

  findOne(id: string): Promise<DocumentResponseDto> {
    return this.findByIdService.execute(id);
  }

  create(
    dto: CreateDocumentRequest,
    actor: AuthenticatedUser,
  ): Promise<DocumentResponseDto> {
    return this.createService.execute(dto, actor);
  }

  update(
    id: string,
    dto: UpdateDocumentRequest,
    actor: AuthenticatedUser,
  ): Promise<DocumentResponseDto> {
    return this.updateService.execute(id, dto, actor);
  }

  createDownloadUrl(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<DocumentDownloadDto> {
    return this.createDownloadUrlService.execute(id, actor);
  }

  remove(id: string, actor: AuthenticatedUser): Promise<void> {
    return this.removeService.execute(id, actor);
  }

  getOrThrow(id: string): Promise<DocumentWithPatient> {
    return this.findByIdService.getOrThrow(id);
  }
}
