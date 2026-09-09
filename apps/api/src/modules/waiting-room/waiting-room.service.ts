import { Injectable } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { CallNextPatientService } from "./services/call-next-patient.service";
import { GetWaitingRoomDisplayService } from "./services/get-waiting-room-display.service";
import { GetWaitingRoomMetricsService } from "./services/get-waiting-room-metrics.service";
import { ListWaitingRoomService } from "./services/list-waiting-room.service";
import { StartAttendanceService } from "./services/start-attendance.service";

/** Item da fila da sala de espera. */
export class WaitingRoomItemDto {
  @ApiProperty() appointmentId!: string;
  @ApiProperty({ description: "Minutos desde o check-in — a coluna Espera" })
  waitingMinutes!: number;
  @ApiProperty({ example: "27min" }) waitingLabel!: string;
  @ApiProperty() patientId!: string;
  @ApiProperty() patientName!: string;
  @ApiProperty() patientPhone!: string;
  @ApiProperty() type!: string;
  @ApiProperty() professionalName!: string;
  @ApiProperty({ example: "08:48", description: "Hora do check-in" })
  checkedInAtLabel!: string;
  @ApiProperty({ example: "09:15", description: "Consulta prevista" })
  scheduledAtLabel!: string;
  @ApiProperty({ description: "Aguardando ou Atrasada" }) state!: string;
  @ApiProperty() isLate!: boolean;
  @ApiProperty({ description: "Já foi chamado pelo painel" })
  wasCalled!: boolean;
}

export class WaitingRoomMetricsDto {
  @ApiProperty() waitingCount!: number;
  @ApiProperty({ description: "Espera média em minutos" })
  averageWaitMinutes!: number;
  @ApiProperty({ description: "Maior espera em minutos" })
  longestWaitMinutes!: number;
  @ApiProperty() inProgressCount!: number;
}

export class WaitingRoomDisplayItemDto {
  @ApiProperty({ example: "Carlos E. D." }) displayName!: string;
  @ApiProperty({ nullable: true, type: String }) room!: string | null;
  @ApiProperty() professionalName!: string;
}

/**
 * WaitingRoomService Facade.
 *
 * Cada verbo/operação possui seu próprio serviço isolado.
 * Esta classe atua como fachada para consumidores internos.
 */
@Injectable()
export class WaitingRoomService {
  constructor(
    private readonly listService: ListWaitingRoomService,
    private readonly metricsService: GetWaitingRoomMetricsService,
    private readonly callNextService: CallNextPatientService,
    private readonly startAttendanceService: StartAttendanceService,
    private readonly displayService: GetWaitingRoomDisplayService,
  ) {}

  list(): Promise<WaitingRoomItemDto[]> {
    return this.listService.execute();
  }

  metrics(): Promise<WaitingRoomMetricsDto> {
    return this.metricsService.execute();
  }

  callNext(actor: AuthenticatedUser): Promise<WaitingRoomItemDto | null> {
    return this.callNextService.execute(actor);
  }

  display(
    token: string,
    expected: string,
  ): Promise<WaitingRoomDisplayItemDto[]> {
    return this.displayService.execute(token, expected);
  }

  startAttendance(appointmentId: string, actor: AuthenticatedUser) {
    return this.startAttendanceService.execute(appointmentId, actor);
  }
}
