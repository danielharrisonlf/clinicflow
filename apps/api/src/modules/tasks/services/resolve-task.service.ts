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
export class ResolveTaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly audit: AuditService,
    private readonly findByIdService: FindTaskByIdService,
  ) {}

  async execute(
    id: string,
    notes: string | undefined,
    actor: AuthenticatedUser,
  ): Promise<TaskResponseDto> {
    const before = await this.findByIdService.getOrThrow(id);
    if (before.status === TaskStatus.RESOLVIDA) {
      return toTaskResponse(before, this.clock.now());
    }

    const task = await this.prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.RESOLVIDA,
        resolvedAt: this.clock.now(),
        resolvedById: actor.id,
        ...(notes ? { notes } : {}),
      },
      include: { patient: { select: { id: true, name: true, phone: true } } },
    });

    await this.audit.record({
      actor,
      action: "task.resolved",
      entity: "Task",
      entityId: id,
      before: { status: before.status },
      after: { status: TaskStatus.RESOLVIDA },
    });

    return toTaskResponse(task, this.clock.now());
  }
}
