import { Injectable } from "@nestjs/common";
import { AppException } from "../../../common/exceptions/app.exception";
import { ClockService } from "../../../shared/clock/clock.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { SettingsService } from "../../settings/settings.service";
import {
  APPOINTMENT_INCLUDE,
  AppointmentWithRelations,
  toAppointmentListItem,
} from "../appointment.mapper";
import { AppointmentDetailDto } from "../dto/appointment-response.dto";

@Injectable()
export class FindAppointmentByIdService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly clock: ClockService,
  ) {}

  async execute(id: string): Promise<AppointmentDetailDto> {
    const appointment = await this.getOrThrow(id);
    const settings = await this.settings.get();
    const documentsCount = await this.prisma.document.count({
      where: { appointmentId: id, deletedAt: null },
    });

    return {
      ...toAppointmentListItem(
        appointment,
        this.clock.now(),
        settings.lateToleranceMinutes,
      ),
      confirmedAt: appointment.confirmedAt?.toISOString() ?? null,
      checkedInAt: appointment.checkedInAt?.toISOString() ?? null,
      startedAt: appointment.startedAt?.toISOString() ?? null,
      completedAt: appointment.completedAt?.toISOString() ?? null,
      cancelledAt: appointment.cancelledAt?.toISOString() ?? null,
      cancelReason: appointment.cancelReason,
      cancelNote: appointment.cancelNote,
      rescheduledFromId: appointment.rescheduledFromId,
      documentsCount,
    };
  }

  async getOrThrow(id: string): Promise<AppointmentWithRelations> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: APPOINTMENT_INCLUDE,
    });
    if (!appointment) throw AppException.notFound("Consulta", id);
    return appointment;
  }
}
