import { Injectable } from "@nestjs/common";
import { uuidv7 } from "uuidv7";
import { ErrorCode } from "../../../common/constants/error-codes";
import { AppException } from "../../../common/exceptions/app.exception";
import type { AuthenticatedUser } from "../../../common/interfaces/authenticated-user.interface";
import { AuditService } from "../../../shared/audit/audit.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { PatientDetailDto } from "../dto/patient.dto";
import { CreatePatientRequest } from "../requests/create-patient.request";
import { FindPatientByIdService } from "./find-patient-by-id.service";

@Injectable()
export class CreatePatientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly findByIdService: FindPatientByIdService,
  ) {}

  async execute(
    dto: CreatePatientRequest,
    actor: AuthenticatedUser,
  ): Promise<PatientDetailDto> {
    if (dto.cpf) {
      const existing = await this.prisma.patient.findUnique({
        where: { cpf: dto.cpf },
      });
      if (existing) {
        throw AppException.conflict(
          ErrorCode.PATIENT_CPF_DUPLICATE,
          `${existing.name} já está cadastrado com este CPF.`,
          { patientId: existing.id },
        );
      }
    }

    const patient = await this.prisma.patient.create({
      data: {
        id: uuidv7(),
        name: dto.name.trim(),
        cpf: dto.cpf ?? null,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        phone: dto.phone.trim(),
        email: dto.email?.toLowerCase().trim() ?? null,
        notes: dto.notes ?? null,
      },
    });

    await this.audit.record({
      actor,
      action: "patient.created",
      entity: "Patient",
      entityId: patient.id,
      after: { name: patient.name, phone: patient.phone },
    });

    return this.findByIdService.execute(patient.id);
  }
}
