import { Injectable } from "@nestjs/common";
import { AppointmentStatus, Patient, TaskStatus } from "@prisma/client";
import { ClinicTime } from "../../../common/utils/clinic-time.util";
import { ClockService } from "../../../shared/clock/clock.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { PatientListItemDto } from "../dto/patient.dto";

export const OPEN_TASK_STATUSES: TaskStatus[] = [
  TaskStatus.ABERTA,
  TaskStatus.EM_ANDAMENTO,
];

@Injectable()
export class PatientEnricherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
  ) {}

  /**
   * Preenche as colunas calculadas de "Última consulta", "Próxima" e
   * "Pendências" com três agregações escopadas aos ids da página.
   */
  async enrich(patients: Patient[]): Promise<PatientListItemDto[]> {
    if (patients.length === 0) return [];

    const ids = patients.map((p) => p.id);
    const now = this.clock.now();

    const [lastVisits, nextVisits, openTasks] = await Promise.all([
      this.prisma.appointment.groupBy({
        by: ["patientId"],
        where: {
          patientId: { in: ids },
          startsAt: { lt: now },
          status: {
            in: [AppointmentStatus.CONCLUIDA, AppointmentStatus.EM_ATENDIMENTO],
          },
        },
        _max: { startsAt: true },
      }),
      this.prisma.appointment.groupBy({
        by: ["patientId"],
        where: {
          patientId: { in: ids },
          startsAt: { gte: now },
          status: {
            notIn: [AppointmentStatus.CANCELADA, AppointmentStatus.REAGENDADA],
          },
        },
        _min: { startsAt: true },
      }),
      this.prisma.task.groupBy({
        by: ["patientId"],
        where: { patientId: { in: ids }, status: { in: OPEN_TASK_STATUSES } },
        _count: { _all: true },
      }),
    ]);

    const lastByPatient = new Map(
      lastVisits.map((r) => [r.patientId, r._max.startsAt]),
    );
    const nextByPatient = new Map(
      nextVisits.map((r) => [r.patientId, r._min.startsAt]),
    );
    const tasksByPatient = new Map(
      openTasks.map((r) => [r.patientId, r._count._all]),
    );

    return patients.map((patient) => ({
      id: patient.id,
      name: patient.name,
      age: ClinicTime.ageOf(patient.birthDate),
      phone: patient.phone,
      lastVisitAt: lastByPatient.get(patient.id)?.toISOString() ?? null,
      nextVisitAt: nextByPatient.get(patient.id)?.toISOString() ?? null,
      openTasksCount: tasksByPatient.get(patient.id) ?? 0,
    }));
  }
}
