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
import {
  ApiCursorResponse,
  ApiPageResponse,
} from "../../common/decorators/api-paginated-response.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CursorOptionsDto } from "../../common/dto/cursor-page.dto";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import {
  AppointmentDetailDto,
  AppointmentEventDto,
  AppointmentListItemDto,
  AvailabilityResultDto,
  CalendarDayDto,
  TimeSlotDto,
} from "./dto/appointment-response.dto";
import {
  CalendarQueryRequest,
  CalendarQuerySchema,
} from "./requests/calendar-query.request";
import {
  CancelAppointmentRequest,
  CancelAppointmentSchema,
} from "./requests/cancel-appointment.request";
import {
  CheckAvailabilityRequest,
  CheckAvailabilitySchema,
} from "./requests/check-availability.request";
import {
  CreateAppointmentRequest,
  CreateAppointmentSchema,
} from "./requests/create-appointment.request";
import {
  ListAppointmentsQueryRequest,
  ListAppointmentsQuerySchema,
} from "./requests/list-appointments.request";
import {
  ListSlotsQueryRequest,
  ListSlotsQuerySchema,
} from "./requests/list-slots.request";
import {
  RescheduleAppointmentRequest,
  RescheduleAppointmentSchema,
} from "./requests/reschedule-appointment.request";
import {
  UpdateAppointmentRequest,
  UpdateAppointmentSchema,
} from "./requests/update-appointment.request";
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
import { ListSlotsService } from "./services/list-slots.service";
import { RescheduleAppointmentService } from "./services/reschedule-appointment.service";
import { StartAppointmentService } from "./services/start-appointment.service";
import { UndoAppointmentService } from "./services/undo-appointment.service";
import { UpdateAppointmentService } from "./services/update-appointment.service";

@ApiTags("Consultas")
@ApiBearerAuth()
@Controller("appointments")
export class AppointmentsController {
  constructor(
    private readonly findAllService: FindAllAppointmentsService,
    private readonly findByIdService: FindAppointmentByIdService,
    private readonly createService: CreateAppointmentService,
    private readonly updateService: UpdateAppointmentService,
    private readonly confirmService: ConfirmAppointmentService,
    private readonly checkInService: CheckInAppointmentService,
    private readonly startService: StartAppointmentService,
    private readonly completeService: CompleteAppointmentService,
    private readonly rescheduleService: RescheduleAppointmentService,
    private readonly cancelService: CancelAppointmentService,
    private readonly undoService: UndoAppointmentService,
    private readonly calendarService: GetCalendarService,
    private readonly listEventsService: ListAppointmentEventsService,
    private readonly listSlotsService: ListSlotsService,
    private readonly checkAvailabilityService: CheckAvailabilityService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Painel do dia com consultas e métricas",
    description:
      "Lista cronológica com filtros de dia, profissional, estado e tipo. derivedState traz ATRASADA calculada.",
  })
  @ApiPageResponse(AppointmentListItemDto)
  findAll(
    @Query(new ZodValidationPipe(ListAppointmentsQuerySchema))
    query: ListAppointmentsQueryRequest,
  ) {
    return this.findAllService.execute(query);
  }

  @Get("calendar")
  @ApiOperation({ summary: "Grade semanal de consultas agrupada por dia" })
  @ApiOkResponse({ type: [CalendarDayDto] })
  calendar(
    @Query(new ZodValidationPipe(CalendarQuerySchema))
    query: CalendarQueryRequest,
  ) {
    return this.calendarService.execute(query);
  }

  @Get("slots")
  @ApiOperation({
    summary: "Horários livres do profissional no dia",
  })
  @ApiOkResponse({ type: [TimeSlotDto] })
  slots(
    @Query(new ZodValidationPipe(ListSlotsQuerySchema))
    query: ListSlotsQueryRequest,
  ) {
    return this.listSlotsService.execute(query);
  }

  @Post("availability")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Checar conflito antes do agendamento",
    description: "Somente leitura: não cria nem altera nada.",
  })
  @ApiOkResponse({ type: AvailabilityResultDto })
  checkAvailability(
    @Body(new ZodValidationPipe(CheckAvailabilitySchema))
    dto: CheckAvailabilityRequest,
  ) {
    return this.checkAvailabilityService.execute(dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Detalhe da consulta" })
  @ApiOkResponse({ type: AppointmentDetailDto })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.findByIdService.execute(id);
  }

  @Get(":id/audit")
  @ApiOperation({ summary: "Histórico e auditoria da consulta (cursor)" })
  @ApiCursorResponse(AppointmentEventDto)
  audit(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() options: CursorOptionsDto,
  ) {
    return this.listEventsService.execute(id, options);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Nova consulta" })
  @ApiOkResponse({ type: AppointmentDetailDto })
  create(
    @Body(new ZodValidationPipe(CreateAppointmentSchema))
    dto: CreateAppointmentRequest,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.createService.execute(dto, actor);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Editar observação operacional ou sala" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateAppointmentSchema))
    dto: UpdateAppointmentRequest,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.updateService.execute(id, dto, actor);
  }

  @Patch(":id/confirm")
  @ApiOperation({ summary: 'Ação "Confirmar" da linha do painel' })
  confirm(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.confirmService.execute(id, actor);
  }

  @Patch(":id/check-in")
  @ApiOperation({
    summary: 'Ação "Check-in" / atalho [C] — entra na sala de espera',
  })
  checkIn(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.checkInService.execute(id, actor);
  }

  @Patch(":id/start")
  @ApiOperation({ summary: 'Ação "Iniciar" / atalho [I]' })
  start(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.startService.execute(id, actor);
  }

  @Patch(":id/complete")
  @ApiOperation({ summary: 'Ação "Concluir" — dispara a pendência de retorno' })
  complete(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.completeService.execute(id, actor);
  }

  @Patch(":id/reschedule")
  @ApiOperation({ summary: "Reagendar consulta com motivo obrigatório" })
  reschedule(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(RescheduleAppointmentSchema))
    dto: RescheduleAppointmentRequest,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.rescheduleService.execute(id, dto, actor);
  }

  @Patch(":id/cancel")
  @ApiOperation({
    summary: "Cancelar consulta com motivo obrigatório",
  })
  cancel(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(CancelAppointmentSchema))
    dto: CancelAppointmentRequest,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.cancelService.execute(id, dto, actor);
  }

  @Post(":id/undo")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Desfazer a última alteração (toast "Desfazer [Z]")',
    description:
      "Janela curta, só do próprio autor. Gera evento de compensação na auditoria.",
  })
  undo(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.undoService.execute(id, actor);
  }
}
