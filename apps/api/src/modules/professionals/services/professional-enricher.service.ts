import { Injectable } from "@nestjs/common";
import { Professional, ScheduleWindow, TaskStatus } from "@prisma/client";
import {
  ClinicTime,
  minutesOfDay,
} from "../../../common/utils/clinic-time.util";
import { ClockService } from "../../../shared/clock/clock.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { ACTIVE_STATUSES } from "../../appointments/appointment-status.machine";
import { ProfessionalResponseDto } from "../dto/professional.dto";

export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export type ProfessionalWithWindows = Professional & {
  scheduleWindows: ScheduleWindow[];
};

@Injectable()
export class ProfessionalEnricherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
  ) {}

  buildWorkdaysLabel(windows: ScheduleWindow[]): string {
    if (windows.length === 0) return "Sem grade configurada";
    const weekdays = [...new Set(windows.map((w) => w.weekday))].sort(
      (a, b) => a - b,
    );

    if (
      weekdays.length === 5 &&
      weekdays.every((day, index) => day === index + 1)
    ) {
      return "Seg a Sex";
    }
    return weekdays.map((day) => WEEKDAY_SHORT[day]).join(", ");
  }

  buildScheduleSummary(windows: ScheduleWindow[]): string {
    if (windows.length === 0) return "Sem grade configurada";

    const label = this.buildWorkdaysLabel(windows);
    const earliest = windows.reduce(
      (min, w) =>
        minutesOfDay(w.startTime) < minutesOfDay(min) ? w.startTime : min,
      windows[0]?.startTime ?? "00:00",
    );
    const latest = windows.reduce(
      (max, w) =>
        minutesOfDay(w.endTime) > minutesOfDay(max) ? w.endTime : max,
      windows[0]?.endTime ?? "00:00",
    );

    return `${label}, ${earliest} às ${latest}`;
  }

  async enrich(
    professionals: ProfessionalWithWindows[],
  ): Promise<ProfessionalResponseDto[]> {
    if (professionals.length === 0) return [];

    const ids = professionals.map((p) => p.id);
    const today = ClinicTime.dayRange(ClinicTime.isoDateOf(this.clock.now()));

    const [todayCounts, taskCounts] = await Promise.all([
      this.prisma.appointment.groupBy({
        by: ["professionalId"],
        where: {
          professionalId: { in: ids },
          startsAt: { gte: today.start, lt: today.end },
          status: { in: ACTIVE_STATUSES },
        },
        _count: { _all: true },
      }),
      this.prisma.task.findMany({
        where: {
          status: { in: [TaskStatus.ABERTA, TaskStatus.EM_ANDAMENTO] },
          appointment: { professionalId: { in: ids } },
        },
        select: { appointment: { select: { professionalId: true } } },
      }),
    ]);

    const appointmentsByProfessional = new Map(
      todayCounts.map((row) => [row.professionalId, row._count._all]),
    );

    const tasksByProfessional = new Map<string, number>();
    for (const task of taskCounts) {
      const professionalId = task.appointment?.professionalId;
      if (!professionalId) continue;
      tasksByProfessional.set(
        professionalId,
        (tasksByProfessional.get(professionalId) ?? 0) + 1,
      );
    }

    return professionals.map((professional) => ({
      id: professional.id,
      name: professional.name,
      specialty: professional.specialty,
      credential: `${professional.specialty} (${professional.councilType} ${professional.councilNumber})`,
      workdaysLabel: this.buildWorkdaysLabel(professional.scheduleWindows),
      defaultDurationMinutes: professional.defaultDurationMinutes,
      isActive: professional.isActive,
      todayAppointmentsCount:
        appointmentsByProfessional.get(professional.id) ?? 0,
      openTasksCount: tasksByProfessional.get(professional.id) ?? 0,
      userId: professional.userId,
    }));
  }
}
