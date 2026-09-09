import { Module } from "@nestjs/common";
import { AppointmentsModule } from "../appointments/appointments.module";
import { ProfessionalsController } from "./professionals.controller";
import { ProfessionalsService } from "./professionals.service";
import { ChangeProfessionalStatusService } from "./services/change-professional-status.service";
import { CreateProfessionalService } from "./services/create-professional.service";
import { FindAllProfessionalsService } from "./services/find-all-professionals.service";
import { FindProfessionalByIdService } from "./services/find-professional-by-id.service";
import { GetProfessionalScheduleService } from "./services/get-professional-schedule.service";
import { ProfessionalEnricherService } from "./services/professional-enricher.service";
import { ReplaceProfessionalScheduleService } from "./services/replace-professional-schedule.service";
import { UpdateProfessionalService } from "./services/update-professional.service";

const services = [
  ProfessionalsService,
  ProfessionalEnricherService,
  FindAllProfessionalsService,
  FindProfessionalByIdService,
  GetProfessionalScheduleService,
  ReplaceProfessionalScheduleService,
  CreateProfessionalService,
  UpdateProfessionalService,
  ChangeProfessionalStatusService,
];

@Module({
  imports: [AppointmentsModule],
  controllers: [ProfessionalsController],
  providers: services,
  exports: services,
})
export class ProfessionalsModule {}
