import { Injectable } from "@nestjs/common";
import { minutesOfDay } from "../../../common/utils/clinic-time.util";
import { ProfessionalScheduleDto } from "../dto/professional.dto";
import { FindProfessionalByIdService } from "./find-professional-by-id.service";
import { ProfessionalEnricherService } from "./professional-enricher.service";

@Injectable()
export class GetProfessionalScheduleService {
  constructor(
    private readonly findByIdService: FindProfessionalByIdService,
    private readonly enricher: ProfessionalEnricherService,
  ) {}

  /** Grade de atendimento configurada do profissional. */
  async execute(id: string): Promise<ProfessionalScheduleDto> {
    const professional = await this.findByIdService.getOrThrow(id);
    const windows = [...professional.scheduleWindows].sort(
      (a, b) =>
        a.weekday - b.weekday ||
        minutesOfDay(a.startTime) - minutesOfDay(b.startTime),
    );

    return {
      professionalId: id,
      windows: windows.map((w) => ({
        weekday: w.weekday,
        startTime: w.startTime,
        endTime: w.endTime,
        ...(w.room ? { room: w.room } : {}),
      })),
      summary: this.enricher.buildScheduleSummary(windows),
    };
  }
}
