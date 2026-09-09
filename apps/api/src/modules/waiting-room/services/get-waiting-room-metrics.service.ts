import { Injectable } from "@nestjs/common";
import { AppointmentStatus } from "@prisma/client";
import { ClinicTime } from "../../../common/utils/clinic-time.util";
import { ClockService } from "../../../shared/clock/clock.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { WaitingRoomMetricsDto } from "../waiting-room.service";
import { ListWaitingRoomService } from "./list-waiting-room.service";

@Injectable()
export class GetWaitingRoomMetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly listService: ListWaitingRoomService,
  ) {}

  async execute(): Promise<WaitingRoomMetricsDto> {
    const queue = await this.listService.execute();
    const now = this.clock.now();
    const { start, end } = ClinicTime.dayRange(ClinicTime.isoDateOf(now));

    const inProgressCount = await this.prisma.appointment.count({
      where: {
        status: AppointmentStatus.EM_ATENDIMENTO,
        startsAt: { gte: start, lt: end },
      },
    });

    const waits = queue.map((item) => item.waitingMinutes);
    return {
      waitingCount: queue.length,
      averageWaitMinutes:
        waits.length === 0
          ? 0
          : Math.round(waits.reduce((a, b) => a + b, 0) / waits.length),
      longestWaitMinutes: waits.length === 0 ? 0 : Math.max(...waits),
      inProgressCount,
    };
  }
}
