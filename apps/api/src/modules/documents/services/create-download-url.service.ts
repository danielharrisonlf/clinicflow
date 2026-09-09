import { Injectable } from "@nestjs/common";
import { config } from "../../../common/config";
import type { AuthenticatedUser } from "../../../common/interfaces/authenticated-user.interface";
import { AuditService } from "../../../shared/audit/audit.service";
import { StorageService } from "../../../shared/storage/storage.service";
import { DocumentDownloadDto } from "../dto/document.dto";
import { FindDocumentByIdService } from "./find-document-by-id.service";

@Injectable()
export class CreateDownloadUrlService {
  constructor(
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly findByIdService: FindDocumentByIdService,
  ) {}

  /** Emite URL assinada de download/visualização do documento com registro de auditoria. */
  async execute(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<DocumentDownloadDto> {
    const document = await this.findByIdService.getOrThrow(id);
    const url = await this.storage.createReadUrl(document.objectKey);

    await this.audit.record({
      actor,
      action: "document.downloaded",
      entity: "Document",
      entityId: id,
    });

    return {
      url,
      fileName: document.fileName,
      expiresIn: config.storage.readUrlTtlSeconds,
    };
  }
}
