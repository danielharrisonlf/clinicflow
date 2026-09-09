import { Module } from "@nestjs/common";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";
import { CreateDocumentService } from "./services/create-document.service";
import { CreateDownloadUrlService } from "./services/create-download-url.service";
import { FindAllDocumentsService } from "./services/find-all-documents.service";
import { FindDocumentByIdService } from "./services/find-document-by-id.service";
import { RemoveDocumentService } from "./services/remove-document.service";
import { UpdateDocumentService } from "./services/update-document.service";

const services = [
  DocumentsService,
  FindDocumentByIdService,
  FindAllDocumentsService,
  CreateDocumentService,
  UpdateDocumentService,
  CreateDownloadUrlService,
  RemoveDocumentService,
];

@Module({
  controllers: [DocumentsController],
  providers: services,
  exports: services,
})
export class DocumentsModule {}
