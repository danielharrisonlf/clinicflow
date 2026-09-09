import { Module } from "@nestjs/common";
import { CreateSystemTaskService } from "./services/create-system-task.service";
import { CreateTaskService } from "./services/create-task.service";
import { FindAllTasksService } from "./services/find-all-tasks.service";
import { FindTaskByIdService } from "./services/find-task-by-id.service";
import { GetTaskSummaryService } from "./services/get-task-summary.service";
import { RegisterTaskContactService } from "./services/register-task-contact.service";
import { ResolveTaskService } from "./services/resolve-task.service";
import { UpdateTaskService } from "./services/update-task.service";
import { TasksController } from "./tasks.controller";
import { TasksListener } from "./tasks.listener";
import { TasksService } from "./tasks.service";

const services = [
  TasksService,
  FindTaskByIdService,
  FindAllTasksService,
  GetTaskSummaryService,
  CreateTaskService,
  UpdateTaskService,
  ResolveTaskService,
  RegisterTaskContactService,
  CreateSystemTaskService,
  TasksListener,
];

@Module({
  controllers: [TasksController],
  providers: services,
  exports: services,
})
export class TasksModule {}
