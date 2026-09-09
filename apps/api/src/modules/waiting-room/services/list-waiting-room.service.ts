import { Injectable } from "@nestjs/common";
import { AppointmentStatus } from "@prisma/client";
import { ClinicTime } from "../../../common/utils/clinic-time.util";
import { ClockService } from "../../../shared/clock/clock.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { APPOINTMENT_INCLUDE } from "../../appointments/appointment.mapper";
import { SettingsService } from "../../settings/settings.service";
import { WaitingRoomItemDto } from "../waiting-room.service";

@Injectable()
export class ListWaitingRoomService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly clock: ClockService,
  ) {}

  async execute(): Promise<WaitingRoomItemDto[]> {
    const now = this.clock.now();
    const settings = await this.settings.get();
    const { start, end } = ClinicTime.dayRange(ClinicTime.isoDateOf(now));

    const queue = await this.prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.CHECK_IN,
        checkedInAt: { not: null },
        startsAt: { gte: start, lt: end },
      },
      include: APPOINTMENT_INCLUDE,
      orderBy: { checkedInAt: "asc" },
      take: 50,
    });

    return queue.map((appointment) => {
      const checkedInAt = appointment.checkedInAt as Date;
      const waitingMinutes = ClinicTime.minutesBetween(checkedInAt, now);
      const isLate =
        now.getTime() >
        appointment.startsAt.getTime() + settings.lateToleranceMinutes * 60_000;

      return {
        appointmentId: appointment.id,
        waitingMinutes,
        waitingLabel: `${waitingMinutes}min`,
        patientId: appointment.patient.id,
        patientName: appointment.patient.name,
        patientPhone: appointment.patient.phone,
        type: appointment.type,
        professionalName: appointment.professional.name,
        checkedInAtLabel: ClinicTime.timeOf(checkedInAt),
        scheduledAtLabel: ClinicTime.timeOf(appointment.startsAt),
        state: isLate ? "Atrasada" : "Aguardando",
        isLate,
        wasCalled: appointment.calledAt !== null,
      };
    });
  }
}
