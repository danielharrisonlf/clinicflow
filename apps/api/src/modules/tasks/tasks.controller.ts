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
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { ApiPageResponse } from "../../common/decorators/api-paginated-response.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { TaskResponseDto, TaskSummaryDto } from "./dto/task.dto";
import {
  CreateTaskRequest,
  CreateTaskSchema,
} from "./requests/create-task.request";
import {
  ListTasksQueryRequest,
  ListTasksQuerySchema,
} from "./requests/list-tasks.request";
import {
  ResolveTaskRequest,
  ResolveTaskSchema,
} from "./requests/resolve-task.request";
import {
  UpdateTaskRequest,
  UpdateTaskSchema,
} from "./requests/update-task.request";
import { CreateTaskService } from "./services/create-task.service";
import { FindAllTasksService } from "./services/find-all-tasks.service";
import { GetTaskSummaryService } from "./services/get-task-summary.service";
import { RegisterTaskContactService } from "./services/register-task-contact.service";
import { ResolveTaskService } from "./services/resolve-task.service";
import { UpdateTaskService } from "./services/update-task.service";

@ApiTags("Pendências e retornos")
@ApiBearerAuth()
@Controller("tasks")
export class TasksController {
  constructor(
    private readonly findAllService: FindAllTasksService,
    private readonly summaryService: GetTaskSummaryService,
    private readonly createService: CreateTaskService,
    private readonly updateService: UpdateTaskService,
    private readonly resolveService: ResolveTaskService,
    private readonly registerContactService: RegisterTaskContactService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Funil operacional de tarefas e retornos" })
  @ApiPageResponse(TaskResponseDto)
  findAll(
    @Query(new ZodValidationPipe(ListTasksQuerySchema))
    query: ListTasksQueryRequest,
  ) {
    return this.findAllService.execute(query);
  }

  @Get("summary")
  @ApiOperation({ summary: "Resumo das métricas do funil de tarefas" })
  @ApiOkResponse({ type: TaskSummaryDto })
  summary() {
    return this.summaryService.execute();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Botão "Nova tarefa"' })
  create(
    @Body(new ZodValidationPipe(CreateTaskSchema))
    dto: CreateTaskRequest,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.createService.execute(dto, actor);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Editar prazo, título ou situação" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateTaskSchema))
    dto: UpdateTaskRequest,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.updateService.execute(id, dto, actor);
  }

  @Patch(":id/resolve")
  @ApiOperation({ summary: "Resolver a pendência" })
  resolve(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(ResolveTaskSchema))
    dto: ResolveTaskRequest,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.resolveService.execute(id, dto.notes, actor);
  }

  @Post(":id/contact")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Registrar tentativa de contato ("Ligar WhatsApp")',
  })
  contact(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.registerContactService.execute(id, actor);
  }
}
