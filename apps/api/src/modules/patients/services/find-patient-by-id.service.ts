import { Injectable } from "@nestjs/common";
import { Patient } from "@prisma/client";
import { AppException } from "../../../common/exceptions/app.exception";
import { ClinicTime } from "../../../common/utils/clinic-time.util";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { PatientDetailDto, PatientListItemDto } from "../dto/patient.dto";
import { PatientEnricherService } from "./patient-enricher.service";

@Injectable()
export class FindPatientByIdService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enricher: PatientEnricherService,
  ) {}

  async execute(id: string): Promise<PatientDetailDto> {
    const patient = await this.getOrThrow(id);
    const [enriched] = await this.enricher.enrich([patient]);
    return {
      ...(enriched as PatientListItemDto),
      cpf: patient.cpf,
      birthDate: patient.birthDate
        ? ClinicTime.isoDateOf(patient.birthDate)
        : null,
      email: patient.email,
      notes: patient.notes,
      createdAt: patient.createdAt.toISOString(),
    };
  }

  async getOrThrow(id: string): Promise<Patient> {
    const patient = await this.prisma.patient.findFirst({
      where: { id, deletedAt: null },
    });
    if (!patient) throw AppException.notFound("Paciente", id);
    return patient;
  }
}
