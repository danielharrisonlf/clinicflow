import { Injectable } from "@nestjs/common";
import { AppException } from "../../../common/exceptions/app.exception";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { DocumentWithPatient, toDocumentResponse } from "../document.mapper";
import { DocumentResponseDto } from "../dto/document.dto";

@Injectable()
export class FindDocumentByIdService {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string): Promise<DocumentResponseDto> {
    const document = await this.getOrThrow(id);
    return toDocumentResponse(document);
  }

  async getOrThrow(id: string): Promise<DocumentWithPatient> {
    const document = await this.prisma.document.findFirst({
      where: { id, deletedAt: null },
      include: { patient: { select: { id: true, name: true } } },
    });
    if (!document) throw AppException.notFound("Documento", id);
    return document;
  }
}
