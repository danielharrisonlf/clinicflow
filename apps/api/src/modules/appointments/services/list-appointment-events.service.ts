import { Injectable } from "@nestjs/common";
import {
  CursorOptionsDto,
  CursorPageDto,
} from "../../../common/dto/cursor-page.dto";
import { paginateByCursor } from "../../../common/utils/paginate.util";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { toAppointmentEvent } from "../appointment.mapper";
import { AppointmentEventDto } from "../dto/appointment-response.dto";
import { FindAppointmentByIdService } from "./find-appointment-by-id.service";

@Injectable()
export class ListAppointmentEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly findByIdService: FindAppointmentByIdService,
  ) {}

  async execute(
    id: string,
    options: CursorOptionsDto,
  ): Promise<CursorPageDto<AppointmentEventDto>> {
    await this.findByIdService.getOrThrow(id);

    const page = await paginateByCursor(
      options,
      ({ take, cursor }) =>
        this.prisma.appointmentEvent.findMany({
          take,
          where: {
            appointmentId: id,
            ...(cursor
              ? {
                  OR: [
                    { createdAt: { lt: cursor.at } },
                    { createdAt: cursor.at, id: { lt: cursor.id } },
                  ],
                }
              : {}),
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        }),
      (row) => ({ at: row.createdAt, id: row.id }),
    );

    return new CursorPageDto(page.data.map(toAppointmentEvent), page.meta);
  }
}
