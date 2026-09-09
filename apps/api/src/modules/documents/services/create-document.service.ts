import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { uuidv7 } from "uuidv7";
import { AppException } from "../../../common/exceptions/app.exception";
import type { AuthenticatedUser } from "../../../common/interfaces/authenticated-user.interface";
import { AuditService } from "../../../shared/audit/audit.service";
import {
  DocumentUploadedPayload,
  DomainEvent,
} from "../../../shared/events/domain-events";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import {
  guessDocumentType,
  StorageService,
} from "../../../shared/storage/storage.service";
import { toDocumentResponse } from "../document.mapper";
import { DocumentResponseDto } from "../dto/document.dto";
import { CreateDocumentRequest } from "../requests/create-document.request";

@Injectable()
export class CreateDocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly events: EventEmitter2,
  ) {}

  async execute(
    dto: CreateDocumentRequest,
    actor: AuthenticatedUser,
  ): Promise<DocumentResponseDto> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, deletedAt: null },
    });
    if (!patient) throw AppException.notFound("Paciente", dto.patientId);

    if (dto.appointmentId) {
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: dto.appointmentId },
      });
      if (!appointment)
        throw AppException.notFound("Consulta", dto.appointmentId);
    }

    const meta = await this.storage.confirmUpload(dto.objectKey);

    const document = await this.prisma.document.create({
      data: {
        id: uuidv7(),
        patientId: dto.patientId,
        appointmentId: dto.appointmentId ?? null,
        objectKey: dto.objectKey,
        fileName: dto.fileName,
        mimeType: meta.mimeType,
        byteSize: meta.byteSize,
        type: dto.type ?? guessDocumentType(dto.fileName),
        source: dto.source ?? null,
        uploadedById: actor.id,
      },
      include: { patient: { select: { id: true, name: true } } },
    });

    await this.audit.record({
      actor,
      action: "document.uploaded",
      entity: "Document",
      entityId: document.id,
      after: { fileName: document.fileName, patientId: document.patientId },
    });

    const payload: DocumentUploadedPayload = {
      documentId: document.id,
      patientId: document.patientId,
      fileName: document.fileName,
    };
    this.events.emit(DomainEvent.DocumentUploaded, payload);

    return toDocumentResponse(document);
  }
}
