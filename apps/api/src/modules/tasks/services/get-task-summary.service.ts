import { Injectable } from "@nestjs/common";
import { TaskStatus, TaskType } from "@prisma/client";
import { DateTime } from "luxon";
import { ClinicTime } from "../../../common/utils/clinic-time.util";
import { ClockService } from "../../../shared/clock/clock.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { TaskSummaryDto } from "../dto/task.dto";
import { OPEN_STATUSES } from "../task.mapper";

@Injectable()
export class GetTaskSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
  ) {}

  /** Os quatro cartões do topo. */
  async execute(): Promise<TaskSummaryDto> {
    const now = this.clock.now();
    const todayStart = DateTime.fromJSDate(now)
      .setZone(ClinicTime.zone)
      .startOf("day")
      .toUTC()
      .toJSDate();

    const [
      returnsToSchedule,
      pendingConfirmations,
      noShowsToRecover,
      resolvedToday,
    ] = await Promise.all([
      this.prisma.task.count({
        where: {
          type: TaskType.RETORNO_A_AGENDAR,
          status: { in: OPEN_STATUSES },
        },
      }),
      this.prisma.task.count({
        where: {
          type: TaskType.CONFIRMACAO_PENDENTE,
          status: { in: OPEN_STATUSES },
        },
      }),
      this.prisma.task.count({
        where: {
          type: TaskType.RESGATE_NO_SHOW,
          status: { in: OPEN_STATUSES },
        },
      }),
      this.prisma.task.count({
        where: {
          status: TaskStatus.RESOLVIDA,
          resolvedAt: { gte: todayStart },
        },
      }),
    ]);

    return {
      returnsToSchedule,
      pendingConfirmations,
      noShowsToRecover,
      resolvedToday,
    };
  }
}
