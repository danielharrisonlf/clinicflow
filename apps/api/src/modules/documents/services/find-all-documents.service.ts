import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PageDto } from "../../../common/dto/page.dto";
import { PageOptionsDto } from "../../../common/dto/page-options.dto";
import { ClinicTime } from "../../../common/utils/clinic-time.util";
import { paginate } from "../../../common/utils/paginate.util";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { toDocumentResponse } from "../document.mapper";
import { DocumentResponseDto } from "../dto/document.dto";
import { ListDocumentsQueryRequest } from "../requests/list-documents.request";

@Injectable()
export class FindAllDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: ListDocumentsQueryRequest | PageOptionsDto,
    overrides: { patientId?: string; appointmentId?: string } = {},
  ): Promise<PageDto<DocumentResponseDto>> {
    const filters = query as ListDocumentsQueryRequest;
    const where: Prisma.DocumentWhereInput = { deletedAt: null };

    if (filters.type) where.type = filters.type;
    if (overrides.patientId ?? filters.patientId) {
      where.patientId = overrides.patientId ?? filters.patientId;
    }
    if (overrides.appointmentId) where.appointmentId = overrides.appointmentId;
    if (!overrides.appointmentId && filters.appointmentId) {
      where.appointmentId = filters.appointmentId;
    }

    if (filters.from || filters.to) {
      const range = ClinicTime.rangeOf(
        filters.from ?? filters.to ?? "",
        filters.to ?? filters.from ?? "",
        366,
      );
      where.createdAt = { gte: range.start, lt: range.end };
    }

    if (filters.search) {
      where.OR = [
        { fileName: { contains: filters.search, mode: "insensitive" } },
        {
          patient: { name: { contains: filters.search, mode: "insensitive" } },
        },
      ];
    }

    const page = await paginate(
      query,
      (args) =>
        this.prisma.document.findMany({
          ...args,
          where,
          include: { patient: { select: { id: true, name: true } } },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        }),
      () => this.prisma.document.count({ where }),
    );

    return new PageDto(page.data.map(toDocumentResponse), page.meta);
  }
}
