import { Injectable } from "@nestjs/common";
import { AppointmentStatus, Prisma } from "@prisma/client";
import { PageDto } from "../../../common/dto/page.dto";
import { ClinicTime } from "../../../common/utils/clinic-time.util";
import { paginate } from "../../../common/utils/paginate.util";
import { ClockService } from "../../../shared/clock/clock.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { SettingsService } from "../../settings/settings.service";
import {
  APPOINTMENT_INCLUDE,
  toAppointmentListItem,
} from "../appointment.mapper";
import { AppointmentListItemDto } from "../dto/appointment-response.dto";
import { ListAppointmentsQueryRequest } from "../requests/list-appointments.request";

@Injectable()
export class FindAllAppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly clock: ClockService,
  ) {}

  async execute(
    query: ListAppointmentsQueryRequest,
  ): Promise<PageDto<AppointmentListItemDto>> {
    const settings = await this.settings.get();
    const now = this.clock.now();
    const where = this.buildWhere(query, now, settings.lateToleranceMinutes);

    const page = await paginate(
      query,
      (args) =>
        this.prisma.appointment.findMany({
          ...args,
          where,
          include: APPOINTMENT_INCLUDE,
          orderBy: [{ startsAt: query.direction }, { id: query.direction }],
        }),
      () => this.prisma.appointment.count({ where }),
    );

    return new PageDto(
      page.data.map((item) =>
        toAppointmentListItem(item, now, settings.lateToleranceMinutes),
      ),
      page.meta,
    );
  }

  private buildWhere(
    query: ListAppointmentsQueryRequest,
    now: Date,
    lateToleranceMinutes: number,
  ): Prisma.AppointmentWhereInput {
    const where: Prisma.AppointmentWhereInput = {};

    if (query.date) {
      const { start, end } = ClinicTime.dayRange(query.date);
      where.startsAt = { gte: start, lt: end };
    } else if (query.from && query.to) {
      const { start, end } = ClinicTime.rangeOf(query.from, query.to, 92);
      where.startsAt = { gte: start, lt: end };
    }

    if (query.professionalId) where.professionalId = query.professionalId;
    if (query.patientId) where.patientId = query.patientId;
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;

    if (query.search) {
      where.patient = { name: { contains: query.search, mode: "insensitive" } };
    }

    if (query.derivedState === "ATRASADA") {
      where.status = {
        in: [AppointmentStatus.AGENDADA, AppointmentStatus.CONFIRMADA],
      };
      where.startsAt = {
        ...(typeof where.startsAt === "object" && where.startsAt !== null
          ? where.startsAt
          : {}),
        lt: new Date(now.getTime() - lateToleranceMinutes * 60_000),
      };
    }

    return where;
  }
}
