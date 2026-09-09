import { Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../../../common/interfaces/authenticated-user.interface";
import { AuditService } from "../../../shared/audit/audit.service";
import { ClockService } from "../../../shared/clock/clock.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { FindDocumentByIdService } from "./find-document-by-id.service";

@Injectable()
export class RemoveDocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly audit: AuditService,
    private readonly findByIdService: FindDocumentByIdService,
  ) {}

  /**
   * Remoção lógica. O objeto no bucket é apagado depois pelo expurgo diário.
   */
  async execute(id: string, actor: AuthenticatedUser): Promise<void> {
    await this.findByIdService.getOrThrow(id);
    await this.prisma.document.update({
      where: { id },
      data: { deletedAt: this.clock.now() },
    });
    await this.audit.record({
      actor,
      action: "document.deleted",
      entity: "Document",
      entityId: id,
    });
  }
}
