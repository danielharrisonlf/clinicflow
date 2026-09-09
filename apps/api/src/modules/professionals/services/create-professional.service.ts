import { Injectable } from "@nestjs/common";
import { uuidv7 } from "uuidv7";
import type { AuthenticatedUser } from "../../../common/interfaces/authenticated-user.interface";
import { AuditService } from "../../../shared/audit/audit.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { ProfessionalResponseDto } from "../dto/professional.dto";
import { CreateProfessionalRequest } from "../requests/create-professional.request";
import { FindProfessionalByIdService } from "./find-professional-by-id.service";

@Injectable()
export class CreateProfessionalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly findByIdService: FindProfessionalByIdService,
  ) {}

  async execute(
    dto: CreateProfessionalRequest,
    actor: AuthenticatedUser,
  ): Promise<ProfessionalResponseDto> {
    const professional = await this.prisma.professional.create({
      data: {
        id: uuidv7(),
        name: dto.name.trim(),
        specialty: dto.specialty.trim(),
        councilType: dto.councilType.toUpperCase(),
        councilNumber: dto.councilNumber.trim(),
        defaultDurationMinutes: dto.defaultDurationMinutes ?? 30,
        userId: dto.userId ?? null,
      },
      include: { scheduleWindows: true },
    });

    await this.audit.record({
      actor,
      action: "professional.created",
      entity: "Professional",
      entityId: professional.id,
      after: { name: professional.name, specialty: professional.specialty },
    });

    return this.findByIdService.execute(professional.id);
  }
}
