import { Injectable } from "@nestjs/common";
import { uuidv7 } from "uuidv7";
import { AppException } from "../../../common/exceptions/app.exception";
import type { AuthenticatedUser } from "../../../common/interfaces/authenticated-user.interface";
import { ClinicTime } from "../../../common/utils/clinic-time.util";
import { AuditService } from "../../../shared/audit/audit.service";
import { ClockService } from "../../../shared/clock/clock.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { TaskResponseDto } from "../dto/task.dto";
import { CreateTaskRequest } from "../requests/create-task.request";
import { toTaskResponse } from "../task.mapper";

@Injectable()
export class CreateTaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly audit: AuditService,
  ) {}

  async execute(
    dto: CreateTaskRequest,
    actor: AuthenticatedUser,
  ): Promise<TaskResponseDto> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, deletedAt: null },
    });
    if (!patient) throw AppException.notFound("Paciente", dto.patientId);

    const task = await this.prisma.task.create({
      data: {
        id: uuidv7(),
        patientId: dto.patientId,
        appointmentId: dto.appointmentId ?? null,
        type: dto.type,
        title: dto.title,
        notes: dto.notes ?? null,
        dueAt: dto.dueAt ? ClinicTime.dayRange(dto.dueAt).end : null,
        assigneeId: actor.id,
      },
      include: { patient: { select: { id: true, name: true, phone: true } } },
    });

    await this.audit.record({
      actor,
      action: "task.created",
      entity: "Task",
      entityId: task.id,
      after: { type: task.type, title: task.title },
    });

    return toTaskResponse(task, this.clock.now());
  }
}
