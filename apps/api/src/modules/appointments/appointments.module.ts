import { Module } from "@nestjs/common";
import { AppointmentsController } from "./appointments.controller";
import { AppointmentsService } from "./appointments.service";
import { AvailabilityService } from "./availability.service";
import { CancelAppointmentService } from "./services/cancel-appointment.service";
import { CheckAvailabilityService } from "./services/check-availability.service";
import { CheckInAppointmentService } from "./services/check-in-appointment.service";
import { CompleteAppointmentService } from "./services/complete-appointment.service";
import { ConfirmAppointmentService } from "./services/confirm-appointment.service";
import { CreateAppointmentService } from "./services/create-appointment.service";
import { FindAllAppointmentsService } from "./services/find-all-appointments.service";
import { FindAppointmentByIdService } from "./services/find-appointment-by-id.service";
import { GetCalendarService } from "./services/get-calendar.service";
import { ListAppointmentEventsService } from "./services/list-appointment-events.service";
import { ListPatientAppointmentsService } from "./services/list-patient-appointments.service";
import { ListSlotsService } from "./services/list-slots.service";
import { RescheduleAppointmentService } from "./services/reschedule-appointment.service";
import { StartAppointmentService } from "./services/start-appointment.service";
import { TransitionAppointmentService } from "./services/transition-appointment.service";
import { UndoAppointmentService } from "./services/undo-appointment.service";
import { UpdateAppointmentService } from "./services/update-appointment.service";

const services = [
  AppointmentsService,
  AvailabilityService,
  TransitionAppointmentService,
  CreateAppointmentService,
  FindAllAppointmentsService,
  FindAppointmentByIdService,
  UpdateAppointmentService,
  ConfirmAppointmentService,
  CheckInAppointmentService,
  StartAppointmentService,
  CompleteAppointmentService,
  CancelAppointmentService,
  RescheduleAppointmentService,
  UndoAppointmentService,
  GetCalendarService,
  ListAppointmentEventsService,
  ListPatientAppointmentsService,
  CheckAvailabilityService,
  ListSlotsService,
];

@Module({
  controllers: [AppointmentsController],
  providers: services,
  exports: services,
})
export class AppointmentsModule {}
