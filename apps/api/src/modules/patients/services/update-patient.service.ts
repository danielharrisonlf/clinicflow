import { Injectable } from "@nestjs/common";
import { ErrorCode } from "../../../common/constants/error-codes";
import { AppException } from "../../../common/exceptions/app.exception";
import type { AuthenticatedUser } from "../../../common/interfaces/authenticated-user.interface";
import { AuditService } from "../../../shared/audit/audit.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { PatientDetailDto } from "../dto/patient.dto";
import { UpdatePatientRequest } from "../requests/update-patient.request";
import { FindPatientByIdService } from "./find-patient-by-id.service";

@Injectable()
export class UpdatePatientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly findByIdService: FindPatientByIdService,
  ) {}

  async execute(
    id: string,
    dto: UpdatePatientRequest,
    actor: AuthenticatedUser,
  ): Promise<PatientDetailDto> {
    const before = await this.findByIdService.getOrThrow(id);

    if (dto.cpf && dto.cpf !== before.cpf) {
      const existing = await this.prisma.patient.findUnique({
        where: { cpf: dto.cpf },
      });
      if (existing && existing.id !== id) {
        throw AppException.conflict(
          ErrorCode.PATIENT_CPF_DUPLICATE,
          `${existing.name} já está cadastrado com este CPF.`,
          { patientId: existing.id },
        );
      }
    }

    await this.prisma.patient.update({
      where: { id },
      data: {
        ...(dto.name === undefined ? {} : { name: dto.name.trim() }),
        ...(dto.cpf === undefined ? {} : { cpf: dto.cpf }),
        ...(dto.birthDate === undefined
          ? {}
          : { birthDate: new Date(dto.birthDate) }),
        ...(dto.phone === undefined ? {} : { phone: dto.phone.trim() }),
        ...(dto.email === undefined
          ? {}
          : { email: dto.email.toLowerCase().trim() }),
        ...(dto.notes === undefined ? {} : { notes: dto.notes }),
      },
    });

    await this.audit.record({
      actor,
      action: "patient.updated",
      entity: "Patient",
      entityId: id,
      before: { name: before.name, phone: before.phone, cpf: before.cpf },
      after: { ...dto },
    });

    return this.findByIdService.execute(id);
  }
}
