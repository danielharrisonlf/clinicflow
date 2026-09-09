import { Injectable } from "@nestjs/common";
import { TaskStatus } from "@prisma/client";
import type { AuthenticatedUser } from "../../../common/interfaces/authenticated-user.interface";
import { AuditService } from "../../../shared/audit/audit.service";
import { ClockService } from "../../../shared/clock/clock.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { TaskResponseDto } from "../dto/task.dto";
import { toTaskResponse } from "../task.mapper";
import { FindTaskByIdService } from "./find-task-by-id.service";

@Injectable()
export class RegisterTaskContactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly audit: AuditService,
    private readonly findByIdService: FindTaskByIdService,
  ) {}

  /** Registra a tentativa de contato ("Ligar WhatsApp") sem resolver a tarefa. */
  async execute(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<TaskResponseDto> {
    await this.findByIdService.getOrThrow(id);
    const now = this.clock.now();

    const task = await this.prisma.task.update({
      where: { id },
      data: { lastContactAt: now, status: TaskStatus.EM_ANDAMENTO },
      include: { patient: { select: { id: true, name: true, phone: true } } },
    });

    await this.audit.record({
      actor,
      action: "task.contact_registered",
      entity: "Task",
      entityId: id,
    });

    return toTaskResponse(task, now);
  }
}
