import { Injectable } from "@nestjs/common";
import {
  CursorOptionsDto,
  CursorPageDto,
} from "../../../common/dto/cursor-page.dto";
import { paginateByCursor } from "../../../common/utils/paginate.util";
import { ClockService } from "../../../shared/clock/clock.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { SettingsService } from "../../settings/settings.service";
import {
  APPOINTMENT_INCLUDE,
  toAppointmentListItem,
} from "../appointment.mapper";
import { AppointmentListItemDto } from "../dto/appointment-response.dto";

@Injectable()
export class ListPatientAppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly clock: ClockService,
  ) {}

  async execute(
    patientId: string,
    options: CursorOptionsDto,
  ): Promise<CursorPageDto<AppointmentListItemDto>> {
    const settings = await this.settings.get();
    const now = this.clock.now();

    const page = await paginateByCursor(
      options,
      ({ take, cursor }) =>
        this.prisma.appointment.findMany({
          take,
          where: {
            patientId,
            ...(cursor
              ? {
                  OR: [
                    { startsAt: { lt: cursor.at } },
                    { startsAt: cursor.at, id: { lt: cursor.id } },
                  ],
                }
              : {}),
          },
          include: APPOINTMENT_INCLUDE,
          orderBy: [{ startsAt: "desc" }, { id: "desc" }],
        }),
      (row) => ({ at: row.startsAt, id: row.id }),
    );

    return new CursorPageDto(
      page.data.map((item) =>
        toAppointmentListItem(item, now, settings.lateToleranceMinutes),
      ),
      page.meta,
    );
  }
}
