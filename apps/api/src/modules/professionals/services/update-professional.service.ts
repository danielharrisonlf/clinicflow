import { Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../../../common/interfaces/authenticated-user.interface";
import { AuditService } from "../../../shared/audit/audit.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { ProfessionalResponseDto } from "../dto/professional.dto";
import { UpdateProfessionalRequest } from "../requests/update-professional.request";
import { FindProfessionalByIdService } from "./find-professional-by-id.service";

@Injectable()
export class UpdateProfessionalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly findByIdService: FindProfessionalByIdService,
  ) {}

  async execute(
    id: string,
    dto: UpdateProfessionalRequest,
    actor: AuthenticatedUser,
  ): Promise<ProfessionalResponseDto> {
    const before = await this.findByIdService.getOrThrow(id);

    await this.prisma.professional.update({
      where: { id },
      data: {
        ...(dto.name === undefined ? {} : { name: dto.name.trim() }),
        ...(dto.specialty === undefined
          ? {}
          : { specialty: dto.specialty.trim() }),
        ...(dto.councilType === undefined
          ? {}
          : { councilType: dto.councilType.toUpperCase() }),
        ...(dto.councilNumber === undefined
          ? {}
          : { councilNumber: dto.councilNumber.trim() }),
        ...(dto.defaultDurationMinutes === undefined
          ? {}
          : { defaultDurationMinutes: dto.defaultDurationMinutes }),
        ...(dto.userId === undefined ? {} : { userId: dto.userId }),
      },
    });

    await this.audit.record({
      actor,
      action: "professional.updated",
      entity: "Professional",
      entityId: id,
      before: { name: before.name, specialty: before.specialty },
      after: { ...dto },
    });

    return this.findByIdService.execute(id);
  }
}
