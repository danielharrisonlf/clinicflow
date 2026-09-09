import { Injectable } from "@nestjs/common";
import { AppointmentStatus } from "@prisma/client";
import { AppException } from "../../../common/exceptions/app.exception";
import { ClinicTime } from "../../../common/utils/clinic-time.util";
import { ClockService } from "../../../shared/clock/clock.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { APPOINTMENT_INCLUDE } from "../../appointments/appointment.mapper";
import { WaitingRoomDisplayItemDto } from "../waiting-room.service";

@Injectable()
export class GetWaitingRoomDisplayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
  ) {}

  /** Payload do chamador de TV: nome abreviado, sem telefone nem diagnóstico. */
  async execute(
    token: string,
    expected: string,
  ): Promise<WaitingRoomDisplayItemDto[]> {
    if (token !== expected) {
      throw AppException.notFound("Painel");
    }

    const now = this.clock.now();
    const { start, end } = ClinicTime.dayRange(ClinicTime.isoDateOf(now));

    const called = await this.prisma.appointment.findMany({
      where: {
        calledAt: { not: null },
        status: {
          in: [AppointmentStatus.CHECK_IN, AppointmentStatus.EM_ATENDIMENTO],
        },
        startsAt: { gte: start, lt: end },
      },
      include: APPOINTMENT_INCLUDE,
      orderBy: { calledAt: "desc" },
      take: 5,
    });

    return called.map((appointment) => ({
      displayName: abbreviateName(appointment.patient.name),
      room: appointment.room,
      professionalName: appointment.professional.name,
    }));
  }
}

/** "Carlos Eduardo Dias" → "Carlos E. D." — nome completo num painel público não. */
function abbreviateName(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? "";
  const initials = parts
    .slice(1)
    .map((part) => `${part.charAt(0).toUpperCase()}.`);
  return [first, ...initials].join(" ");
}
