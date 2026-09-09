import { Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../../../common/interfaces/authenticated-user.interface";
import { AuditService } from "../../../shared/audit/audit.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { AppointmentDetailDto } from "../dto/appointment-response.dto";
import { UpdateAppointmentRequest } from "../requests/update-appointment.request";
import { FindAppointmentByIdService } from "./find-appointment-by-id.service";

@Injectable()
export class UpdateAppointmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly findByIdService: FindAppointmentByIdService,
  ) {}

  async execute(
    id: string,
    dto: UpdateAppointmentRequest,
    actor: AuthenticatedUser,
  ): Promise<AppointmentDetailDto> {
    const before = await this.findByIdService.getOrThrow(id);

    await this.prisma.appointment.update({
      where: { id },
      data: {
        ...(dto.notes === undefined ? {} : { notes: dto.notes }),
        ...(dto.room === undefined ? {} : { room: dto.room }),
      },
    });

    await this.audit.record({
      actor,
      action: "appointment.updated",
      entity: "Appointment",
      entityId: id,
      before: { notes: before.notes, room: before.room },
      after: { ...dto },
    });

    return this.findByIdService.execute(id);
  }
}
