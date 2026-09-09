import { Injectable } from "@nestjs/common";
import { AppException } from "../../../common/exceptions/app.exception";
import type { AuthenticatedUser } from "../../../common/interfaces/authenticated-user.interface";
import { AuditService } from "../../../shared/audit/audit.service";
import { ClockService } from "../../../shared/clock/clock.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { ACTIVE_STATUSES } from "../../appointments/appointment-status.machine";
import { ProfessionalResponseDto } from "../dto/professional.dto";
import { ChangeProfessionalStatusRequest } from "../requests/change-professional-status.request";
import { FindProfessionalByIdService } from "./find-professional-by-id.service";

@Injectable()
export class ChangeProfessionalStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly audit: AuditService,
    private readonly findByIdService: FindProfessionalByIdService,
  ) {}

  async execute(
    id: string,
    dto: ChangeProfessionalStatusRequest,
    actor: AuthenticatedUser,
  ): Promise<ProfessionalResponseDto> {
    const before = await this.findByIdService.getOrThrow(id);

    // Desativar com agenda futura em pé deixaria pacientes marcados com alguém
    // que não atende mais. A recepção precisa reagendar antes.
    if (!dto.isActive) {
      const upcoming = await this.prisma.appointment.count({
        where: {
          professionalId: id,
          startsAt: { gte: this.clock.now() },
          status: { in: ACTIVE_STATUSES },
        },
      });
      if (upcoming > 0) {
        throw AppException.conflict(
          "RESOURCE_CONFLICT",
          `${before.name} ainda tem ${upcoming} consulta(s) futura(s). Reagende ou cancele antes de desativar.`,
          { upcoming },
        );
      }
    }

    await this.prisma.professional.update({
      where: { id },
      data: { isActive: dto.isActive },
    });

    await this.audit.record({
      actor,
      action: dto.isActive
        ? "professional.activated"
        : "professional.deactivated",
      entity: "Professional",
      entityId: id,
    });

    return this.findByIdService.execute(id);
  }
}
