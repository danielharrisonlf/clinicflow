import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { TasksModule } from "../tasks/tasks.module";
import { JobsService } from "./jobs.service";

@Module({
  imports: [TasksModule, NotificationsModule],
  providers: [JobsService],
})
export class JobsModule {}
