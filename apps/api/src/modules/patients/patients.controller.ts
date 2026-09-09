import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Role } from "@prisma/client";
import {
  ApiCursorResponse,
  ApiPageResponse,
} from "../../common/decorators/api-paginated-response.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { CursorOptionsDto } from "../../common/dto/cursor-page.dto";
import { PageOptionsDto } from "../../common/dto/page-options.dto";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { AppointmentsService } from "../appointments/appointments.service";
import { AppointmentListItemDto } from "../appointments/dto/appointment-response.dto";
import { DocumentsService } from "../documents/documents.service";
import { DocumentResponseDto } from "../documents/dto/document.dto";
import { TaskResponseDto } from "../tasks/dto/task.dto";
import { TasksService } from "../tasks/tasks.service";
import {
  PatientDetailDto,
  PatientListItemDto,
  PatientSummaryDto,
} from "./dto/patient.dto";
import {
  CreatePatientRequest,
  CreatePatientSchema,
} from "./requests/create-patient.request";
import {
  ListPatientsQueryRequest,
  ListPatientsQuerySchema,
} from "./requests/list-patients.request";
import {
  UpdatePatientRequest,
  UpdatePatientSchema,
} from "./requests/update-patient.request";
import { CreatePatientService } from "./services/create-patient.service";
import { DeactivatePatientService } from "./services/deactivate-patient.service";
import { ExportPatientsService } from "./services/export-patients.service";
import { FindAllPatientsService } from "./services/find-all-patients.service";
import { FindPatientByIdService } from "./services/find-patient-by-id.service";
import { GetPatientSummaryService } from "./services/get-patient-summary.service";
import { UpdatePatientService } from "./services/update-patient.service";

@ApiTags("Pacientes")
@ApiBearerAuth()
@Controller("patients")
export class PatientsController {
  constructor(
    private readonly findAllService: FindAllPatientsService,
    private readonly findByIdService: FindPatientByIdService,
    private readonly summaryService: GetPatientSummaryService,
    private readonly createService: CreatePatientService,
    private readonly updateService: UpdatePatientService,
    private readonly deactivateService: DeactivatePatientService,
    private readonly exportService: ExportPatientsService,
    private readonly appointmentsService: AppointmentsService,
    private readonly documentsService: DocumentsService,
    private readonly tasksService: TasksService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Listagem paginada de pacientes",
    description:
      "Busca por nome, CPF ou telefone. Colunas calculadas de última/próxima consulta.",
  })
  @ApiPageResponse(PatientListItemDto)
  findAll(
    @Query(new ZodValidationPipe(ListPatientsQuerySchema))
    query: ListPatientsQueryRequest,
  ) {
    return this.findAllService.execute(query);
  }

  @Get("export")
  @ApiOperation({ summary: 'Botão "Exportar" — CSV' })
  export(
    @Query(new ZodValidationPipe(ListPatientsQuerySchema))
    query: ListPatientsQueryRequest,
  ): Promise<StreamableFile> {
    return this.exportService.execute(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Detalhes e ficha cadastral do paciente" })
  @ApiOkResponse({ type: PatientDetailDto })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.findByIdService.execute(id);
  }

  @Get(":id/summary")
  @ApiOperation({ summary: "Os quatro contadores do topo da ficha" })
  @ApiOkResponse({ type: PatientSummaryDto })
  summary(@Param("id", ParseUUIDPipe) id: string) {
    return this.summaryService.execute(id);
  }

  @Get(":id/appointments")
  @ApiOperation({ summary: 'Aba "Histórico de Consultas" (cursor)' })
  @ApiCursorResponse(AppointmentListItemDto)
  async appointments(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() options: CursorOptionsDto,
  ) {
    await this.findByIdService.getOrThrow(id);
    return this.appointmentsService.listByPatient(id, options);
  }

  @Get(":id/documents")
  @ApiOperation({ summary: 'Aba "Documentos Clínicos"' })
  @ApiPageResponse(DocumentResponseDto)
  async documents(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() options: PageOptionsDto,
  ) {
    await this.findByIdService.getOrThrow(id);
    return this.documentsService.findAll(options, { patientId: id });
  }

  @Get(":id/tasks")
  @ApiOperation({ summary: 'Aba "Pendências e Retornos"' })
  @ApiPageResponse(TaskResponseDto)
  async tasks(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() options: PageOptionsDto,
  ) {
    await this.findByIdService.getOrThrow(id);
    return this.tasksService.findAll(options, { patientId: id });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Cadastrar novo paciente" })
  @ApiOkResponse({ type: PatientDetailDto })
  create(
    @Body(new ZodValidationPipe(CreatePatientSchema))
    dto: CreatePatientRequest,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.createService.execute(dto, actor);
  }

  @Patch(":id")
  @ApiOperation({ summary: 'Botão "Editar cadastro"' })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdatePatientSchema))
    dto: UpdatePatientRequest,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.updateService.execute(id, dto, actor);
  }

  @Delete(":id")
  @Roles(Role.GESTOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Inativar paciente (lógico — o histórico permanece)",
  })
  remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.deactivateService.execute(id, actor);
  }
}
