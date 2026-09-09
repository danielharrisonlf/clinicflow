import { Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../../../common/interfaces/authenticated-user.interface";
import { AuditService } from "../../../shared/audit/audit.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { toDocumentResponse } from "../document.mapper";
import { DocumentResponseDto } from "../dto/document.dto";
import { UpdateDocumentRequest } from "../requests/update-document.request";
import { FindDocumentByIdService } from "./find-document-by-id.service";

@Injectable()
export class UpdateDocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly findByIdService: FindDocumentByIdService,
  ) {}

  async execute(
    id: string,
    dto: UpdateDocumentRequest,
    actor: AuthenticatedUser,
  ): Promise<DocumentResponseDto> {
    const before = await this.findByIdService.getOrThrow(id);

    const document = await this.prisma.document.update({
      where: { id },
      data: {
        ...(dto.type === undefined ? {} : { type: dto.type }),
        ...(dto.patientId === undefined ? {} : { patientId: dto.patientId }),
        ...(dto.appointmentId === undefined
          ? {}
          : { appointmentId: dto.appointmentId }),
        ...(dto.source === undefined ? {} : { source: dto.source }),
      },
      include: { patient: { select: { id: true, name: true } } },
    });

    await this.audit.record({
      actor,
      action: "document.updated",
      entity: "Document",
      entityId: id,
      before: { type: before.type, patientId: before.patientId },
      after: { ...dto },
    });

    return toDocumentResponse(document);
  }
}
