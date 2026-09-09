import { Module } from "@nestjs/common";
import { AppointmentsModule } from "../appointments/appointments.module";
import { DocumentsModule } from "../documents/documents.module";
import { TasksModule } from "../tasks/tasks.module";
import { PatientsController } from "./patients.controller";
import { PatientsService } from "./patients.service";
import { CreatePatientService } from "./services/create-patient.service";
import { DeactivatePatientService } from "./services/deactivate-patient.service";
import { ExportPatientsService } from "./services/export-patients.service";
import { FindAllPatientsService } from "./services/find-all-patients.service";
import { FindPatientByIdService } from "./services/find-patient-by-id.service";
import { GetPatientSummaryService } from "./services/get-patient-summary.service";
import { PatientEnricherService } from "./services/patient-enricher.service";
import { UpdatePatientService } from "./services/update-patient.service";

const services = [
  PatientsService,
  PatientEnricherService,
  FindAllPatientsService,
  FindPatientByIdService,
  GetPatientSummaryService,
  CreatePatientService,
  UpdatePatientService,
  DeactivatePatientService,
  ExportPatientsService,
];

/**
 * As abas da ficha do paciente são listagens de outros módulos exibidas sob a
 * rota do paciente. A dependência é de mão única — consultas, documentos e
 * pendências não conhecem `PatientsModule` —, então não há ciclo nem forwardRef.
 */
@Module({
  imports: [AppointmentsModule, DocumentsModule, TasksModule],
  controllers: [PatientsController],
  providers: services,
  exports: services,
})
export class PatientsModule {}
