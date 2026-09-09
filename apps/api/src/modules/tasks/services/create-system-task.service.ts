import { Injectable } from "@nestjs/common";
import { TaskType } from "@prisma/client";
import { uuidv7 } from "uuidv7";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { OPEN_STATUSES } from "../task.mapper";

@Injectable()
export class CreateSystemTaskService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Criação idempotente usada pelos ouvintes de evento e pelos crons.
   */
  async execute(params: {
    patientId: string;
    appointmentId?: string;
    type: TaskType;
    title: string;
    dueAt: Date | null;
  }): Promise<void> {
    const duplicate = await this.prisma.task.findFirst({
      where: {
        patientId: params.patientId,
        type: params.type,
        status: { in: OPEN_STATUSES },
        ...(params.appointmentId
          ? { appointmentId: params.appointmentId }
          : {}),
      },
    });
    if (duplicate) return;

    await this.prisma.task.create({
      data: {
        id: uuidv7(),
        patientId: params.patientId,
        appointmentId: params.appointmentId ?? null,
        type: params.type,
        title: params.title,
        dueAt: params.dueAt,
      },
    });
  }
}
