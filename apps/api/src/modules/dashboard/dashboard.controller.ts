import { Controller, Get, Query, Sse } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { fromEvent, map, merge, Observable, startWith, switchMap } from "rxjs";
import { DomainEvent } from "../../shared/events/domain-events";
import { DashboardService, TodaySummaryDto } from "./dashboard.service";

@ApiTags("Painel do dia")
@ApiBearerAuth()
@Controller("dashboard")
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly events: EventEmitter2,
  ) {}

  @Get("today")
  @ApiOperation({ summary: "Contadores consolidados do painel do dia" })
  @ApiQuery({ name: "date", required: false, example: "2026-09-11" })
  @ApiQuery({ name: "professionalId", required: false })
  @ApiOkResponse({ type: TodaySummaryDto })
  today(
    @Query("date") date?: string,
    @Query("professionalId") professionalId?: string,
  ): Promise<TodaySummaryDto> {
    return this.dashboardService.today(date, professionalId);
  }

  /**
   * Fluxo SSE do painel.
   *
   * Reemite o resumo a cada transição de estado, em vez de o balcão perguntar
   * de cinco em cinco segundos se algo mudou. A primeira emissão é imediata
   * (`startWith`) para a tela não abrir vazia esperando o primeiro evento.
   */
  @Sse("stream")
  @ApiOperation({
    summary: "Atualização em tempo real do painel (text/event-stream)",
  })
  stream(
    @Query("professionalId") professionalId?: string,
  ): Observable<{ data: TodaySummaryDto }> {
    const changes = merge(
      fromEvent(this.events, DomainEvent.AppointmentStatusChanged),
      fromEvent(this.events, DomainEvent.AppointmentCreated),
    );

    return changes.pipe(
      startWith(null),
      switchMap(() => this.dashboardService.today(undefined, professionalId)),
      map((summary) => ({ data: summary })),
    );
  }
}
