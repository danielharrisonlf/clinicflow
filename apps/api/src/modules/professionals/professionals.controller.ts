import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { ApiPageResponse } from "../../common/decorators/api-paginated-response.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { PageOptionsDto } from "../../common/dto/page-options.dto";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { AppointmentsService } from "../appointments/appointments.service";
import { CalendarQueryDto } from "../appointments/dto/appointment.dto";
import { CalendarDayDto } from "../appointments/dto/appointment-response.dto";
import {
  ProfessionalResponseDto,
  ProfessionalScheduleDto,
} from "./dto/professional.dto";
import {
  ChangeProfessionalStatusRequest,
  ChangeProfessionalStatusSchema,
} from "./requests/change-professional-status.request";
import {
  CreateProfessionalRequest,
  CreateProfessionalSchema,
} from "./requests/create-professional.request";
import {
  ReplaceScheduleRequest,
  ReplaceScheduleSchema,
} from "./requests/replace-schedule.request";
import {
  UpdateProfessionalRequest,
  UpdateProfessionalSchema,
} from "./requests/update-professional.request";
import { ChangeProfessionalStatusService } from "./services/change-professional-status.service";
import { CreateProfessionalService } from "./services/create-professional.service";
import { FindAllProfessionalsService } from "./services/find-all-professionals.service";
import { FindProfessionalByIdService } from "./services/find-professional-by-id.service";
import { GetProfessionalScheduleService } from "./services/get-professional-schedule.service";
import { ReplaceProfessionalScheduleService } from "./services/replace-professional-schedule.service";
import { UpdateProfessionalService } from "./services/update-professional.service";

@ApiTags("Profissionais")
@ApiBearerAuth()
@Controller("professionals")
export class ProfessionalsController {
  constructor(
    private readonly findAllService: FindAllProfessionalsService,
    private readonly findByIdService: FindProfessionalByIdService,
    private readonly getScheduleService: GetProfessionalScheduleService,
    private readonly replaceScheduleService: ReplaceProfessionalScheduleService,
    private readonly createService: CreateProfessionalService,
    private readonly updateService: UpdateProfessionalService,
    private readonly changeStatusService: ChangeProfessionalStatusService,
    private readonly appointmentsService: AppointmentsService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Listagem do corpo clínico" })
  @ApiPageResponse(ProfessionalResponseDto)
  findAll(@Query() options: PageOptionsDto) {
    return this.findAllService.execute(options);
  }

  @Get(":id")
  @ApiOperation({ summary: "Detalhes do profissional por ID" })
  @ApiOkResponse({ type: ProfessionalResponseDto })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.findByIdService.execute(id);
  }

  @Get(":id/schedule")
  @ApiOperation({ summary: "Janelas de atendimento configuradas" })
  @ApiOkResponse({ type: ProfessionalScheduleDto })
  getSchedule(@Param("id", ParseUUIDPipe) id: string) {
    return this.getScheduleService.execute(id);
  }

  @Put(":id/schedule")
  @Roles(Role.GESTOR)
  @ApiOperation({ summary: "Substituir a grade de atendimento (em bloco)" })
  replaceSchedule(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(ReplaceScheduleSchema))
    dto: ReplaceScheduleRequest,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.replaceScheduleService.execute(id, dto, actor);
  }

  @Get(":id/appointments")
  @ApiOperation({ summary: "Agenda do profissional no intervalo" })
  @ApiOkResponse({ type: [CalendarDayDto] })
  async appointments(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: CalendarQueryDto,
  ) {
    await this.findByIdService.getOrThrow(id);
    return this.appointmentsService.calendar({
      from: query.from,
      to: query.to,
      professionalId: id,
    });
  }

  @Post()
  @Roles(Role.GESTOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Cadastrar novo profissional" })
  create(
    @Body(new ZodValidationPipe(CreateProfessionalSchema))
    dto: CreateProfessionalRequest,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.createService.execute(dto, actor);
  }

  @Patch(":id")
  @Roles(Role.GESTOR)
  @ApiOperation({ summary: "Editar dados do profissional" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateProfessionalSchema))
    dto: UpdateProfessionalRequest,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.updateService.execute(id, dto, actor);
  }

  @Patch(":id/status")
  @Roles(Role.GESTOR)
  @ApiOperation({
    summary: "Ativar ou desativar (bloqueado se houver agenda futura)",
  })
  changeStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(ChangeProfessionalStatusSchema))
    dto: ChangeProfessionalStatusRequest,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.changeStatusService.execute(id, dto, actor);
  }
}
