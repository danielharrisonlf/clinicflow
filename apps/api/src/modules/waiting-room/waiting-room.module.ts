import { Module } from "@nestjs/common";
import { AppointmentsModule } from "../appointments/appointments.module";
import { CallNextPatientService } from "./services/call-next-patient.service";
import { GetWaitingRoomDisplayService } from "./services/get-waiting-room-display.service";
import { GetWaitingRoomMetricsService } from "./services/get-waiting-room-metrics.service";
import { ListWaitingRoomService } from "./services/list-waiting-room.service";
import { StartAttendanceService } from "./services/start-attendance.service";
import { WaitingRoomController } from "./waiting-room.controller";
import { WaitingRoomService } from "./waiting-room.service";

const services = [
  WaitingRoomService,
  ListWaitingRoomService,
  GetWaitingRoomMetricsService,
  CallNextPatientService,
  StartAttendanceService,
  GetWaitingRoomDisplayService,
];

@Module({
  imports: [AppointmentsModule],
  controllers: [WaitingRoomController],
  providers: services,
  exports: services,
})
export class WaitingRoomModule {}
