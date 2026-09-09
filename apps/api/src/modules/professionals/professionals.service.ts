import { Injectable } from "@nestjs/common";
import { PageDto } from "../../common/dto/page.dto";
import { PageOptionsDto } from "../../common/dto/page-options.dto";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import {
  ProfessionalResponseDto,
  ProfessionalScheduleDto,
} from "./dto/professional.dto";
import { ChangeProfessionalStatusRequest } from "./requests/change-professional-status.request";
import { CreateProfessionalRequest } from "./requests/create-professional.request";
import { ReplaceScheduleRequest } from "./requests/replace-schedule.request";
import { UpdateProfessionalRequest } from "./requests/update-professional.request";
import { ChangeProfessionalStatusService } from "./services/change-professional-status.service";
import { CreateProfessionalService } from "./services/create-professional.service";
import { FindAllProfessionalsService } from "./services/find-all-professionals.service";
import { FindProfessionalByIdService } from "./services/find-professional-by-id.service";
import { GetProfessionalScheduleService } from "./services/get-professional-schedule.service";
import { ProfessionalWithWindows } from "./services/professional-enricher.service";
import { ReplaceProfessionalScheduleService } from "./services/replace-professional-schedule.service";
import { UpdateProfessionalService } from "./services/update-professional.service";

/**
 * ProfessionalsService Facade.
 *
 * Cada verbo/operação possui seu próprio serviço isolado.
 * Esta classe atua como fachada para consumidores internos.
 */
@Injectable()
export class ProfessionalsService {
  constructor(
    private readonly findAllService: FindAllProfessionalsService,
    private readonly findByIdService: FindProfessionalByIdService,
    private readonly getScheduleService: GetProfessionalScheduleService,
    private readonly replaceScheduleService: ReplaceProfessionalScheduleService,
    private readonly createService: CreateProfessionalService,
    private readonly updateService: UpdateProfessionalService,
    private readonly changeStatusService: ChangeProfessionalStatusService,
  ) {}

  findAll(options: PageOptionsDto): Promise<PageDto<ProfessionalResponseDto>> {
    return this.findAllService.execute(options);
  }

  findOne(id: string): Promise<ProfessionalResponseDto> {
    return this.findByIdService.execute(id);
  }

  getSchedule(id: string): Promise<ProfessionalScheduleDto> {
    return this.getScheduleService.execute(id);
  }

  replaceSchedule(
    id: string,
    dto: ReplaceScheduleRequest,
    actor: AuthenticatedUser,
  ): Promise<ProfessionalScheduleDto> {
    return this.replaceScheduleService.execute(id, dto, actor);
  }

  create(
    dto: CreateProfessionalRequest,
    actor: AuthenticatedUser,
  ): Promise<ProfessionalResponseDto> {
    return this.createService.execute(dto, actor);
  }

  update(
    id: string,
    dto: UpdateProfessionalRequest,
    actor: AuthenticatedUser,
  ): Promise<ProfessionalResponseDto> {
    return this.updateService.execute(id, dto, actor);
  }

  changeStatus(
    id: string,
    dto: ChangeProfessionalStatusRequest,
    actor: AuthenticatedUser,
  ): Promise<ProfessionalResponseDto> {
    return this.changeStatusService.execute(id, dto, actor);
  }

  getOrThrow(id: string): Promise<ProfessionalWithWindows> {
    return this.findByIdService.getOrThrow(id);
  }
}
