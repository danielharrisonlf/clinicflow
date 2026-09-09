import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PageDto } from "../../../common/dto/page.dto";
import { PageOptionsDto } from "../../../common/dto/page-options.dto";
import { paginate } from "../../../common/utils/paginate.util";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { ProfessionalResponseDto } from "../dto/professional.dto";
import { ProfessionalEnricherService } from "./professional-enricher.service";

@Injectable()
export class FindAllProfessionalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enricher: ProfessionalEnricherService,
  ) {}

  async execute(
    options: PageOptionsDto,
  ): Promise<PageDto<ProfessionalResponseDto>> {
    const where: Prisma.ProfessionalWhereInput = options.search
      ? {
          OR: [
            { name: { contains: options.search, mode: "insensitive" } },
            { specialty: { contains: options.search, mode: "insensitive" } },
          ],
        }
      : {};

    const page = await paginate(
      options,
      (args) =>
        this.prisma.professional.findMany({
          ...args,
          where,
          include: { scheduleWindows: true },
          orderBy: [{ name: options.direction }, { id: options.direction }],
        }),
      () => this.prisma.professional.count({ where }),
    );

    const enriched = await this.enricher.enrich(page.data);
    return new PageDto(enriched, page.meta);
  }
}
