import { Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../../../common/interfaces/authenticated-user.interface";
import { ClinicTime } from "../../../common/utils/clinic-time.util";
import { AuditService } from "../../../shared/audit/audit.service";
import { ClockService } from "../../../shared/clock/clock.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { TaskResponseDto } from "../dto/task.dto";
import { UpdateTaskRequest } from "../requests/update-task.request";
import { toTaskResponse } from "../task.mapper";
import { FindTaskByIdService } from "./find-task-by-id.service";

@Injectable()
export class UpdateTaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly audit: AuditService,
    private readonly findByIdService: FindTaskByIdService,
  ) {}

  async execute(
    id: string,
    dto: UpdateTaskRequest,
    actor: AuthenticatedUser,
  ): Promise<TaskResponseDto> {
    await this.findByIdService.getOrThrow(id);

    const task = await this.prisma.task.update({
      where: { id },
      data: {
        ...(dto.title === undefined ? {} : { title: dto.title }),
        ...(dto.notes === undefined ? {} : { notes: dto.notes }),
        ...(dto.status === undefined ? {} : { status: dto.status }),
        ...(dto.dueAt === undefined
          ? {}
          : { dueAt: ClinicTime.dayRange(dto.dueAt).end }),
      },
      include: { patient: { select: { id: true, name: true, phone: true } } },
    });

    await this.audit.record({
      actor,
      action: "task.updated",
      entity: "Task",
      entityId: id,
      after: { ...dto },
    });

    return toTaskResponse(task, this.clock.now());
  }
}
