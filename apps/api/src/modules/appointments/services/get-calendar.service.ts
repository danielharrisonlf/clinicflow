import { Injectable } from "@nestjs/common";
import { AppointmentStatus } from "@prisma/client";
import { ClinicTime } from "../../../common/utils/clinic-time.util";
import { ClockService } from "../../../shared/clock/clock.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { SettingsService } from "../../settings/settings.service";
import {
  APPOINTMENT_INCLUDE,
  toAppointmentListItem,
} from "../appointment.mapper";
import { CalendarDayDto } from "../dto/appointment-response.dto";
import { CalendarQueryRequest } from "../requests/calendar-query.request";

const WEEKDAY_LABEL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

@Injectable()
export class GetCalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly clock: ClockService,
  ) {}

  async execute(query: CalendarQueryRequest): Promise<CalendarDayDto[]> {
    const { start, end } = ClinicTime.rangeOf(query.from, query.to, 31);
    const settings = await this.settings.get();
    const now = this.clock.now();

    const appointments = await this.prisma.appointment.findMany({
      where: {
        startsAt: { gte: start, lt: end },
        status: {
          notIn: [AppointmentStatus.CANCELADA, AppointmentStatus.REAGENDADA],
        },
        ...(query.professionalId
          ? { professionalId: query.professionalId }
          : {}),
      },
      include: APPOINTMENT_INCLUDE,
      orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    });

    const byDay = new Map<string, CalendarDayDto>();
    for (const appointment of appointments) {
      const date = ClinicTime.isoDateOf(appointment.startsAt);
      const item = toAppointmentListItem(
        appointment,
        now,
        settings.lateToleranceMinutes,
      );

      const day = byDay.get(date) ?? {
        date,
        weekdayLabel:
          WEEKDAY_LABEL[ClinicTime.weekdayOf(appointment.startsAt)] ?? "",
        slots: [],
      };
      day.slots.push({
        id: item.id,
        date,
        time: item.time,
        startsAt: item.startsAt,
        durationMinutes: item.durationMinutes,
        patientName: item.patientName,
        professionalId: item.professionalId,
        professionalName: item.professionalName,
        status: item.status,
        derivedState: item.derivedState,
      });
      byDay.set(date, day);
    }

    return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
  }
}
