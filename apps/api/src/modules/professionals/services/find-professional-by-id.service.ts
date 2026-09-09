import { Injectable } from "@nestjs/common";
import { AppException } from "../../../common/exceptions/app.exception";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { ProfessionalResponseDto } from "../dto/professional.dto";
import {
  ProfessionalEnricherService,
  ProfessionalWithWindows,
} from "./professional-enricher.service";

@Injectable()
export class FindProfessionalByIdService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enricher: ProfessionalEnricherService,
  ) {}

  async execute(id: string): Promise<ProfessionalResponseDto> {
    const professional = await this.getOrThrow(id);
    const [enriched] = await this.enricher.enrich([professional]);
    if (!enriched) throw AppException.notFound("Profissional", id);
    return enriched;
  }

  async getOrThrow(id: string): Promise<ProfessionalWithWindows> {
    const professional = await this.prisma.professional.findUnique({
      where: { id },
      include: { scheduleWindows: true },
    });
    if (!professional) throw AppException.notFound("Profissional", id);
    return professional;
  }
}
