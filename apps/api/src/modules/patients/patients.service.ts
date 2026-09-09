import { Injectable, StreamableFile } from "@nestjs/common";
import { Patient } from "@prisma/client";
import { PageDto } from "../../common/dto/page.dto";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import {
  PatientDetailDto,
  PatientListItemDto,
  PatientSummaryDto,
} from "./dto/patient.dto";
import { CreatePatientRequest } from "./requests/create-patient.request";
import { ListPatientsQueryRequest } from "./requests/list-patients.request";
import { UpdatePatientRequest } from "./requests/update-patient.request";
import { CreatePatientService } from "./services/create-patient.service";
import { DeactivatePatientService } from "./services/deactivate-patient.service";
import { ExportPatientsService } from "./services/export-patients.service";
import { FindAllPatientsService } from "./services/find-all-patients.service";
import { FindPatientByIdService } from "./services/find-patient-by-id.service";
import { GetPatientSummaryService } from "./services/get-patient-summary.service";
import { UpdatePatientService } from "./services/update-patient.service";

/**
 * PatientsService Facade.
 *
 * Cada verbo/ação HTTP possui seu serviço isolado. Esta classe atua como
 * fachada agregadora para consumidores internos de outros módulos.
 */
@Injectable()
export class PatientsService {
  constructor(
    private readonly findAllService: FindAllPatientsService,
    private readonly findByIdService: FindPatientByIdService,
    private readonly summaryService: GetPatientSummaryService,
    private readonly createService: CreatePatientService,
    private readonly updateService: UpdatePatientService,
    private readonly deactivateService: DeactivatePatientService,
    private readonly exportService: ExportPatientsService,
  ) {}

  findAll(
    options: ListPatientsQueryRequest,
  ): Promise<PageDto<PatientListItemDto>> {
    return this.findAllService.execute(options);
  }

  findOne(id: string): Promise<PatientDetailDto> {
    return this.findByIdService.execute(id);
  }

  summary(id: string): Promise<PatientSummaryDto> {
    return this.summaryService.execute(id);
  }

  create(
    dto: CreatePatientRequest,
    actor: AuthenticatedUser,
  ): Promise<PatientDetailDto> {
    return this.createService.execute(dto, actor);
  }

  update(
    id: string,
    dto: UpdatePatientRequest,
    actor: AuthenticatedUser,
  ): Promise<PatientDetailDto> {
    return this.updateService.execute(id, dto, actor);
  }

  deactivate(id: string, actor: AuthenticatedUser): Promise<void> {
    return this.deactivateService.execute(id, actor);
  }

  exportCsv(options: ListPatientsQueryRequest): Promise<StreamableFile> {
    return this.exportService.execute(options);
  }

  getOrThrow(id: string): Promise<Patient> {
    return this.findByIdService.getOrThrow(id);
  }
}
