import { Injectable } from "@nestjs/common";
import { AppointmentStatus, Prisma } from "@prisma/client";
import { PageDto, PageMetaDto } from "../../../common/dto/page.dto";
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
    const filteredStart =
      query.date ?? (query.from && query.to ? query.from : undefined);
    if (
      query.derivedState === "ATRASADA" &&
      filteredStart &&
      ClinicTime.dayRange(filteredStart).start.getTime() >=
        now.getTime() - settings.lateToleranceMinutes * 60_000
    ) {
      return new PageDto(
        [],
        new PageMetaDto({ pageOptionsDto: query, itemCount: 0 }),
      );
    }
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
    let dateEnd: Date | undefined;

    if (query.date) {
      const { start, end } = ClinicTime.dayRange(query.date);
      where.startsAt = { gte: start, lt: end };
      dateEnd = end;
    } else if (query.from && query.to) {
      const { start, end } = ClinicTime.rangeOf(query.from, query.to, 92);
      where.startsAt = { gte: start, lt: end };
      dateEnd = end;
    }

    if (query.professionalId) where.professionalId = query.professionalId;
    if (query.patientId) where.patientId = query.patientId;
    if (query.status?.length) where.status = { in: query.status };
    if (query.type) where.type = query.type;

    if (query.search) {
      where.patient = { name: { contains: query.search, mode: "insensitive" } };
    }

    if (query.derivedState === "ATRASADA") {
      // Atrasada só existe entre os status ainda não atendidos; com filtro de
      // status junto, vale a interseção dos dois.
      const lateStatuses: AppointmentStatus[] = [
        AppointmentStatus.AGENDADA,
        AppointmentStatus.CONFIRMADA,
      ];
      where.status = {
        in: query.status?.length
          ? lateStatuses.filter((status) => query.status?.includes(status))
          : lateStatuses,
      };
      where.startsAt = {
        ...(typeof where.startsAt === "object" && where.startsAt !== null
          ? where.startsAt
          : {}),
        lt: new Date(
          Math.min(
            dateEnd?.getTime() ?? Number.POSITIVE_INFINITY,
            now.getTime() - lateToleranceMinutes * 60_000,
          ),
        ),
      };
    }

    return where;
  }
}
