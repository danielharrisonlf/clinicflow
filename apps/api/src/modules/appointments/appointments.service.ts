import { Injectable } from "@nestjs/common";
import { Channel } from "@prisma/client";
import {
  CursorOptionsDto,
  CursorPageDto,
} from "../../common/dto/cursor-page.dto";
import { PageDto } from "../../common/dto/page.dto";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import {
  AppointmentDetailDto,
  AppointmentEventDto,
  AppointmentListItemDto,
  CalendarDayDto,
} from "./dto/appointment-response.dto";
import { CalendarQueryRequest } from "./requests/calendar-query.request";
import { CancelAppointmentRequest } from "./requests/cancel-appointment.request";
import { CreateAppointmentRequest } from "./requests/create-appointment.request";
import { ListAppointmentsQueryRequest } from "./requests/list-appointments.request";
import { RescheduleAppointmentRequest } from "./requests/reschedule-appointment.request";
import { UpdateAppointmentRequest } from "./requests/update-appointment.request";
import { CancelAppointmentService } from "./services/cancel-appointment.service";
import { CheckInAppointmentService } from "./services/check-in-appointment.service";
import { CompleteAppointmentService } from "./services/complete-appointment.service";
import { ConfirmAppointmentService } from "./services/confirm-appointment.service";
import { CreateAppointmentService } from "./services/create-appointment.service";
import { FindAllAppointmentsService } from "./services/find-all-appointments.service";
import { FindAppointmentByIdService } from "./services/find-appointment-by-id.service";
import { GetCalendarService } from "./services/get-calendar.service";
import { ListAppointmentEventsService } from "./services/list-appointment-events.service";
import { ListPatientAppointmentsService } from "./services/list-patient-appointments.service";
import { RescheduleAppointmentService } from "./services/reschedule-appointment.service";
import { StartAppointmentService } from "./services/start-appointment.service";
import { UndoAppointmentService } from "./services/undo-appointment.service";
import { UpdateAppointmentService } from "./services/update-appointment.service";

/**
 * AppointmentsService Facade.
 *
 * Cada operação/verbo possui seu serviço especializado e isolado.
 * Esta classe atua como agregadora de conveniência para consumidores internos.
 */
@Injectable()
export class AppointmentsService {
  constructor(
    private readonly createService: CreateAppointmentService,
    private readonly findAllService: FindAllAppointmentsService,
    private readonly findByIdService: FindAppointmentByIdService,
    private readonly updateService: UpdateAppointmentService,
    private readonly confirmService: ConfirmAppointmentService,
    private readonly checkInService: CheckInAppointmentService,
    private readonly startService: StartAppointmentService,
    private readonly completeService: CompleteAppointmentService,
    private readonly cancelService: CancelAppointmentService,
    private readonly rescheduleService: RescheduleAppointmentService,
    private readonly undoService: UndoAppointmentService,
    private readonly calendarService: GetCalendarService,
    private readonly listEventsService: ListAppointmentEventsService,
    private readonly listPatientAppointmentsService: ListPatientAppointmentsService,
  ) {}

  findAll(
    query: ListAppointmentsQueryRequest,
  ): Promise<PageDto<AppointmentListItemDto>> {
    return this.findAllService.execute(query);
  }

  calendar(query: CalendarQueryRequest): Promise<CalendarDayDto[]> {
    return this.calendarService.execute(query);
  }

  findOne(id: string): Promise<AppointmentDetailDto> {
    return this.findByIdService.execute(id);
  }

  listEvents(
    id: string,
    options: CursorOptionsDto,
  ): Promise<CursorPageDto<AppointmentEventDto>> {
    return this.listEventsService.execute(id, options);
  }

  listByPatient(
    patientId: string,
    options: CursorOptionsDto,
  ): Promise<CursorPageDto<AppointmentListItemDto>> {
    return this.listPatientAppointmentsService.execute(patientId, options);
  }

  create(
    dto: CreateAppointmentRequest,
    actor: AuthenticatedUser,
  ): Promise<AppointmentDetailDto> {
    return this.createService.execute(dto, actor);
  }

  update(
    id: string,
    dto: UpdateAppointmentRequest,
    actor: AuthenticatedUser,
  ): Promise<AppointmentDetailDto> {
    return this.updateService.execute(id, dto, actor);
  }

  confirm(
    id: string,
    actor: AuthenticatedUser,
    channel: Channel = Channel.WEB,
  ): Promise<AppointmentDetailDto> {
    return this.confirmService.execute(id, actor, channel);
  }

  checkIn(id: string, actor: AuthenticatedUser): Promise<AppointmentDetailDto> {
    return this.checkInService.execute(id, actor);
  }

  start(id: string, actor: AuthenticatedUser): Promise<AppointmentDetailDto> {
    return this.startService.execute(id, actor);
  }

  complete(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<AppointmentDetailDto> {
    return this.completeService.execute(id, actor);
  }

  reschedule(
    id: string,
    dto: RescheduleAppointmentRequest,
    actor: AuthenticatedUser,
  ): Promise<AppointmentDetailDto> {
    return this.rescheduleService.execute(id, dto, actor);
  }

  cancel(
    id: string,
    dto: CancelAppointmentRequest,
    actor: AuthenticatedUser,
  ): Promise<AppointmentDetailDto> {
    return this.cancelService.execute(id, dto, actor);
  }

  undoLastTransition(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<AppointmentDetailDto> {
    return this.undoService.execute(id, actor);
  }

  getOrThrow(id: string) {
    return this.findByIdService.getOrThrow(id);
  }
}
