import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Sse,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { fromEvent, map, merge, Observable, startWith, switchMap } from "rxjs";
import { config } from "../../common/config";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { DomainEvent } from "../../shared/events/domain-events";
import {
  DisplayQueryRequest,
  DisplayQuerySchema,
} from "./requests/display-query.request";
import { CallNextPatientService } from "./services/call-next-patient.service";
import { GetWaitingRoomDisplayService } from "./services/get-waiting-room-display.service";
import { GetWaitingRoomMetricsService } from "./services/get-waiting-room-metrics.service";
import { ListWaitingRoomService } from "./services/list-waiting-room.service";
import { StartAttendanceService } from "./services/start-attendance.service";
import {
  WaitingRoomDisplayItemDto,
  WaitingRoomItemDto,
  WaitingRoomMetricsDto,
} from "./waiting-room.service";

@ApiTags("Sala de espera")
@ApiBearerAuth()
@Controller("waiting-room")
export class WaitingRoomController {
  constructor(
    private readonly listService: ListWaitingRoomService,
    private readonly metricsService: GetWaitingRoomMetricsService,
    private readonly callNextService: CallNextPatientService,
    private readonly startAttendanceService: StartAttendanceService,
    private readonly displayService: GetWaitingRoomDisplayService,
    private readonly events: EventEmitter2,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Fila em tempo real, ordenada por espera decrescente",
  })
  @ApiOkResponse({ type: [WaitingRoomItemDto] })
  list() {
    return this.listService.execute();
  }

  @Get("metrics")
  @ApiOperation({
    summary: "Na sala, espera média, maior espera, em atendimento",
  })
  @ApiOkResponse({ type: WaitingRoomMetricsDto })
  metrics() {
    return this.metricsService.execute();
  }

  @Sse("stream")
  @ApiOperation({ summary: "Fila em tempo real por SSE (balcão)" })
  stream(): Observable<{ data: WaitingRoomItemDto[] }> {
    const changes = merge(
      fromEvent(this.events, DomainEvent.AppointmentStatusChanged),
      fromEvent(this.events, DomainEvent.AppointmentCheckedIn),
    );
    return changes.pipe(
      startWith(null),
      switchMap(() => this.listService.execute()),
      map((queue) => ({ data: queue })),
    );
  }

  @Post("call-next")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '"Chamar próximo" / atalho [Espaço]' })
  @ApiOkResponse({ type: WaitingRoomItemDto })
  callNext(@CurrentUser() actor: AuthenticatedUser) {
    return this.callNextService.execute(actor);
  }

  @Patch(":appointmentId/start")
  @ApiOperation({ summary: "Atalho [I]: iniciar o atendimento selecionado" })
  start(
    @Param("appointmentId", ParseUUIDPipe) appointmentId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.startAttendanceService.execute(appointmentId, actor);
  }

  /**
   * Chamador de painel de TV. Público, porque a TV da recepção não faz login —
   * a autorização é o token na URL, e o payload não carrega nada sensível:
   * nome abreviado, sala e profissional.
   */
  @Public()
  @Get("display")
  @ApiOperation({
    summary: "Painel de TV (público por token, sem dado sensível)",
  })
  @ApiOkResponse({ type: [WaitingRoomDisplayItemDto] })
  display(
    @Query(new ZodValidationPipe(DisplayQuerySchema))
    query: DisplayQueryRequest,
  ) {
    return this.displayService.execute(query.token, config.displayToken);
  }
}
