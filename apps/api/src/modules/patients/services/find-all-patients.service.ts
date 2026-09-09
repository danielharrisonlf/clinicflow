import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PageDto } from "../../../common/dto/page.dto";
import { paginate } from "../../../common/utils/paginate.util";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { PatientListItemDto } from "../dto/patient.dto";
import { ListPatientsQueryRequest } from "../requests/list-patients.request";
import {
  OPEN_TASK_STATUSES,
  PatientEnricherService,
} from "./patient-enricher.service";

const ORDERABLE_FIELDS = new Set(["name", "createdAt"]);

@Injectable()
export class FindAllPatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enricher: PatientEnricherService,
  ) {}

  async execute(
    options: ListPatientsQueryRequest,
  ): Promise<PageDto<PatientListItemDto>> {
    const where = this.buildWhere(options);
    const orderField = ORDERABLE_FIELDS.has(options.orderBy ?? "")
      ? options.orderBy
      : "name";

    const page = await paginate(
      options,
      (args) =>
        this.prisma.patient.findMany({
          ...args,
          where,
          orderBy: [
            { [orderField as string]: options.direction },
            { id: options.direction },
          ],
        }),
      () => this.prisma.patient.count({ where }),
    );

    const enriched = await this.enricher.enrich(page.data);
    return new PageDto(enriched, page.meta);
  }

  buildWhere(options: ListPatientsQueryRequest): Prisma.PatientWhereInput {
    const where: Prisma.PatientWhereInput = { deletedAt: null };

    if (options.search) {
      const term = options.search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { cpf: { contains: term.replace(/\D/g, "") } },
        { phone: { contains: term.replace(/\D/g, "") } },
      ];
    }

    if (options.hasPendencies) {
      where.tasks = { some: { status: { in: OPEN_TASK_STATUSES } } };
    }

    return where;
  }
}
