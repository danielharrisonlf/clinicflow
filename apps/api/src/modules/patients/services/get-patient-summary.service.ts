import { Injectable } from "@nestjs/common";
import { AppointmentStatus } from "@prisma/client";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { PatientSummaryDto } from "../dto/patient.dto";
import { FindPatientByIdService } from "./find-patient-by-id.service";
import { OPEN_TASK_STATUSES } from "./patient-enricher.service";

@Injectable()
export class GetPatientSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly findByIdService: FindPatientByIdService,
  ) {}

  /** Contadores consolidados e resumo do paciente. */
  async execute(id: string): Promise<PatientSummaryDto> {
    await this.findByIdService.getOrThrow(id);

    const [appointmentsCount, cancelledCount, documentsCount, openTasksCount] =
      await Promise.all([
        this.prisma.appointment.count({ where: { patientId: id } }),
        this.prisma.appointment.count({
          where: { patientId: id, status: AppointmentStatus.CANCELADA },
        }),
        this.prisma.document.count({
          where: { patientId: id, deletedAt: null },
        }),
        this.prisma.task.count({
          where: { patientId: id, status: { in: OPEN_TASK_STATUSES } },
        }),
      ]);

    return {
      appointmentsCount,
      cancelledCount,
      documentsCount,
      openTasksCount,
    };
  }
}
