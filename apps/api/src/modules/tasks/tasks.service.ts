import { Injectable } from "@nestjs/common";
import { TaskType } from "@prisma/client";
import { PageDto } from "../../common/dto/page.dto";
import { PageOptionsDto } from "../../common/dto/page-options.dto";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { TaskResponseDto, TaskSummaryDto } from "./dto/task.dto";
import { CreateTaskRequest } from "./requests/create-task.request";
import { ListTasksQueryRequest } from "./requests/list-tasks.request";
import { UpdateTaskRequest } from "./requests/update-task.request";
import { CreateSystemTaskService } from "./services/create-system-task.service";
import { CreateTaskService } from "./services/create-task.service";
import { FindAllTasksService } from "./services/find-all-tasks.service";
import { FindTaskByIdService } from "./services/find-task-by-id.service";
import { GetTaskSummaryService } from "./services/get-task-summary.service";
import { RegisterTaskContactService } from "./services/register-task-contact.service";
import { ResolveTaskService } from "./services/resolve-task.service";
import { UpdateTaskService } from "./services/update-task.service";
import { TaskWithPatient } from "./task.mapper";

/**
 * TasksService Facade.
 *
 * Cada verbo/ação possui seu próprio serviço isolado.
 * Esta classe atua como fachada para consumidores internos.
 */
@Injectable()
export class TasksService {
  constructor(
    private readonly findAllService: FindAllTasksService,
    private readonly findByIdService: FindTaskByIdService,
    private readonly summaryService: GetTaskSummaryService,
    private readonly createService: CreateTaskService,
    private readonly updateService: UpdateTaskService,
    private readonly resolveService: ResolveTaskService,
    private readonly registerContactService: RegisterTaskContactService,
    private readonly createSystemTaskService: CreateSystemTaskService,
  ) {}

  findAll(
    query: ListTasksQueryRequest | PageOptionsDto,
    overrides: { patientId?: string } = {},
  ): Promise<PageDto<TaskResponseDto>> {
    return this.findAllService.execute(query, overrides);
  }

  summary(): Promise<TaskSummaryDto> {
    return this.summaryService.execute();
  }

  create(
    dto: CreateTaskRequest,
    actor: AuthenticatedUser,
  ): Promise<TaskResponseDto> {
    return this.createService.execute(dto, actor);
  }

  update(
    id: string,
    dto: UpdateTaskRequest,
    actor: AuthenticatedUser,
  ): Promise<TaskResponseDto> {
    return this.updateService.execute(id, dto, actor);
  }

  resolve(
    id: string,
    notes: string | undefined,
    actor: AuthenticatedUser,
  ): Promise<TaskResponseDto> {
    return this.resolveService.execute(id, notes, actor);
  }

  registerContact(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<TaskResponseDto> {
    return this.registerContactService.execute(id, actor);
  }

  createSystemTask(params: {
    patientId: string;
    appointmentId?: string;
    type: TaskType;
    title: string;
    dueAt: Date | null;
  }): Promise<void> {
    return this.createSystemTaskService.execute(params);
  }

  getOrThrow(id: string): Promise<TaskWithPatient> {
    return this.findByIdService.getOrThrow(id);
  }
}
