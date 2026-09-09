import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { AppointmentsModule } from "./modules/appointments/appointments.module";
import { AuthModule } from "./modules/auth/auth.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { DocumentsModule } from "./modules/documents/documents.module";
import { HealthModule } from "./modules/health/health.module";
import { JobsModule } from "./modules/jobs/jobs.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PatientsModule } from "./modules/patients/patients.module";
import { ProfessionalsModule } from "./modules/professionals/professionals.module";
import { SearchModule } from "./modules/search/search.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { UsersModule } from "./modules/users/users.module";
import { WaitingRoomModule } from "./modules/waiting-room/waiting-room.module";
import { PrismaModule } from "./shared/prisma/prisma.module";
import { SharedModule } from "./shared/shared.module";
import { StorageModule } from "./shared/storage/storage.module";

@Module({
  imports: [
    // Infraestrutura
    PrismaModule,
    SharedModule,
    StorageModule,
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),

    // Domínio
    AuthModule,
    UsersModule,
    SettingsModule,
    PatientsModule,
    ProfessionalsModule,
    AppointmentsModule,
    DashboardModule,
    WaitingRoomModule,
    DocumentsModule,
    TasksModule,
    NotificationsModule,
    SearchModule,
    JobsModule,
    HealthModule,
  ],
  providers: [
    // A ordem importa: autentica, depois autoriza, depois limita a taxa.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
