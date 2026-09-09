import { Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../../../common/interfaces/authenticated-user.interface";
import { AuditService } from "../../../shared/audit/audit.service";
import { ClockService } from "../../../shared/clock/clock.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { FindPatientByIdService } from "./find-patient-by-id.service";

@Injectable()
export class DeactivatePatientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly audit: AuditService,
    private readonly findByIdService: FindPatientByIdService,
  ) {}

  /**
   * Inativação lógica. Nunca DELETE físico: o paciente é a raiz do histórico
   * clínico e da auditoria — apagar a linha apagaria o rastro de quem foi
   * atendido, que é justamente o que o sistema existe para guardar.
   */
  async execute(id: string, actor: AuthenticatedUser): Promise<void> {
    await this.findByIdService.getOrThrow(id);
    await this.prisma.patient.update({
      where: { id },
      data: { deletedAt: this.clock.now() },
    });
    await this.audit.record({
      actor,
      action: "patient.deactivated",
      entity: "Patient",
      entityId: id,
    });
  }
}
